import { FastifyRequest } from "fastify";
import Stripe from "stripe";

// Default fallback handler used when `config.stripe.handlers.webhook` is not
// provided. We intentionally do NOT throw here: throwing yields a 500, which
// causes Stripe to retry indefinitely with exponential backoff. Instead we
// log an error so the misconfiguration is visible, then resolve so the route
// responds 200 and Stripe stops retrying. The plugin also warns at
// registration time when no custom handler is wired.
const handleWebhook = async (
  request: FastifyRequest,
  event: Stripe.Event,
): Promise<void> => {
  request.log.error(
    { eventId: event.id, eventType: event.type },
    "Stripe webhook received but no handler is configured (config.stripe.handlers.webhook). Acknowledging with 200 to suppress Stripe retries; event is discarded.",
  );
};

export default handleWebhook;
