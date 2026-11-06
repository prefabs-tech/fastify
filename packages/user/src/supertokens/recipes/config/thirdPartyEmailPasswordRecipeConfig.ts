import type { FastifyInstance } from "fastify";
import type {
  APIInterface,
  RecipeInterface,
  TypeInput as ThirdPartyEmailPasswordRecipeConfig,
} from "supertokens-node/recipe/thirdpartyemailpassword/types/index.js";

import type {
  SendEmailWrapper,
  ThirdPartyEmailPasswordRecipe,
} from "../../types/thirdPartyEmailPasswordRecipe.js";

import appleRedirectHandlerPOST from "./third-party-email-password/appleRedirectHandlerPost.js";
import emailPasswordSignIn from "./third-party-email-password/emailPasswordSignIn.js";
import emailPasswordSignUp from "./third-party-email-password/emailPasswordSignUp.js";
import emailPasswordSignUpPOST from "./third-party-email-password/emailPasswordSignUpPost.js";
import getFormFields from "./third-party-email-password/getFormFields.js";
import resetPasswordUsingToken from "./third-party-email-password/resetPasswordUsingToken.js";
import sendPasswordResetEmail from "./third-party-email-password/sendPasswordResetEmail.js";
import thirdPartySignInUp from "./third-party-email-password/thirdPartySignInUp.js";
import thirdPartySignInUpPOST from "./third-party-email-password/thirdPartySignInUpPost.js";
import getThirdPartyProviders from "./thirdPartyProviders.js";

const getThirdPartyEmailPasswordRecipeConfig = (
  fastify: FastifyInstance,
): ThirdPartyEmailPasswordRecipeConfig => {
  const { config } = fastify;

  let thirdPartyEmailPassword: ThirdPartyEmailPasswordRecipe = {};

  if (
    typeof config.user.supertokens.recipes?.thirdPartyEmailPassword === "object"
  ) {
    thirdPartyEmailPassword =
      config.user.supertokens.recipes.thirdPartyEmailPassword;
  }

  return {
    emailDelivery: {
      override: (originalImplementation) => {
        let sendEmailConfig: SendEmailWrapper | undefined;

        if (thirdPartyEmailPassword?.sendEmail) {
          sendEmailConfig = thirdPartyEmailPassword.sendEmail;
        }

        return {
          ...originalImplementation,
          sendEmail: sendEmailConfig
            ? sendEmailConfig(originalImplementation, fastify)
            : sendPasswordResetEmail(originalImplementation, fastify),
        };
      },
    },
    override: {
      apis: (originalImplementation) => {
        const apiInterface: Partial<APIInterface> = {};

        if (thirdPartyEmailPassword.override?.apis) {
          const apis = thirdPartyEmailPassword.override.apis;

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
          appleRedirectHandlerPOST: appleRedirectHandlerPOST(
            originalImplementation,
            fastify,
          ),
          emailPasswordSignUpPOST: emailPasswordSignUpPOST(
            originalImplementation,
            fastify,
          ),
          thirdPartySignInUpPOST: thirdPartySignInUpPOST(
            originalImplementation,
            fastify,
          ),
          ...apiInterface,
        };
      },
      functions: (originalImplementation) => {
        const recipeInterface: Partial<RecipeInterface> = {};

        if (thirdPartyEmailPassword.override?.functions) {
          const recipes = thirdPartyEmailPassword.override.functions;

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
          emailPasswordSignIn: emailPasswordSignIn(
            originalImplementation,
            fastify,
          ),
          emailPasswordSignUp: emailPasswordSignUp(
            originalImplementation,
            fastify,
          ),
          resetPasswordUsingToken: resetPasswordUsingToken(
            originalImplementation,
            fastify,
          ),
          thirdPartySignInUp: thirdPartySignInUp(
            originalImplementation,
            fastify,
          ),
          ...recipeInterface,
        };
      },
    },
    providers: getThirdPartyProviders(config),
    signUpFeature: {
      formFields: getFormFields(config),
    },
  };
};

export default getThirdPartyEmailPasswordRecipeConfig;
