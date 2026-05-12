import type { TwilioServiceConfig } from "supertokens-node/lib/build/ingredients/smsdelivery/services/twilio";
import type {
  APIInterface,
  TypeInput as PasswordlessRecipeConfig,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

import { FastifyInstance } from "fastify";
import { PasswordlessRecipe } from "src/supertokens/types/passwordlessRecipe";
import { TwilioService } from "supertokens-node/recipe/passwordless/smsdelivery";

import consumeCode from "./passwordless/consumeCode";
import consumeCodePOST from "./passwordless/consumeCodePost";

const getPasswordlessRecipeConfig = (
  fastify: FastifyInstance,
): PasswordlessRecipeConfig => {
  const { config } = fastify;
  const isDevelopment = config.user.passwordLessConfig.enableDevMode;
  const developmentModeOtp = config.user.passwordLessConfig.devModeOtp;

  const isDevelopmentNumber = (phoneNumber: string) => {
    const developmentModeNumbers =
      config.user.passwordLessConfig.bypassSmsFor || [];

    return developmentModeNumbers.includes(phoneNumber);
  };

  let passwordless: PasswordlessRecipe = {};

  if (typeof config.user.supertokens.recipes?.passwordless === "object") {
    passwordless = config.user.supertokens.recipes.passwordless;
  }

  const twilioSettings: TwilioServiceConfig | undefined = isDevelopment
    ? undefined
    : config.user.passwordLessConfig.twilio;

  if (!isDevelopment && !twilioSettings) {
    throw new Error(
      "Twilio config is missing for passwordless recipe. Please add twilio config to your app config.",
    );
  }

  if (
    !isDevelopment &&
    twilioSettings &&
    !("from" in twilioSettings) &&
    !("messagingServiceSid" in twilioSettings)
  ) {
    throw new Error(
      "Twilio config requires either 'from' or 'messagingServiceSid'.",
    );
  }

  return {
    contactMethod: passwordless?.contactMethod || "PHONE",
    flowType: passwordless?.flowType || "USER_INPUT_CODE",
    getCustomUserInputCode: async (userContext) => {
      const phoneNumber = userContext?.phoneNumber as string | undefined;

      if (isDevelopment || (phoneNumber && isDevelopmentNumber(phoneNumber))) {
        return developmentModeOtp;
      }

      // TODO [AJ 20260512] Check how supertokens generates OTP by default and use that logic here
      return Math.floor(100_000 + Math.random() * 900_000).toString();
    },
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
          createCodePOST: async (input) => {
            if ("phoneNumber" in input) {
              input.userContext.phoneNumber = input.phoneNumber;
            }

            return originalImplementation.createCodePOST!(input);
          },
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
              `Skipping passwordless SMS delivery in development environment. Use default OTP [${developmentModeOtp}] for testing.`,
            );
          },
        }
      : {
          smsDelivery: {
            service: new TwilioService({
              override: (originalImplementation) => {
                return {
                  ...originalImplementation,
                  getContent: async (input) => {
                    const message =
                      config.user.passwordLessConfig.smsMessage ||
                      "Your verification code is:";

                    return {
                      body: `${message} ${input.userInputCode}.`,
                      toPhoneNumber: input.phoneNumber,
                    };
                  },
                  sendRawSms: async (input) => {
                    if (isDevelopmentNumber(input.toPhoneNumber)) {
                      fastify.log.info(
                        `Skipping SMS for test number ${input.toPhoneNumber}. SMS body: [${input.body}]`,
                      );

                      return;
                    }

                    await originalImplementation.sendRawSms(input);
                  },
                };
              },
              twilioSettings: twilioSettings as TwilioServiceConfig,
            }),
          },
        }),
  };
};

export default getPasswordlessRecipeConfig;
