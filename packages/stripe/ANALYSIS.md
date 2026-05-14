<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

## Base Library Passthrough Analysis

### `stripe` (Stripe Node SDK) — PARTIAL PASSTHROUGH / MODIFIED

- Options type: Custom `StripeConfig` for this plugin plus `clientConfig?: Stripe.StripeConfig` passed verbatim to `new Stripe(apiKey, clientConfig)`.
- Options passed: `apiKey` and `clientConfig` unmodified to constructor. Webhook verification uses `Stripe.webhooks.constructEvent(rawBody, signature, secret)` (SDK static API) with no extra transformation.
- Features restricted: Consumers do not receive a generic “pass all Checkout params” helper; `createCheckoutSession` only accepts `CreateSessionInput` and builds a fixed `SessionCreateParams`. `getActivePromotionCode` wraps `promotionCodes.list` with `active: true` and returns only the first result.
- Features added: Fastify plugin wiring, webhook route, scoped raw-body parser, signature preHandler, optional handler warning + safe default handler, `StripeClient` helper class, TypeScript augmentations, route constant export.

### `@prefabs.tech/fastify-config` — MODIFIED (integration only)

- This package augments `ApiConfig` with optional `stripe?: StripeConfig`; it does not redefine the config system.
- `StripeClient` reads `config.stripe` from a full `ApiConfig` instance.

### `fastify` / `fastify-plugin` — THEIRS (framework)

- Plugin pattern: default export wrapped with `fastify-plugin` so behavior applies to the enclosing Fastify scope. Webhook controller is a **nested** plugin without `fastify-plugin`, keeping the JSON parser override local.

---

## Summary

### Package metadata

- **Runtime dependency:** `stripe@20.3.1` (bundled; consumers do not declare it unless they use the SDK alongside this package).
- **Peers:** `@prefabs.tech/fastify-config@0.94.0`, `fastify@>=5.2.2`, `fastify-plugin@>=5.0.1`.
- **Entry:** `src/index.ts` → `export *` from `./constants`, `./utils`; default plugin from `./plugin`; types `StripeConfig`, `StripeEvent`.

### Public exports (from `src/index.ts` and `src/utils/index.ts`)

| Export | Description |
| ------ | ----------- |
| `default` | `FastifyPluginAsync`-wrapped Stripe plugin; requires non-empty `StripeConfig`. |
| `ROUTE_STRIPE_WEBHOOK` | Constant `"/payment/webhook"`. |
| `StripeClient` | Holds `Stripe` SDK + `createCheckoutSession` + `getActivePromotionCode`. |
| `registerRawBodyParser` | Alias export of the default from `stripeRawBodyParser` — registers JSON parser with `rawBody`. |
| `StripeConfig` | Type of plugin options / `config.stripe`. |
| `StripeEvent` | Type alias for `Stripe.Event`. |

`CreateSessionInput` exists in `src/types/index.ts` but is **not** re-exported from the package entry.

### Internal (not in public API)

| Symbol | Role |
| ------ | ---- |
| `createVerifyStripeSignature` | Factory returning webhook `preHandler`; validates secret, header, `rawBody`; calls `Stripe.webhooks.constructEvent`; sets `request.stripeEvent`. |
| `webhookHandler` | Default fallback when `handlers.webhook` omitted — logs error, responds so Stripe does not retry indefinitely. |
| Webhook `controller` plugin | Registers route, installs raw-body parser in this scope, attaches preHandler. |
| Default export of `stripeRawBodyParser.ts` | Same implementation as `registerRawBodyParser`; registers `application/json` buffer parser setting `request.rawBody` and JSON body. |

### Source modules (one line each)

| File | Responsibility |
| ---- | ---------------- |
| `src/plugin.ts` | Top-level plugin: validate options, optionally register webhook controller. |
| `src/webhook/controller.ts` | Encapsulated route + parser + signature preHandler + dispatch to user or default handler. |
| `src/webhook/handler.ts` | Default no-op handler: log misconfiguration, avoid Stripe retry storms. |
| `src/middlewares/verifyStripeSignature.ts` | `createVerifyStripeSignature` — signature verification preHandler. |
| `src/utils/stripeClient.ts` | `StripeClient` — SDK constructor passthrough + checkout/promo helpers. |
| `src/utils/stripeRawBodyParser.ts` | JSON raw-body parser; augments `FastifyRequest.rawBody`. |
| `src/types/index.ts` | `StripeConfig`, `CreateSessionInput`, webhook types; augments `FastifyRequest.stripeEvent`. |
| `src/constants.ts` | `ROUTE_STRIPE_WEBHOOK`. |

### `StripeClient` methods (ours vs theirs)

| Member | Classification |
| ------ | -------------- |
| `constructor` | **Ours** — requires `config.stripe`; passes `apiKey` + `clientConfig` to `new Stripe(...)`. |
| `stripe` | **Theirs** — live SDK instance. |
| `createCheckoutSession` | **Ours** — builds `SessionCreateParams` (defaults, line item, metadata by mode); **theirs** — `checkout.sessions.create`. |
| `getActivePromotionCode` | **Ours** — restricts to `active: true`, first result; **theirs** — `promotionCodes.list`. |

### Framework / lifecycle

- Registration log: `"Registering Stripe plugin"` (`plugin.ts`).
- Webhook registration log: `"Registering Stripe webhook route"` (`controller.ts`).
- Conditional: `enablePaymentWebhook` registers webhook sub-plugin only when truthy.

### Conditional branches & defaults

- Empty/missing plugin options → throw `"Missing stripe configuration..."`.
- Missing `{ stripeConfig }` on webhook controller options → throw (defensive; normally only called internally).
- No `handlers.webhook` but webhooks enabled → warn at register; route uses default ack handler.
- Webhook path: `stripeConfig.webhookPath || ROUTE_STRIPE_WEBHOOK`.
- Checkout helper defaults: `quantity` → 1, `mode` → `"payment"`, `currency` → `defaultCurrency`, success/cancel URLs from `urls`, `allow_promotion_codes` from `allowPromotionCodes`.

### Default values (ours)

- Fallback webhook handler behavior: log at error level with event id/type; response path returns 200-equivalent completion without throwing.
- JSON parse error in raw-body parser: assign `statusCode: 400` on error for Fastify.

### “Ours” vs “Theirs” highlights

- **Ours:** Validation, logging, warning, error response bodies, `SessionCreateParams` assembly, metadata routing by checkout mode, promotion code list filtering/return shape, plugin encapsulation for parser, module augmentations.
- **Theirs:** `new Stripe(...)`, `stripe.checkout.sessions.create`, `stripe.promotionCodes.list`, `Stripe.webhooks.constructEvent` inputs/outputs as provided by the SDK.
