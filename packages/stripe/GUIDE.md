# `@prefabs.tech/fastify-stripe` — Developer Guide

A Fastify plugin that wires Stripe payment processing into your app: a configurable webhook endpoint with signature verification, a raw-body content-type parser, and a `StripeClient` helper for one-shot Checkout session creation.

This guide assumes familiarity with Fastify and the [Stripe Node SDK](https://github.com/stripe/stripe-node). For the wrapped library's full API, refer to its own docs (linked below) — this guide only documents what *we* add on top.

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-stripe @prefabs.tech/fastify-config fastify fastify-plugin
```

```bash
pnpm add @prefabs.tech/fastify-stripe @prefabs.tech/fastify-config fastify fastify-plugin
```

The `stripe` SDK is bundled as a direct dependency of this package (see `package.json`), so you do not install it separately unless you choose to add it for your own scripts.

Peer dependencies enforced by `package.json`: `fastify >= 5.2.2`, `fastify-plugin >= 5.0.1`, `@prefabs.tech/fastify-config 0.94.0`.

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-stripe test
pnpm --filter @prefabs.tech/fastify-stripe build
pnpm --filter @prefabs.tech/fastify-stripe typecheck
pnpm --filter @prefabs.tech/fastify-stripe lint
```

## Setup

Register `@prefabs.tech/fastify-config` first, then pass `config.stripe` into the Stripe plugin at register time — the same integration pattern as `@prefabs.tech/fastify-graphql`, `@prefabs.tech/fastify-slonik`, and `@prefabs.tech/fastify-mailer` (`register(plugin, config.<slice>)`).

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import stripePlugin from "@prefabs.tech/fastify-stripe";
import Fastify from "fastify";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  // ...your other config
  stripe: {
    apiKey: process.env.STRIPE_API_KEY!,
    defaultCurrency: "usd",
    enablePaymentWebhook: true,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    urls: {
      cancel: "https://example.com/cancel",
      success: "https://example.com/success",
    },
    handlers: {
      webhook: async (request, event) => {
        request.server.log.info({ type: event.type }, "received Stripe event");
      },
    },
  },
};

const fastify = Fastify({ logger: true });

await fastify.register(configPlugin, { config });
await fastify.register(stripePlugin, config.stripe);

await fastify.listen({ port: 3000, host: "0.0.0.0" });
```

Recommended: pass `config.stripe` as the second argument to `register`, like `@prefabs.tech/fastify-mailer` / `@prefabs.tech/fastify-graphql`. If you omit options or pass `{}`, the plugin logs a warning and reads `fastify.config.stripe` (after `@prefabs.tech/fastify-config` has run). If `config.stripe` is missing in that case, registration throws with `"Missing stripe configuration. Did you forget to pass it to the stripe plugin?"`.

All examples below assume this setup is in place. Examples will only show the relevant subset of `config.stripe` rather than repeating the whole object.

> **Heads up:** registering this plugin with `enablePaymentWebhook: true` installs an `application/json` content-type parser scoped to the webhook controller's plugin encapsulation. The webhook route gets `request.rawBody` populated; other JSON routes on the parent instance are unaffected. If you want `request.rawBody` on a route you control, call `registerRawBodyParser(fastify)` yourself — see the [Raw Body Parser](#raw-body-parser-registerrawbodyparser) section.

---

## Base Libraries

### `stripe` (Stripe Node SDK) — Partial Passthrough / Modified

The official [Stripe Node SDK](https://github.com/stripe/stripe-node) for talking to the Stripe API.

→ **Their docs:** [Stripe API reference](https://docs.stripe.com/api) · [stripe-node README](https://github.com/stripe/stripe-node#readme)

This package exposes the SDK partially:

- **`clientConfig` is passed through unchanged.** Anything you put on `config.stripe.clientConfig` (`apiVersion`, `httpClient`, `maxNetworkRetries`, `timeout`, `telemetry`, etc.) is forwarded directly to `new Stripe(apiKey, clientConfig)`.
- **`webhooks.constructEvent` is passed through unchanged.** The webhook route runs an internal `preHandler` (implemented as `createVerifyStripeSignature` in source, **not exported**) that calls `Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` and attaches the result to `request.stripeEvent`.
- **`checkout.sessions.create` is wrapped with a different surface.** `StripeClient.createCheckoutSession` accepts a flat `CreateSessionInput` (one product, one quantity, one amount) and synthesizes a fixed `SessionCreateParams` payload. You **cannot** pass arbitrary Checkout options through this helper — for advanced cases use `client.stripe.checkout.sessions.create(...)` directly.
- **`promotionCodes.list` is wrapped with a different surface.** `StripeClient.getActivePromotionCode` hardcodes `active: true` and returns only the first match. For full search behavior, call `client.stripe.promotionCodes.list(...)` directly.

**What we add on top:**

- A Fastify plugin that wires the webhook endpoint when `enablePaymentWebhook` is set.
- A signature-verification preHandler with structured 400 responses and log lines.
- A raw-body content-type parser that retains `request.rawBody` (required for `webhooks.constructEvent`).
- A config-aware `StripeClient` helper with default URLs, currency, and promotion-code wiring.
- Module augmentations so `ApiConfig.stripe`, `request.rawBody`, and `request.stripeEvent` are typed without manual declaration.

---

## Features

### Plugin registration and options

`stripePlugin` is `fastify-plugin`-wrapped, so its decorations attach to the top-level Fastify instance.

Prefer `register(stripePlugin, config.stripe)`. You may call `register(stripePlugin)` or `register(stripePlugin, {})` after the config plugin has decorated `fastify.config`; the Stripe plugin will then use `fastify.config.stripe` (with a warning). Empty-options registration without `config.stripe` fails with the same `"Missing stripe…"` message as `@prefabs.tech/fastify-mailer` when mailer config is missing.

Services that do not use Stripe should **not** register this plugin (you may omit `stripe` from `ApiConfig` entirely on those services).

### Webhook endpoint toggle (`enablePaymentWebhook`)

The webhook route is only registered when `config.stripe.enablePaymentWebhook` is truthy. Use this to keep the rest of `config.stripe` available (for `StripeClient`) without exposing a webhook endpoint on services that don't need one.

```typescript
{
  stripe: {
    apiKey: process.env.STRIPE_API_KEY!,
    defaultCurrency: "usd",
    enablePaymentWebhook: false, // no /payment/webhook route registered
    urls: { cancel: "...", success: "..." },
  },
}
```

### Configurable webhook route path

The default route is `/payment/webhook`, exported as `ROUTE_STRIPE_WEBHOOK`. Override it via `config.stripe.webhookPath`.

```typescript
import { ROUTE_STRIPE_WEBHOOK } from "@prefabs.tech/fastify-stripe";

