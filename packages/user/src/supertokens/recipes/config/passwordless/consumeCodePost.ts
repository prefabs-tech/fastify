import { ROLE_USER } from "../../../../constants";

import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/passwordless/types";

const consumeCodePOST = (
  originalImplementation: APIInterface,
  fastify: FastifyInstance,
): APIInterface["consumeCodePOST"] => {
  return async (input) => {
    input.userContext.roles = input.userContext.roles || [
      fastify.config.user.role || ROLE_USER,
    ];

    if (originalImplementation.consumeCodePOST === undefined) {
      throw new Error("Should never come here");
    }

    return originalImplementation.consumeCodePOST(input);
  };
};

export default consumeCodePOST;
