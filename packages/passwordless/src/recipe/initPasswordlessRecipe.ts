import type { FastifyInstance } from "fastify";

import Passwordless from "supertokens-node/recipe/passwordless";

import getPasswordlessRecipeConfig from "./config";

const initPasswordlessRecipe = (fastify: FastifyInstance) => {
  const recipe = fastify.config.passwordless?.recipe;

  if (typeof recipe === "function") {
    return Passwordless.init(recipe(fastify));
  }

  return Passwordless.init(getPasswordlessRecipeConfig(fastify));
};

export default initPasswordlessRecipe;
