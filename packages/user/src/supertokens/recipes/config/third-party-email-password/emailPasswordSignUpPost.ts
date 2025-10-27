import { ROLE_USER } from "../../../../constants";

import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";

const emailPasswordSignUpPOST = (
  originalImplementation: APIInterface,
  fastify: FastifyInstance,
): APIInterface["emailPasswordSignUpPOST"] => {
  return async (input) => {
    input.userContext.roles = [fastify.config.user.role || ROLE_USER];

    if (originalImplementation.emailPasswordSignUpPOST === undefined) {
      throw new Error("Should never come here");
    }

    if (fastify.config.user.features?.signUp?.enabled === false) {
      throw fastify.httpErrors.notFound("SignUp feature is currently disabled");
    }

    const originalResponse =
      await originalImplementation.emailPasswordSignUpPOST(input);

    if (originalResponse.status === "OK") {
      return {
        status: "OK",
        user: originalResponse.user,
        session: originalResponse.session,
      };
    }

    return originalResponse;
  };
};

export default emailPasswordSignUpPOST;
