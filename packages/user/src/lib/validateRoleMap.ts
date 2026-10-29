import type { AccessControlProvider } from "../types";

/** Stops registration when `roleMap` couldn't be applied at sign-up. */
const validateRoleMap = (accessControl?: AccessControlProvider): void => {
  const { admin, roleMap } = accessControl ?? {};

  if (roleMap === undefined) {
    return;
  }

  if (!admin || typeof admin !== "object") {
    throw new Error(
      "config.user.accessControl.roleMap needs config.user.accessControl.admin to give roles through",
    );
  }

  const valid =
    typeof roleMap === "object" &&
    roleMap !== null &&
    !Array.isArray(roleMap) &&
    Object.values(roleMap).every(
      (roles) =>
        Array.isArray(roles) && roles.every((role) => typeof role === "string"),
    );

  if (!valid) {
    throw new Error(
      "config.user.accessControl.roleMap must map each SuperTokens role to an array of role names",
    );
  }
};

export default validateRoleMap;
