import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { formatDate } from "@prefabs.tech/fastify-slonik";
import { deleteUser, getRequestFromUserContext } from "supertokens-node";
import UserRoles from "supertokens-node/recipe/userroles";

import { User, UserCreateInput } from "src/types";

import { ROLE_USER } from "../../../../constants";
import getUserService from "../../../../lib/getUserService";
import areRolesExist from "../../../utils/areRolesExist";

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/passwordless/types";

const consumeCode = (
  originalImplementation: RecipeInterface,
  fastify: FastifyInstance,
): RecipeInterface["consumeCode"] => {
  return async (input) => {
    const roles = (input.userContext.roles || [
      fastify.config.user.role || ROLE_USER,
    ]) as string[];

    if (!(await areRolesExist(roles))) {
      throw new CustomError(
        `At least one role from ${roles.join(", ")} does not exist.`,
        "SIGNUP_FAILED_ERROR",
      );
    }

    const originalResponse = await originalImplementation.consumeCode(input);

    if (originalResponse.status !== "OK") {
      return originalResponse;
    }

    const request = getRequestFromUserContext(input.userContext)?.original as
      | FastifyRequest
      | undefined;

    const userService = getUserService(
      request?.config || fastify.config,
      request?.slonik || fastify.slonik,
      request?.dbSchema,
    );

    const phoneNumber = originalResponse.user.phoneNumber;

    const emailDomain =
      fastify.config.user.fallbackEmailDomain ||
      fastify.config.appName.toLowerCase().replaceAll(/\s+/g, "") + ".com";

    const email = phoneNumber
      ? `${phoneNumber}@${emailDomain}`
      : originalResponse.user.email;

    if (!email || !phoneNumber) {
      await deleteUser(originalResponse.user.id);

      throw new Error("Passwordless user missing phoneNumber or email");
    }

    let user: User | null | undefined;

    if (originalResponse.createdNewUser) {
      try {
        user = await userService.create({
          id: originalResponse.user.id,
          email,
          phoneNumber,
        } as UserCreateInput);

        if (!user) {
          throw new Error("User not found");
        }
      } catch (error) {
        await deleteUser(originalResponse.user.id);

        throw error;
      }

      user.roles = roles;

      originalResponse.user = {
        ...originalResponse.user,
        ...user,
      };

      for (const role of roles) {
        const rolesResponse = await UserRoles.addRoleToUser(
          originalResponse.user.id,
          role,
        );

        if (rolesResponse.status !== "OK") {
          fastify.log.error(rolesResponse.status);
        }
      }
    } else {
      await userService
        .update(originalResponse.user.id, {
          lastLoginAt: formatDate(new Date(Date.now())),
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .catch((error: any) => {
          fastify.log.error(
            `Unable to update lastLoginAt for userId ${originalResponse.user.id}`,
          );
          fastify.log.error(error);
        });
    }

    return {
      ...originalResponse,
      user: {
        ...originalResponse.user,
        email,
        phoneNumber,
      },
    };
  };
};

export default consumeCode;
