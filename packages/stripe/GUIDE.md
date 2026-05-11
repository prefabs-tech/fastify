# `@prefabs.tech/fastify-stripe` — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-stripe
```

```bash
pnpm add @prefabs.tech/fastify-stripe
```

Peer dependencies: `fastify` (>=5.2.1), `fastify-plugin` (>=5.0.1), `@prefabs.tech/fastify-config` (aligned with your app). Install those in your app as well.

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-stripe build
pnpm --filter @prefabs.tech/fastify-stripe typecheck
```

---

## Setup

The plugin reads Stripe settings from `fastify.config`, provided by `@prefabs.tech/fastify-config`. Register **config first**, then this plugin.

```typescript
import Fastify from "fastify";
import configPlugin from "@prefabs.tech/fastify-config";
import stripePlugin from "@prefabs.tech/fastify-stripe";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  // ...other ApiConfig fields required by your app
  stripe: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    urls: {
      cancel: "https://example.com/cancel",
      success: "https://example.com/success",
    },
    handlers: {
      webhook: async (request, event) => {
        // implement handling (required for real traffic; default handler throws)
      },
    },
  },
};

const app = Fastify({ logger: true });

await app.register(configPlugin, { config });
await app.register(stripePlugin);

await app.listen({ port: 3000, host: "0.0.0.0" });
```

**All later examples assume** `config`, `app`, and registration order as above unless noted.

---

## Base Libraries

### stripe — Modified

The official Node Stripe SDK for API calls, webhooks, and types.

