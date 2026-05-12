import type { StripeConfig } from "../../types";

const createStripeConfig = (
  overrides: Partial<StripeConfig> = {},
): StripeConfig => {
  return {
    apiKey: "sk_test_dummy",
    defaultCurrency: "usd",
    enablePaymentWebhook: false,
    urls: {
      cancel: "https://example.com/cancel",
      success: "https://example.com/success",
    },
    webhookSecret: "whsec_test_dummy",
    ...overrides,
  };
};

export default createStripeConfig;
