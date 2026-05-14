<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# `@prefabs.tech/fastify-stripe` — Features

## Plugin Registration

1. The plugin is exported via `fastify-plugin`, so all registrations attach to the top-level (non-encapsulated) Fastify instance.
2. Register-time options are recommended: `fastify.register(stripePlugin, config.stripe)` (same convention as graphql/slonik/mailer). If register options are empty, the plugin logs `"The stripe plugin now recommends passing stripe options directly to the plugin."` then reads from `fastify.config.stripe`.
3. When no Stripe configuration resolves after that step, the plugin logs (`"Stripe configuration is missing. Stripe plugin will not be registered."`) and returns without registering anything — **it does not throw** (unlike graphql/slonik/mailer on an equivalent missing-config path).
4. When Stripe configuration is present, the plugin logs `"Registering Stripe plugin"` at `info` level.
5. The webhook controller is registered only when the resolved config's `enablePaymentWebhook` is truthy, with `{ stripeConfig }` passed into the controller so signature verification closes over the same object (not only `fastify.config.stripe`).

## Configuration & Type Exports

6. Module augmentation of `@prefabs.tech/fastify-config` adds `stripe?: StripeConfig` to `ApiConfig` (optional, matching the plugin's runtime tolerance for missing config).
7. Module augmentation of `fastify` adds `rawBody?: Buffer` and `stripeEvent?: Stripe.Event` to `FastifyRequest`.
8. `StripeConfig` type is exported (curated subset; not a direct passthrough of any Stripe SDK type).
9. `StripeEvent` type is exported as an alias for `Stripe.Event`.
10. `CreateSessionInput` type describes the checkout helper input shape.
11. `ROUTE_STRIPE_WEBHOOK` constant (`"/payment/webhook"`) is exported as the default webhook route path.

## Webhook Endpoint

12. A `POST` route is registered at the resolved config's `webhookPath`, falling back to `ROUTE_STRIPE_WEBHOOK` (`/payment/webhook`) when unset.
13. The webhook controller logs `"Registering Stripe webhook route"` at `info` level on registration.
14. When the controller is registered with `enablePaymentWebhook: true` but `handlers.webhook` is unset, the controller logs a warning at registration time (`"config.stripe.handlers.webhook is not set; received webhooks will be acknowledged but not processed. Provide a handler to fulfill events."`).
15. The verified Stripe event is dispatched to `handlers.webhook` on the resolved config when defined.
16. When `handlers.webhook` is not defined, the request falls through to the default handler, which logs an error with `{ eventId, eventType }` and resolves so the route responds `200` (instead of throwing 500 and triggering Stripe's retry backoff).
17. The route responds with `500 { error: "Stripe event not found on request" }` and logs an error when the preHandler did not attach `request.stripeEvent` (defensive guard — should be unreachable).
18. If the webhook controller is registered directly (not via the parent plugin) with no `{ stripeConfig }` and `fastify.config.stripe` is unset, it logs an error (`"Stripe webhook controller registered without stripe configuration; skipping route registration."`) and registers no route.

## Webhook Signature Verification

The preHandler from `createVerifyStripeSignature(stripeConfig)` runs on the webhook route and performs the following checks in order:

19. Responds with 400 `{ error: "Webhook secret not configured" }` and logs an error (`"Stripe webhook secret is not configured; rejecting webhook request."`) when `stripeConfig.webhookSecret` is unset.
20. Responds with 400 `{ error: "Missing stripe-signature header" }` and logs an error when the `stripe-signature` request header is absent.
21. Responds with 400 `{ error: "Raw body is not available for signature verification" }` and logs an error when `request.rawBody` is unset.
22. Responds with 400 `{ error: "Webhook signature verification failed" }` and logs the underlying error when `stripe.webhooks.constructEvent` throws.
23. On success, attaches the verified `Stripe.Event` to `request.stripeEvent` (available via module augmentation).

## Raw Body Parser

24. `registerRawBodyParser(fastify)` registers a Fastify content-type parser for `application/json` that captures the request buffer to `request.rawBody` and parses JSON for downstream handlers.
25. JSON parse errors are tagged with `statusCode: 400` and forwarded through `done(error)`, so Fastify's default error handler produces a 400 response.
26. When the webhook controller installs the raw body parser, the parser is scoped to the webhook controller's plugin encapsulation. It applies to the webhook route but does **not** bleed into other `application/json` routes registered on the parent Fastify instance. Calling `registerRawBodyParser(fastify)` directly on the parent installs it on that instance instead.

## `StripeClient` Helper

27. `new StripeClient(config)` throws `"StripeClient requires config.stripe to be set on the provided ApiConfig."` when `config.stripe` is unset.
28. `new StripeClient(config)` constructs a `Stripe` SDK client using `config.stripe.apiKey` and forwards `config.stripe.clientConfig` unmodified.
29. The raw `Stripe` SDK instance is exposed as `client.stripe` for direct SDK calls.
30. `createCheckoutSession(input, metadata?)` synthesizes a Checkout session containing exactly one `line_items` entry built from `productName`, `unitAmount`, `quantity`, and `currency`.
31. `createCheckoutSession` defaults `quantity` to `1` when `input.quantity` is unset.
32. `createCheckoutSession` defaults `mode` to `"payment"` when `input.mode` is unset.
33. `createCheckoutSession` defaults `currency` to `config.stripe.defaultCurrency` when `input.currency` is unset.
34. `createCheckoutSession` defaults `success_url` to `config.stripe.urls.success` when `input.successUrl` is unset.
35. `createCheckoutSession` defaults `cancel_url` to `config.stripe.urls.cancel` when `input.cancelUrl` is unset.
36. `createCheckoutSession` forwards `config.stripe.allowPromotionCodes` as the `allow_promotion_codes` parameter (passed as-is — `undefined` is allowed).
37. `createCheckoutSession` writes the `metadata` argument onto `session.metadata` only when `metadata` is provided. When provided, it additionally writes it onto the mode-specific data block:
    - `mode: "payment"` → `payment_intent_data.metadata`
    - `mode: "subscription"` → `subscription_data.metadata`
    - `mode: "setup"` → `setup_intent_data.metadata`

    Only the block matching the selected mode is set; the others are left unset so Stripe does not reject the call. When `metadata` is not provided, no mode-specific `*_data` block is set.
38. `getActivePromotionCode(code)` calls `promotionCodes.list({ active: true, code })` and returns only the first matching `Stripe.PromotionCode` (or `undefined` when there is no match).
