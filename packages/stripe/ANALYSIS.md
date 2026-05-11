<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

# Package analysis: `@prefabs.tech/fastify-stripe`

`.claude/CONVENTIONS.md` was not present; conventions were inferred from dependencies and layout (Fastify 5 plugin, `@prefabs.tech/fastify-config`, Stripe SDK).

## Base Library Passthrough Analysis

### stripe (npm `stripe`) — MODIFIED / PARTIAL PASSTHROUGH

- **Options type:**  
  - **Constructor:** `StripeConfig.clientConfig?: Stripe.StripeConfig` — type comes from the base library and is passed through without transformation.  
  - **Checkout sessions:** Inputs use a **custom** `CreateSessionInput` type; downstream call uses **`Stripe.Checkout.SessionCreateParams` only implicitly** via a built object rather than exposing full session params from callers.
- **Options passed:**  
  - **Unmodified:** `new Stripe(apiKey, clientConfig)` in `StripeClient` and again in `verifyStripeSignature`; `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` and `stripe.promotionCodes.list({ active: true, code })`.  
  - **Transformed:** `createCheckoutSession` maps `CreateSessionInput` + `StripeConfig` into a fixed `checkout.sessions.create` payload (fixed single `line_items` entry with inline `price_data`, copies `metadata` onto both session and `payment_intent_data`, applies fallbacks for URLs/currency/qty/mode).
- **Features restricted:** Callers cannot pass arbitrary `SessionCreateParams` (e.g. multiple line items, existing price IDs, shipping, subscription-specific fields beyond `mode`) without changing this package—not a passthrough checkout API.
- **Features added:** `StripeClient` wrapper, checkout helper with opinionated line-item shape, `getActivePromotionCode`, webhook verification pre-handler wired to Fastify (`rawBody` + `constructEvent`).

### fastify / fastify-plugin — N/A (host framework)

Integration is ours (plugin registration, route, content-type parser); no “options passthrough” to a wrapped library besides normal Fastify plugin patterns.

### @prefabs.tech/fastify-config — INTEGRATION ONLY

Augments `ApiConfig` with `stripe: StripeConfig` (TypeScript declaration merge). Runtime reads `fastify.config.stripe`; this package does not re-export or proxy config-option types beyond `StripeConfig`.

### zod — NOT USED IN SOURCE

Listed in `package.json` and Vite bundle config but **no imports under `src/`**. Not a wrapped runtime dependency for behavior in this package.

---

## “Ours” vs “theirs” (by area)

### `src/index.ts` — OURS (+ type re-export)

- **Ours:** `declare module "@prefabs.tech/fastify-config"` augmentation so `ApiConfig` includes `stripe`.
- **Theirs-like:** `export type StripeEvent = Stripe.Event` is a thin alias.

### `src/plugin.ts` — OURS

- **Ours:** Early exit when `config.stripe` missing (warn); register `webhookController` only when `enablePaymentWebhook` is true.
- **Theirs:** `fastify-plugin` wraps the plugin function.

### `src/types/index.ts` — OURS

Defines `StripeConfig` and `CreateSessionInput`; references `Stripe` types from the Stripe SDK.

### `src/constants.ts` — OURS

`ROUTE_STRIPE_WEBHOOK` default path segment.

### `src/utils/stripeClient.ts` — OURS (orchestration) + THEIRS (SDK calls)

- **Ours:** Constructor stores `ApiConfig`; `createCheckoutSession` builds defaults (`cancel_url`, `success_url`, `currency`, `quantity ?? 1`, `mode ?? "payment"`), applies `allow_promotion_codes`, structures `line_items`.
- **Theirs:** `new Stripe(...)`, `checkout.sessions.create(...)`, `promotionCodes.list(...)`.

### `src/utils/stripeRawBodyParser.ts` — OURS

Registers `application/json` parser with `parseAs: "buffer"`, attaches `request.rawBody`, parses JSON and passes to Fastify via `done`.

