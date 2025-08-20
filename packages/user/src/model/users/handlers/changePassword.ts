import { createNewSession } from "supertokens-node/recipe/session";

import getUserService from "../../../lib/getUserService";
import createUserContext from "../../../supertokens/utils/createUserContext";

import type { ChangePasswordInput } from "../../../types";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const changePassword = async (request: SessionRequest, reply: FastifyReply) => {
  const { body, config, dbSchema, server, slonik, user } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const oldPassword = (body as ChangePasswordInput).oldPassword ?? "";
  const newPassword = (body as ChangePasswordInput).newPassword ?? "";

  const service = getUserService(config, slonik, dbSchema);

  const response = await service.changePassword(
    user.id,
    oldPassword,
    newPassword,
  );

  if (response.status === "OK") {
    await createNewSession(
      request,
      reply,
      user.id,
      undefined,
      undefined,
      createUserContext(undefined, request),
    );
  }

  reply.send(response);
};

export default changePassword;
