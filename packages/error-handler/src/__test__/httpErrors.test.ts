/* istanbul ignore file */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildFastify, FastifyInstance } from "./helpers";

describe("errorHandlerPlugin — HTTP error methods", () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = await buildFastify();
    fastify.get("/400", async () => {
      throw fastify.httpErrors.badRequest("Invalid input");
    });
    fastify.get("/500", async () => {
      throw fastify.httpErrors.internalServerError("Something went wrong");
    });
  });

  afterEach(async () => await fastify.close());

  it("badRequest → 400", async () => {
    const res = await fastify.inject({ method: "GET", url: "/400" });
    expect(res.statusCode).toBe(400);
  });

  it("internalServerError → 500", async () => {
    const res = await fastify.inject({ method: "GET", url: "/500" });
    expect(res.statusCode).toBe(500);
  });
});

describe("errorHandlerPlugin — error response structure", () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = await buildFastify();
    fastify.get("/not-found", async () => {
      throw fastify.httpErrors.notFound("User not found");
    });
  });

  afterEach(async () => await fastify.close());

  it("includes statusCode in the response body", async () => {
    const res = await fastify.inject({ method: "GET", url: "/not-found" });
    expect(res.json().statusCode).toBe(404);
  });

  it("includes message in the response body", async () => {
    const res = await fastify.inject({ method: "GET", url: "/not-found" });
    expect(res.json().message).toBe("User not found");
  });

  it("includes name in the response body", async () => {
    const res = await fastify.inject({ method: "GET", url: "/not-found" });
    expect(typeof res.json().name).toBe("string");
    expect(res.json().name.length).toBeGreaterThan(0);
  });

  it("includes error (HTTP status text) in the response body", async () => {
    const res = await fastify.inject({ method: "GET", url: "/not-found" });
    expect(res.json().error).toBe("Not Found");
  });

  it("code is absent for standard httpErrors helpers", async () => {
    // @fastify/sensible v6 does NOT auto-populate .code on its helpers.
    // Code only appears when the HttpError has an explicit .code set.
    const res = await fastify.inject({ method: "GET", url: "/not-found" });
    expect(res.json().code).toBeUndefined();
  });

  it("does not include stack by default (stackTrace: false)", async () => {
    const res = await fastify.inject({ method: "GET", url: "/not-found" });
    expect(res.json().stack).toBeUndefined();
  });
});
