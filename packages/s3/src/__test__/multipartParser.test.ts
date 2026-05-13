import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

// processMultipartFormData is our code — mock it to avoid real busboy parsing
// in unit tests, and to prevent the double-done side effect in source code.
vi.mock("../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return {
    ...actual,
    processMultipartFormData: vi.fn(
      (_req: unknown, _payload: unknown, done: (err: null) => void) =>
        /* slonik returns null so we allow it here */ /* eslint-disable-next-line unicorn/no-null */
        done(null),
    ),
  };
});

const buildFastify = (graphqlConfig?: { enabled: boolean; path: string }) => {
  const instance = Fastify({ logger: false });
  instance.addHook("onRequest", async (req) => {
    (req as unknown as { config: unknown }).config = graphqlConfig
      ? { graphql: graphqlConfig }
      : {};
  });
  return instance;
};

describe("multipartParserPlugin", () => {
  let fastify: FastifyInstance;

  afterEach(async () => fastify.close());

  it("does not return 415 for unknown content types after registration", async () => {
    fastify = buildFastify();
    const { default: plugin } = await import("../plugins/multipartParser");
    await fastify.register(plugin);

    fastify.post("/test", async () => ({}));
    await fastify.ready();

    // Without the * catch-all parser, Fastify returns 415 for unrecognised content types.
    // With it registered, the request reaches the route handler normally.
    const response = await fastify.inject({
      headers: { "content-type": "text/csv" },
      method: "POST",
      payload: "a,b,c",
      url: "/test",
    });

    expect(response.statusCode).not.toBe(415);
  });

  it("sets graphqlFileUploadMultipart on the request for multipart requests to the graphql path", async () => {
    fastify = buildFastify({ enabled: true, path: "/graphql" });
    const { default: plugin } = await import("../plugins/multipartParser");
    await fastify.register(plugin);

    let capturedFlag: boolean | undefined;
    fastify.post("/graphql", async (req) => {
      capturedFlag = req.graphqlFileUploadMultipart;
      return {};
    });

    await fastify.ready();

    await fastify.inject({
      headers: { "content-type": "multipart/form-data; boundary=----abc" },
      method: "POST",
      payload: "------abc--\r\n",
      url: "/graphql",
    });

    expect(capturedFlag).toBe(true);
  });

  it("does not set graphqlFileUploadMultipart for multipart requests outside the graphql path", async () => {
    const { processMultipartFormData } = await import("../utils");

    fastify = buildFastify({ enabled: true, path: "/graphql" });
    const { default: plugin } = await import("../plugins/multipartParser");
    await fastify.register(plugin);

    let capturedFlag: boolean | undefined;
    fastify.post("/upload", async (req) => {
      capturedFlag = req.graphqlFileUploadMultipart;
      return {};
    });

    await fastify.ready();

    await fastify.inject({
      headers: { "content-type": "multipart/form-data; boundary=----abc" },
      method: "POST",
      payload: "------abc--\r\n",
      url: "/upload",
    });

    expect(capturedFlag).toBeUndefined();
    expect(processMultipartFormData).toHaveBeenCalled();
  });

  it("does not set graphqlFileUploadMultipart when graphql is disabled", async () => {
    fastify = buildFastify({ enabled: false, path: "/graphql" });
    const { default: plugin } = await import("../plugins/multipartParser");
    await fastify.register(plugin);

    let capturedFlag: boolean | undefined;
    fastify.post("/graphql", async (req) => {
      capturedFlag = req.graphqlFileUploadMultipart;
      return {};
    });

    await fastify.ready();

    await fastify.inject({
      headers: { "content-type": "multipart/form-data; boundary=----abc" },
      method: "POST",
      payload: "------abc--\r\n",
      url: "/graphql",
    });

    expect(capturedFlag).toBeUndefined();
  });
});
