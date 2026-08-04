import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import getUserService from "../../../lib/getUserService";
import { User } from "../../../types";

const updateUserProfile = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const { body, config, dbSchema, server, slonik } = request;

  const userId = request.session?.getUserId() as string;

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
