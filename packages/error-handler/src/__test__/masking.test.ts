/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import errorHandlerPlugin, { CustomError } from "../index";
import { buildFastify, FastifyInstance, makeLogSpy } from "./helpers";

describe("errorHandlerPlugin — exact masked messages (stackTrace: false)", () => {
  it("plain Error message is replaced with generic safe message", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw new Error("secret details here");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().message).toBe("Server error, please contact support");
    await fastify.close();
  });

  it("CustomError message is replaced with a distinct safe message", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw new CustomError("secret internal state", "MY_CODE");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().message).toBe(
      "Server has an error that is not handled, please contact support",
    );
    await fastify.close();
  });
});

describe("errorHandlerPlugin — unknown error normalization", () => {
  it("coerces a thrown non-Error value into a 500 response", async () => {
    const fastify = await buildFastify();
    fastify.get("/test", async () => {
      throw undefined;
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(500);
    await fastify.close();
  });
});

describe("errorHandlerPlugin — non-HttpError logging", () => {
  let fastify: FastifyInstance;
  let logSpy: ReturnType<typeof makeLogSpy>;

  beforeEach(async () => {
    logSpy = makeLogSpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastify = Fastify({ loggerInstance: logSpy as any });
    await fastify.register(errorHandlerPlugin, {});
    fastify.get("/test", async () => {
      throw new Error("unexpected crash");
    });
    await fastify.ready();
    vi.clearAllMocks();
    logSpy.child.mockImplementation(() => logSpy);
  });

  afterEach(async () => await fastify.close());

  it("plain Error is always logged at error level regardless of stackTrace setting", async () => {
    await fastify.inject({ method: "GET", url: "/test" });
    expect(logSpy.error).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy.info).not.toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("errorHandlerPlugin — stack trace gated on error.stack presence", () => {
  it("omits stack field when error has no .stack property, even with stackTrace: true", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      const err = new Error("no stack");
      delete err.stack;
      throw err;
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().stack).toBeUndefined();
    await fastify.close();
  });
});
