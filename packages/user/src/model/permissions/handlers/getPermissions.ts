import type { FastifyReply, FastifyRequest } from "fastify";

const getPermissions = async (request: FastifyRequest, reply: FastifyReply) => {
  const { config } = request;

  const permissions: string[] = config.user.permissions || [];

  reply.send({ permissions });
};

export default getPermissions;
