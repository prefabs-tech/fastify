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
