/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import errorHandlerPlugin, { CustomError } from "../index";
import { buildFastify, FastifyInstance } from "./helpers";

class DomainError extends CustomError {
  constructor(message: string) {
    super(message, "DOMAIN_ERROR");
    this.name = "DOMAIN_ERROR";
  }
}

describe("errorHandlerPlugin — requestId in error responses", () => {
  let fastify: FastifyInstance;

  afterEach(async () => await fastify.close());

  it("HttpError responses carry the request id", async () => {
    fastify = await buildFastify();
    fastify.get("/not-found", async () => {
      throw fastify.httpErrors.notFound("User not found");
    });

    const res = await fastify.inject({ method: "GET", url: "/not-found" });

    expect(res.statusCode).toBe(404);
    expect(res.json().requestId).toBe("req-1");
  });

  it("domain-mapped error responses carry the request id", async () => {
    fastify = await buildFastify({
      domainErrorStatusMap: new Map([["DOMAIN_ERROR", 404]]),
    });
    fastify.get("/domain", async () => {
      throw new DomainError("not found");
    });

    const res = await fastify.inject({ method: "GET", url: "/domain" });

    expect(res.statusCode).toBe(404);
    expect(res.json().requestId).toBe("req-1");
  });

  it("unhandled 500 responses carry the request id", async () => {
    fastify = await buildFastify({ stackTrace: false });
    fastify.get("/boom", async () => {
      throw new Error("secret");
    });

    const res = await fastify.inject({ method: "GET", url: "/boom" });

    expect(res.statusCode).toBe(500);
    expect(res.json().requestId).toBe("req-1");
  });

  it("echoes the id supplied via the configured request-id header", async () => {
    // The load balancer (or client) sets the request id; the error response
    // must quote the same id so the failure can be found in the logs.
    fastify = Fastify({ logger: false, requestIdHeader: "x-request-id" });
    await fastify.register(errorHandlerPlugin, {});
    fastify.get("/boom", async () => {
      throw new Error("secret");
    });

    const res = await fastify.inject({
      headers: { "x-request-id": "lb-trace-42" },
      method: "GET",
      url: "/boom",
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().requestId).toBe("lb-trace-42");
  });
});
