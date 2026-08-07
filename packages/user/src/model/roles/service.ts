import { CustomError } from "@prefabs.tech/fastify-error-handler";

import { auth } from "../../auth/adapter";
import { ERROR_CODES } from "../../constants";

class RoleService {
  async createRole(
    role: string,
    permissions?: string[],
  ): Promise<{ status: string }> {
    const roles = await auth.roles.getAllRoles();

    if (roles.includes(role)) {
      throw new CustomError(
        "Unable to create role as it already exists",
        ERROR_CODES.ROLE_ALREADY_EXISTS,
      );
    }

    const createdNewRole = await auth.roles.createNewRoleOrAddPermissions(
      role,
      permissions || [],
    );

    return { status: createdNewRole ? "OK" : "ROLE_ALREADY_EXISTS" };
  }

  async deleteRole(role: string): Promise<{ status: string }> {
    const users = await auth.roles.getUsersThatHaveRole(role);

    if (users.length === 0) {
      const allRoles = await auth.roles.getAllRoles();
      if (!allRoles.includes(role)) {
        throw new CustomError("Invalid role", ERROR_CODES.UNKNOWN_ROLE_ERROR);
      }
    }

    if (users.length > 0) {
      throw new CustomError(
        "The role is currently assigned to one or more users and cannot be deleted",
        ERROR_CODES.ROLE_IN_USE,
      );
    }

    const didRoleExist = await auth.roles.deleteRole(role);

    return { status: didRoleExist ? "OK" : "UNKNOWN_ROLE_ERROR" };
  }

  async getPermissionsForRole(role: string): Promise<string[]> {
    return auth.roles.getPermissionsForRole(role);
  }

  async getRoles(): Promise<{ permissions: string[]; role: string }[]> {
    const roleNames = await auth.roles.getAllRoles();

    // [DU 2024-MAR-20] This is N+1 problem
    const roles = await Promise.all(
      roleNames.map(async (role: string) => {
        const permissions = await auth.roles.getPermissionsForRole(role);

        return {
          permissions,
          role,
        };
      }),
    );

    return roles;
  }

  async updateRolePermissions(
    role: string,
    permissions: string[],
  ): Promise<{ permissions: string[]; status: "OK" }> {
    const rolePermissions = await auth.roles.getPermissionsForRole(role);

    if (rolePermissions.length === 0) {
      const allRoles = await auth.roles.getAllRoles();
      if (!allRoles.includes(role)) {
        throw new CustomError("Invalid role", ERROR_CODES.UNKNOWN_ROLE_ERROR);
      }
    }

    const newPermissions = permissions.filter(
      (permission: string) => !rolePermissions.includes(permission),
    );

    const removedPermissions = rolePermissions.filter(
      (permission: string) => !permissions.includes(permission),
    );

    await auth.roles.removePermissionsFromRole(role, removedPermissions);
    await auth.roles.createNewRoleOrAddPermissions(role, newPermissions);

    const permissionsResponse = await this.getPermissionsForRole(role);

    return {
      permissions: permissionsResponse,
      status: "OK",
    };
  }
}

export default RoleService;
