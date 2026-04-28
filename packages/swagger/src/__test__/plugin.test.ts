import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import swaggerPlugin from "../plugin";

describe("swagger plugin", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("registers successfully with minimal required options", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
    });
    await expect(fastify.ready()).resolves.toBeDefined();
  });

  it("decorates instance with default documentation path when uiOptions not provided", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
    });
    await fastify.ready();

    expect(fastify.swaggerUIRoutePrefix).toBe("/documentation");
    expect(fastify.apiDocumentationPath).toBe("/documentation");
  });

  it("decorates instance with custom routePrefix from uiOptions", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
      uiOptions: { routePrefix: "/api-docs" },
    });
    await fastify.ready();

    expect(fastify.swaggerUIRoutePrefix).toBe("/api-docs");
    expect(fastify.apiDocumentationPath).toBe("/api-docs");
  });

  it("uses default documentation path when uiOptions is an empty object", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
      uiOptions: {},
    });
    await fastify.ready();

    expect(fastify.swaggerUIRoutePrefix).toBe("/documentation");
    expect(fastify.apiDocumentationPath).toBe("/documentation");
  });

  it("serves swagger spec JSON at custom uiOptions.routePrefix", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
      uiOptions: { routePrefix: "/api-docs" },
    });
    await fastify.ready();

    const response = await fastify.inject({
      method: "GET",
      url: "/api-docs/json",
    });

    expect(response.statusCode).toBe(200);
  });

  it("skips registration when enabled is false", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      enabled: false,
      fastifySwaggerOptions: { openapi: {} },
    });
    await fastify.ready();

    expect(fastify.swaggerUIRoutePrefix).toBeUndefined();
    expect(fastify.apiDocumentationPath).toBeUndefined();
    expect(fastify.swagger).toBeUndefined();

    const response = await fastify.inject({
      method: "GET",
      url: "/documentation/json",
    });
    expect(response.statusCode).toBe(404);
  });

  it("registers when enabled is explicitly true", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      enabled: true,
      fastifySwaggerOptions: { openapi: {} },
    });
    await fastify.ready();

    expect(fastify.swaggerUIRoutePrefix).toBe("/documentation");
  });

  it("registers when enabled is undefined (default behavior)", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
    });
    await fastify.ready();

    expect(fastify.swaggerUIRoutePrefix).toBe("/documentation");
  });

  it("passes uiOptions through to swagger-ui (serves UI route)", async () => {
    fastify = Fastify();
    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: { openapi: {} },
    });
    await fastify.ready();

    const response = await fastify.inject({
      method: "GET",
      url: "/documentation/json",
    });

    expect(response.statusCode).toBe(200);
  });

  it("passes fastifySwaggerOptions through (generates spec)", async () => {
    fastify = Fastify();

    fastify.get(
      "/test",
      {
        schema: {
          response: {
            200: { properties: { ok: { type: "boolean" } }, type: "object" },
          },
        },
      },
      async () => ({ ok: true }),
    );

    await fastify.register(swaggerPlugin, {
      fastifySwaggerOptions: {
        openapi: {
          info: { title: "Test API", version: "1.0.0" },
        },
      },
    });
    await fastify.ready();

    const spec = fastify.swagger();
    expect(spec.info.title).toBe("Test API");
    expect(spec.info.version).toBe("1.0.0");
  });
});
