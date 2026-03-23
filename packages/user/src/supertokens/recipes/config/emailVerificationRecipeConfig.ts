import sendEmailVerificationEmail from "./email-verification/sendEmailVerificationEmail";
import { EMAIL_VERIFICATION_MODE } from "../../../constants";
import getUserService from "../../../lib/getUserService";

import type {
  SendEmailWrapper,
  EmailVerificationRecipe,
} from "../../types/emailVerificationRecipe";
import type { FastifyInstance } from "fastify";
import type {
  APIInterface,
  RecipeInterface,
  TypeInput as EmailVerificationRecipeConfig,
} from "supertokens-node/recipe/emailverification/types";

const getEmailVerificationRecipeConfig = (
  fastify: FastifyInstance,
): EmailVerificationRecipeConfig => {
  const { config, slonik } = fastify;

  let emailVerification: EmailVerificationRecipe = {};

  if (typeof config.user.supertokens!.recipes?.emailVerification === "object") {
    emailVerification = config.user.supertokens!.recipes.emailVerification;
  }

  return {
    mode: emailVerification?.mode || EMAIL_VERIFICATION_MODE,
    emailDelivery: {
      override: (originalImplementation) => {
        let sendEmailConfig: SendEmailWrapper | undefined;

        if (emailVerification?.sendEmail) {
          sendEmailConfig = emailVerification.sendEmail;
        }

        return {
          ...originalImplementation,
          sendEmail: sendEmailConfig
            ? sendEmailConfig(originalImplementation, fastify)
            : sendEmailVerificationEmail(originalImplementation, fastify),
        };
      },
    },
    override: {
      apis: (originalImplementation) => {
        const apiInterface: Partial<APIInterface> = {};

        if (emailVerification.override?.apis) {
          const apis = emailVerification.override.apis;

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
          verifyEmailPOST: async (input) => {
            if (originalImplementation.verifyEmailPOST === undefined) {
              throw new Error("Should never come here");
            }

            const session = input.session;

            if (!session) {
              return {
                status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR",
              };
            }

            // TODO: if token is not valid for current user, return {status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR"}

            const response =
              await originalImplementation.verifyEmailPOST(input);

            if (response.status === "OK") {
              const email = input.options.req.original.user.email;

              if (email !== response.user.email) {
                const userService = getUserService(config, slonik);

                await userService.changeEmail(
                  response.user.id,
                  response.user.email,
                );
              }
            }

            return response;
          },
          ...apiInterface,
        };
      },
      functions: (originalImplementation) => {
        const recipeInterface: Partial<RecipeInterface> = {};

        if (emailVerification.override?.functions) {
          const recipes = emailVerification.override.functions;

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

export default getEmailVerificationRecipeConfig;