### `src/middlewares/verifyStripeSignature.ts` — OURS (HTTP + branching) + THEIRS (`constructEvent`)

- **Ours:** Validates presence of `webhookSecret`, `stripe-signature` header, `rawBody`; attaches `stripeEvent`; maps failures to `400` and logs.
- **Theirs:** `stripe.webhooks.constructEvent`.

### `src/webhook/controller.ts` — OURS

Registers raw-body parser when webhook enabled, `POST` on `webhookPath || ROUTE_STRIPE_WEBHOOK`, `preHandler: verifyStripeSignature`; dispatches to `config.stripe.handlers?.webhook` or default `webhook/handler`; throws if `stripeEvent` missing.

### `src/webhook/handler.ts` — OURS

Default webhook implementation is a stub that always throws `"Webhook handler not implemented"`.

---

## Summary

### Public exports (one line each)

| Export | Description |
|--------|-------------|
| `ROUTE_STRIPE_WEBHOOK` | Constant default webhook route path `/payment/webhook`. |
| `default` (plugin) | Fastify plugin: noop if no `config.stripe`; registers webhook routes when `enablePaymentWebhook`. |
| `StripeConfig` | Shape of `config.stripe` (API key, URLs, webhook flags/path/secret, optional handler, Stripe client options, etc.). |
| `StripeEvent` | Type alias for `stripe.Event`. |
| `StripeClient` | Helper class: Stripe instance + `createCheckoutSession` + `getActivePromotionCode`. |
| `registerRawBodyParser` | Registers JSON buffer parser that sets `request.rawBody`. |

Also: **`FastifyRequest.rawBody`** is augmented in `stripeRawBodyParser.ts` for signature verification.

### Framework / Fastify constructs

- **fastify-plugin** default export wrapping the async plugin.
- **Child plugin:** `webhook/controller` registered from main plugin under `enablePaymentWebhook`.
- **Route:** `POST` webhook with `preHandler: [verifyStripeSignature]`.
- **Content-type parser:** `application/json` with buffer parsing for webhook body.

### Lifecycle / hooks

- No `onReady`/`onClose` handlers; webhook flow uses **route `preHandler`** only.

### Conditional branches / feature gates

| Location | Behavior |
|---------|----------|
| `plugin.ts` | Missing `config.stripe` → warn and return without registering Stripe pieces. |
| `plugin.ts` | `enablePaymentWebhook` → register webhook controller. |
| `controller.ts` | Same `enablePaymentWebhook` gate before parser + route (redundant given parent plugin, but preserves safety if controller were reused). |
| `verifyStripeSignature.ts` | No secret / no `stripe-signature` / no `rawBody` → `400` responses. |
| `controller.ts` handler | Missing `stripeEvent` → thrown error. |
| `controller.ts` handler | Optional `handlers.webhook` overrides default stub handler. |

### Default values (`CreateSessionSession` builder and routes)

| Item | Default / fallback |
|------|---------------------|
| `quantity` | `1` |
| Checkout `mode` | `"payment"` |
| Currency | `StripeConfig.defaultCurrency` when input `currency` omitted |
| URLs | `StripeConfig.urls.cancel` / `success` when `cancelUrl` / `successUrl` omitted |
| Webhook route | `ROUTE_STRIPE_WEBHOOK` when `webhookPath` falsy |

### Wrapped dependencies recap

See **Base Library Passthrough Analysis** above. No other third-party wrappers with configurable passthrough semantics beyond Stripe + Fastify hosting.

---

## Completeness checklist

- [x] Classified every public export as “ours” or “theirs”
- [x] Listed framework constructs added (decorators N/A for this stack)
- [x] Identified conditional branches (feature gates, verification paths)
- [x] Documented defaults for options this package defines
- [x] Produced passthrough classification for every wrapped dependency (Stripe primary; Fastify/integration noted)
