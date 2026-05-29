import type { FastifyReply, FastifyRequest } from "fastify";

import type { ChangePasswordInput } from "../../../types";

import { auth } from "../../../auth/adapter";
import getUserService from "../../../lib/getUserService";

const changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
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
    await auth.session.createNewSession(
      request,
      reply,
      user.id,
      undefined,
      undefined,
      auth.createUserContext(request),
    );
  }

  reply.send(response);
};

export default changePassword;
