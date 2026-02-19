# @prefabs.tech/fastify-stripe

A [Fastify](https://github.com/fastify/fastify) plugin for that provides easy integration of Stripe for payment processing.

## Features

- **Stripe Checkout Sessions**: Create Stripe checkout sessions for one-time payments
- **Webhook Handling**: Built-in webhook endpoint with signature verification
- **Custom Webhook Handlers**: Support for custom webhook event handlers
- **Configurable Routes**: Customizable webhook endpoint paths

## Requirements

- [@prefabs.tech/fastify-config](https://www.npmjs.com/package/@prefabs.tech/fastify-config)

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

  // Register stripe plugin
  await fastify.register(stripePlugin);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```

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
    redirectUrl: {
      callbackWebhook: "https://your-domain.com/webhook",
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

You can provide a custom webhook handler to process Stripe events:

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
const config = {
  stripe: {
    // ...other config
    handlers: {
      webhook: customWebhookHandler,
    },
  },
};
```

## API Version

This package uses Stripe API version: `2025-12-15.clover`
