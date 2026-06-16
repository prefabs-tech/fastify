import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/session/types";

import { getRequestFromUserContext } from "supertokens-node";

import getUserService from "../../../../lib/getUserService";
import ProfileValidationClaim from "../../../utils/profileValidationClaim";

const createNewSession = (
  originalImplementation: RecipeInterface,

  fastify: FastifyInstance,
): RecipeInterface["createNewSession"] => {
  return async (input) => {
    if (originalImplementation.createNewSession === undefined) {
      throw new Error("Should never come here");
    }

    const request = getRequestFromUserContext(input.userContext)?.original as
      | FastifyRequest
      | undefined;

    let user: FastifyRequest["user"] | undefined;

    if (request && !request.user) {
      const { config, dbSchema, slonik } = request;

      const userService = getUserService(config, slonik, dbSchema);

      user = (await userService.findById(input.userId)) || undefined;

      if (user?.deletedAt) {
        throw fastify.httpErrors.unauthorized("User not found");
      }

      if (user?.disabled) {
        throw fastify.httpErrors.unauthorized("User is disabled");
      }

      request.user = user;
    } else if (!request) {
      // supertokens-node v15 multitenancy internal flow
      // may not set request in userContext. Fetch user and inject
      // a request-like object so ProfileValidationClaim.fetchValue works.
      const { config, slonik } = fastify;

      const userService = getUserService(config, slonik);

      user = (await userService.findById(input.userId)) || undefined;

      if (user?.deletedAt) {
        throw fastify.httpErrors.unauthorized("User not found");
      }

      if (user?.disabled) {
        throw fastify.httpErrors.unauthorized("User is disabled");
      }

      input.userContext._default = input.userContext._default || {};
      input.userContext._default.request = {
        original: {
          config,
          user,
        },
      };
    }

    const session = await originalImplementation.createNewSession(input);

    // re-inject in case v15 cleared _default during createNewSession
    if (!request && user) {
      input.userContext._default = input.userContext._default || {};
      input.userContext._default.request = {
        original: {
          config: fastify.config,
          user,
        },
      };
    }

    const profileValidationEnabled = request
      ? request.config.user.features?.profileValidation?.enabled
      : fastify.config.user?.features?.profileValidation?.enabled;

    if ((request?.user ?? user) && profileValidationEnabled) {
      await session.fetchAndSetClaim(
        new ProfileValidationClaim(),
        input.userContext,
      );
    }

    return session;
  };
};

export default createNewSession;
