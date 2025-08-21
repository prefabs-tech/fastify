import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const getPermissions = async (request: SessionRequest, reply: FastifyReply) => {
  const { config } = request;

  const permissions: string[] = config.user.permissions || [];

  reply.send({ permissions });
};

export default getPermissions;
