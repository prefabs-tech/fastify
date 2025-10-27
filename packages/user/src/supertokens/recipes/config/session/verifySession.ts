import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/session/types";

const verifySession = (
  originalImplementation: APIInterface,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fastify: FastifyInstance,
): APIInterface["verifySession"] => {
  return async (input) => {
    if (originalImplementation.verifySession === undefined) {
      throw new Error("Should never come here");
    }

    input.verifySessionOptions = {
      checkDatabase:
        fastify.config.user.supertokens.checkSessionInDatabase ?? true,
      ...input.verifySessionOptions,
    };

    // [DU 2024-JUN-21] There is currently an issue where the session is not being updated
    // after verifySession fails for the ProfileVerification claim. As a result, the updated
    // gracePeriod is not reflected in the session for users whose grace period has already passed.

    const session = await originalImplementation.verifySession(input);

    if (session) {
      const user = input.userContext._default.request.request.user;

      if (user?.deletedAt) {
        await session.revokeSession();

        throw fastify.httpErrors.unauthorized("User not found");
      }

      if (user?.disabled) {
        await session.revokeSession();

        throw fastify.httpErrors.unauthorized("User is disabled");
      }
    }

    return session;
  };
};

export default verifySession;
