import fastifyPlugin from "fastify-plugin";

import webhookController from "./webhook/controller";

import type { FastifyInstance } from "fastify";

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

const stripePlugin: ReturnType<typeof fastifyPlugin> = fastifyPlugin(
  plugin as unknown as Parameters<typeof fastifyPlugin>[0],
);

export default stripePlugin;
