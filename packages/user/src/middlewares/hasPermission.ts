import type { FastifyRequest } from "fastify";

import { auth } from "../auth/adapter";
import hasUserPermission from "../lib/hasUserPermission";

const hasPermission =
  (permission: string) =>
  async (request: FastifyRequest): Promise<void> => {
    const user = request.user;

    if (!user) {
      throw auth.errors.createUnauthorizedError("unauthorised");
    }

    if (!(await hasUserPermission(request.server, user.id, permission))) {
      throw auth.errors.createInvalidClaimsError([
        {
          id: auth.roles.PermissionClaim?.key || "st-role.permissions",
          reason: {
            expectedToInclude: permission,
            message: "Not have enough permission",
          },
        },
      ]);
    }
  };

export default hasPermission;
