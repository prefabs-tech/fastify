import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword";

import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { formatDate } from "@prefabs.tech/fastify-slonik";
import { deleteUser, listUsersByAccountInfo } from "supertokens-node";
import UserRoles from "supertokens-node/recipe/userroles";

import { SUPERTOKENS_DEFAULT_TENANT_ID } from "../../../../constants";
import getUserService from "../../../../lib/getUserService";
import areRolesExist from "../../../utils/areRolesExist";

const thirdPartySignInUp = (
  originalImplementation: RecipeInterface,
  fastify: FastifyInstance,
): RecipeInterface["thirdPartySignInUp"] => {
  const { config, log, slonik } = fastify;

  return async (input) => {
    const roles = (input.userContext.roles || []) as string[];

    const thirdPartyUsers = await listUsersByAccountInfo(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      {
        thirdParty: {
          id: input.thirdPartyId,
          userId: input.thirdPartyUserId,
        },
      },
    );

    if (
      thirdPartyUsers.length === 0 &&
      config.user.features?.signUp?.enabled === false
    ) {
      throw fastify.httpErrors.notFound("SignUp feature is currently disabled");
    }

    const originalResponse =
      await originalImplementation.thirdPartySignInUp(input);

    if (originalResponse.status !== "OK") {
      return originalResponse;
    }

    const userService = getUserService(
      config,
      slonik,
      input.userContext._default.request.request.dbSchema,
    );

    if (originalResponse.createdNewRecipeUser) {
      if (!(await areRolesExist(roles))) {
        await deleteUser(originalResponse.user.id);

        throw new CustomError(
          `At least one role from ${roles.join(", ")} does not exist.`,
          "SIGNUP_FAILED_ERROR",
        );
      }

      for (const role of roles) {
        const rolesResponse = await UserRoles.addRoleToUser(
          SUPERTOKENS_DEFAULT_TENANT_ID,
          originalResponse.user.id,
          role,
        );

        if (rolesResponse.status !== "OK") {
          log.error(rolesResponse.status);
        }
      }

      try {
        const user = await userService.create({
          email: originalResponse.user.emails[0] ?? "",
          id: originalResponse.user.id,
        });

        if (!user) {
          throw new Error("User not found");
        }
      } catch (error) {
        await deleteUser(originalResponse.user.id);

        throw error;
      }
    } else {
      await userService
        .update(originalResponse.user.id, {
          lastLoginAt: formatDate(new Date(Date.now())),
        })
        /*eslint-disable-next-line @typescript-eslint/no-explicit-any */
        .catch((error: any) => {
          log.error(
            `Unable to update lastLoginAt for userId ${originalResponse.user.id}`,
          );
          log.error(error);
        });
    }

    return originalResponse;
  };
};

export default thirdPartySignInUp;
