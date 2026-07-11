import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks (hoisted so vi.mock factories can reference them) ──────────────────

const { runMigrationsMock } = vi.hoisted(() => ({
  runMigrationsMock: vi.fn().mockResolvedValue(),
}));

vi.mock("../migrations/runMigrations", () => ({ default: runMigrationsMock }));

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

/** Fastify instance without a config decoration, for new-pattern tests. */
const buildBareFastify = () => {
  const instance = Fastify({ logger: false });
  instance.decorate("slonik", {});
  return instance;
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

  it("passes slonik and the composed options to runMigrations when falling back to fastify.config", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        bucket: "test-bucket",
        rest: { enabled: true },
      }),
    );
  });

  it("logs a deprecation warning when falling back to fastify.config", async () => {
    fastify = buildFastify();
    const warnSpy = vi.spyOn(fastify.log, "warn");

    await fastify.register(plugin);
    await fastify.ready();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("passing s3 options directly"),
    );
  });

  it("throws when registered without options and without fastify.config", async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("slonik", {});

    await expect(fastify.register(plugin).ready()).rejects.toThrow(
      "Missing s3 configuration",
    );
  });

  it("throws when the slonik decorator is missing", async () => {
    fastify = Fastify({ logger: false });

    await expect(
      fastify
        .register(plugin, { bucket: "options-bucket", clientConfig: {} })
        .ready(),
    ).rejects.toThrow("Missing slonik decorator");
  });
});

describe("s3 plugin — options passed directly (new pattern)", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());
  afterEach(async () => fastify.close());

  it("registers @fastify/multipart from options.rest without reading fastify.config", async () => {
    fastify = buildBareFastify();
    await fastify.register(plugin, {
      bucket: "options-bucket",
      clientConfig: {},
      rest: { enabled: true },
    });
    await fastify.ready();

    expect(fastify.hasContentTypeParser("multipart/form-data")).toBe(true);
  });

  it("does not register @fastify/multipart when options.rest is omitted", async () => {
    fastify = buildBareFastify();
    await fastify.register(plugin, {
      bucket: "options-bucket",
      clientConfig: {},
    });
    await fastify.ready();

    expect(fastify.hasContentTypeParser("multipart/form-data")).toBe(false);
  });

  it("passes the options object to runMigrations", async () => {
    fastify = buildBareFastify();
    await fastify.register(plugin, {
      bucket: "options-bucket",
      clientConfig: {},
      table: { name: "custom_files" },
    });
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        bucket: "options-bucket",
        table: { name: "custom_files" },
      }),
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
