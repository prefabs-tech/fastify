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
  const isDevelopment = process.env.NODE_ENV === "development";
  const defaultTestOtp = process.env.DEFAULT_TEST_OTP || "123456";

  let passwordless: PasswordlessRecipe = {};

  if (typeof config.user.supertokens.recipes?.passwordless === "object") {
    passwordless = config.user.supertokens.recipes.passwordless;
  }

  let twilioSettings: TwilioServiceConfig | undefined;

  if (!isDevelopment) {
    if (!config.user.twilio) {
      throw new Error(
        "Twilio config is missing for passwordless recipe. Please add twilio config to your app config.",
      );
    }

    if (
      !("messagingServiceSid" in config.user.twilio) &&
      !("from" in config.user.twilio)
    ) {
      throw new Error(
        "Twilio config requires either messagingServiceSid or from",
      );
    }

    twilioSettings =
      "messagingServiceSid" in config.user.twilio
        ? {
            opts: config.user.twilio.opts,
            accountSid: config.user.twilio.accountSid,
            authToken: config.user.twilio.authToken,
            messagingServiceSid: config.user.twilio.messagingServiceSid,
          }
        : {
            opts: config.user.twilio.opts,
            accountSid: config.user.twilio.accountSid,
            authToken: config.user.twilio.authToken,
            from: config.user.twilio.from,
          };
  }

  return {
    contactMethod: passwordless?.contactMethod || "PHONE",
    flowType: passwordless?.flowType || "USER_INPUT_CODE",
    ...(isDevelopment
      ? {
          getCustomUserInputCode: () => defaultTestOtp,
        }
      : {}),
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
    ...(isDevelopment
      ? {
          createAndSendCustomTextMessage: async () => {
            fastify.log.info(
              `Skipping passwordless SMS delivery in development environment. Use default OTP [${defaultTestOtp}] for testing.`,
            );
          },
        }
      : {
          smsDelivery: {
            service: new TwilioService({
              twilioSettings: twilioSettings as TwilioServiceConfig,
              override: (originalImplementation) => {
                return {
                  ...originalImplementation,
                  getContent: async (input) => {
                    const message =
                      config.user.twilio?.message ||
                      "Your verification code is:";

                    return {
                      body: `${message} ${input.userInputCode}.`,
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
        }),
  };
};

export default getPasswordlessRecipeConfig;
