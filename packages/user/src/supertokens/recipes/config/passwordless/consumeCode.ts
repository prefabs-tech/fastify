import { deleteUser, getRequestFromUserContext } from "supertokens-node";

import { UserCreateInput } from "src/types";

import getUserService from "../../../../lib/getUserService";

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/passwordless/types";

const consumeCode = (
  originalImplementation: RecipeInterface,
  fastify: FastifyInstance,
): RecipeInterface["consumeCode"] => {
  return async (input) => {
    const originalResponse = await originalImplementation.consumeCode(input);

    if (originalResponse.status !== "OK" || !originalResponse.createdNewUser) {
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

    const emailHost =
      fastify.config.appName.toLowerCase().replaceAll(/\s+/g, "") + ".com";

    const email = phoneNumber
      ? `${phoneNumber}@${emailHost}`
      : originalResponse.user.email;

    if (!email || !phoneNumber) {
      await deleteUser(originalResponse.user.id);

      throw new Error("Passwordless user missing phoneNumber or email");
    }

    try {
      const user = await userService.create({
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
