import type { FastifyReply, FastifyRequest } from "fastify";

import RoleService from "../service";

const getRoles = async (request: FastifyRequest, reply: FastifyReply) => {
  const service = new RoleService();
  const roles = await service.getRoles();

  return reply.send({ roles });
};

export default getRoles;
