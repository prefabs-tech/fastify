import { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer | string;
  }
}

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
