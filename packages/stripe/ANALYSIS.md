<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

## Base Library Passthrough Analysis

### stripe — [PARTIAL PASSTHROUGH / MODIFIED]

- Options type: [imported from base library for `clientConfig` (`Stripe.StripeConfig`) | custom subset for checkout options (`CreateSessionInput`)]
- Options passed: [`clientConfig` is passed unmodified to the `Stripe` constructor. For `createCheckoutSession`, input options are transformed into a specific `line_items` structure and defaults are applied. `allowPromotionCodes` is passed through as `allow_promotion_codes`.]
- Features restricted: [`StripeClient.createCheckoutSession` restricts creating sessions to a single product with flat parameters. `StripeClient.getActivePromotionCode` restricts lookup to `active: true` and returns only the first match. Full features are still available via the exposed `client.stripe` property.]
- Features added: [Configurable webhook route registration, signature verification middleware with formatted errors, raw body parser for `application/json` (scoped to the webhook controller's plugin encapsulation), default parameter injection for checkout sessions, mode-aware metadata routing (`payment_intent_data` / `subscription_data` / `setup_intent_data`), typed Fastify request augmentations.]

## Summary

### Exports & Functions

- `default` (stripePlugin): Registers the plugin and optionally the webhook controller if enabled in config.
- `ROUTE_STRIPE_WEBHOOK`: Constant for the default webhook path (`"/payment/webhook"`).
- `StripeClient`: Helper class holding the `Stripe` SDK client and exposing simplified checkout session creation and promotion code lookup.
  - `createCheckoutSession`: Synthesizes a one-product Checkout session and applies config defaults.
  - `getActivePromotionCode`: Looks up an active promotion code by its string.
- `registerRawBodyParser`: Helper function to add an `application/json` parser that retains `request.rawBody`.
- Type exports: `StripeConfig`, `StripeEvent`, `CreateSessionInput`.

### Framework Constructs Added

- Fastify plugin wrapping (`fastify-plugin`) so registrations attach to the top-level instance.
- Fastify module augmentations for `FastifyRequest` (adds `rawBody` and `stripeEvent`).
- Fastify route (`fastify.post`) for the webhook endpoint.
- Fastify `preHandler` (`verifyStripeSignature`) for webhook route middleware.
- Fastify content-type parser (`fastify.addContentTypeParser`) for raw body retention.
- Module augmentation for `@prefabs.tech/fastify-config` `ApiConfig` (adds `stripe`).

### Hooks or Lifecycle Registrations

- Fastify `preHandler` hook on the webhook route (`verifyStripeSignature`).
- Fastify `addContentTypeParser` for `application/json` registered inside the webhook controller's plugin scope (scoped — does not leak to parent).

### Conditional Branches

- If `config.stripe` is missing: Logs a warning and returns without registering anything.
- If `config.stripe.enablePaymentWebhook` is truthy: Registers the webhook controller route and raw body parser.
- If `config.stripe.webhookPath` is defined: Uses it instead of the default `ROUTE_STRIPE_WEBHOOK`.
- If `config.stripe.handlers?.webhook` is defined: Delegates the Stripe event to this custom handler. Otherwise, falls through to a default handler that logs an error containing the event id and type and resolves (responds 200) so Stripe stops retrying. The plugin also warns at registration time when a webhook handler is not configured.
- In `verifyStripeSignature`: Early returns HTTP 400 if `webhookSecret` is missing, `stripe-signature` header is missing, `request.rawBody` is missing, or `Stripe.webhooks.constructEvent` throws an error.

### Default Values

- Webhook Path: `"/payment/webhook"`
- `createCheckoutSession` defaults:
  - `quantity`: `1`
  - `mode`: `"payment"`
  - `currency`: Falls back to `config.stripe.defaultCurrency`
  - `successUrl`: Falls back to `config.stripe.urls.success`
  - `cancelUrl`: Falls back to `config.stripe.urls.cancel`
