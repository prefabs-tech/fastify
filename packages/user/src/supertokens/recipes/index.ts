import type { FastifyInstance } from "fastify";
import type { RecipeListFunction } from "supertokens-node/types/index.js";

import initEmailVerificationRecipe from "./initEmailVerificationRecipe.js";
import initSessionRecipe from "./initSessionRecipe.js";
import initThirdPartyEmailPassword from "./initThirdPartyEmailPasswordRecipe.js";
import initUserRolesRecipe from "./initUserRolesRecipe.js";

const getRecipeList = (fastify: FastifyInstance): RecipeListFunction[] => {
  const recipeList = [
    initSessionRecipe(fastify),
    initThirdPartyEmailPassword(fastify),
    initUserRolesRecipe(fastify),
  ];

  if (fastify.config.user.features?.signUp?.emailVerification) {
    recipeList.push(initEmailVerificationRecipe(fastify));
  }

  const registeredRecipes = fastify.supertokensRecipes ?? [];

  for (const factory of registeredRecipes) {
    recipeList.push(factory(fastify));
  }

  return recipeList;
};

export default getRecipeList;
