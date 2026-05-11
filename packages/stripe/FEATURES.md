<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# Features: `@prefabs.tech/fastify-stripe`

## Type system and configuration

1. TypeScript declaration merge on `@prefabs.tech/fastify-config` so `ApiConfig` includes a `stripe` field typed as `StripeConfig`.
2. Exported types `StripeConfig` (shape of `config.stripe`) and `StripeEvent` (alias for `Stripe.Event`) for application and handler code.
3. Exported constant `ROUTE_STRIPE_WEBHOOK` with default path `/payment/webhook`.

## Main Fastify plugin

4. If `config.stripe` is absent at registration time, the plugin logs a warning and does not register Stripe routes or other behavior.
5. When `config.stripe.enablePaymentWebhook` is `true`, the plugin registers the bundled webhook child plugin.

## Webhook route and verification

6. Registers a `POST` route at `config.stripe.webhookPath` when set, otherwise at `ROUTE_STRIPE_WEBHOOK`.
7. For the webhook flow, registers an `application/json` content-type parser that stores the raw body on `request.rawBody` (buffer) and supplies parsed JSON as the request body.
8. Augments `FastifyRequest` with optional `rawBody` (`Buffer | string`) for signature verification.
9. Route `preHandler` verifies the Stripe webhook signature via `stripe.webhooks.constructEvent` using `config.stripe.apiKey`, `config.stripe.clientConfig`, `config.stripe.webhookSecret`, the `stripe-signature` header, and `request.rawBody`.
10. Responds with HTTP `400` and a JSON `{ error: string }` body when the webhook secret is missing, the `stripe-signature` header is missing, `rawBody` is missing, or signature verification throws; logs errors on those paths.
11. On success, attaches the verified `Stripe.Event` to the request as `stripeEvent` for the route handler.
12. If `config.stripe.handlers?.webhook` is set, the route invokes it with `(request, event)`; otherwise it calls the package default handler.
13. The package default webhook handler throws `Error("Webhook handler not implemented")` so production apps must supply `handlers.webhook` or replace behavior.

## Utilities

14. Exports `registerRawBodyParser` to register the same JSON buffer parser used by the webhook module (for apps that need `rawBody` outside this plugin’s route registration).
15. `StripeClient` constructor accepts `ApiConfig`, keeps a reference, and constructs `new Stripe(config.stripe.apiKey, config.stripe.clientConfig)` exposed as `stripe`.
16. `StripeClient.createCheckoutSession(input, metadata?)` builds a `checkout.sessions.create` call with a single inline `line_items` price, `allow_promotion_codes` from `config.stripe.allowPromotionCodes`, `cancel_url` / `success_url` from input or `config.stripe.urls`, `currency` from input or `config.stripe.defaultCurrency`, `quantity` default `1`, `mode` default `"payment"`, and copies `metadata` to both the session and `payment_intent_data.metadata`.
17. `StripeClient.getActivePromotionCode(code)` calls `promotionCodes.list({ active: true, code })` and returns the first entry or `undefined`.
