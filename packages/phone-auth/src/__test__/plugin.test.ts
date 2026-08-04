import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import runMigrations from "../migrations/runMigrations";
import plugin from "../plugin";

vi.mock("../migrations/runMigrations", () => ({
  default: vi.fn(),
}));

/**
 * Builds a Fastify instance decorated with everything the phone auth plugin
 * reads. `addSupertokensRecipe` comes from @prefabs.tech/fastify-user and only
 * touches decorators, so no SuperTokens init happens here.
 */
const buildFastify = (
  phoneAuthConfig?: Record<string, unknown>,
): FastifyInstance => {
  const fastify = Fastify({ logger: false });

  fastify.decorate("config", {
    appName: "Test App",
    phoneAuth: phoneAuthConfig,
  });

  fastify.decorate("slonik", {});

  return fastify;
};

describe("phoneAuthPlugin", () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.mocked(runMigrations).mockClear();
  });

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

  it("registers the recipe factory when the phone auth config is absent", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);

    expect(fastify.supertokensRecipes).toHaveLength(1);
  });

  it("registers no recipe factory when enabled === false", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);

    expect(fastify.supertokensRecipes).toBeUndefined();
  });

  it("runs the migration on ready, not during registration", async () => {
    fastify = buildFastify({});
    await fastify.register(plugin);

    expect(runMigrations).not.toHaveBeenCalled();

    await fastify.ready();

    expect(runMigrations).toHaveBeenCalledWith(fastify.config, fastify.slonik);
  });

  it("runs no migration when enabled === false", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrations).not.toHaveBeenCalled();
  });

  it("throws when registered after SuperTokens has already been initialised", async () => {
    fastify = buildFastify({});
    fastify.decorate("supertokensInitialized", true);

    await expect(fastify.register(plugin)).rejects.toThrow(
      /Register SuperTokens recipe plugins before @prefabs.tech\/fastify-user/,
    );
  });
});
