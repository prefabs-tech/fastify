import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import FastifyPlugin from "fastify-plugin";

import type { StripeConfig } from "./types";

import StripeClient from "./utils/stripeClient";
import webhookController from "./webhook/controller";

const plugin: FastifyPluginAsync<StripeConfig> = async (
  fastify: FastifyInstance,
  options,
) => {
  fastify.log.info("Registering Stripe plugin");

  if (!options || Object.keys(options).length === 0) {
    fastify.log.warn(
      "The stripe plugin now recommends passing stripe options directly to the plugin.",
    );

    if (!fastify.config?.stripe) {
      throw new Error(
        "Missing stripe configuration. Did you forget to pass it to the stripe plugin?",
      );
    }

    options = fastify.config.stripe;
  } else {
    fastify.config.stripe = options;
  }

  if (fastify.stripe) {
    throw new Error("fastify-stripe has already been registered");
  }

  fastify.decorate("stripe", new StripeClient(fastify.config));

  if (options.enablePaymentWebhook) {
    await fastify.register(webhookController, { stripeConfig: options });
  }
};

export default FastifyPlugin(plugin);
