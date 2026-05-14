<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

## Plugin registration

1. The default export is wrapped with `fastify-plugin` so the plugin applies to the parent Fastify scope.
2. If plugin options are missing or an empty object, a warn recommends passing options explicitly; registration then uses `fastify.config.stripe` when present. If `fastify.config.stripe` is also absent, registration throws with a clear message (`Missing stripe configuration. Did you forget to pass it to the stripe plugin?`).
3. An info-level log is emitted when the Stripe plugin registers (`Registering Stripe plugin`).
4. When `enablePaymentWebhook` is truthy, the webhook controller sub-plugin is registered; when falsy, no webhook route or webhook-scoped parser is installed.

## Webhook route

5. The webhook controller throws if `stripeConfig` is missing from its register options (internal guard).
6. An info-level log is emitted when the webhook route plugin registers (`Registering Stripe webhook route`).
7. If `enablePaymentWebhook` is true and `handlers.webhook` is not set, a warning is logged at registration; the HTTP route still accepts webhooks.
8. The webhook `POST` path is `config.stripe.webhookPath` when set, otherwise the default `ROUTE_STRIPE_WEBHOOK` (`/payment/webhook`).
9. When no custom `handlers.webhook` is provided, the default handler logs an error with event id and type and completes without throwing so Stripe does not retry indefinitely.
10. When `handlers.webhook` is provided, it is invoked with `(request, event)` after successful verification.
11. If `request.stripeEvent` is missing after the preHandler chain (defensive), the route responds with HTTP 500 and a structured error body.

## Webhook signature verification

12. If `webhookSecret` is missing on the resolved config, the preHandler responds with HTTP 400 and `{ error: "Webhook secret not configured" }` and logs an error.
13. If the `stripe-signature` header is missing, responds with HTTP 400 and `{ error: "Missing stripe-signature header" }`.
14. If `request.rawBody` is missing, responds with HTTP 400 and `{ error: "Raw body is not available for signature verification" }`.
15. If `Stripe.webhooks.constructEvent` throws, responds with HTTP 400 and `{ error: "Webhook signature verification failed" }` and logs the error.
16. On success, the verified `Stripe.Event` is assigned to `request.stripeEvent`.

## Raw body parser

17. `registerRawBodyParser` (same implementation as used inside the webhook controller) adds an `application/json` parser using `parseAs: "buffer"`, stores the buffer on `request.rawBody`, and parses JSON for the handler.
18. Invalid JSON in the body results in an error passed to `done` with `statusCode: 400` so clients get a 400 response instead of a generic 500.
19. The parser is registered only on the Fastify instance passed in; when used from the webhook controller, that instance is the non-`fastify-plugin`-wrapped sub-scope so other parent routes keep their default JSON parsing.

## Types and module augmentations

20. Importing the package augments `@prefabs.tech/fastify-config`’s `ApiConfig` with optional `stripe?: StripeConfig`.
21. `FastifyRequest` is augmented with optional `stripeEvent?: Stripe.Event` (from `types/index.ts`).
22. `FastifyRequest` is augmented with optional `rawBody?: Buffer` (from the raw-body parser module).
23. The package entry exports the `StripeConfig` type and `StripeEvent` as a public alias for `Stripe.Event`.

## StripeClient

24. `StripeClient` constructor throws if `config.stripe` is undefined on the provided `ApiConfig`.
25. `StripeClient` constructs `new Stripe(apiKey, clientConfig)` using `config.stripe.apiKey` and optional `config.stripe.clientConfig` unchanged.
26. `createCheckoutSession` builds a single line item from `CreateSessionInput` with defaults: `quantity` defaults to `1`, `mode` defaults to `"payment"`, `currency` defaults to `config.stripe.defaultCurrency`, success and cancel URLs default to `config.stripe.urls`.
27. `createCheckoutSession` sets `allow_promotion_codes` from `config.stripe.allowPromotionCodes` (may be `undefined`).
28. When `metadata` is passed to `createCheckoutSession`, it is set on `metadata` and on the mode-appropriate field only (`payment_intent_data`, `setup_intent_data`, or `subscription_data`); when omitted, metadata and those blocks are left off the payload.
29. `getActivePromotionCode` calls `promotionCodes.list` with `{ active: true, code }` and returns the first element of `data` or `undefined`.

## Constants

30. `ROUTE_STRIPE_WEBHOOK` is exported as the string `/payment/webhook`.
