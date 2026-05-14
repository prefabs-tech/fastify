import type { FastifyInstance } from "fastify";

import fastifyPlugin from "fastify-plugin";

import type { StripeConfig } from "./types";

import webhookController from "./webhook/controller";

const plugin = async (fastify: FastifyInstance, options?: StripeConfig) => {
  const rawOptions = options ?? {};

  let stripeConfig: StripeConfig | undefined;

  if (Object.keys(rawOptions).length === 0) {
    fastify.log.warn(
      "The stripe plugin now recommends passing stripe options directly to the plugin.",
    );

    stripeConfig = fastify.config?.stripe;
  } else {
    stripeConfig = rawOptions as StripeConfig;
  }

  const { log } = fastify;

  if (!stripeConfig) {
    log.warn(
      "Stripe configuration is missing. Stripe plugin will not be registered.",
    );

    return;
  }

  fastify.log.info("Registering Stripe plugin");

  if (stripeConfig.enablePaymentWebhook) {
    await fastify.register(webhookController, { stripeConfig });
  }
};

const stripePlugin: ReturnType<typeof fastifyPlugin> = fastifyPlugin(
  plugin as unknown as Parameters<typeof fastifyPlugin>[0],
);

export default stripePlugin;
