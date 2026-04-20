import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks (hoisted so vi.mock factories can reference them) ──────────────────

const { graphqlUploadMock, runMigrationsMock } = vi.hoisted(() => ({
  graphqlUploadMock: vi.fn(async () => {}),
  runMigrationsMock: vi.fn().mockResolvedValue(),
}));

vi.mock("../migrations/runMigrations", () => ({ default: runMigrationsMock }));
vi.mock("../plugins/graphqlUpload", () => ({ default: graphqlUploadMock }));

// ── Helpers ──────────────────────────────────────────────────────────────────

const buildFastify = (configOverrides: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });
  fastify.decorate("config", {
    rest: { enabled: true },
    s3: { bucket: "test-bucket", clientConfig: {} },
    ...configOverrides,
  });
  fastify.decorate("slonik", {});
  return fastify;
};

/** Minimal multipart/form-data body for inject tests (single file field). */
const buildMultipartFileBody = (
  boundary: string,
  fieldName: string,
  filename: string,
  fileBytes: Buffer,
): Buffer => {
  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
    "utf8",
  );
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return Buffer.concat([preamble, fileBytes, closing]);
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("s3 plugin — initialization", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => fastify.close());

  it("calls runMigrations on startup", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledOnce();
  });

  it("passes slonik and config to runMigrations", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ s3: expect.any(Object) }),
    );
  });
});

describe("s3 plugin — REST multipart registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => fastify.close());

  it("registers @fastify/multipart when config.rest.enabled is true", async () => {
    fastify = buildFastify({ rest: { enabled: true } });
    await fastify.register(plugin);
    await fastify.ready();

    // @fastify/multipart registers a multipart/form-data content-type parser
    expect(fastify.hasContentTypeParser("multipart/form-data")).toBe(true);
  });

  it("does not register @fastify/multipart when config.rest.enabled is false", async () => {
    fastify = buildFastify({ rest: { enabled: false } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasContentTypeParser("multipart/form-data")).toBe(false);
  });

  it("rejects multipart uploads larger than fileSizeLimitInBytes with 413", async () => {
    const boundary = "----test-boundary-413";
    const limitBytes = 512;
    const oversized = Buffer.alloc(limitBytes + 200, 7);

    fastify = buildFastify({
      s3: {
        bucket: "test-bucket",
        clientConfig: {},
        fileSizeLimitInBytes: limitBytes,
      },
    });
    await fastify.register(plugin);

    fastify.post("/upload", async () => ({ ok: true }));

    await fastify.ready();

    const response = await fastify.inject({
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      method: "POST",
      payload: buildMultipartFileBody(boundary, "doc", "big.bin", oversized),
      url: "/upload",
    });

    expect(response.statusCode).toBe(413);
  });

  it("attaches normalised file objects to the body for multipart fields within the size limit", async () => {
    const boundary = "----test-boundary-ok";
    const fileBytes = Buffer.from("hello-s3");

    fastify = buildFastify({
      s3: {
        bucket: "test-bucket",
        clientConfig: {},
        fileSizeLimitInBytes: 50000,
      },
    });
    await fastify.register(plugin);

    let body: unknown;
    fastify.post("/upload", async (request) => {
      body = request.body;
      return {};
    });

    await fastify.ready();

    const response = await fastify.inject({
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      method: "POST",
      payload: buildMultipartFileBody(boundary, "doc", "note.txt", fileBytes),
      url: "/upload",
    });

    expect(response.statusCode).toBe(200);
    expect(body).toEqual({
      doc: {
        data: fileBytes,
        encoding: expect.any(String),
        filename: "note.txt",
        mimetype: "application/octet-stream",
      },
    });
  });
});

describe("s3 plugin — GraphQL upload registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => fastify.close());

  it("registers the graphql upload plugin when config.graphql.enabled is true", async () => {
    fastify = buildFastify({
      graphql: { enabled: true },
      rest: { enabled: false },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(graphqlUploadMock).toHaveBeenCalledOnce();
  });

  it("does not register the graphql upload plugin when config.graphql is undefined", async () => {
    fastify = buildFastify({ graphql: undefined, rest: { enabled: false } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(graphqlUploadMock).not.toHaveBeenCalled();
  });

  it("does not register the graphql upload plugin when config.graphql.enabled is false", async () => {
    fastify = buildFastify({
      graphql: { enabled: false },
      rest: { enabled: false },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(graphqlUploadMock).not.toHaveBeenCalled();
  });

  it("passes fileSizeLimitInBytes as maxFileSize to the graphql upload plugin", async () => {
    fastify = buildFastify({
      graphql: { enabled: true },
      rest: { enabled: false },
      s3: { fileSizeLimitInBytes: 5_000_000 },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(graphqlUploadMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxFileSize: 5_000_000 }),
      expect.any(Function),
    );
  });

  it("passes Infinity as maxFileSize when fileSizeLimitInBytes is not set", async () => {
    fastify = buildFastify({
      graphql: { enabled: true },
      rest: { enabled: false },
      s3: { bucket: "test-bucket", clientConfig: {} },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(graphqlUploadMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxFileSize: Number.POSITIVE_INFINITY }),
      expect.any(Function),
    );
  });
});
