import Stripe from "stripe";

import webhookHandler from "../webhook/handler";

export type StripeConfig = {
  allowPromotionCodes: boolean;
  apiKey: string;
  defaultCurrency: string;
  enablePaymentWebhook: boolean;
  handlers?: {
    webhook?: typeof webhookHandler;
  };
  redirectUrl: {
    callbackWebhook: string;
    cancel: string;
    success: string;
  };
  webhookPath?: string;
  webhookSecret?: string;
};

export type CreateSessionInput = {
  cancelUrl?: string;
  currency?: string;
  mode?: Stripe.Checkout.SessionCreateParams.Mode;
  productName: string;
  quantity?: number;
  successUrl?: string;
  unitAmount: number;
};
