import { FastifyInstance, FastifyRequest } from "fastify";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";
import verifyStripeSignature from "../middlewares/verifyStripeSignature";
import stripeRawBodyParser from "../utils/stripeRawBodyParser";
import webhookHandler from "./handler";

const plugin = async (fastify: FastifyInstance) => {
  fastify.log.info("Registering Stripe webhook route");

  // `stripe` is guaranteed by the parent plugin (which only registers this
  // controller when `config.stripe` is set), but we narrow it once locally
  // so the rest of the function stays free of `!` non-null assertions.
  const stripeConfig = fastify.config.stripe;

  if (!stripeConfig) {
    fastify.log.error(
      "Stripe webhook controller registered without config.stripe; skipping route registration.",
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
    { preHandler: [verifyStripeSignature] },
    async (request: FastifyRequest, reply) => {
      const event = request.stripeEvent;

      if (!event) {
        // Should be unreachable: verifyStripeSignature either sets the event
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
