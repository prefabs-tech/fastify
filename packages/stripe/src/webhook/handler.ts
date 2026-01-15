import { FastifyRequest } from "fastify";
import Stripe from "stripe";

const handleWebhook = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: FastifyRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: Stripe.Event,
): Promise<void> => {
  throw new Error("Webhook handler not implemented");
};

export default handleWebhook;
