import type { FastifyInstance } from "fastify";
import type {
  APIInterface,
  TypeInput as PasswordlessRecipeConfig,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

import type { PasswordlessConfig } from "../types";

import {
  DEFAULT_CONTACT_METHOD,
  DEFAULT_FLOW_TYPE,
  TWILIO_VERIFY_PLACEHOLDER_CODE,
} from "../constants";
import getTwilioClient from "../lib/getTwilioClient";
import consumeCode from "./consumeCode";
import consumeCodePOST from "./consumeCodePost";

// SuperTokens has no first-class support for the Twilio Verify API, so both
// consumeCodePOST and consumeCode are overridden to bridge the two.
//
// How it works:
// 1. Sign in/up hits createCodePOST, which asks Twilio Verify to send an OTP to
//    the phone number.
// 2. SuperTokens still requires a user input code of its own, so it stores
//    TWILIO_VERIFY_PLACEHOLDER_CODE instead of the real OTP.
// 3. On consumeCodePOST the submitted OTP is checked against Twilio Verify. If
//    Twilio approves, the original consumeCodePOST is replayed with
//    TWILIO_VERIFY_PLACEHOLDER_CODE so SuperTokens can complete its own flow.
// 4. consumeCode then creates the matching row in our database, with a
//    synthetic `<phoneNumber>@<fallbackEmailDomain>` email because SuperTokens
//    requires an email field.

const getPasswordlessRecipeConfig = (
  fastify: FastifyInstance,
): PasswordlessRecipeConfig => {
  const passwordless: PasswordlessConfig | undefined =
    fastify.config.passwordless;

  if (!passwordless) {
    throw new Error(
      "Passwordless recipe config is missing. Add `passwordless` to your app config.",
    );
  }

  const isDevelopment = passwordless.enableDevMode === true;
  const developmentModeOtp = passwordless.devModeOtp;

  if (isDevelopment && !developmentModeOtp) {
    throw new Error(
      "passwordless.devModeOtp is required when passwordless.enableDevMode is true",
    );
  }

  const isDevelopmentNumber = (phoneNumber: string) => {
    return (passwordless.bypassSmsFor || []).includes(phoneNumber);
  };

  // Fail at boot rather than on the first sign-in attempt.
  if (!isDevelopment) {
    getTwilioClient(passwordless.twilio);
  }

  return {
    contactMethod: passwordless.contactMethod || DEFAULT_CONTACT_METHOD,
    flowType: passwordless.flowType || DEFAULT_FLOW_TYPE,
    getCustomUserInputCode: async (userContext) => {
      const phoneNumber = userContext?.phoneNumber as string | undefined;

      if (isDevelopment || (phoneNumber && isDevelopmentNumber(phoneNumber))) {
        return developmentModeOtp as string;
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

                  const { client, verifyServiceSid } = getTwilioClient(
                    passwordless.twilio,
                  );

                  try {
                    await client.verify.v2
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
