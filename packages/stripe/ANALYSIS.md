<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

# `@prefabs.tech/fastify-stripe` — Analysis

Package: `packages/stripe` (v0.93.4)
Entry: `src/index.ts` → exports plugin (default), `StripeClient`, `registerRawBodyParser`, `ROUTE_STRIPE_WEBHOOK`, `StripeConfig`, `StripeEvent`.

---

## Base Library Passthrough Analysis

### `stripe` (Stripe Node SDK, v20.3.1) — PARTIAL PASSTHROUGH / MODIFIED

- **Options type:** Custom subset (`StripeConfig`). Only the `clientConfig?: Stripe.StripeConfig` field is the SDK's own option type and is forwarded unmodified to `new Stripe(...)`.
- **Options passed:**
  - Constructor: `new Stripe(config.stripe.apiKey, config.stripe.clientConfig)` — full passthrough of `clientConfig`.
  - `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` — full passthrough.
  - `stripe.checkout.sessions.create(...)` — **MODIFIED**. We synthesize a fixed shape from `CreateSessionInput`: one `line_items` entry built from `productName`/`unitAmount`/`quantity`/`currency`, hardcoded `payment_intent_data.metadata` mirroring top-level metadata, default `mode = "payment"`, and config-driven URLs/`allow_promotion_codes`.
  - `stripe.promotionCodes.list(...)` — **MODIFIED**. Hardcoded `{ active: true, code }`; returns only `data[0]`.
- **Features restricted:**
  - Checkout session creation: cannot pass arbitrary `Stripe.Checkout.SessionCreateParams` — no subscription line items by `price` ID, no multi-item carts, no tax rates / discounts / shipping options / locale / customer fields, no `automatic_payment_methods`, etc. Consumers are pinned to a one-product, flat-amount form.
  - Promotion code lookup: forced to `active: true`, no pagination, only first match returned.
  - Webhook dispatching: not an event-typed router — just a single `(request, event)` callback. Per-event-type wiring is left to the consumer's handler.
- **Features added:**
  - Fastify plugin registration with `fastify-plugin` (no encapsulation).
  - Module augmentation: `ApiConfig.stripe: StripeConfig` on `@prefabs.tech/fastify-config`.
  - Module augmentation: `FastifyRequest.rawBody?: Buffer | string`.
  - Conditional webhook route registration via `enablePaymentWebhook` flag.
  - Configurable webhook route path (`webhookPath` with `/payment/webhook` default, exported as `ROUTE_STRIPE_WEBHOOK`).
  - Built-in `verifyStripeSignature` preHandler with structured 400 responses and pino logging.
  - Built-in raw-body content-type parser for `application/json` (writes `request.rawBody`).
  - Pluggable webhook handler via `config.stripe.handlers.webhook`, with a sentinel default that throws "Webhook handler not implemented".
  - `StripeClient` helper class with config-aware defaulting (`urls.success`, `urls.cancel`, `defaultCurrency`, `allowPromotionCodes`).
  - Re-exports: `StripeEvent = Stripe.Event` type alias.

### `zod` (v3.25.76) — UNUSED

Declared in `dependencies` but **not imported anywhere in `src/`**. Either dead dependency or reserved for downstream consumer use through the bundler's externals list.

### `supertokens-node` (peer ≥14.1.3) — UNUSED

Declared in `peerDependencies` and `devDependencies` but **not imported anywhere in `src/`**. Likely a leftover from a sibling package's template or reserved for future auth-aware behavior.

### `fastify`, `fastify-plugin`, `@prefabs.tech/fastify-config` — INFRASTRUCTURE

Used directly for plugin registration, route declaration, content-type parsing, and config typing. No options wrapped — these are the host framework rather than a wrapped dependency.

---

## Summary

### Public exports

- **`default` (plugin)** — `fastify-plugin`-wrapped Fastify plugin. Warns and no-ops when `config.stripe` is missing; conditionally registers the webhook controller when `enablePaymentWebhook` is set.
- **`StripeClient`** — class wrapping `Stripe` with config-driven `createCheckoutSession(input, metadata?)` and `getActivePromotionCode(code)` helpers.
- **`registerRawBodyParser`** (alias of `stripeRawBodyParser`) — installs a Fastify `application/json` content-type parser that retains the raw buffer on `request.rawBody`.
- **`ROUTE_STRIPE_WEBHOOK`** — `"/payment/webhook"` constant (default route).
- **`StripeConfig`** (type) — curated subset of plugin configuration (see `types/index.ts`).
- **`StripeEvent`** (type) — alias for `Stripe.Event`.

### Internal subplugins / modules (not directly exported, but reachable via the default plugin)

- **`webhookController`** — internal Fastify subplugin that wires raw body parser, `preHandler`, route handler, and dispatch.
- **`verifyStripeSignature`** — preHandler middleware verifying the `stripe-signature` header against the configured `webhookSecret`.
- **`webhookHandler`** (default) — throws `"Webhook handler not implemented"` sentinel.

### Framework constructs added

- `fastifyPlugin(plugin)` export — non-encapsulated registration at the top scope of the host Fastify instance.
- Two TypeScript module augmentations:
  - `@prefabs.tech/fastify-config` → adds `stripe: StripeConfig` to `ApiConfig`.
  - `fastify` → adds `rawBody?: Buffer | string` to `FastifyRequest`.
