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
        done(error as Error);
      }
    },
  );
};

export default stripeRawBodyParser;
