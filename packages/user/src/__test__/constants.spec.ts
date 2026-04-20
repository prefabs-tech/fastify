import { describe, expect, it } from "vitest";

import {
  DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB,
  EMAIL_VERIFICATION_MODE,
  EMAIL_VERIFICATION_PATH,
  ERROR_CODES,
  INVITATION_ACCEPT_LINK_PATH,
  INVITATION_EXPIRE_AFTER_IN_DAYS,
  PERMISSIONS_INVITATIONS_CREATE,
  PERMISSIONS_INVITATIONS_DELETE,
  PERMISSIONS_INVITATIONS_LIST,
  PERMISSIONS_INVITATIONS_RESEND,
  PERMISSIONS_INVITATIONS_REVOKE,
  PERMISSIONS_USERS_DISABLE,
  PERMISSIONS_USERS_ENABLE,
  PERMISSIONS_USERS_LIST,
  PERMISSIONS_USERS_READ,
  RESET_PASSWORD_PATH,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
  ROLE_USER,
  ROUTE_CHANGE_EMAIL,
  ROUTE_CHANGE_PASSWORD,
  ROUTE_INVITATIONS,
  ROUTE_INVITATIONS_ACCEPT,
  ROUTE_INVITATIONS_GET_BY_TOKEN,
  ROUTE_ME,
  ROUTE_ME_PHOTO,
  ROUTE_PERMISSIONS,
  ROUTE_ROLES,
  ROUTE_ROLES_PERMISSIONS,
  ROUTE_SIGNUP_ADMIN,
  ROUTE_USERS,
  ROUTE_USERS_DISABLE,
  ROUTE_USERS_ENABLE,
  ROUTE_USERS_FIND_BY_ID,
  SUPERTOKENS_CORS_HEADERS,
  TABLE_INVITATIONS,
  TABLE_USERS,
} from "../constants";

describe("role constants", () => {
  it("ROLE_ADMIN is 'ADMIN'", () => {
    expect(ROLE_ADMIN).toBe("ADMIN");
  });

  it("ROLE_SUPERADMIN is 'SUPERADMIN'", () => {
    expect(ROLE_SUPERADMIN).toBe("SUPERADMIN");
  });

  it("ROLE_USER is 'USER'", () => {
    expect(ROLE_USER).toBe("USER");
  });
});

describe("permission constants", () => {
  it.each([
    [PERMISSIONS_INVITATIONS_CREATE, "invitations:create"],
    [PERMISSIONS_INVITATIONS_DELETE, "invitations:delete"],
    [PERMISSIONS_INVITATIONS_LIST, "invitations:list"],
    [PERMISSIONS_INVITATIONS_RESEND, "invitations:resend"],
    [PERMISSIONS_INVITATIONS_REVOKE, "invitations:revoke"],
    [PERMISSIONS_USERS_DISABLE, "users:disable"],
    [PERMISSIONS_USERS_ENABLE, "users:enable"],
    [PERMISSIONS_USERS_LIST, "users:list"],
    [PERMISSIONS_USERS_READ, "users:read"],
  ])("permission constant %s equals expected value", (constant, expected) => {
    expect(constant).toBe(expected);
  });
});

describe("table name constants", () => {
  it("TABLE_USERS is 'users'", () => {
    expect(TABLE_USERS).toBe("users");
  });

  it("TABLE_INVITATIONS is 'invitations'", () => {
    expect(TABLE_INVITATIONS).toBe("invitations");
  });
});

