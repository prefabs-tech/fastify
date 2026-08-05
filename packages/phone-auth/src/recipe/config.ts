import type { FastifyInstance } from "fastify";
import type {
  APIInterface,
  TypeInput as PasswordlessRecipeConfig,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

import type { PhoneAuthConfig } from "../types";

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
  const phoneAuth: PhoneAuthConfig | undefined = fastify.config.phoneAuth;

  if (!phoneAuth) {
    throw new Error(
      "Phone auth config is missing. Add `phoneAuth` to your app config.",
    );
  }

  const isDevelopment = phoneAuth.enableDevMode === true;
  const developmentModeOtp = phoneAuth.devModeOtp;

  if (isDevelopment && !developmentModeOtp) {
    throw new Error(
      "phoneAuth.devModeOtp is required when phoneAuth.enableDevMode is true",
    );
  }

  const isDevelopmentNumber = (phoneNumber: string) => {
    return (phoneAuth.bypassSmsFor || []).includes(phoneNumber);
  };

  // Fail at boot rather than on the first sign-in attempt.
  if (!isDevelopment) {
    getTwilioClient(phoneAuth.twilio);
  }

  return {
    contactMethod: phoneAuth.contactMethod || DEFAULT_CONTACT_METHOD,
    flowType: phoneAuth.flowType || DEFAULT_FLOW_TYPE,
    getCustomUserInputCode: async (_tenantId, userContext) => {
      const phoneNumber = userContext?.phoneNumber as string | undefined;

      if (isDevelopment || (phoneNumber && isDevelopmentNumber(phoneNumber))) {
        return developmentModeOtp as string;
      }

      return TWILIO_VERIFY_PLACEHOLDER_CODE;
    },
    override: {
      apis: (originalImplementation) => {
        const apiInterface: Partial<APIInterface> = {};

        if (phoneAuth.override?.apis) {
          const apis = phoneAuth.override.apis;

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

        if (phoneAuth.override?.functions) {
          const recipes = phoneAuth.override.functions;

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
      override: (originalImplementation) => {
        return {
          ...originalImplementation,
          sendSms: async (input: { phoneNumber: string }) => {
            if (isDevelopment) {
              fastify.log.info(
                `Skipping phone auth SMS delivery in development environment. Use default OTP [${developmentModeOtp}] for testing.`,
              );

              return;
            }

            if (isDevelopmentNumber(input.phoneNumber)) {
              fastify.log.info(
                `Skipping SMS for test number ${input.phoneNumber}.`,
              );

              return;
            }

            const { client, verifyServiceSid } = getTwilioClient(
              phoneAuth.twilio,
            );

            try {
              await client.verify.v2
                .services(verifyServiceSid)
                .verifications.create({
                  channel: "sms",
                  to: input.phoneNumber,
                });
            } catch (error) {
              fastify.log.error(error, "Twilio Verify failed to send OTP");
              throw error;
            }
          },
        };
      },
    },
  };
};

export default getPasswordlessRecipeConfig;
