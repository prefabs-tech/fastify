import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import plugin from "../plugin";

vi.mock("../migrations/runMigrations", () => ({
  default: vi.fn(),
}));

// Stands in for the decorator mercurius adds; mercurius itself is not a
// dependency of this package.
const buildGraphqlDecorator = (userTypeExists: boolean) => ({
  extendSchema: vi.fn(),
  schema: { getType: vi.fn(() => (userTypeExists ? {} : undefined)) },
});

const buildFastify = (
  graphql?: ReturnType<typeof buildGraphqlDecorator>,
): FastifyInstance => {
  const fastify = Fastify({ logger: false });

  fastify.decorate("config", { appName: "Test App", phoneAuth: {} });
  fastify.decorate("slonik", {});

  if (graphql) {
    fastify.decorate(
      "graphql",
      graphql as unknown as FastifyInstance["graphql"],
    );
  }

  return fastify;
};

describe("extendUserSchema", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("adds phoneNumber to the User type when the schema defines it", async () => {
    const graphql = buildGraphqlDecorator(true);
    fastify = buildFastify(graphql);

    await fastify.register(plugin);
    await fastify.ready();

    expect(graphql.schema.getType).toHaveBeenCalledWith("User");
    expect(graphql.extendSchema).toHaveBeenCalledTimes(1);
    expect(graphql.extendSchema.mock.calls[0][0]).toContain("extend type User");
    expect(graphql.extendSchema.mock.calls[0][0]).toContain(
      "phoneNumber: String",
    );
  });

  it("does not extend the schema when the User type is absent", async () => {
    const graphql = buildGraphqlDecorator(false);
    fastify = buildFastify(graphql);

    await fastify.register(plugin);
    await fastify.ready();

    expect(graphql.extendSchema).not.toHaveBeenCalled();
  });

  it("does not extend the schema when mercurius is not registered", async () => {
    fastify = buildFastify();

    await fastify.register(plugin);

    await expect(fastify.ready()).resolves.toBeDefined();
  });
});
