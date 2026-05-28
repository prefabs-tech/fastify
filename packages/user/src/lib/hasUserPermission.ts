import type { FastifyInstance } from "fastify";

import { auth } from "../auth/adapter";
import { ROLE_SUPERADMIN } from "../constants";

const getPermissions = async (roles: string[]) => {
  let permissions: string[] = [];

  for (const role of roles) {
    const rolePermissions = await auth.roles.getPermissionsForRole(role);
    permissions = [...new Set([...permissions, ...rolePermissions])];
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

  const roles = await auth.roles.getRolesForUser(userId);

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
