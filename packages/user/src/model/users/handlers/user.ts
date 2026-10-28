import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify/index.js";

import getUserService from "../../../lib/getUserService.js";

const user = async (request: SessionRequest, reply: FastifyReply) => {
  const service = getUserService(
    request.config,
    request.slonik,
    request.dbSchema,
  );

  const { id } = request.params as { id: string };

  const user = await service.findById(id);

  reply.send(user);
};

export default user;
