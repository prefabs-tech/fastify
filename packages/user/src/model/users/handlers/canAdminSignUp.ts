import type { FastifyReply, FastifyRequest } from "fastify";

import { auth } from "../../../auth/adapter";
import { ROLE_ADMIN, ROLE_SUPERADMIN } from "../../../constants";

const canAdminSignUp = async (request: FastifyRequest, reply: FastifyReply) => {
  const { server } = request;

  // check if already admin user exists
  const adminUsers = await auth.roles.getUsersThatHaveRole(ROLE_ADMIN);
  const superAdminUsers =
    await auth.roles.getUsersThatHaveRole(ROLE_SUPERADMIN);

  if (adminUsers.length === 0 && superAdminUsers.length === 0) {
    const allRoles = await auth.roles.getAllRoles();

    if (!allRoles.includes(ROLE_ADMIN) && !allRoles.includes(ROLE_SUPERADMIN)) {
      throw server.httpErrors.unprocessableEntity("UNKNOWN_ROLE_ERROR");
    }
  }

  if (adminUsers.length > 0 || superAdminUsers.length > 0) {
    return reply.send({ signUp: false });
  }

  reply.send({ signUp: true });
};

export default canAdminSignUp;
