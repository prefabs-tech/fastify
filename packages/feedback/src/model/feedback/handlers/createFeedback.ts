import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import type { FeedbackCreateInput } from "../../../types";

import Service from "../service";

const createFeedback = async (request: SessionRequest, reply: FastifyReply) => {
  const { body, config, dbSchema, slonik, user } = request;

  if (!user) {
    throw request.server.httpErrors.unauthorized("Unauthorised");
  }

  const { appVersion, deviceModel, message, platform, typeId } =
    body as FeedbackCreateInput;

  const service = new Service(config, slonik, dbSchema);

  reply.send(
    await service.create({
      appVersion,
      deviceModel,
      message,
      platform,
      typeId,
      userId: user.id,
    }),
  );
};

export default createFeedback;
