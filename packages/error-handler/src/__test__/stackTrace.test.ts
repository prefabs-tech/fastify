/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import { buildFastify } from "./helpers";

describe("errorHandlerPlugin — stack trace option", () => {
  it("omits stack from response when stackTrace: false", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw fastify.httpErrors.internalServerError("boom");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().stack).toBeUndefined();
    await fastify.close();
  });

  it("includes stack array in response when stackTrace: true (5xx)", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw fastify.httpErrors.internalServerError("boom");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(Array.isArray(res.json().stack)).toBe(true);
    expect(res.json().stack.length).toBeGreaterThan(0);
    await fastify.close();
  });

  it("includes stack array in response when stackTrace: true (4xx)", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw fastify.httpErrors.badRequest("bad");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(Array.isArray(res.json().stack)).toBe(true);
    await fastify.close();
  });

  it("each stack entry has file and line information", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw fastify.httpErrors.internalServerError("boom");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().stack[0]).toHaveProperty("line");
    await fastify.close();
  });
});
