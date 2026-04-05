/* istanbul ignore file */
import { describe, expect, it, vi } from "vitest";

import { buildFastify } from "./helpers";

describe("errorHandlerPlugin — preErrorHandler", () => {
  it("is called before the default error handler", async () => {
    const preErrorHandler = vi.fn();
    const fastify = await buildFastify({ preErrorHandler });

    fastify.get("/test", async () => {
      throw fastify.httpErrors.notFound("missing");
    });

    await fastify.inject({ method: "GET", url: "/test" });

    expect(preErrorHandler).toHaveBeenCalledOnce();
    await fastify.close();
  });

  it("receives error, request, and reply as arguments", async () => {
    let capturedArguments: unknown[] = [];

    const fastify = await buildFastify({
      preErrorHandler: async (error, request, reply) => {
        capturedArguments = [error, request, reply];
      },
    });

    fastify.get("/test", async () => {
      throw fastify.httpErrors.badRequest("bad");
    });

    await fastify.inject({ method: "GET", url: "/test" });

    expect(capturedArguments[0]).toBeInstanceOf(Error);
    expect(capturedArguments[1]).toHaveProperty("method");
    expect(capturedArguments[2]).toHaveProperty("send");
    await fastify.close();
  });

  it("skips default handler when preErrorHandler sends the reply", async () => {
    const customPayload = { custom: "handled" };

    const fastify = await buildFastify({
      preErrorHandler: async (_error, _request, reply) => {
        await reply.code(200).send(customPayload);
      },
    });

    fastify.get("/test", async () => {
      throw fastify.httpErrors.internalServerError("boom");
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(customPayload);
    await fastify.close();
  });

  it("falls through to the default handler when preErrorHandler throws", async () => {
    const fastify = await buildFastify({
      preErrorHandler: async () => {
        throw new Error("preErrorHandler crashed");
      },
    });

    fastify.get("/test", async () => {
      throw fastify.httpErrors.badRequest("bad input");
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe("bad input");
    await fastify.close();
  });

  it("default handler still runs when preErrorHandler does nothing", async () => {
    const fastify = await buildFastify({
      preErrorHandler: async () => {
        // intentionally empty
      },
    });

    fastify.get("/test", async () => {
      throw fastify.httpErrors.notFound("missing resource");
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe("missing resource");
    await fastify.close();
  });
});
