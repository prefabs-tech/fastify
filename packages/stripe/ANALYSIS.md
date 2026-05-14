<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

# `@prefabs.tech/fastify-stripe` — Package Analysis

## Base Library Passthrough Analysis

### `stripe` (Stripe Node SDK) — PARTIAL PASSTHROUGH / MODIFIED

- **Options type:** Partial import — `clientConfig` is imported from `Stripe.StripeConfig` and passed through; other SDK features are accessed via the exposed `client.stripe` instance.
- **Options passed:** `clientConfig` is forwarded unmodified to `new Stripe(apiKey, clientConfig)`. All other SDK configuration happens through the curated `StripeConfig` type defined by this package.
- **Features restricted:**
  - `checkout.sessions.create` is wrapped with a simplified surface (`CreateSessionInput`) that supports only single-product sessions. Multi-product sessions, tax rates, shipping options, and other advanced features require direct SDK access via `client.stripe`.
  - `promotionCodes.list` is wrapped to hardcode `active: true` and return only the first result.
- **Features added:**
  - Fastify plugin with automatic webhook endpoint registration
  - Signature verification preHandler with structured 400 responses
  - Raw-body content-type parser scoped to webhook routes
  - Config-aware `StripeClient` helper with defaults for currency, URLs, and promotion codes
  - Module augmentations for `fastify.config.stripe`, `request.rawBody`, and `request.stripeEvent`
  - Missing-config guard (plugin warns and skips registration when Stripe config does not resolve)
  - Register-time options with legacy `fastify.config.stripe` fallback (same ergonomics as graphql/slonik/mailer; Stripe does not throw when config is still missing after fallback)
  - Webhook handler warning system (logs at registration when no custom handler is provided)
  - Default fallback webhook handler (returns 200 to prevent Stripe retries)
  - Mode-specific metadata routing for checkout sessions

---

## Code Classification: "Ours" vs "Theirs"

### OURS — Custom Logic

**Plugin Registration (`src/plugin.ts`)**
1. Resolves Stripe config: register options when non-empty; otherwise warns and reads `fastify.config?.stripe` (legacy path)
2. Missing-config guard: logs warning and returns early if no config resolves (does not throw)
3. Conditional webhook controller registration when resolved `enablePaymentWebhook` is truthy, passing `{ stripeConfig }` into the controller
4. `fastify-plugin` wrapping for non-encapsulated registration

**Type System (`src/types/index.ts`, `src/index.ts`)**
5. Module augmentation of `@prefabs.tech/fastify-config` to add `stripe?: StripeConfig`
6. Module augmentation of `fastify` to add `rawBody?: Buffer` and `stripeEvent?: Stripe.Event`
7. Curated `StripeConfig` type (not a direct passthrough of Stripe SDK types)
8. `CreateSessionInput` type for simplified checkout session creation

**Webhook Controller (`src/webhook/controller.ts`)**
9. Accepts optional `{ stripeConfig }` at register time; falls back to `fastify.config?.stripe` when the controller is registered directly
10. Registration-time warning when `handlers.webhook` is unset but `enablePaymentWebhook` is true
11. Defensive guard logging error when neither register options nor `fastify.config.stripe` provides config
12. Route path defaults to `ROUTE_STRIPE_WEBHOOK` when resolved `webhookPath` is unset
13. Conditional dispatch: calls custom handler if provided, otherwise falls back to default handler
14. Error response when `request.stripeEvent` is missing after verification (defensive, should be unreachable)

**Signature Verification (`src/middlewares/verifyStripeSignature.ts`)**
15. `createVerifyStripeSignature(stripeConfig)` returns a preHandler that closes over `webhookSecret` (does not read `request.server.config.stripe`)
16. Structured 400 responses with specific error messages for each failure mode
17. Error logging for all verification failures
18. Guards: missing secret, missing signature header, missing raw body
19. Attaches verified event to `request.stripeEvent` on success

