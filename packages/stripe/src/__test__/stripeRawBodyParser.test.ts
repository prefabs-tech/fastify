import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { registerRawBodyParser } from "../utils";

describe("registerRawBodyParser", () => {
  let fastify: ReturnType<typeof Fastify>;

  afterEach(async () => {
    await fastify.close();
  });

  it("stores the raw JSON body on request.rawBody and parses the body", async () => {
    fastify = Fastify({ logger: false });
    registerRawBodyParser(fastify);
    fastify.post("/parse", async (request) => ({
      body: request.body,
      hadRawBody: request.rawBody !== undefined,
    }));

    await fastify.ready();

    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: { answer: 42 },
      url: "/parse",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      body: { answer: 42 },
      hadRawBody: true,
    });
  });

  it("responds with an error when JSON is invalid", async () => {
    fastify = Fastify({ logger: false });
    registerRawBodyParser(fastify);
    fastify.post("/parse", async () => ({ ok: true }));

    await fastify.ready();

    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: "{not-json",
      url: "/parse",
    });

    expect(res.statusCode).toBe(500);
  });
});
