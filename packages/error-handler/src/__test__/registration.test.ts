/* istanbul ignore file */
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import errorHandlerPlugin from "../index";
import { buildFastify } from "./helpers";

describe("errorHandlerPlugin — registration", () => {
  it("registers without throwing", async () => {
    const fastify = Fastify({ logger: false });
    await expect(
      fastify.register(errorHandlerPlugin, {}),
    ).resolves.not.toThrow();
    await fastify.close();
  });

  it("decorates fastify with stackTrace: false by default", async () => {
    const fastify = await buildFastify();
    await fastify.ready();
    expect(fastify.stackTrace).toBe(false);
    await fastify.close();
  });

  it("decorates fastify with stackTrace: true when option is set", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    await fastify.ready();
    expect(fastify.stackTrace).toBe(true);
    await fastify.close();
  });

  it("registers the ErrorResponse JSON schema", async () => {
    const fastify = await buildFastify();
    await fastify.ready();
    expect(fastify.getSchema("ErrorResponse")).toBeDefined();
    await fastify.close();
  });

  it("registers @fastify/sensible helpers on the fastify instance", async () => {
    const fastify = await buildFastify();
    await fastify.ready();
    expect(fastify.httpErrors).toBeDefined();
    expect(typeof fastify.httpErrors.badRequest).toBe("function");
    await fastify.close();
  });
});
