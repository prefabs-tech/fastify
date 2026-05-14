# @prefabs.tech/fastify-stripe

A [Fastify](https://github.com/fastify/fastify) plugin that integrates Stripe for payment processing.

## Features

- **Stripe Checkout Sessions**: Create Stripe checkout sessions for one-time payments
- **Webhook Handling**: Built-in webhook endpoint with signature verification
- **Custom Webhook Handlers**: Support for custom webhook event handlers
- **Configurable Routes**: Customizable webhook endpoint paths

## Requirements

Peer dependencies (install explicitly in your app): `fastify`, `fastify-plugin`, `@prefabs.tech/fastify-config`, and `stripe`. See `package.json` for supported version ranges.

## Usage

### Register Plugin

Register the stripe plugin with your Fastify instance:

```typescript
import stripePlugin from "@prefabs.tech/fastify-stripe";
import configPlugin from "@prefabs.tech/fastify-config";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register fastify-config plugin
  await fastify.register(configPlugin, { config });

  // Register stripe plugin (pass the same object as `config.stripe` — same idea as
  // `register(mailerPlugin, config.mailer)` / `register(graphqlPlugin, config.graphql)`)
  await fastify.register(stripePlugin, config.stripe);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```

You must pass the Stripe options object as the second argument to `register` (typically `config.stripe`), matching `@prefabs.tech/fastify-mailer`, `@prefabs.tech/fastify-slonik`, and other prefabs plugins. Omitting options or passing `{}` throws at registration time.

If a service does not use Stripe, do not register this plugin (you may still omit `stripe` from `ApiConfig` for `StripeClient` usage elsewhere).

## Configuration

Add Stripe configuration to your config:

```typescript
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  // ...other config
  stripe: {
    apiKey: "sk_test_...",
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookPath: "/payment/webhook", // Optional, defaults to "/payment/webhook"
    webhookSecret: "whsec_...",
    allowPromotionCodes: true, // Optional, enables promotion code support
    clientConfig: {}, // Optional, custom Stripe client configuration
    urls: {
      cancel: "https://your-domain.com/cancel",
      success: "https://your-domain.com/success",
    },
    handlers: {
      webhook: async (request, event) => {
        // Handle Stripe events
        switch (event.type) {
          case "checkout.session.completed":
            // Handle successful checkout
            break;
          case "payment_intent.succeeded":
            // Handle successful payment
            break;
          // ... handle other events
        }
      },
    },
  },
};
```


## Using the Stripe Client

The package exports a `StripeClient` class for creating checkout sessions:

```typescript
import { StripeClient } from "@prefabs.tech/fastify-stripe";

// Initialize the client with your config
const stripeClient = new StripeClient(config);

// Create a checkout session
const session = await stripeClient.createCheckoutSession({
  productName: "Premium Subscription",
  unitAmount: 2999, // Amount in cents ($29.99)
  quantity: 1,
  currency: "usd", // Optional, uses defaultCurrency if not provided
  mode: "payment", // Optional: "payment" | "subscription" | "setup"
  successUrl: "https://your-domain.com/success", // Optional, uses config if not provided
  cancelUrl: "https://your-domain.com/cancel", // Optional, uses config if not provided
}, {
  // Optional metadata
  userId: "user_123",
  orderId: "order_456",
});
```

### Custom Webhook Handler

When `enablePaymentWebhook` is `true` you should provide a `handlers.webhook` function to process Stripe events. If you don't, the plugin logs a warning at registration time and the route falls back to a default handler that acknowledges the event with HTTP 200 and logs an error — so Stripe does not retry the delivery indefinitely, but the misconfiguration is loud in the logs.

```typescript
import type { FastifyRequest } from "fastify";
import type { StripeEvent } from "@prefabs.tech/fastify-stripe";

const customWebhookHandler = async (
  request: FastifyRequest,
  event: StripeEvent,
): Promise<void> => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Fulfill the purchase
      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      // Handle successful payment
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      // Handle failed payment
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
};

// Add to config
const config: ApiConfig = {
  stripe: {
    // ...other config
    urls: {
      cancel: "https://your-domain.com/cancel",
      success: "https://your-domain.com/success",
    },
    handlers: {
      webhook: customWebhookHandler,
    },
  },
};
```

## API Version

This package does not pin a Stripe API version — it forwards `config.stripe.clientConfig` (including `apiVersion`) unmodified to the [`Stripe`](https://github.com/stripe/stripe-node) constructor. When `apiVersion` is omitted, the default pinned by the installed `stripe` SDK is used. For production deployments, pin `apiVersion` explicitly via `clientConfig.apiVersion` so SDK upgrades don't silently change the API version:

```typescript
const config: ApiConfig = {
  stripe: {
    apiKey: process.env.STRIPE_API_KEY!,
    // ...
    clientConfig: {
      apiVersion: "2024-11-20.acacia",
    },
  },
};
```
