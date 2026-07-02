import type {
  APIInterface,
  TypeInput as PasswordlessRecipeConfig,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

import { FastifyInstance } from "fastify";
import { PasswordlessRecipe } from "src/supertokens/types/passwordlessRecipe";
import { TwilioConfig } from "src/types";
import twilio from "twilio";

import consumeCode from "./passwordless/consumeCode";
import consumeCodePOST, {
  TWILIO_VERIFY_PLACEHOLDER_CODE,
} from "./passwordless/consumeCodePost";

// Since Supertokens directly does not support Twilio verify api, we need to override the consumeCodePOST api to integrate with Twilio Verify. The consumeCode function is also overridden to create a user in our database when a new user is created in Supertokens after successful verification.

// How it works:
// 1. When a user tries to sign in/sign up, they hit the createCodePOST API which requests an OTP from Twilio Verify for the provided phone number.
// 2. To satisfy Supertokens' requirement of having a user input code, we store a TWILIO_VERIFY_PLACEHOLDER_CODE in Supertokens instead of the actual OTP.
// 3. When the user submits the OTP they received, we hit the consumeCodePOST API. Here, we first verify the OTP with Twilio Verify. If Twilio approves, we then call the original consumeCodePOST with the TWILIO_VERIFY_PLACEHOLDER_CODE, which allows Supertokens to complete its flow successfully.
// 4. In the consumeCode function, if a new user was created by Supertokens, we create a corresponding user in our database with the phone number and a synthetic email (in the format phoneNumber@fallbackEmailDomain) since Supertokens requires an email field.

const getPasswordlessRecipeConfig = (
  fastify: FastifyInstance,
): PasswordlessRecipeConfig => {
  const { config } = fastify;

  if (!config.user.passwordLessConfig) {
    throw new Error("Passwordless recipe config is missing");
  }

  const isDevelopment = config.user.passwordLessConfig.enableDevMode;
  const developmentModeOtp = config.user.passwordLessConfig.devModeOtp;

  const isDevelopmentNumber = (phoneNumber: string) => {
    const developmentModeNumbers =
      config.user.passwordLessConfig?.bypassSmsFor || [];

    return developmentModeNumbers.includes(phoneNumber);
  };

  let passwordless: PasswordlessRecipe = {};

  if (typeof config.user.supertokens.recipes?.passwordless === "object") {
    passwordless = config.user.supertokens.recipes.passwordless;
  }

  const twilioSettings: TwilioConfig | undefined = isDevelopment
    ? undefined
    : config.user.passwordLessConfig.twilio;

  if (!isDevelopment && !twilioSettings) {
    throw new Error(
      "Twilio config is missing for passwordless recipe. Please add twilio config to your app config.",
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

      return TWILIO_VERIFY_PLACEHOLDER_CODE;
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
            override: (originalImplementation) => {
              return {
                ...originalImplementation,
                sendSms: async (input: { phoneNumber: string }) => {
                  if (isDevelopmentNumber(input.phoneNumber)) {
                    fastify.log.info(
                      `Skipping SMS for test number ${input.phoneNumber}.`,
                    );

                    return;
                  }

                  const verifyServiceSid =
                    config.user.passwordLessConfig?.twilio?.verifyServiceSid;

                  if (!verifyServiceSid) {
                    throw new Error(
                      "TWILIO_VERIFY_SERVICE_SID is not configured",
                    );
                  }

                  const { accountSid, authToken } =
                    twilioSettings as TwilioConfig;

                  if (!accountSid || !authToken) {
                    throw new Error(
                      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for passwordless SMS delivery",
                    );
                  }

                  const twilioClient = twilio(accountSid, authToken);

                  try {
                    await twilioClient.verify.v2
                      .services(verifyServiceSid)
                      .verifications.create({
                        channel: "sms",
                        to: input.phoneNumber,
                      });
                  } catch (error) {
                    fastify.log.error(
                      error,
                      "Twilio Verify failed to send OTP",
                    );
                    throw error;
                  }
                },
              };
            },
          },
        }),
  };
};

export default getPasswordlessRecipeConfig;
