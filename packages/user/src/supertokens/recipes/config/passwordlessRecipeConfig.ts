import { FastifyInstance } from "fastify";

import { PasswordlessRecipe } from "src/supertokens/types/passwordlessRecipe";

import type { TypeInput as PasswordlessRecipeConfig } from "supertokens-node/recipe/passwordless/types";

const getPasswordlessRecipeConfig = (
  fastify: FastifyInstance,
): PasswordlessRecipeConfig => {
  const { config } = fastify;

  let passwordless: PasswordlessRecipe = {};

  if (typeof config.user.supertokens.recipes?.passwordless === "object") {
    passwordless = config.user.supertokens.recipes.passwordless;
  }

  return {
    contactMethod: passwordless?.contactMethod || "EMAIL",
    flowType: passwordless?.flowType || "USER_INPUT_CODE",
  };
};

export default getPasswordlessRecipeConfig;