console.log(ROUTE_STRIPE_WEBHOOK); // "/payment/webhook"

{
  stripe: {
    // ...
    webhookPath: "/stripe/events",
  },
}
```

### Custom webhook handler (`handlers.webhook`)

Provide a function on `config.stripe.handlers.webhook` to receive the verified event. It is called with the Fastify `request` and a `Stripe.Event`.

If you omit it but still set `enablePaymentWebhook: true`, the plugin logs a warning at registration time and the route falls back to a default handler that **acknowledges the event with HTTP 200 and logs an error** containing the event id and type. This is intentional: returning a non-2xx status would cause Stripe to retry the delivery with exponential backoff, so the package optimizes for "your logs scream that you forgot to wire a handler" rather than "Stripe retries indefinitely".

```typescript
import type { StripeEvent } from "@prefabs.tech/fastify-stripe";
import type { FastifyRequest } from "fastify";

const handleWebhook = async (
  request: FastifyRequest,
  event: StripeEvent,
): Promise<void> => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      request.server.log.info({ sessionId: session.id }, "checkout complete");
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      request.server.log.warn({ intentId: intent.id }, "payment failed");
      break;
    }
  }
};

{
  stripe: {
    // ...
    handlers: { webhook: handleWebhook },
  },
}
```

### Signature verification (webhook `preHandler`)

Before your webhook handler runs, the route executes a bundled `preHandler` that verifies the Stripe signature. You cannot import this preHandler factory from the package; it validates the `stripe-signature` header against `webhookSecret` using `Stripe.webhooks.constructEvent` (same semantics as in the Stripe Node SDK). All failures return HTTP 400 with a `{ error }` body and log an error line:

| Condition                                              | Status | Response body                                                       |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------- |
| `webhookSecret` unset on resolved Stripe config           | 400    | `{ error: "Webhook secret not configured" }`                        |
| `stripe-signature` header missing                      | 400    | `{ error: "Missing stripe-signature header" }`                      |
| `request.rawBody` missing                              | 400    | `{ error: "Raw body is not available for signature verification" }` |
| `Stripe.webhooks.constructEvent` throws                | 400    | `{ error: "Webhook signature verification failed" }`                |

On success, the verified `Stripe.Event` is attached to `request.stripeEvent`. The field is typed via module augmentation, so it is automatically available on `FastifyRequest`:

```typescript
import type { FastifyRequest } from "fastify";

