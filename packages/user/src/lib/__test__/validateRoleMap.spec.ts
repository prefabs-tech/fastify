import { describe, expect, it } from "vitest";

import type { AccessControlProvider } from "../../types";

import validateRoleMap from "../validateRoleMap";

const admin = {} as AccessControlProvider["admin"];

const check = (accessControl?: Record<string, unknown>) => () =>
  validateRoleMap(accessControl as AccessControlProvider | undefined);

describe("validateRoleMap", () => {
  it("accepts a config without access control or without roleMap", () => {
    expect(check()).not.toThrow();
    expect(check({})).not.toThrow();
    expect(check({ admin })).not.toThrow();
  });

  it("accepts a roleMap of role name arrays with an admin object", () => {
    expect(
      check({ admin, roleMap: { ADMIN: ["user-admin"], USER: [] } }),
    ).not.toThrow();
  });

  it("refuses roleMap without admin to give roles through", () => {
    expect(check({ roleMap: { ADMIN: ["user-admin"] } })).toThrow(
      "config.user.accessControl.roleMap needs config.user.accessControl.admin",
    );
  });

  it("refuses roleMap when admin is not an object", () => {
    expect(
      check({ admin: "supertokens", roleMap: { ADMIN: ["user-admin"] } }),
    ).toThrow("needs config.user.accessControl.admin");
  });

  it.each([
    ["a role mapped to a string", { ADMIN: "user-admin" }],
    ["a role mapped to an array holding a non-string", { ADMIN: [1] }],
    // eslint-disable-next-line unicorn/no-null
    ["null", null],
    ["an array", [["user-admin"]]],
  ])("refuses a roleMap that is %s", (_name, roleMap) => {
    expect(check({ admin, roleMap })).toThrow(
      "must map each SuperTokens role to an array of role names",
    );
  });
});
