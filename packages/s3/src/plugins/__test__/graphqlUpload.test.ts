import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

describe("graphqlUpload plugin", () => {
  let fastify: FastifyInstance;

  afterEach(async () => fastify.close());

  it("does not modify request body when graphqlFileUploadMultipart is not set", async () => {
    fastify = Fastify({ logger: false });
    const { default: plugin } = await import("../graphqlUpload");
    await fastify.register(plugin);

    let capturedBody: unknown;
    fastify.post("/test", async (req) => {
      capturedBody = req.body;
      return {};
    });

    await fastify.ready();

    await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ original: true }),
      url: "/test",
    });

    expect(capturedBody).toEqual({ original: true });
  });

  it("does not modify request body when graphqlFileUploadMultipart is explicitly false", async () => {
    fastify = Fastify({ logger: false });
    const { default: plugin } = await import("../graphqlUpload");
    await fastify.register(plugin);

    fastify.addHook("onRequest", async (req) => {
      req.graphqlFileUploadMultipart = false;
    });

    let capturedBody: unknown;
    fastify.post("/test", async (req) => {
      capturedBody = req.body;
      return {};
    });

    await fastify.ready();

    await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ original: true }),
      url: "/test",
    });

    expect(capturedBody).toEqual({ original: true });
  });
});
