import twilio from "twilio";

import type { TwilioConfig } from "../types";

const getTwilioClient = (config: TwilioConfig | undefined) => {
  if (!config) {
    throw new Error(
      "Twilio config is missing for the passwordless recipe. Add `passwordless.twilio` to your app config.",
    );
  }

  if (!config.verifyServiceSid) {
    throw new Error(
      "passwordless.twilio.verifyServiceSid is required for passwordless verification",
    );
  }

  if (!config.accountSid || !config.authToken) {
    throw new Error(
      "passwordless.twilio.accountSid and passwordless.twilio.authToken are required for passwordless verification",
    );
  }

  return {
    client: twilio(config.accountSid, config.authToken),
    verifyServiceSid: config.verifyServiceSid,
  };
};

export default getTwilioClient;
