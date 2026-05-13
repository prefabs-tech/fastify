import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import getUserService from "../../../lib/getUserService";

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
