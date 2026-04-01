import { FastifyInstance } from "fastify";
import { TwilioService } from "supertokens-node/recipe/passwordless/smsdelivery";

import { PasswordlessRecipe } from "src/supertokens/types/passwordlessRecipe";

import consumeCode from "./passwordless/consumeCode";
import consumeCodePOST from "./passwordless/consumeCodePost";

import type { TwilioServiceConfig } from "supertokens-node/lib/build/ingredients/smsdelivery/services/twilio";
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

  if (!config.twilio) {
    throw new Error(
      "Twilio config is missing for passwordless recipe. Please add twilio config to your app config.",
    );
  }

  if (!("messagingServiceSid" in config.twilio) && !("from" in config.twilio)) {
    throw new Error(
      "Twilio config requires either messagingServiceSid or from",
    );
  }

  const twilioSettings: TwilioServiceConfig =
    "messagingServiceSid" in config.twilio
      ? {
          opts: config.twilio.opts,
          accountSid: config.twilio.accountSid,
          authToken: config.twilio.authToken,
          messagingServiceSid: config.twilio.messagingServiceSid,
        }
      : {
          opts: config.twilio.opts,
          accountSid: config.twilio.accountSid,
          authToken: config.twilio.authToken,
          from: config.twilio.from,
        };

  return {
    contactMethod: passwordless?.contactMethod || "PHONE",
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
          consumeCodePOST: consumeCodePOST(originalImplementation, fastify),
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
          consumeCode: consumeCode(originalImplementation, fastify),
          ...recipeInterface,
        };
      },
    },
    smsDelivery: {
      service: new TwilioService({
        twilioSettings,
        override: (originalImplementation) => {
          return {
            ...originalImplementation,
            getContent: async (input) => {
              return {
                body: `Your verification code is: ${input.userInputCode}.`,
                toPhoneNumber: input.phoneNumber,
              };
            },
            sendRawSms: async (input) => {
              await originalImplementation.sendRawSms(input);
            },
          };
        },
      }),
    },
  };
};

export default getPasswordlessRecipeConfig;
