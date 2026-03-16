import { FastifyInstance } from "fastify";

import { PasswordlessRecipe } from "src/supertokens/types/passwordlessRecipe";

import type {
  APIInterface,
  RecipeInterface,
  TypeInput as PasswordlessRecipeConfig,
} from "supertokens-node/recipe/passwordless/types";

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
    override: {
      apis: (originalImplementation) => {
        const apiInterface: Partial<APIInterface> = {};

        if (passwordless.override?.apis) {
          const apis = passwordless.override.apis;

          let api: keyof APIInterface;

          for (api in apis) {
            const apiWrapper = apis[api];

            if (apiWrapper) {
              apiInterface[api] = apiWrapper(
                originalImplementation,
                fastify,
                // eslint-disable-next-line  @typescript-eslint/no-explicit-any
              ) as any;
            }
          }
        }

        return {
          ...originalImplementation,
          ...apiInterface,
        };
      },
      functions: (originalImplementation) => {
        const recipeInterface: Partial<RecipeInterface> = {};

        if (passwordless.override?.functions) {
          const recipes = passwordless.override.functions;

          let recipe: keyof RecipeInterface;

          for (recipe in recipes) {
            const recipeWrapper = recipes[recipe];

            if (recipeWrapper) {
              recipeInterface[recipe] = recipeWrapper(
                originalImplementation,
                fastify,
                // eslint-disable-next-line  @typescript-eslint/no-explicit-any
              ) as any;
            }
          }
        }

        return {
          ...originalImplementation,
          ...recipeInterface,
        };
      },
    },
  };
};

export default getPasswordlessRecipeConfig;
