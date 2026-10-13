import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";

import { ROLE_USER } from "../../../../constants";
import getUserService from "../../../../lib/getUserService";
import withGrants from "../../../../lib/withGrants";

const thirdPartySignInUpPOST = (
  originalImplementation: APIInterface,
  fastify: FastifyInstance,
): APIInterface["thirdPartySignInUpPOST"] => {
  const { config, log, slonik } = fastify;

  return async (input) => {
    input.userContext.roles = [config.user.role || ROLE_USER];

    if (originalImplementation.thirdPartySignInUpPOST === undefined) {
      throw new Error("Should never come here");
    }

    const originalResponse =
      await originalImplementation.thirdPartySignInUpPOST(input);

    if (originalResponse.status === "OK") {
      const userService = getUserService(
        config,
        slonik,
        input.userContext._default.request.request.dbSchema,
      );

      const user = await userService.findById(originalResponse.user.id);

      if (!user) {
        log.error(
          `User record not found for userId ${originalResponse.user.id}`,
        );

        return {
          message: "Something went wrong",
          status: "GENERAL_ERROR",
        };
      }

      return {
        ...originalResponse,
        user: await withGrants({ ...originalResponse.user, ...user }, fastify),
      };
    }

    return originalResponse;
  };
};

export default thirdPartySignInUpPOST;
