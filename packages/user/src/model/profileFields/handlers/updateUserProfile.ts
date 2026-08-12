import type { FastifyReply, FastifyRequest } from "fastify";

import type { User } from "../../../types";

import { getRequiredSession } from "../../../auth/adapter";
import getUserService from "../../../lib/getUserService";

const updateUserProfile = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { body, config, dbSchema, server, slonik } = request;

  const userId = getRequiredSession(request).getUserId();

  if (!userId) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  if (!body) {
    throw server.httpErrors.badRequest("No data provided");
  }

  const userService = getUserService(config, slonik, dbSchema);

  await userService.updateProfile(userId, body as User["profile"]);

  const user = await userService.findById(userId);

  return reply.status(200).send(user);
};

export default updateUserProfile;
