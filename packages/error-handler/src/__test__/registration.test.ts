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

  it("accepts stackTrace option without decorating fastify", async () => {
    const fastify = await buildFastify({ stackTrace: true });
    await fastify.ready();
    expect("stackTrace" in fastify).toBe(false);
    await fastify.close();
  });

  it("accepts domainErrorStatusMap option without decorating fastify", async () => {
    const fastify = await buildFastify({
      domainErrorStatusMap: new Map([["FooError", 418]]),
    });
    await fastify.ready();
    expect("domainErrorStatusMap" in fastify).toBe(false);
    await fastify.close();
  });

  it("throws when domainErrorStatusMap has invalid HTTP status", async () => {
    const fastify = Fastify({ logger: false });
    await expect(
      fastify.register(errorHandlerPlugin, {
        domainErrorStatusMap: new Map([["Bad", 99]]),
      }),
    ).rejects.toThrow(/domainErrorStatusMap/);
    await fastify.close();
  });

  it("throws when domainErrorStatusMap status is not an integer", async () => {
    const fastify = Fastify({ logger: false });
    await expect(
      fastify.register(errorHandlerPlugin, {
        domainErrorStatusMap: new Map([["Bad", 422.5]]),
      }),
    ).rejects.toThrow(/domainErrorStatusMap/);
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
