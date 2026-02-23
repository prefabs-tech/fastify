import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

import webhookController from "./webhook/controller";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log } = fastify;

  if (!config.stripe) {
    log.warn(
      "Stripe configuration is missing. Stripe plugin will not be registered.",
    );

    return;
  }

  fastify.log.info("Registering Stripe plugin");

  if (config.stripe.enablePaymentWebhook) {
    await fastify.register(webhookController);
  }
};

export default fastifyPlugin(plugin);