describe("route constants", () => {
  it("ROUTE_ME is '/me'", () => {
    expect(ROUTE_ME).toBe("/me");
  });

  it("ROUTE_ME_PHOTO is '/me/photo'", () => {
    expect(ROUTE_ME_PHOTO).toBe("/me/photo");
  });

  it("ROUTE_USERS is '/users'", () => {
    expect(ROUTE_USERS).toBe("/users");
  });

  it("ROUTE_USERS_FIND_BY_ID contains :id", () => {
    expect(ROUTE_USERS_FIND_BY_ID).toContain(":id");
  });

  it("ROUTE_USERS_DISABLE ends with /disable", () => {
    expect(ROUTE_USERS_DISABLE).toMatch(/\/disable$/);
  });

  it("ROUTE_USERS_ENABLE ends with /enable", () => {
    expect(ROUTE_USERS_ENABLE).toMatch(/\/enable$/);
  });

  it("ROUTE_CHANGE_EMAIL is '/change-email'", () => {
    expect(ROUTE_CHANGE_EMAIL).toBe("/change-email");
  });

  it("ROUTE_CHANGE_PASSWORD is '/change_password'", () => {
    expect(ROUTE_CHANGE_PASSWORD).toBe("/change_password");
  });

  it("ROUTE_SIGNUP_ADMIN is '/signup/admin'", () => {
    expect(ROUTE_SIGNUP_ADMIN).toBe("/signup/admin");
  });

  it("ROUTE_INVITATIONS is '/invitations'", () => {
    expect(ROUTE_INVITATIONS).toBe("/invitations");
  });

  it("ROUTE_INVITATIONS_ACCEPT contains :token", () => {
    expect(ROUTE_INVITATIONS_ACCEPT).toContain(":token");
  });

  it("ROUTE_INVITATIONS_GET_BY_TOKEN contains :token", () => {
    expect(ROUTE_INVITATIONS_GET_BY_TOKEN).toContain(":token");
  });

  it("ROUTE_ROLES is '/roles'", () => {
    expect(ROUTE_ROLES).toBe("/roles");
  });

  it("ROUTE_ROLES_PERMISSIONS is '/roles/permissions'", () => {
    expect(ROUTE_ROLES_PERMISSIONS).toBe("/roles/permissions");
  });

  it("ROUTE_PERMISSIONS is '/permissions'", () => {
    expect(ROUTE_PERMISSIONS).toBe("/permissions");
  });

  it("RESET_PASSWORD_PATH is '/reset-password'", () => {
    expect(RESET_PASSWORD_PATH).toBe("/reset-password");
  });

  it("EMAIL_VERIFICATION_PATH is '/verify-email'", () => {
    expect(EMAIL_VERIFICATION_PATH).toBe("/verify-email");
  });
});

describe("invitation constants", () => {
  it("INVITATION_ACCEPT_LINK_PATH contains :token placeholder", () => {
    expect(INVITATION_ACCEPT_LINK_PATH).toContain(":token");
  });

  it("INVITATION_EXPIRE_AFTER_IN_DAYS is 30", () => {
    expect(INVITATION_EXPIRE_AFTER_IN_DAYS).toBe(30);
  });
});

describe("SUPERTOKENS_CORS_HEADERS", () => {
  it("is an array", () => {
    expect(Array.isArray(SUPERTOKENS_CORS_HEADERS)).toBe(true);
  });

  it.each([
    "anti-csrf",
    "authorization",
    "fdi-version",
    "front-token",
    "rid",
    "st-access-token",
    "st-auth-mode",
    "st-refresh-token",
  ])("includes '%s'", (header) => {
    expect(SUPERTOKENS_CORS_HEADERS).toContain(header);
  });

  it("has exactly 8 headers", () => {
    expect(SUPERTOKENS_CORS_HEADERS).toHaveLength(8);
  });
});

describe("ERROR_CODES", () => {
  it.each([
    ["CHANGE_PASSWORD", "CHANGE_PASSWORD_ERROR"],
    ["INVALID_EMAIL", "INVALID_EMAIL_ERROR"],
    ["INVALID_PASSWORD", "INVALID_PASSWORD_ERROR"],
    ["INVITATION_ALREADY_EXISTS", "INVITATION_ALREADY_EXISTS_ERROR"],
    ["INVITATION_NOT_FOUND", "INVITATION_NOT_FOUND_ERROR"],
    ["PHOTO_FILE_MISSING", "PHOTO_FILE_MISSING_ERROR"],
    ["PHOTO_FILE_TOO_LARGE", "PHOTO_FILE_TOO_LARGE_ERROR"],
    ["ROLE_ALREADY_EXISTS", "ROLE_ALREADY_EXISTS_ERROR"],
    ["ROLE_IN_USE", "ROLE_IN_USE_ERROR"],
    ["ROLE_NOT_FOUND", "ROLE_NOT_FOUND_ERROR"],
    ["ROLE_NOT_SUPPORTED", "ROLE_NOT_SUPPORTED_ERROR"],
    ["UNSUPPORTED_PHOTO_FILE_TYPE", "UNSUPPORTED_PHOTO_FILE_TYPE_ERROR"],
    ["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_ERROR"],
    ["USER_NOT_FOUND", "USER_NOT_FOUND_ERROR"],
  ] as const)("ERROR_CODES.%s is '%s'", (key, expected) => {
    expect(ERROR_CODES[key]).toBe(expected);
  });
});

describe("photo constants", () => {
  it("DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB is 5", () => {
    expect(DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB).toBe(5);
  });
});

describe("email verification constants", () => {
  it("EMAIL_VERIFICATION_MODE is 'REQUIRED'", () => {
    expect(EMAIL_VERIFICATION_MODE).toBe("REQUIRED");
  });
});
