<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# `@prefabs.tech/fastify-stripe` — Features

## Plugin Registration

1. The plugin is exported via `fastify-plugin`, so all registrations attach to the top-level (non-encapsulated) Fastify instance.
2. When `config.stripe` is missing, the plugin logs a warning (`"Stripe configuration is missing. Stripe plugin will not be registered."`) and returns without registering anything.
3. When `config.stripe` is present, the plugin logs `"Registering Stripe plugin"` at `info` level.
4. The webhook controller is registered only when `config.stripe.enablePaymentWebhook` is truthy.

## Configuration & Type Exports

5. Module augmentation of `@prefabs.tech/fastify-config` adds `stripe: StripeConfig` to `ApiConfig`.
6. Module augmentation of `fastify` adds `rawBody?: Buffer | string` to `FastifyRequest`.
7. `StripeConfig` type is exported (curated subset; not a direct passthrough of any Stripe SDK type).
8. `StripeEvent` type is exported as an alias for `Stripe.Event`.
9. `CreateSessionInput` type describes the checkout helper input shape.
10. `ROUTE_STRIPE_WEBHOOK` constant (`"/payment/webhook"`) is exported as the default webhook route path.

## Webhook Endpoint

11. A `POST` route is registered at `config.stripe.webhookPath`, falling back to `ROUTE_STRIPE_WEBHOOK` (`/payment/webhook`) when unset.
12. The webhook controller logs `"Registering Stripe webhook route"` at `info` level on registration.
13. The verified Stripe event is dispatched to `config.stripe.handlers.webhook` when defined.
14. When `config.stripe.handlers.webhook` is not defined, the request falls through to the default handler, which throws `"Webhook handler not implemented"`.
15. The route handler throws `"Stripe event not found on request"` when the preHandler did not attach `request.stripeEvent` (defensive guard).

## Webhook Signature Verification

The `verifyStripeSignature` preHandler runs on the webhook route and performs the following checks in order:

16. Responds with 400 `{ error: "Webhook secret not configured" }` and logs an error when `config.stripe.webhookSecret` is unset.
17. Responds with 400 `{ error: "Missing stripe-signature header" }` and logs an error when the `stripe-signature` request header is absent.
18. Responds with 400 `{ error: "Raw body is not available for signature verification" }` and logs an error when `request.rawBody` is unset.
19. Responds with 400 `{ error: "Webhook signature verification failed" }` and logs the underlying error when `stripe.webhooks.constructEvent` throws.
20. On success, attaches the verified `Stripe.Event` to `request.stripeEvent` (via inline type cast — not module-augmented).

## Raw Body Parser

21. `registerRawBodyParser(fastify)` registers a Fastify content-type parser for `application/json` that captures the request buffer to `request.rawBody` and parses JSON for downstream handlers.
22. JSON parse errors are forwarded through `done(error)` so Fastify produces a standard 400 response.
23. The raw body parser is installed automatically by the webhook controller, which means it applies **globally** to every `application/json` route on the same Fastify instance (not only the webhook route).

## `StripeClient` Helper

24. `new StripeClient(config)` constructs a `Stripe` SDK client using `config.stripe.apiKey` and forwards `config.stripe.clientConfig` unmodified.
25. The raw `Stripe` SDK instance is exposed as `client.stripe` for direct SDK calls.
26. `createCheckoutSession(input, metadata?)` synthesizes a Checkout session containing exactly one `line_items` entry built from `productName`, `unitAmount`, `quantity`, and `currency`.
27. `createCheckoutSession` defaults `quantity` to `1` when `input.quantity` is unset.
28. `createCheckoutSession` defaults `mode` to `"payment"` when `input.mode` is unset.
29. `createCheckoutSession` defaults `currency` to `config.stripe.defaultCurrency` when `input.currency` is unset.
30. `createCheckoutSession` defaults `success_url` to `config.stripe.urls.success` when `input.successUrl` is unset.
31. `createCheckoutSession` defaults `cancel_url` to `config.stripe.urls.cancel` when `input.cancelUrl` is unset.
32. `createCheckoutSession` forwards `config.stripe.allowPromotionCodes` as the `allow_promotion_codes` parameter (passed as-is — `undefined` is allowed).
33. `createCheckoutSession` writes the `metadata` argument onto **both** `session.metadata` and `session.payment_intent_data.metadata`.
34. `getActivePromotionCode(code)` calls `promotionCodes.list({ active: true, code })` and returns only the first matching `Stripe.PromotionCode` (or `undefined` when there is no match).
