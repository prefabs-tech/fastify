import {
  FastifyInstance,
  type FastifyPluginAsync,
  FastifyRequest,
} from "fastify";
import Stripe from "stripe";

import type { StripeEventHandlers, WebhookControllerOptions } from "../types";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";
import { createVerifyStripeSignature } from "../middlewares/verifyStripeSignature";
import stripeRawBodyParser from "../utils/stripeRawBodyParser";
import webhookHandler from "./handler";

/**
 * Dispatch a Stripe event to the matching handler in the typed handler map.
 * Falls through to the default handler (which logs and acknowledges) when no
 * matching handler exists.
 */
const dispatchToHandler = async (
  handlers: StripeEventHandlers | undefined,
  request: FastifyRequest,
  event: NonNullable<FastifyRequest["stripeEvent"]>,
): Promise<boolean> => {
  if (!handlers) {
    return false;
  }

  const handler = handlers[event.type as keyof typeof handlers];

  if (handler) {
    await (
      handler as (
        req: FastifyRequest,
        event_: Stripe.Event,
      ) => Promise<void> | void
    )(request, event);

    return true;
  }

  return false;
};

const plugin: FastifyPluginAsync<WebhookControllerOptions> = async (
  fastify: FastifyInstance,
  options,
) => {
  fastify.log.info("Registering Stripe webhook route");

  if (!options?.stripeConfig) {
    throw new Error(
      "Missing stripe configuration. Did you forget to pass { stripeConfig } to the Stripe webhook controller?",
    );
  }

  const { stripeConfig } = options;

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

      // Try the typed handler map first; fall back to the default handler
      // when no matching entry exists (or no map was configured).
      const dispatched = await dispatchToHandler(
        stripeConfig.handlers?.webhook,
        request,
        event,
      );

      if (!dispatched) {
        await webhookHandler(request, event);
      }
    },
  );
};

export default plugin;
