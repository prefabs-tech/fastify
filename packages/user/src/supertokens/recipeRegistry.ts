import type { FastifyInstance } from "fastify";

import type { SupertokensRecipeFactory } from "./types";

// SuperTokens allows exactly one global init(), which happens while
// @prefabs.tech/fastify-user is being registered. Plugins that contribute a
// recipe therefore have to be registered BEFORE it, so the factory is in the
// registry by the time getRecipeList() drains it.
const addSupertokensRecipe = (
  fastify: FastifyInstance,
  factory: SupertokensRecipeFactory,
): void => {
  if (fastify.hasDecorator("supertokensInitialized")) {
    throw new Error(
      "SuperTokens is already initialised. Register SuperTokens recipe plugins before @prefabs.tech/fastify-user.",
    );
  }

  if (!fastify.hasDecorator("supertokensRecipes")) {
    fastify.decorate("supertokensRecipes", []);
  }

  fastify.supertokensRecipes?.push(factory);
};

export default addSupertokensRecipe;
