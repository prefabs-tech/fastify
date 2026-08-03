import twilio from "twilio";

import type { TwilioConfig } from "../types";

const getTwilioClient = (config: TwilioConfig | undefined) => {
  if (!config) {
    throw new Error(
      "Twilio config is missing for phone auth. Add `phoneAuth.twilio` to your app config.",
    );
  }

  if (!config.verifyServiceSid) {
    throw new Error(
      "phoneAuth.twilio.verifyServiceSid is required for phone auth verification",
    );
  }

  if (!config.accountSid || !config.authToken) {
    throw new Error(
      "phoneAuth.twilio.accountSid and phoneAuth.twilio.authToken are required for phone auth verification",
    );
  }

  return {
    client: twilio(config.accountSid, config.authToken),
    verifyServiceSid: config.verifyServiceSid,
  };
};

export default getTwilioClient;
