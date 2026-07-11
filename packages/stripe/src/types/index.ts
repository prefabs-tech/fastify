import type { FastifyPluginOptions, FastifyRequest } from "fastify";

import Stripe from "stripe";

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
    webhook?: StripeEventHandlers;
  };
  urls: {
    cancel: string;
    success: string;
  };
  webhookPath?: string;
  webhookSecret?: string;
};

/**
 * A map of Stripe event type strings to handler functions.
 *
 * Each handler receives the Fastify request and the correctly-typed
 * discriminated event — no manual `switch` + `as` casting needed.
 *
 * Example:
 * ```ts
 * {
 *   "checkout.session.completed": async (request, event) => {
 *     // event.data.object is Stripe.Checkout.Session — fully typed
 *   },
 * }
 * ```
 */
export type StripeEventHandlers = {
  [E in Stripe.Event as E["type"]]?: (
    request: FastifyRequest,
    event: E,
  ) => Promise<void> | void;
};

export type WebhookControllerOptions = FastifyPluginOptions & {
  stripeConfig: StripeConfig;
};
