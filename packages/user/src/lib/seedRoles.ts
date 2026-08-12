import { auth } from "../auth/adapter";
import { ROLE_ADMIN, ROLE_SUPERADMIN, ROLE_USER } from "../constants";
import { UserConfig } from "../types";

const seedRoles = async (userConfig?: Partial<UserConfig>) => {
  const roles = [
    ROLE_ADMIN,
    ROLE_SUPERADMIN,
    ROLE_USER,
    ...(userConfig?.roles ?? []),
  ];

  for (const role of roles) {
    await auth.roles.createNewRoleOrAddPermissions(role, []);
  }
};

export default seedRoles;
