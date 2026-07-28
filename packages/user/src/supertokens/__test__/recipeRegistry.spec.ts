import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import addSupertokensRecipe from "../recipeRegistry";

// The individual recipe inits reach SuperTokens' global singleton; the registry
// itself is what is under test, so they are stubbed out.
vi.mock("../recipes/initSessionRecipe", () => ({ default: () => "session" }));
vi.mock("../recipes/initThirdPartyEmailPasswordRecipe", () => ({
  default: () => "thirdPartyEmailPassword",
}));
vi.mock("../recipes/initUserRolesRecipe", () => ({
  default: () => "userRoles",
}));
vi.mock("../recipes/initEmailVerificationRecipe", () => ({
  default: () => "emailVerification",
}));

const { default: getRecipeList } = await import("../recipes");

const buildFastify = (): FastifyInstance => {
  const fastify = Fastify({ logger: false });

  fastify.decorate("config", { user: { supertokens: {} } });

  return fastify;
};

describe("addSupertokensRecipe", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("creates the registry on first use", () => {
    fastify = buildFastify();

    addSupertokensRecipe(fastify, () => "passwordless");

    expect(fastify.supertokensRecipes).toHaveLength(1);
  });

  it("appends to an existing registry", () => {
    fastify = buildFastify();

    addSupertokensRecipe(fastify, () => "one");
    addSupertokensRecipe(fastify, () => "two");

    expect(fastify.supertokensRecipes).toHaveLength(2);
  });

  it("throws when SuperTokens has already been initialised", () => {
    fastify = buildFastify();
    fastify.decorate("supertokensInitialized", true);

    expect(() => addSupertokensRecipe(fastify, () => "late")).toThrow(
      /Register SuperTokens recipe plugins before @prefabs.tech\/fastify-user/,
    );
  });
});

describe("getRecipeList", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("returns the always-on recipes when the registry is empty", () => {
    fastify = buildFastify();

    expect(getRecipeList(fastify)).toStrictEqual([
      "session",
      "thirdPartyEmailPassword",
      "userRoles",
    ]);
  });

  it("drains registered recipe factories", () => {
    fastify = buildFastify();

    addSupertokensRecipe(fastify, () => "passwordless");

    expect(getRecipeList(fastify)).toContain("passwordless");
  });

  it("passes the fastify instance to each registered factory", () => {
    fastify = buildFastify();

    const factory = vi.fn(() => "passwordless");

    addSupertokensRecipe(fastify, factory);
    getRecipeList(fastify);

    // Identity check rather than toHaveBeenCalledWith: deep-equalling a Fastify
    // instance touches getters that throw before the server is listening.
    expect(factory.mock.calls[0][0]).toBe(fastify);
  });
});
