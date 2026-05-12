import { FastifyReply, FastifyRequest } from "fastify";
import Stripe from "stripe";

const verifyStripeSignature = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const { config, log } = request.server;
  const webhookSecret = config.stripe?.webhookSecret;

  if (!webhookSecret) {
    log.error(
      "Stripe webhook secret is not configured; rejecting webhook request.",
    );

    return reply.status(400).send({ error: "Webhook secret not configured" });
  }

  const signature = request.headers["stripe-signature"];

  if (!signature) {
    log.error("Missing stripe-signature header");

    return reply.status(400).send({ error: "Missing stripe-signature header" });
  }

  try {
    const rawBody = request.rawBody;

    if (!rawBody) {
      log.error("Raw body is not available for signature verification");

      return reply.status(400).send({
        error: "Raw body is not available for signature verification",
      });
    }

    const event = Stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    request.stripeEvent = event;
  } catch (error) {
    log.error({ err: error }, "Stripe webhook signature verification failed");
    return reply
      .status(400)
      .send({ error: "Webhook signature verification failed" });
  }
};

export default verifyStripeSignature;