function readEvent(request: FastifyRequest) {
  const event = request.stripeEvent;
  // ...
}
```

If verification succeeds but `request.stripeEvent` is missing afterward, the webhook route responds with HTTP 500 (defensive; should not occur in normal operation).

### Raw body parser (`registerRawBodyParser`)

Stripe's signature verification requires the *exact* raw request bytes. The webhook controller installs an `application/json` content-type parser that retains the raw buffer on `request.rawBody` while still parsing JSON for downstream handlers. JSON parse errors are tagged with `statusCode: 400`, so Fastify responds 400 instead of a generic 500.

The parser is installed inside the webhook controller's plugin scope, so it applies to the webhook route but **does not** override `application/json` parsing on other routes registered on the parent Fastify instance.

If you want the raw body on routes you control (e.g. a custom raw-body-aware endpoint), import the parser directly and register it on the instance where those routes live:

```typescript
import { registerRawBodyParser } from "@prefabs.tech/fastify-stripe";

registerRawBodyParser(fastify);

fastify.post("/custom-webhook", async (request) => {
  return { rawBytes: request.rawBody?.length ?? 0 };
});
```

### `StripeConfig` and `StripeEvent` types

`StripeConfig` is the shape of `config.stripe` — a curated subset of options used by this package, augmented onto `ApiConfig`. `StripeEvent` is a re-export of `Stripe.Event` so consumers don't need to import from `stripe` directly.

```typescript
import type {
  StripeConfig,
  StripeEvent,
} from "@prefabs.tech/fastify-stripe";

const stripeConfig: StripeConfig = {
  apiKey: process.env.STRIPE_API_KEY!,
  defaultCurrency: "usd",
  enablePaymentWebhook: true,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  urls: { cancel: "...", success: "..." },
};

function logEvent(event: StripeEvent) {
  console.log(event.type, event.id);
}
```

### `StripeClient` — config-aware Stripe wrapper

`StripeClient` is a small class that holds an `ApiConfig` and exposes:

- `client.stripe` — the raw `Stripe` SDK instance, for any call this package doesn't wrap.
- `createCheckoutSession(input, metadata?)` — one-product Checkout session helper.
- `getActivePromotionCode(code)` — promo code lookup (active-only, first match).

The constructor throws if `config.stripe` is unset:

```typescript
new StripeClient({} as ApiConfig);
// Error: StripeClient requires config.stripe to be set on the provided ApiConfig.
```

```typescript
import { StripeClient } from "@prefabs.tech/fastify-stripe";

const client = new StripeClient(fastify.config);

const session = await client.createCheckoutSession(
  {
    productName: "Premium Plan",
    unitAmount: 2999,
  },
  { userId: "user_123" },
);

console.log(session.url);
```

#### `createCheckoutSession` defaults and behavior

`createCheckoutSession` builds a `SessionCreateParams` payload with these defaults applied when fields are unset on `input`:

| Field         | Default                                    |
| ------------- | ------------------------------------------ |
| `quantity`    | `1`                                        |
| `mode`        | `"payment"`                                |
| `currency`    | `config.stripe.defaultCurrency`            |
| `successUrl`  | `config.stripe.urls.success`               |
| `cancelUrl`   | `config.stripe.urls.cancel`                |

`config.stripe.allowPromotionCodes` is forwarded as `allow_promotion_codes` (passing `undefined` is fine — Stripe ignores it).

When the optional `metadata` argument is provided, it is written to `session.metadata` *and* to the mode-specific data block so it surfaces on the downstream object too:

| Mode             | Mode-specific placement              |
| ---------------- | ------------------------------------ |
| `"payment"`      | `payment_intent_data.metadata`       |
| `"subscription"` | `subscription_data.metadata`         |
| `"setup"`        | `setup_intent_data.metadata`         |

Only the placement matching the selected mode is set — Stripe rejects mode-specific `*_data` blocks that don't match the session mode, so the helper picks the right one for you. When `metadata` is omitted, the helper leaves `metadata` and every `*_data` block off the payload entirely.

```typescript
await client.createCheckoutSession(
  {
    productName: "Annual subscription",
    unitAmount: 9900,
    currency: "eur",
    mode: "subscription",
    quantity: 1,
    successUrl: "https://example.com/thanks",
    cancelUrl: "https://example.com/cancelled",
  },
  { orderId: "order_42", source: "campaign-q4" },
);
```

If you need anything `CreateSessionInput` doesn't cover (multiple line items, tax rates, shipping options, customer fields, etc.), bypass the helper and call the SDK directly:

```typescript
const session = await client.stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [
    { price: "price_1", quantity: 1 },
    { price: "price_2", quantity: 2 },
  ],
  success_url: "https://example.com/success",
  cancel_url: "https://example.com/cancel",
});
```

#### `getActivePromotionCode`

Looks up an *active* promotion code by its customer-facing string and returns the first matching `Stripe.PromotionCode`, or `undefined` if there is no match. Note that this never paginates — if you have multiple active codes that share the same string (rare), only the first one Stripe returns is visible.

```typescript
const promo = await client.getActivePromotionCode("LAUNCH20");

