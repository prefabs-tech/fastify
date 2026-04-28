/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import errorHandlerPlugin from "../index";
import { FastifyInstance, makeLogSpy } from "./helpers";

describe("errorHandlerPlugin — error logging", () => {
  let fastify: FastifyInstance;
  let logSpy: ReturnType<typeof makeLogSpy>;

  beforeEach(async () => {
    logSpy = makeLogSpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastify = Fastify({ loggerInstance: logSpy as any });
    await fastify.register(errorHandlerPlugin, {});

    fastify.get("/4xx", async () => {
      throw fastify.httpErrors.badRequest("bad input");
    });
    fastify.get("/5xx", async () => {
      throw fastify.httpErrors.internalServerError("server error");
    });
    fastify.get("/3xx", async () => {
      const error = new Error("redirect error") as {
        statusCode: number;
      } & Error;
      error.statusCode = 302;
      Object.setPrototypeOf(
        error,
        fastify.httpErrors.internalServerError().constructor.prototype,
      );
      throw error;
    });

    await fastify.ready();
    vi.clearAllMocks();
    logSpy.child.mockImplementation(() => logSpy);
  });

  afterEach(async () => await fastify.close());

  it("logs 4xx errors at info level", async () => {
    await fastify.inject({ method: "GET", url: "/4xx" });
    expect(logSpy.info).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy.error).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it("logs 5xx errors at error level", async () => {
    await fastify.inject({ method: "GET", url: "/5xx" });
    expect(logSpy.error).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy.info).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it("logs sub-400 HTTP errors at error level", async () => {
    await fastify.inject({ method: "GET", url: "/3xx" });
    expect(logSpy.error).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy.info).not.toHaveBeenCalledWith(expect.any(Error));
  });
});
