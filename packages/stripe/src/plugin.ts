import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import FastifyPlugin from "fastify-plugin";

import type { StripeConfig } from "./types";

import StripeClient from "./utils/stripeClient";
import webhookController from "./webhook/controller";

const plugin: FastifyPluginAsync<StripeConfig> = async (
  fastify: FastifyInstance,
) => {
  const { config, log } = fastify;

  log.info("Registering Stripe plugin");

  if (!config.stripe || Object.keys(config.stripe).length === 0) {
    throw new Error(
      "Missing stripe configuration. Did you forget to pass it to the stripe plugin?",
    );
  }

  if (fastify.stripe) {
    throw new Error("fastify-stripe has already been registered");
  }

  fastify.decorate("stripe", new StripeClient(config));

  if (config.stripe?.enablePaymentWebhook) {
    await fastify.register(webhookController, { stripeConfig: config.stripe });
  }
};

export default FastifyPlugin(plugin);