if (promo) {
  console.log(promo.id, promo.coupon.percent_off);
}
```

### Module augmentations

Importing this package brings these ambient TypeScript augmentations into scope:

- `ApiConfig` (from `@prefabs.tech/fastify-config`) gains an optional `stripe?: StripeConfig` field. Optional so other consumers of `ApiConfig` aren't forced to declare a Stripe block; the plugin checks for and warns when it is missing.
- `FastifyRequest` gains optional `rawBody?: Buffer` and `stripeEvent?: Stripe.Event` fields.

You do not need to redeclare these fields — import the package in your entry file so the augmentations apply.

---

## Use Cases

### Accept a one-time payment for a single product

When all you need is a "buy this thing" flow, `createCheckoutSession` is the shortest path. Register the plugin, expose a route that creates a session, and rely on the webhook handler for fulfillment.

```typescript
import { StripeClient } from "@prefabs.tech/fastify-stripe";

fastify.post<{ Body: { productName: string; amountCents: number } }>(
  "/checkout",
  async (request) => {
    const client = new StripeClient(fastify.config);
    const session = await client.createCheckoutSession(
      {
        productName: request.body.productName,
        unitAmount: request.body.amountCents,
      },
      { userId: request.user?.id ?? "anonymous" },
    );

    return { url: session.url };
  },
);
```

Fulfillment runs in `config.stripe.handlers.webhook` on the `checkout.session.completed` event, using the `metadata.userId` to look up which customer to deliver to.

### Use the Stripe SDK directly while keeping the helper

For workflows that need full SDK access (custom line items, subscriptions with price IDs, invoices, refunds…) use `client.stripe` — the helper class is a convenience layer, not a wall.

```typescript
const client = new StripeClient(fastify.config);

const customer = await client.stripe.customers.create({
  email: "buyer@example.com",
  name: "Buyer",
});

const subscription = await client.stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: "price_monthly_premium" }],
});
```

### Service that talks to Stripe but does not host a webhook

Some services need to call the Stripe API but don't terminate webhooks themselves (e.g. a worker that processes events forwarded from another service, or an API that only creates checkout sessions). Set `enablePaymentWebhook: false` to skip the route and the global raw-body parser.

```typescript
{
  stripe: {
    apiKey: process.env.STRIPE_API_KEY!,
    defaultCurrency: "usd",
    enablePaymentWebhook: false,
    urls: { cancel: "...", success: "..." },
  },
}
```

`StripeClient` still works exactly the same.

### Verify a webhook signature manually

If you need to handle Stripe webhooks on a non-standard path or alongside other handlers, install the raw-body parser yourself and run signature verification directly. The package's preHandler is internal, so you'd reproduce its logic with `client.stripe.webhooks.constructEvent`:

```typescript
import { StripeClient, registerRawBodyParser } from "@prefabs.tech/fastify-stripe";

registerRawBodyParser(fastify);

const client = new StripeClient(fastify.config);

fastify.post("/my-stripe-webhook", async (request, reply) => {
  const signature = request.headers["stripe-signature"];

  if (!signature || !request.rawBody) {
    return reply.status(400).send({ error: "Missing signature or body" });
  }

  try {
    const event = client.stripe.webhooks.constructEvent(
      request.rawBody,
      signature,
      fastify.config.stripe.webhookSecret!,
    );

    return { received: true, type: event.type };
  } catch (error) {
    request.server.log.error({ err: error }, "signature verification failed");
    return reply.status(400).send({ error: "Invalid signature" });
  }
});
```

### Gate a campaign behind an active promotion code

`getActivePromotionCode` is convenient for "does this code exist and is it currently active?" checks before redirecting a user into Checkout. Combine it with `createCheckoutSession` and rely on `config.stripe.allowPromotionCodes` to surface the field in the Stripe-hosted UI.

```typescript
fastify.post<{ Body: { code?: string } }>("/start-checkout", async (request, reply) => {
  const client = new StripeClient(fastify.config);

  if (request.body.code) {
    const promo = await client.getActivePromotionCode(request.body.code);

    if (!promo) {
      return reply.status(400).send({ error: "Invalid or expired promotion code" });
    }
  }

  const session = await client.createCheckoutSession({
    productName: "Annual plan",
    unitAmount: 9900,
    currency: "usd",
  });

  return { url: session.url };
});
```

The Checkout page will show a "promotion code" field because `config.stripe.allowPromotionCodes` is `true`; users still need to enter the code there — the pre-check just prevents wasted Checkout sessions.
