import humps from "humps";

import type { UserUpdateInput } from "../../types";

const ignoredUpdateKeys = new Set([
  "disable",
  "email",
  "enable",
  "id",
  "lastLoginAt",
  "roles",
  "signedUpAt",
]) as Set<keyof UserUpdateInput>;

const filterUserUpdateInput = (updateInput: UserUpdateInput) => {
  for (const key of Object.keys(updateInput)) {
    if (ignoredUpdateKeys.has(humps.camelize(key) as keyof UserUpdateInput)) {
      delete updateInput[key as keyof UserUpdateInput];
    }
  }
};

export default filterUserUpdateInput;
