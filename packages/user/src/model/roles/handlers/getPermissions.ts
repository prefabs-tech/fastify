import RoleService from "../service";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const getPermissions = async (request: SessionRequest, reply: FastifyReply) => {
  const { query } = request;
  let permissions: string[] = [];

  let { role } = query as { role?: string };

  if (role) {
    try {
      role = JSON.parse(role) as string;
    } catch {
      /* empty */
    }

    if (typeof role != "string") {
      return reply.send({ permissions });
    }

    const service = new RoleService();

    permissions = await service.getPermissionsForRole(role);
  }

  return reply.send({ permissions });
};

export default getPermissions;
