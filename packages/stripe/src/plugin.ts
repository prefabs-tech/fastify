import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import FastifyPlugin from "fastify-plugin";

import type { StripeConfig } from "./types";

import webhookController from "./webhook/controller";

const plugin: FastifyPluginAsync<StripeConfig> = async (
  fastify: FastifyInstance,
  options,
) => {
  fastify.log.info("Registering Stripe plugin");

  if (!options || Object.keys(options).length === 0) {
    throw new Error(
      "Missing stripe configuration. Did you forget to pass it to the stripe plugin?",
    );
  }

  if (options.enablePaymentWebhook) {
    await fastify.register(webhookController, { stripeConfig: options });
  }
};

export default FastifyPlugin(plugin);
