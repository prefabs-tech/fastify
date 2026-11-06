import type { FastifyInstance } from "fastify";

import UserRoles from "supertokens-node/recipe/userroles/index.js";

import type { SupertokensRecipes } from "../types/index.js";

import getUserRolesRecipeConfig from "./config/userRolesRecipeConfig.js";

const init = (fastify: FastifyInstance) => {
  const recipes = fastify.config.user.supertokens.recipes as SupertokensRecipes;

  if (recipes && recipes.userRoles) {
    return UserRoles.init(recipes.userRoles(fastify));
  }

  return UserRoles.init(getUserRolesRecipeConfig());
};

export default init;
