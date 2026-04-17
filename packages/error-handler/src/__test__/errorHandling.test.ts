/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import { CustomError } from "../index";
import { buildFastify } from "./helpers";

describe("errorHandlerPlugin — CustomError handling", () => {
  it("responds with 500 for CustomError", async () => {
    const fastify = await buildFastify();
    fastify.get("/test", async () => {
      throw new CustomError("internal failure", "MY_CODE");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(500);
    await fastify.close();
  });

  it("sanitizes message in response when stackTrace: false", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw new CustomError("secret DB credentials leaked", "MY_CODE");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().message).not.toContain("secret DB credentials");
    await fastify.close();
  });

  it("sanitizes code and name in response when stackTrace: false", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw new CustomError("some error", "MY_ERROR_CODE");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.json().name).toBe("Error");
    await fastify.close();
  });

  it("includes code in response when stackTrace: true", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw new CustomError("some error", "MY_ERROR_CODE");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().code).toBe("MY_ERROR_CODE");
    await fastify.close();
  });

  it("uses INTERNAL_SERVER_ERROR for CustomError when no code is set and stackTrace: true", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw new CustomError("some error");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().code).toBe("INTERNAL_SERVER_ERROR");
    await fastify.close();
  });

  it("includes name in response when stackTrace: true", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw new CustomError("some error", "CODE");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().name).toBe("CustomError");
    await fastify.close();
  });

  it("CustomError subclass is handled the same way", async () => {
    class DatabaseError extends CustomError {
      constructor(message: string) {
        super(message, "DATABASE_ERROR");
      }
    }

    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw new DatabaseError("connection timeout");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(500);
    expect(res.json().code).toBe("DATABASE_ERROR");
    expect(res.json().name).toBe("DatabaseError");
    await fastify.close();
  });
});

describe("errorHandlerPlugin — unknown error handling", () => {
  it("responds with 500 for a plain Error", async () => {
    const fastify = await buildFastify();
    fastify.get("/test", async () => {
      throw new Error("unexpected crash");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(500);
    await fastify.close();
  });

  it("sanitizes the message for plain Error when stackTrace: false", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw new Error("secret internal detail");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().message).not.toContain("secret internal detail");
    await fastify.close();
  });

  it("sanitizes code and name for plain Error when stackTrace: false", async () => {
    const fastify = await buildFastify({ stackTrace: false });
    fastify.get("/test", async () => {
      throw new Error("unexpected crash");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.json().name).toBe("Error");
    await fastify.close();
  });

  it("includes stack and original message when stackTrace: true", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    fastify.get("/test", async () => {
      throw new Error("raw error message");
    });
    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().message).toBe("raw error message");
    expect(Array.isArray(res.json().stack)).toBe(true);
    await fastify.close();
  });
});