**Raw Body Parser (`src/utils/stripeRawBodyParser.ts`)**
20. Custom `application/json` parser that captures `request.rawBody` while still parsing JSON
21. JSON parse errors tagged with `statusCode: 400` for proper HTTP response
22. Scoped to plugin encapsulation (doesn't affect parent instance routes)

**Default Webhook Handler (`src/webhook/handler.ts`)**
23. Intentionally returns without throwing to avoid 500 response and Stripe retry loop
24. Logs error with `eventId` and `eventType` for visibility
25. Acknowledges event with 200 to suppress Stripe retries

**StripeClient Wrapper (`src/utils/stripeClient.ts`)**
26. Constructor throws when `config.stripe` is unset
27. `createCheckoutSession`: defaults `quantity` to `1`
28. `createCheckoutSession`: defaults `mode` to `"payment"`
29. `createCheckoutSession`: defaults `currency` to `config.stripe.defaultCurrency`
30. `createCheckoutSession`: defaults `successUrl` to `config.stripe.urls.success`
31. `createCheckoutSession`: defaults `cancelUrl` to `config.stripe.urls.cancel`
32. `createCheckoutSession`: forwards `config.stripe.allowPromotionCodes` as `allow_promotion_codes`
33. `createCheckoutSession`: synthesizes single `line_items` entry from flat input
34. `createCheckoutSession`: mode-specific metadata routing (payment → `payment_intent_data.metadata`, subscription → `subscription_data.metadata`, setup → `setup_intent_data.metadata`)
35. `createCheckoutSession`: omits all `*_data` blocks when metadata is not provided
36. `getActivePromotionCode`: hardcodes `active: true` filter
37. `getActivePromotionCode`: returns only first match (no pagination)

**Constants & Exports (`src/constants.ts`, `src/index.ts`)**
38. `ROUTE_STRIPE_WEBHOOK` constant exported for consumer reference
39. Re-exports: `StripeConfig`, `StripeEvent` (aliased from `Stripe.Event`), `CreateSessionInput`

### THEIRS — Direct Passthrough

**Stripe SDK Usage**
1. `new Stripe(apiKey, clientConfig)` — `clientConfig` passed unmodified
2. `stripe.webhooks.constructEvent(rawBody, signature, secret)` — called directly with no transformation
3. `stripe.checkout.sessions.create(params)` — called directly after parameter synthesis
4. `stripe.promotionCodes.list({ active, code })` — called directly with hardcoded filter
5. Raw `Stripe` SDK instance exposed as `client.stripe` for direct access to all SDK features

---

## Summary

### Public Exports

**Default Export:** `stripePlugin` — Fastify plugin wrapped with `fastify-plugin` for non-encapsulated registration

**Named Exports:**
- `ROUTE_STRIPE_WEBHOOK` — constant string `"/payment/webhook"`
- `StripeClient` — class for config-aware Stripe operations
- `registerRawBodyParser` — function to install raw-body parser on any Fastify instance
- `StripeConfig` — type for `config.stripe` shape
- `StripeEvent` — re-exported `Stripe.Event` type
- `CreateSessionInput` — type for `createCheckoutSession` input

### Framework Constructs Added

1. **Module Augmentations:**
   - `@prefabs.tech/fastify-config` gains `ApiConfig.stripe?: StripeConfig`
   - `fastify` gains `FastifyRequest.rawBody?: Buffer` and `FastifyRequest.stripeEvent?: Stripe.Event`

2. **Fastify Plugin:** Non-encapsulated plugin (via `fastify-plugin`) that registers webhook routes on the parent instance

3. **Content-Type Parser:** `application/json` parser registered inside webhook controller scope (does not affect parent routes)

4. **PreHandler:** `createVerifyStripeSignature(resolvedConfig)` runs before webhook route handler

5. **Route:** `POST` route at resolved `webhookPath` (defaults to `/payment/webhook`) when `enablePaymentWebhook` is true

### Conditional Branches

1. **Plugin Registration:**
   - If register options are empty → warn, then read `fastify.config?.stripe`
   - If Stripe config still missing → log warning, skip registration (no throw)
   - If resolved `enablePaymentWebhook` is truthy → register webhook controller with `{ stripeConfig }`
   - If resolved `enablePaymentWebhook` is falsy → skip webhook controller

2. **Webhook Controller:**
   - If neither `{ stripeConfig }` nor `fastify.config.stripe` is set → log error, skip route registration
   - If `handlers.webhook` is missing → log warning at registration time
   - If `handlers.webhook` is set → dispatch to custom handler
   - If `handlers.webhook` is unset → dispatch to default handler (logs error, returns 200)

3. **Signature Verification:**
   - If resolved `webhookSecret` is missing → return 400
   - If `stripe-signature` header is missing → return 400
   - If `request.rawBody` is missing → return 400
   - If `Stripe.webhooks.constructEvent` throws → return 400

4. **StripeClient Constructor:**
   - If `config.stripe` is missing → throw error

5. **createCheckoutSession Metadata:**
   - If `metadata` is provided → write to `session.metadata` and mode-specific `*_data` block
   - If `metadata` is not provided → omit all metadata fields

6. **createCheckoutSession Mode Routing:**
   - `mode: "payment"` → metadata to `payment_intent_data.metadata`
   - `mode: "subscription"` → metadata to `subscription_data.metadata`
   - `mode: "setup"` → metadata to `setup_intent_data.metadata`

### Default Values

| Field                             | Default Value                           | Applied When                    |
| --------------------------------- | --------------------------------------- | ------------------------------- |
| `webhookPath`                     | `/payment/webhook`                      | `config.stripe.webhookPath` unset |
| `CreateSessionInput.quantity`     | `1`                                     | `input.quantity` unset          |
| `CreateSessionInput.mode`         | `"payment"`                             | `input.mode` unset              |
| `CreateSessionInput.currency`     | `config.stripe.defaultCurrency`         | `input.currency` unset          |
| `CreateSessionInput.successUrl`   | `config.stripe.urls.success`            | `input.successUrl` unset        |
| `CreateSessionInput.cancelUrl`    | `config.stripe.urls.cancel`             | `input.cancelUrl` unset         |

---

## Completeness Checklist

- ✅ Classified every public export as "ours" or "theirs"
- ✅ Listed every framework construct added (module augmentations, plugin, parser, preHandler, route)
- ✅ Identified every conditional branch (plugin registration, webhook dispatch, signature verification, metadata handling, mode routing)
- ✅ Documented default values for all options we define
- ✅ Produced passthrough classification for wrapped dependency (`stripe`)
