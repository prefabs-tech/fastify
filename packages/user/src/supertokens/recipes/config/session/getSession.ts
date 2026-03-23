import getUserService from "../../../../lib/getUserService";

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/session/types";

const getSession = (
  originalImplementation: RecipeInterface,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fastify: FastifyInstance,
): RecipeInterface["getSession"] => {
  return async (input) => {
    if (originalImplementation.getSession === undefined) {
      throw new Error("Should never come here");
    }

    const { config, dbSchema, slonik } = input.userContext._default.request
      .request as FastifyRequest;

    input.options = {
      checkDatabase: config.user.supertokens!.checkSessionInDatabase ?? true,
      ...input.options,
    };

    const session = await originalImplementation.getSession(input);

    if (session) {
      const userId = session.getUserId();

      const userService = getUserService(config, slonik, dbSchema);

      const user = (await userService.findById(userId)) || undefined;

      input.userContext._default.request.request.user = user;
    }

    return session;
  };
};

export default getSession;