→ **Their docs:** [Stripe API reference](https://docs.stripe.com/api)

We wrap this library with a different surface for checkout: **`StripeClient.createCheckoutSession`** accepts our `CreateSessionInput` and builds a fixed `checkout.sessions.create` payload (one line item with inline `price_data`, not arbitrary `SessionCreateParams`). Constructor options for the client are passed through via `StripeConfig.clientConfig` (`Stripe.StripeConfig`). Webhook verification uses `webhooks.constructEvent` with the same rules as Stripe’s docs; we add Fastify-specific wiring (raw body, headers, HTTP errors).

**What we add on top:** `StripeClient` helper, opinionated checkout session builder, `getActivePromotionCode`, Fastify route + `preHandler` for signed webhooks, JSON buffer parser exposing `rawBody`, and types `StripeConfig` / `StripeEvent` for your app.

### @prefabs.tech/fastify-config — Partial passthrough (integration)

Shared config plugin; this package extends its TypeScript `ApiConfig` with `stripe` and reads `fastify.config.stripe` at runtime.

→ **Their docs:** [`@prefabs.tech/fastify-config` on npm](https://www.npmjs.com/package/@prefabs.tech/fastify-config)

**What we add on top:** The `stripe` key shape (`StripeConfig`) and module augmentation so TypeScript knows `config.stripe` exists when you use this plugin.

---

## Features

### Config typing (`StripeConfig`, `StripeEvent`, `ApiConfig` augmentation)

Import `StripeConfig` for your config object. `StripeEvent` is the event type for custom webhook handlers. `ApiConfig` is augmented so `stripe` is part of the typed config.

```typescript
import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { StripeConfig, StripeEvent } from "@prefabs.tech/fastify-stripe";

const stripe: StripeConfig = {
  apiKey: "sk_test_...",
  defaultCurrency: "usd",
  enablePaymentWebhook: false,
  urls: { cancel: "https://example.com/c", success: "https://example.com/s" },
};

const config: ApiConfig = { /* ... */ stripe };

const handle = async (_req: unknown, event: StripeEvent) => {
  console.log(event.type);
};
```

### Default webhook path constant

Use `ROUTE_STRIPE_WEBHOOK` when aligning proxies or docs with the default mount path.

```typescript
import { ROUTE_STRIPE_WEBHOOK } from "@prefabs.tech/fastify-stripe";
// "/payment/webhook"
```

### Plugin skip when `config.stripe` is missing

If `stripe` is not on `config`, the plugin logs a warning and registers nothing. Ensure `configPlugin` runs with a `config` that includes `stripe` when you need Stripe.

### Gating webhooks with `enablePaymentWebhook`

Set `enablePaymentWebhook: true` to register the webhook parser, verification `preHandler`, and `POST` route. Set `false` to use only client-side helpers (e.g. `StripeClient`) without an HTTP webhook.

```typescript
const config: ApiConfig = {
  /* ... */
  stripe: {
    apiKey: "sk_test_...",
    defaultCurrency: "usd",
    enablePaymentWebhook: false,
    urls: { cancel: "https://example.com/c", success: "https://example.com/s" },
  },
};
```

### Custom webhook URL

Override the path with `webhookPath`; otherwise the route is `POST` `ROUTE_STRIPE_WEBHOOK`.

```typescript
const config: ApiConfig = {
  /* ... */
  stripe: {
    apiKey: "sk_test_...",
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookPath: "/v1/stripe/webhook",
    webhookSecret: "whsec_...",
    urls: { cancel: "https://example.com/c", success: "https://example.com/s" },
    handlers: { webhook: async () => {} },
  },
};
```

### Webhook signature verification and error responses

The route runs a `preHandler` that calls `stripe.webhooks.constructEvent` using `request.rawBody` and `config.stripe.webhookSecret`. Missing secret, missing `stripe-signature` header, missing `rawBody`, or verification failure yields HTTP `400` with a JSON body `{ error: string }`; failures are logged. On success the verified event is available to your handler logic (the route implementation reads it from the request after verification).

```typescript
// Unsigned or malformed webhook calls return 400 + { error: string } before your handler runs.

const bad = await fetch("http://127.0.0.1:3000/payment/webhook", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

console.assert(bad.status === 400);
(await bad.json()) as { error: string };
```

### Custom webhook handler

Implement `handlers.webhook` to process verified events. Without it, the built-in default handler throws.

```typescript
import type { FastifyRequest } from "fastify";
import type { StripeEvent } from "@prefabs.tech/fastify-stripe";

const config: ApiConfig = {
  /* ... */
  stripe: {
    apiKey: "sk_test_...",
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookSecret: "whsec_...",
    urls: { cancel: "https://example.com/c", success: "https://example.com/s" },
    handlers: {
      webhook: async (request: FastifyRequest, event: StripeEvent) => {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          request.log.info({ sessionId: session.id }, "checkout completed");
        }
      },
    },
  },
};
```

### `StripeClient` and checkout sessions

Use `StripeClient` where you have a full `ApiConfig` (e.g. service layer). It exposes `.stripe` for full SDK access and `createCheckoutSession` for the opinionated one-line-item flow.

```typescript
import { StripeClient } from "@prefabs.tech/fastify-stripe";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

declare const config: ApiConfig;

const client = new StripeClient(config);

const session = await client.createCheckoutSession(
  {
    productName: "Pro plan",
    unitAmount: 2900,
    quantity: 1,
    currency: "usd",
    mode: "payment",
  },
  { userId: "user_123" },
);

// Full SDK access when needed:
const balance = await client.stripe.balance.retrieve();
```

### Promotion codes lookup

Resolve an active promotion code by its customer-visible code string.

```typescript
import { StripeClient } from "@prefabs.tech/fastify-stripe";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

declare const config: ApiConfig;

const client = new StripeClient(config);
const promo = await client.getActivePromotionCode("SUMMER25");
```

### Optional `registerRawBodyParser`

If another part of your app needs `request.rawBody` for `application/json`, you can register the same parser explicitly (the webhook submodule registers it when webhooks are enabled).

```typescript
import Fastify from "fastify";
import { registerRawBodyParser } from "@prefabs.tech/fastify-stripe";

const app = Fastify();

registerRawBodyParser(app);

app.post("/manual-echo", async (request) => ({
  len: Buffer.isBuffer(request.rawBody)
    ? request.rawBody.length
    : String(request.rawBody ?? "").length,
}));
```

---

## Use Cases

### One-time payment checkout URL from your API

Use `StripeClient` with config defaults for URLs and currency so callers only send product details.

```typescript
import { StripeClient } from "@prefabs.tech/fastify-stripe";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

declare const config: ApiConfig;

export async function createPaymentLink(customerId: string) {
  const client = new StripeClient(config);

  return client.createCheckoutSession(
    {
      productName: "One-time credits",
      unitAmount: 5000,
    },
    { customerId },
  );
}
```

### Stripe Dashboard webhook → verified handler in Fastify

Point Stripe’s webhook endpoint to your deployed `POST` URL (default `/payment/webhook` unless customized). Set `webhookSecret` from the Dashboard signing secret and implement `handlers.webhook`.

```typescript
const config: ApiConfig = {
  /* ... */
  stripe: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    urls: {
      cancel: `${process.env.PUBLIC_ORIGIN}/cancel`,
      success: `${process.env.PUBLIC_ORIGIN}/success`,
    },
    handlers: {
      webhook: async (request, event) => {
        switch (event.type) {
          case "checkout.session.completed":
            await fulfillOrder(request.server, event.data.object.id);
            break;
          default:
            request.log.debug({ type: event.type }, "stripe webhook ignored");
        }
      },
    },
  },
};

async function fulfillOrder(_server: unknown, _sessionId: string) {
  // your domain logic
}
```

### Stripe-only API server (no HTTP webhook)

Disable the route and use the client for Checkout or other Stripe APIs.

```typescript
const config: ApiConfig = {
  /* ... */
  stripe: {
    apiKey: "sk_test_...",
    defaultCurrency: "usd",
    enablePaymentWebhook: false,
    urls: { cancel: "https://example.com/c", success: "https://example.com/s" },
  },
};
```

