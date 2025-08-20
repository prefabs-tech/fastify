import { CustomError } from "@prefabs.tech/fastify-error-handler";
import UserRoles from "supertokens-node/recipe/userroles";

import { ERROR_CODES } from "../../constants";

class RoleService {
  async createRole(
    role: string,
    permissions?: string[],
  ): Promise<{ status: "OK" }> {
    const { roles } = await UserRoles.getAllRoles(role);

    if (roles.includes(role)) {
      throw new CustomError(
        "Unable to create role as it already exists",
        ERROR_CODES.ROLE_ALREADY_EXISTS,
      );
    }

    const createRoleResponse = await UserRoles.createNewRoleOrAddPermissions(
      role,
      permissions || [],
    );

    return { status: createRoleResponse.status };
  }

  async deleteRole(role: string): Promise<{ status: "OK" }> {
    const response = await UserRoles.getUsersThatHaveRole(role);

    if (response.status === "UNKNOWN_ROLE_ERROR") {
      throw new CustomError("Invalid role", ERROR_CODES.UNKNOWN_ROLE_ERROR);
    }

    if (response.users.length > 0) {
      throw new CustomError(
        "The role is currently assigned to one or more users and cannot be deleted",
        ERROR_CODES.ROLE_IN_USE,
      );
    }

    const deleteRoleResponse = await UserRoles.deleteRole(role);

    return { status: deleteRoleResponse.status };
  }

  async getPermissionsForRole(role: string): Promise<string[]> {
    let permissions: string[] = [];

    const response = await UserRoles.getPermissionsForRole(role);

    if (response.status === "OK") {
      permissions = response.permissions;
    }

    return permissions;
  }

  async getRoles(): Promise<{ role: string; permissions: string[] }[]> {
    let roles: { role: string; permissions: string[] }[] = [];

    const response = await UserRoles.getAllRoles();

    if (response.status === "OK") {
      // [DU 2024-MAR-20] This is N+1 problem
      roles = await Promise.all(
        response.roles.map(async (role) => {
          const response = await UserRoles.getPermissionsForRole(role);

          return {
            role,
            permissions: response.status === "OK" ? response.permissions : [],
          };
        }),
      );
    }

    return roles;
  }

  async updateRolePermissions(
    role: string,
    permissions: string[],
  ): Promise<{ status: "OK"; permissions: string[] }> {
    const response = await UserRoles.getPermissionsForRole(role);

    if (response.status === "UNKNOWN_ROLE_ERROR") {
      throw new CustomError("Invalid role", ERROR_CODES.UNKNOWN_ROLE_ERROR);
    }

    const rolePermissions = response.permissions;

    const newPermissions = permissions.filter(
      (permission) => !rolePermissions.includes(permission),
    );

    const removedPermissions = rolePermissions.filter(
      (permission) => !permissions.includes(permission),
    );

    await UserRoles.removePermissionsFromRole(role, removedPermissions);
    await UserRoles.createNewRoleOrAddPermissions(role, newPermissions);

    const permissionsResponse = await this.getPermissionsForRole(role);

    return {
      status: "OK",
      permissions: permissionsResponse,
    };
  }
}

export default RoleService;
