import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ErrorHandlerOptions } from "../types";

import errorHandlerPlugin, { CustomError } from "../index";
import { FastifyInstance, makeLogSpy } from "./helpers";

describe("errorHandlerPlugin — domainErrorStatusMap", () => {
  let fastify: FastifyInstance;

  afterEach(async () => await fastify.close());

  it("responds with mapped status and masks details when stackTrace is false", async () => {
    fastify = await buildFastify({
      domainErrorStatusMap: { UnprocessableEntityError: 422 },
    });
    fastify.get("/test", async () => {
      const err = new Error("validation failed");
      err.name = "UnprocessableEntityError";
      throw err;
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.statusCode).toBe(422);
    expect(body.message).toBe("Server error, please contact support");
    expect(body.name).toBe("Error");
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error).toBe("Unprocessable Entity");
  });

  it("exposes message and name when stackTrace is true", async () => {
    fastify = await buildFastify({
      domainErrorStatusMap: { UnprocessableEntityError: 422 },
      stackTrace: true,
    });
    fastify.get("/test", async () => {
      const err = new Error("validation failed");
      err.name = "UnprocessableEntityError";
      throw err;
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.message).toBe("validation failed");
    expect(body.name).toBe("UnprocessableEntityError");
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error).toBe("Unprocessable Entity");
  });

  it("masks CustomError like unmapped errors when stackTrace is false", async () => {
    class UnprocessableEntityError extends CustomError {
      constructor(message: string) {
        super(message, "UNPROCESSABLE_ENTITY");
        this.name = "UnprocessableEntityError";
      }
    }

    fastify = await buildFastify({
      domainErrorStatusMap: { UnprocessableEntityError: 422 },
    });
    fastify.get("/test", async () => {
      throw new UnprocessableEntityError("bad");
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.message).toBe(
      "Server has an error that is not handled, please contact support",
    );
    expect(body.name).toBe("Error");
  });

  it("includes CustomError.code when stackTrace is true", async () => {
    class UnprocessableEntityError extends CustomError {
      constructor(message: string) {
        super(message, "UNPROCESSABLE_ENTITY");
        this.name = "UnprocessableEntityError";
      }
    }

    fastify = await buildFastify({
      domainErrorStatusMap: { UnprocessableEntityError: 422 },
      stackTrace: true,
    });
    fastify.get("/test", async () => {
      throw new UnprocessableEntityError("bad");
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe("UNPROCESSABLE_ENTITY");
  });

  it("includes stack when stackTrace is true", async () => {
    fastify = await buildFastify({
      domainErrorStatusMap: { MappedError: 409 },
      stackTrace: true,
    });
    fastify.get("/test", async () => {
      const err = new Error("conflict");
      err.name = "MappedError";
      throw err;
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().stack).toBeDefined();
  });
});

describe("errorHandlerPlugin — domainErrorStatusMap logging", () => {
  let fastify: FastifyInstance;
  let logSpy: ReturnType<typeof makeLogSpy>;

  beforeEach(async () => {
    logSpy = makeLogSpy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastify = Fastify({ loggerInstance: logSpy as any });
    await fastify.register(errorHandlerPlugin, {
      domainErrorStatusMap: {
        ClientErr: 422,
        ServerMapped: 503,
      },
    });
    fastify.get("/422", async () => {
      const err = new Error("x");
      err.name = "ClientErr";
      throw err;
    });
    fastify.get("/503", async () => {
      const err = new Error("y");
      err.name = "ServerMapped";
      throw err;
    });
    await fastify.ready();
    vi.clearAllMocks();
    logSpy.child.mockImplementation(() => logSpy);
  });

  afterEach(async () => await fastify.close());

  it("logs mapped 4xx at info", async () => {
    await fastify.inject({ method: "GET", url: "/422" });
    expect(logSpy.info).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy.error).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it("logs mapped 5xx at error", async () => {
    await fastify.inject({ method: "GET", url: "/503" });
    expect(logSpy.error).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy.info).not.toHaveBeenCalledWith(expect.any(Error));
  });
});

async function buildFastify(
  options: ErrorHandlerOptions,
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });
  await fastify.register(errorHandlerPlugin, options);
  return fastify;
}
