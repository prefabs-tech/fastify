import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import graphqlPlugin from "../plugin";

const schema = `
  type Query {
    ping: String
  }
`;

const resolvers = {
  Query: {
    ping: async () => "pong",
  },
};

describe("graphqlPlugin — conditional registration", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("registers the /graphql route when enabled is true", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlPlugin, { enabled: true, resolvers, schema });
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ query: "{ ping }" }),
      url: "/graphql",
    });

    expect(response.statusCode).toBe(200);
  });

  it("does not register /graphql route when enabled is false", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlPlugin, {
      enabled: false,
      resolvers,
      schema,
    });
    await fastify.ready();

    const response = await fastify.inject({
      method: "POST",
      url: "/graphql",
    });

    expect(response.statusCode).toBe(404);
  });

  it("does not register /graphql when enabled is omitted", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlPlugin, { resolvers, schema });
    await fastify.ready();

    const response = await fastify.inject({
      method: "POST",
      url: "/graphql",
    });

    expect(response.statusCode).toBe(404);
  });

  it("uses caller-provided context instead of the default factory when both are applicable", async () => {
    fastify = Fastify({ logger: false });
    const customSchema = `
      type Query {
        source: String
      }
    `;
    const customResolvers = {
      Query: {
        source: async (_: unknown, __: unknown, context: unknown) =>
          (context as { source: string }).source,
      },
    };

    await fastify.register(graphqlPlugin, {
      context: async () => ({ source: "custom-context" }),
      enabled: true,
      resolvers: customResolvers,
      schema: customSchema,
    });
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ query: "{ source }" }),
      url: "/graphql",
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data.source).toBe("custom-context");
  });

  it("injects config, database, and dbSchema from the request into Mercurius context by default", async () => {
    fastify = Fastify({ logger: false });
    const dumpSchema = `
      type Query {
        dump: String
      }
    `;
    const dumpResolvers = {
      Query: {
        dump: async (_: unknown, __: unknown, context: unknown) =>
          JSON.stringify({
            config: (context as { config: { marker: string } }).config.marker,
            database: (context as { database: { marker: string } }).database
              .marker,
            dbSchema: (context as { dbSchema: string }).dbSchema,
          }),
      },
    };

    fastify.addHook("onRequest", async (request) => {
      request.config = { marker: "cfg" } as unknown as typeof request.config;
      request.slonik = { marker: "db" } as unknown as typeof request.slonik;
      request.dbSchema = "app_schema";
    });

    await fastify.register(graphqlPlugin, {
      enabled: true,
      resolvers: dumpResolvers,
      schema: dumpSchema,
    });
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ query: "{ dump }" }),
      url: "/graphql",
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).data.dump).toBe(
      JSON.stringify({
        config: "cfg",
        database: "db",
        dbSchema: "app_schema",
      }),
    );
  });
});

describe("graphqlPlugin — config fallback", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("reads options from fastify.config.graphql when no options are passed directly", async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      graphql: { enabled: false, resolvers, schema },
    } as unknown as ApiConfig);

    await fastify.register(graphqlPlugin);
    await fastify.ready();

    // enabled: false in the fallback config means mercurius was not mounted
    const response = await fastify.inject({ method: "POST", url: "/graphql" });
    expect(response.statusCode).toBe(404);
  });

  it("throws when no options are passed and fastify.config.graphql is undefined", async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {} as unknown as ApiConfig);

    const start = async () => {
      await fastify.register(graphqlPlugin);
      await fastify.ready();
    };

    await expect(start()).rejects.toThrow("Missing graphql configuration");
  });

  it("logs a warning when falling back to fastify.config.graphql", async () => {
    fastify = Fastify({ logger: false });
    const warn = vi.spyOn(fastify.log, "warn").mockImplementation(() => {});
    fastify.decorate("config", {
      graphql: { enabled: false, resolvers, schema },
    } as unknown as ApiConfig);

    await fastify.register(graphqlPlugin);
    await fastify.ready();

    expect(warn).toHaveBeenCalled();
    const warnedWithRecommendation = warn.mock.calls.some((call) =>
      call.some(
        (argument) =>
          typeof argument === "string" &&
          argument.includes("passing graphql options directly"),
      ),
    );
    expect(warnedWithRecommendation).toBe(true);
  });
});

describe("graphqlPlugin — registration logging", () => {
  let fastify!: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("logs that GraphQL is disabled when enabled is false", async () => {
    fastify = Fastify({ logger: false });
    const info = vi.spyOn(fastify.log, "info").mockImplementation(() => {});

    await fastify.register(graphqlPlugin, {
      enabled: false,
      resolvers,
      schema,
    });
    await fastify.ready();

    const loggedDisabled = info.mock.calls.some((call) =>
      call.some(
        (argument) =>
          typeof argument === "string" &&
          argument.includes("GraphQL API not enabled"),
      ),
    );
    expect(loggedDisabled).toBe(true);
  });
});
