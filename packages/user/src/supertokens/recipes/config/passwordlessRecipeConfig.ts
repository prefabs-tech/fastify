import { FastifyInstance } from "fastify";
import { TwilioService } from "supertokens-node/recipe/passwordless/smsdelivery";

import { PasswordlessRecipe } from "src/supertokens/types/passwordlessRecipe";

import type { TwilioServiceConfig } from "supertokens-node/lib/build/ingredients/smsdelivery/services/twilio";
import type { TypeInput as PasswordlessRecipeConfig } from "supertokens-node/recipe/passwordless/types";

const getPasswordlessRecipeConfig = (
  fastify: FastifyInstance,
): PasswordlessRecipeConfig => {
  const { config } = fastify;

  let passwordless: PasswordlessRecipe = {};

  if (typeof config.user.supertokens.recipes?.passwordless === "object") {
    passwordless = config.user.supertokens.recipes.passwordless;
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
    smsDelivery: {
      service: new TwilioService({
        twilioSettings,
      }),
    },
  };
};

export default getPasswordlessRecipeConfig;
