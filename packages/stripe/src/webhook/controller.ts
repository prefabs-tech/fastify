import { FastifyInstance, FastifyRequest } from "fastify";
import Stripe from "stripe";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";
import verifyStripeSignature from "../middlewares/verifyStripeSignature";
import stripeRawBodyParser from "../utils/stripeRawBodyParser";
import webhookHandler from "./handler";

const plugin = async (fastify: FastifyInstance) => {
  if (fastify.config.stripe.enablePaymentWebhook) {
    fastify.log.info("Registering Stripe webhook route");

    stripeRawBodyParser(fastify);

    fastify.post(
      fastify.config.stripe.webhookPath || ROUTE_STRIPE_WEBHOOK,
      { preHandler: [verifyStripeSignature] },
      async (request: FastifyRequest) => {
        const event = (
          request as FastifyRequest & { stripeEvent?: Stripe.Event }
        ).stripeEvent;

        if (!event) {
          throw new Error("Stripe event not found on request");
        }

        if (fastify.config.stripe.handlers?.webhook) {
          await fastify.config.stripe.handlers.webhook(request, event);

          return;
        }

        await webhookHandler(request, event);
      },
    );
  }
};

export default plugin;
