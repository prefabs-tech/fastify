import { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

/**
 * Registers an `application/json` content-type parser that captures the raw
 * request buffer on `request.rawBody` while still parsing JSON for downstream
 * handlers. Stripe's `webhooks.constructEvent` requires the exact raw bytes
 * for signature verification.
 *
 * IMPORTANT — encapsulation contract:
 * Fastify content-type parsers are scoped to the plugin context they are
 * registered in. The webhook controller calls this function inside its own
 * (non-`fastify-plugin`-wrapped) plugin scope, so the override stays local to
 * the webhook route and does NOT bleed into other `application/json` routes
 * on the parent instance. If you call this function on the top-level
 * Fastify instance directly, the override applies to that whole scope.
 * Do not wrap the webhook controller with `fastify-plugin` or this guarantee
 * will be broken.
 */
const stripeRawBodyParser = (fastify: FastifyInstance): void => {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request: FastifyRequest, body: Buffer, done) => {
      request.rawBody = body;

      try {
        const json = JSON.parse(body.toString());

        // eslint-disable-next-line unicorn/no-null
        done(null, json);
      } catch (error) {
        // Tag the error so Fastify's default error handler responds 400
        // instead of falling back to a generic 500.
        const parseError = error as Error & { statusCode?: number };
        parseError.statusCode = 400;
        done(parseError);
      }
    },
  );
};

export default stripeRawBodyParser;
