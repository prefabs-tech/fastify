import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

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
});
