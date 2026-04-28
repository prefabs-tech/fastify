import type { FastifyReply, FastifyRequest } from "fastify";

import UserRoles from "supertokens-node/recipe/userroles";

import { ROLE_ADMIN, ROLE_SUPERADMIN } from "../../../constants";

const canAdminSignUp = async (request: FastifyRequest, reply: FastifyReply) => {
  const { server } = request;

  // check if already admin user exists
  const adminUsers = await UserRoles.getUsersThatHaveRole(ROLE_ADMIN);
  const superAdminUsers = await UserRoles.getUsersThatHaveRole(ROLE_SUPERADMIN);

  if (
    adminUsers.status === "UNKNOWN_ROLE_ERROR" &&
    superAdminUsers.status === "UNKNOWN_ROLE_ERROR"
  ) {
    throw server.httpErrors.unprocessableEntity(adminUsers.status);
  } else if (
    (adminUsers.status === "OK" && adminUsers.users.length > 0) ||
    (superAdminUsers.status === "OK" && superAdminUsers.users.length > 0)
  ) {
    return reply.send({ signUp: false });
  }

  reply.send({ signUp: true });
};

export default canAdminSignUp;
