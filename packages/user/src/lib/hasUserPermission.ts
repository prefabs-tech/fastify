import type { FastifyInstance } from "fastify";

import UserRoles from "supertokens-node/recipe/userroles";

import { ROLE_SUPERADMIN } from "../constants";

const getPermissions = async (roles: string[]) => {
  let permissions: string[] = [];

  for (const role of roles) {
    const response = await UserRoles.getPermissionsForRole(role);

    if (response.status === "OK") {
      permissions = [...new Set([...permissions, ...response.permissions])];
    }
  }

  return permissions;
};

const hasUserPermission = async (
  fastify: FastifyInstance,
  userId: string,
  permission: string,
): Promise<boolean> => {
  const permissions = fastify.config.user.permissions;

  // Allow if provided permission is not defined
  if (!permissions || !permissions.includes(permission)) {
    return true;
  }

  const { roles } = await UserRoles.getRolesForUser(userId);

  // Allow if user has super admin role
  if (roles && roles.includes(ROLE_SUPERADMIN)) {
    return true;
  }

  const rolePermissions = await getPermissions(roles);

  if (!rolePermissions || !rolePermissions.includes(permission)) {
    return false;
  }

  return true;
};

export default hasUserPermission;
