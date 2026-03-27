import UserRoles from "supertokens-node/recipe/userroles";

import getUserRolesRecipeConfig from "./config/userRolesRecipeConfig";

import type { SupertokensRecipes } from "../types";
import type { FastifyInstance } from "fastify";

const init = (fastify: FastifyInstance) => {
  const recipes = fastify.config.user.supertokens!
    .recipes as SupertokensRecipes;

  if (recipes && recipes.userRoles) {
    return UserRoles.init(recipes.userRoles(fastify));
  }

  return UserRoles.init(getUserRolesRecipeConfig());
};

export default init;
