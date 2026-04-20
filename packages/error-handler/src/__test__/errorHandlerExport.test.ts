/* istanbul ignore file */
import fastifySensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { errorHandler } from "../index";

describe("errorHandler — standalone export", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("handles errors the same way as the plugin when wired with sensible and stackTrace", async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("stackTrace", false);
    await fastify.register(fastifySensible);
    fastify.setErrorHandler((err, request, reply) => {
      errorHandler(err, request, reply);
    });
    fastify.get("/boom", async () => {
      throw new Error("internal detail");
    });
    await fastify.ready();

    const res = await fastify.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe("Server error, please contact support");
    expect(res.json().code).toBe("INTERNAL_SERVER_ERROR");
  });
});
