import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/passwordless/types";

import Passwordless from "supertokens-node/recipe/passwordless";
import twilio from "twilio";

import { ROLE_USER } from "../../../../constants";

export const TWILIO_VERIFY_PLACEHOLDER_CODE = "000000";

const enrichResult = (
  result: Awaited<ReturnType<NonNullable<APIInterface["consumeCodePOST"]>>>,
  phoneNumber: string,
  fallbackEmailDomain: string,
) => {
  if (result.status !== "OK") {
    return result;
  }

  return {
    ...result,
    user: {
      ...result.user,
      email: result.user.email ?? `${phoneNumber}@${fallbackEmailDomain}`,
    },
  };
};

const consumeCodePOST = (
  originalImplementation: APIInterface,
  fastify: FastifyInstance,
): APIInterface["consumeCodePOST"] => {
  return async (input) => {
    input.userContext.roles ||= [fastify.config.user.role || ROLE_USER];

    if (originalImplementation.consumeCodePOST === undefined) {
      throw new Error("Should never come here");
    }

    // Only handle user input code flows, not magic link flows
    if (!("userInputCode" in input) || input.userInputCode === undefined) {
      return originalImplementation.consumeCodePOST(input);
    }

    const { config } = fastify;

    if (!config.user.passwordLessConfig) {
      throw new Error("Passwordless recipe config is missing");
    }

    const isDevelopment = config.user.passwordLessConfig.enableDevMode;

    // Look up the device to retrieve the associated phone number
    const deviceContext = await Passwordless.listCodesByPreAuthSessionId({
      preAuthSessionId: input.preAuthSessionId,
    });

    if (!deviceContext || !deviceContext.phoneNumber) {
      return { status: "RESTART_FLOW_ERROR" };
    }

    const { phoneNumber } = deviceContext;
    const bypassNumbers = config.user.passwordLessConfig.bypassSmsFor ?? [];

    const fallbackEmailDomain =
      config.user.passwordLessConfig.fallbackEmailDomain ?? "";

    // In dev mode or for bypassed numbers, skip Twilio Verify and let
    // SuperTokens verify the code directly (uses devModeOtp)
    if (isDevelopment || bypassNumbers.includes(phoneNumber)) {
      return enrichResult(
        await originalImplementation.consumeCodePOST(input),
        phoneNumber,
        fallbackEmailDomain,
      );
    }

    const verifyServiceSid =
      config.user.passwordLessConfig?.twilio?.verifyServiceSid;

    if (!verifyServiceSid) {
      fastify.log.error("TWILIO_VERIFY_SERVICE_SID is not configured");
      return { status: "RESTART_FLOW_ERROR" };
    }

    const twilioConfig = config.user.passwordLessConfig.twilio;

    if (!twilioConfig) {
      fastify.log.error("Twilio config is missing for passwordless recipe");
      return { status: "RESTART_FLOW_ERROR" };
    }

    if (!twilioConfig.accountSid || !twilioConfig.authToken) {
      fastify.log.error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for passwordless verification",
      );
      return { status: "RESTART_FLOW_ERROR" };
    }

    const twilioClient = twilio(
      twilioConfig.accountSid,
      twilioConfig.authToken,
    );

    try {
      const check = await twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({
          code: input.userInputCode,
          to: phoneNumber,
        });

      return check.status === "approved"
        ? enrichResult(
            await originalImplementation.consumeCodePOST({
              ...input,
              userInputCode: TWILIO_VERIFY_PLACEHOLDER_CODE,
            }),
            phoneNumber,
            fallbackEmailDomain,
          )
        : {
            failedCodeInputAttemptCount: 1,
            maximumCodeInputAttempts: 5,
            status: "INCORRECT_USER_INPUT_CODE_ERROR",
          };
    } catch (error) {
      fastify.log.error(error, "Twilio Verify verification check failed");
      return { status: "RESTART_FLOW_ERROR" };
    }
  };
};

export default consumeCodePOST;
