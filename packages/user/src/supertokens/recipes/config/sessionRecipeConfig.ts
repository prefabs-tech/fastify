import createNewSession from "./session/createNewSession";
import getGlobalClaimValidators from "./session/getGlobalClaimValidators";
import getSession from "./session/getSession";
import verifySession from "./session/verifySession";

import type { SessionRecipe } from "../../types/sessionRecipe";
import type { FastifyInstance } from "fastify";
import type {
  APIInterface,
  RecipeInterface,
  TypeInput as SessionRecipeConfig,
} from "supertokens-node/recipe/session/types";

const getSessionRecipeConfig = (
  fastify: FastifyInstance,
): SessionRecipeConfig => {
  const { config } = fastify;

  let session: SessionRecipe = {};

  if (typeof config.user.supertokens.recipes?.session === "object") {
    session = config.user.supertokens.recipes.session;
  }

  return {
    ...session,
    getTokenTransferMethod: (input) => {
      return input.req.getHeaderValue("st-auth-mode") === "header"
        ? "header"
        : "cookie";
    },
    override: {
      apis: (originalImplementation) => {
        const apiInterface: Partial<APIInterface> = {};

        if (session.override?.apis) {
          const apis = session.override.apis;

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
          verifySession: verifySession(originalImplementation, fastify),
          ...apiInterface,
        };
      },
      functions: (originalImplementation) => {
        const recipeInterface: Partial<RecipeInterface> = {};

        if (session.override?.functions) {
          const recipes = session.override.functions;

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
          createNewSession: createNewSession(originalImplementation, fastify),
          getSession: getSession(originalImplementation, fastify),
          getGlobalClaimValidators: getGlobalClaimValidators(
            originalImplementation,
            fastify,
          ),
          ...recipeInterface,
        };
      },
      openIdFeature: session.override?.openIdFeature,
    },
  };
};

export default getSessionRecipeConfig;
