import type { FastifyPluginOptions } from "fastify";

import Stripe from "stripe";

import webhookHandler from "../webhook/handler";

declare module "fastify" {
  interface FastifyRequest {
    stripeEvent?: Stripe.Event;
  }
}

export type CreateSessionInput = {
  cancelUrl?: string;
  currency?: string;
  mode?: Stripe.Checkout.SessionCreateParams.Mode;
  productName: string;
  quantity?: number;
  successUrl?: string;
  unitAmount: number;
};

export type StripeConfig = FastifyPluginOptions & {
  allowPromotionCodes?: boolean;
  apiKey: string;
  clientConfig?: Stripe.StripeConfig;
  defaultCurrency: string;
  enablePaymentWebhook: boolean;
  handlers?: {
    webhook?: typeof webhookHandler;
  };
  urls: {
    cancel: string;
    success: string;
  };
  webhookPath?: string;
  webhookSecret?: string;
};

export type WebhookControllerOptions = FastifyPluginOptions & {
  stripeConfig: StripeConfig;
};
