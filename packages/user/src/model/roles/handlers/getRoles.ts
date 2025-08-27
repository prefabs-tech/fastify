import RoleService from "../service";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const getRoles = async (request: SessionRequest, reply: FastifyReply) => {
  const service = new RoleService();
  const roles = await service.getRoles();

  return reply.send({ roles });
};

export default getRoles;
