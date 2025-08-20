import type { FastifyInstance } from "fastify";

const isFirebaseEnabled =
  (fastify: FastifyInstance) => async (): Promise<void> => {
    if (fastify.config.firebase.enabled === false) {
      throw fastify.httpErrors.notFound("Firebase is disabled");
    }
  };

export default isFirebaseEnabled;
