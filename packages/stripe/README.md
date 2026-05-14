# `@prefabs.tech/fastify-stripe`

Fastify integration for Stripe: optional verified webhooks with a scoped raw-body parser, config typing against [`@prefabs.tech/fastify-config`](../config), and a small `StripeClient` helper around the Stripe Node SDK.

## Why This Package?

Handling Stripe correctly in Fastify means signature verification against the exact request bytes, encapsulating parsers so other JSON routes stay normal, and keeping secrets and URLs typed next to the rest of your app config. This package wires those pieces with the same `register(plugin, config.slice)` pattern as other prefabs plugins, so you do not rebuild webhook safety and checkout helpers in every service.

## What You Get

### `stripe` (Stripe Node SDK) — Partial passthrough / modified

Most of the live API is available on the `Stripe` instance from `StripeClient` — see the [Stripe API reference](https://stripe.com/docs/api) and [stripe-node](https://github.com/stripe/stripe-node). This package modifies or narrows the surface in these ways:

- **`new Stripe(...)`** — Constructed for you via `StripeClient` from `config.stripe.apiKey` and optional `clientConfig` passed through unchanged to the SDK constructor.
- **Checkout** — `createCheckoutSession` does not accept arbitrary `SessionCreateParams`; it takes a fixed `CreateSessionInput` shape and builds the session payload with opinionated defaults (URLs, currency, line item, metadata by mode).
- **Promotion codes** — `getActivePromotionCode` wraps `promotionCodes.list` with `active: true` and returns only the first match.
- **Webhooks** — Verification uses `Stripe.webhooks.constructEvent` on `request.rawBody` and the `stripe-signature` header; no extra transformation beyond that.

### `@prefabs.tech/fastify-config` — Modified (integration only)

The package augments `ApiConfig` from [`@prefabs.tech/fastify-config`](../config) with optional `stripe?: StripeConfig`. `StripeClient` reads `config.stripe` from a full `ApiConfig` instance; it does not replace the config system.

### Added by This Package

- **Optional webhook route** — `POST` on `webhookPath` or default `ROUTE_STRIPE_WEBHOOK` (`/payment/webhook`), with signature preHandler and user or safe default handler.
- **Scoped raw-body JSON parser** — Webhook controller registers `application/json` parsing with `request.rawBody` only inside its encapsulation; `registerRawBodyParser` is exported for your own routes.
- **`StripeClient`** — SDK instance plus `createCheckoutSession` and `getActivePromotionCode`.
- **Types** — Exported `StripeConfig`, `StripeEvent`; request augmentations for `stripeEvent` and `rawBody` when you import the package.

→ [Full feature list](FEATURES.md) | [Developer guide](GUIDE.md)

## Usage Guidelines

- **Pass real options** — Register with the same `config.stripe` object you put on `ApiConfig`. Empty or missing options throw at register time so misconfiguration fails fast.
- **Webhooks need the secret** — If you enable the webhook route, configure `webhookSecret` for production verification; without it, the preHandler responds with 400 (see [FEATURES.md](FEATURES.md)).
- **Parser scope** — Enabling the webhook installs the raw-body JSON parser only on the webhook sub-scope. Other routes keep the parent’s JSON parser. For a custom route that must verify Stripe (or needs `rawBody`), call `registerRawBodyParser` on that scope — do not assume `rawBody` exists globally.
- **Custom handler vs default** — If `enablePaymentWebhook` is true and you omit `handlers.webhook`, registration logs a warning and the default handler acknowledges events so Stripe does not retry forever; you still need a custom handler to implement your domain logic.

```typescript
// Avoid: registering with no stripe slice
await fastify.register(stripePlugin, {});

// Correct: same object as config.stripe
await fastify.register(stripePlugin, config.stripe);
```

## Requirements

Install and register [`@prefabs.tech/fastify-config`](../config) first. Peers (see `package.json`): `fastify` >= 5.2.2, `fastify-plugin` >= 5.0.1, `@prefabs.tech/fastify-config` 0.94.0. Node >= 20.

## Quick Start

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import stripePlugin from "@prefabs.tech/fastify-stripe";
import Fastify from "fastify";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  stripe: {
    apiKey: process.env.STRIPE_API_KEY!,
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    urls: { success: "https://example.com/success", cancel: "https://example.com/cancel" },
    handlers: {
      webhook: async (_request, event) => {
        /* handle event.type */
      },
    },
  },
};

const app = Fastify({ logger: true });
await app.register(configPlugin, { config });
await app.register(stripePlugin, config.stripe);
await app.listen({ port: 3000, host: "0.0.0.0" });
```

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-stripe @prefabs.tech/fastify-config fastify fastify-plugin
```

Install with pnpm:

```bash
pnpm add @prefabs.tech/fastify-stripe @prefabs.tech/fastify-config fastify fastify-plugin
```

The `stripe` package is bundled as a dependency of `@prefabs.tech/fastify-stripe`; add it separately only if you use the SDK outside this plugin.
