import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import plugin from "../plugin";

/**
 * Builds a Fastify instance decorated with everything the passwordless plugin
 * reads. `addSupertokensRecipe` comes from @prefabs.tech/fastify-user and only
 * touches decorators, so no SuperTokens init happens here.
 */
const buildFastify = (
  passwordlessConfig?: Record<string, unknown>,
): FastifyInstance => {
  const fastify = Fastify({ logger: false });

  fastify.decorate("config", {
    appName: "Test App",
    passwordless: passwordlessConfig,
  });

  return fastify;
};

describe("passwordlessPlugin", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("registers the recipe factory when enabled is undefined", async () => {
    fastify = buildFastify({});
    await fastify.register(plugin);

    expect(fastify.supertokensRecipes).toHaveLength(1);
  });

  it("registers the recipe factory when enabled is true", async () => {
    fastify = buildFastify({ enabled: true });
    await fastify.register(plugin);

    expect(fastify.supertokensRecipes).toHaveLength(1);
  });

  it("registers the recipe factory when the passwordless config is absent", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);

    expect(fastify.supertokensRecipes).toHaveLength(1);
  });

  it("registers no recipe factory when enabled === false", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);

    expect(fastify.supertokensRecipes).toBeUndefined();
  });

  it("throws when registered after SuperTokens has already been initialised", async () => {
    fastify = buildFastify({});
    fastify.decorate("supertokensInitialized", true);

    await expect(fastify.register(plugin)).rejects.toThrow(
      /Register SuperTokens recipe plugins before @prefabs.tech\/fastify-user/,
    );
  });
});
