const DEFAULT_CONTACT_METHOD = "PHONE";
const DEFAULT_FLOW_TYPE = "USER_INPUT_CODE";

const ERROR_CODES = {
  SIGNUP_FAILED_ERROR: "SIGNUP_FAILED_ERROR",
};

// SuperTokens insists on storing a user input code of its own. When Twilio
// Verify owns the real OTP we hand SuperTokens this placeholder instead, and
// replay it once Twilio has approved the code the user actually typed.
const TWILIO_VERIFY_PLACEHOLDER_CODE = "000000";

export {
  DEFAULT_CONTACT_METHOD,
  DEFAULT_FLOW_TYPE,
  ERROR_CODES,
  TWILIO_VERIFY_PLACEHOLDER_CODE,
};