- `fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, ...)` — overrides Fastify's default JSON parsing for the *entire* instance once the webhook is enabled.
- `fastify.post(...)` route registration with `preHandler: [verifyStripeSignature]`.
- Nested plugin registration: `fastify.register(webhookController)`.
- Inline (non-module-augmented) cast: `request as FastifyRequest & { stripeEvent: Stripe.Event }` — the `stripeEvent` property is *not* declared via `declare module "fastify"`, only set and read through casts.

### Conditional branches (feature flags / guards)

1. `plugin.ts`: `if (!config.stripe)` → warn + early return.
2. `plugin.ts`: `if (config.stripe.enablePaymentWebhook)` → register webhook controller.
3. `webhook/controller.ts`: `if (fastify.config.stripe.enablePaymentWebhook)` → register route. **Redundant with #2** — the controller is only registered when the flag is already true.
4. `verifyStripeSignature.ts`: `if (!webhookSecret)` → 400 `"Webhook secret not configured"`.
5. `verifyStripeSignature.ts`: `if (!signature)` → 400 `"Missing stripe-signature header"`.
6. `verifyStripeSignature.ts`: `if (!rawBody)` → 400 `"Raw body is not available for signature verification"`.
7. `verifyStripeSignature.ts`: `try/catch` around `constructEvent` → 400 `"Webhook signature verification failed"`.
8. `webhook/controller.ts`: `if (!event)` → `throw new Error("Stripe event not found on request")`.
9. `webhook/controller.ts`: `if (fastify.config.stripe.handlers?.webhook)` → call custom handler; else fall through to default `webhookHandler`.
10. Five `??` defaults inside `StripeClient.createCheckoutSession` (see Defaults).

### Defaults

- `webhookPath` → `ROUTE_STRIPE_WEBHOOK = "/payment/webhook"`.
- `createCheckoutSession`:
  - `quantity` → `1`
  - `mode` → `"payment"`
  - `currency` → `config.stripe.defaultCurrency`
  - `successUrl` → `config.stripe.urls.success`
  - `cancelUrl` → `config.stripe.urls.cancel`
  - `allow_promotion_codes` → `config.stripe.allowPromotionCodes` (passed as-is; `undefined` if unset).
- `getActivePromotionCode` → returns `codes.data[0]` (no fallback; `undefined` when no match).
- Default webhook handler → throws "Webhook handler not implemented" (sentinel, forces consumer to wire `handlers.webhook`).

### Ours vs theirs at a glance

| File | "Ours" | "Theirs" |
|---|---|---|
| `index.ts` | Module augmentation of `ApiConfig`; re-exports | — |
| `constants.ts` | Default route path | — |
| `plugin.ts` | Missing-config guard + warn, `enablePaymentWebhook` gate, `fastify-plugin` wrap | — |
| `types/index.ts` | `StripeConfig`, `CreateSessionInput` (curated subsets) | `Stripe.Event` re-export |
| `utils/stripeClient.ts` | Config-aware defaults, flat-input → line_items synthesis, dual metadata placement, single-result helper | `new Stripe(...)`, `sessions.create`, `promotionCodes.list` |
| `utils/stripeRawBodyParser.ts` | Augment `FastifyRequest`, save raw buffer, JSON-parse, error-forward via `done` | `addContentTypeParser`, `JSON.parse` |
| `middlewares/verifyStripeSignature.ts` | Three validation guards, structured 400s, pino logging, attach event to request | `stripe.webhooks.constructEvent` |
| `webhook/controller.ts` | Route registration, raw-body parser install, custom-vs-default dispatch | `fastify.post`, `fastify.register` |
| `webhook/handler.ts` | Sentinel "not implemented" error | — |

### Notable behaviors / gotchas (for downstream test / doc skills)

- **Two Stripe client instantiations.** `StripeClient.constructor` creates one; `verifyStripeSignature` creates a fresh `new Stripe(...)` *on every request* just to call `webhooks.constructEvent`. The crypto check doesn't require a fresh SDK instance per request — this is wasteful.
- **Global content-type parser side-effect.** `stripeRawBodyParser` overrides Fastify's default `application/json` parser *for the whole instance* the moment the webhook controller is registered. Any other route on the same instance that reads `application/json` will also get a raw buffer attached to `request.rawBody`. This is implicit and easy to miss.
- **Redundant `enablePaymentWebhook` check** in `webhook/controller.ts` — the controller is only registered when the flag is true (see plugin.ts).
- **`stripeEvent` is cast, not module-augmented** — TypeScript users reading `request.stripeEvent` outside this package will get type errors unless they replicate the cast.
- **Default handler is a sentinel that throws** rather than a no-op — calling the webhook without configuring `handlers.webhook` is a hard error (500 response after preHandler success).
- **Unused dependencies:** `zod` (runtime) and `supertokens-node` (peer + dev) are declared but never imported in `src/`.
- **API version claim:** `README.md` says "API version 2025-12-15.clover", but the source never pins an `apiVersion` in `clientConfig` — Stripe SDK v20.3.1 just uses its compiled default. The README claim is not enforced by code and should be treated as informational only.
