import { FastifyInstance, FastifyRequest } from "fastify";

import type { StripeConfig } from "../types";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";
import { createVerifyStripeSignature } from "../middlewares/verifyStripeSignature";
import stripeRawBodyParser from "../utils/stripeRawBodyParser";
import webhookHandler from "./handler";

export type WebhookControllerOptions = {
  stripeConfig?: StripeConfig;
};

const plugin = async (
  fastify: FastifyInstance,
  options?: WebhookControllerOptions,
) => {
  fastify.log.info("Registering Stripe webhook route");

  const stripeConfig = options?.stripeConfig ?? fastify.config?.stripe;

  if (!stripeConfig) {
    fastify.log.error(
      "Stripe webhook controller registered without stripe configuration; skipping route registration.",
    );

    return;
  }

  if (!stripeConfig.handlers?.webhook) {
    fastify.log.warn(
      "config.stripe.handlers.webhook is not set; received webhooks will be acknowledged but not processed. Provide a handler to fulfill events.",
    );
  }

  stripeRawBodyParser(fastify);

  fastify.post(
    stripeConfig.webhookPath || ROUTE_STRIPE_WEBHOOK,
    { preHandler: [createVerifyStripeSignature(stripeConfig)] },
    async (request: FastifyRequest, reply) => {
      const event = request.stripeEvent;

      if (!event) {
        // Should be unreachable: signature verification either sets the event
        // or replies 400. Surface a clear 500 with context if it ever fires.
        request.log.error(
          "Stripe event not found on request after signature verification; refusing to dispatch.",
        );

        return reply.status(500).send({
          error: "Stripe event not found on request",
        });
      }

      if (stripeConfig.handlers?.webhook) {
        await stripeConfig.handlers.webhook(request, event);

        return;
      }

      await webhookHandler(request, event);
    },
  );
};

export default plugin;
