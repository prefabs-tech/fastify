import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/passwordless/types";

import { ROLE_USER } from "@prefabs.tech/fastify-user";
import Passwordless from "supertokens-node/recipe/passwordless";

import { TWILIO_VERIFY_PLACEHOLDER_CODE } from "../constants";
import getTwilioClient from "../lib/getTwilioClient";

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
      emails:
        result.user.emails.length > 0
          ? result.user.emails
          : [`${phoneNumber}@${fallbackEmailDomain}`],
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

    const phoneAuth = fastify.config.phoneAuth;

    if (!phoneAuth) {
      throw new Error("Phone auth config is missing");
    }

    const isDevelopment = phoneAuth.enableDevMode === true;

    // Look up the device to retrieve the associated phone number
    const deviceContext = await Passwordless.listCodesByPreAuthSessionId({
      preAuthSessionId: input.preAuthSessionId,
      tenantId: input.tenantId,
    });

    if (!deviceContext || !deviceContext.phoneNumber) {
      return { status: "RESTART_FLOW_ERROR" };
    }

    const { phoneNumber } = deviceContext;
    const bypassNumbers = phoneAuth.bypassSmsFor ?? [];
    const fallbackEmailDomain = phoneAuth.fallbackEmailDomain ?? "";

    // In dev mode or for bypassed numbers, skip Twilio Verify and let
    // SuperTokens verify the code directly (uses devModeOtp)
    if (isDevelopment || bypassNumbers.includes(phoneNumber)) {
      return enrichResult(
        await originalImplementation.consumeCodePOST(input),
        phoneNumber,
        fallbackEmailDomain,
      );
    }

    let client, verifyServiceSid;

    try {
      ({ client, verifyServiceSid } = getTwilioClient(phoneAuth.twilio));
    } catch (error) {
      fastify.log.error(error);

      return { status: "RESTART_FLOW_ERROR" };
    }

    try {
      const check = await client.verify.v2
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
