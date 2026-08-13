import { describe, expect, it } from "vitest";

import { applyTableNamesPrefix } from "../supertokensCoreSql";

describe("applyTableNamesPrefix", () => {
  it("leaves unprefixed SQL unchanged when prefix is empty", () => {
    const sqlText =
      "CREATE TABLE apps (id INT); CREATE INDEX user_roles_role_index ON user_roles (role);";

    expect(applyTableNamesPrefix(sqlText)).toBe(sqlText);
  });

  it("prefixes table, constraint, and index identifiers", () => {
    const sqlText = `
      CREATE TABLE apps (
        app_id VARCHAR(64),
        CONSTRAINT apps_pkey PRIMARY KEY (app_id)
      );
      CREATE INDEX user_roles_role_index ON user_roles (role);
    `;

    expect(applyTableNamesPrefix(sqlText, "st__")).toContain(
      "CREATE TABLE st__apps",
    );
    expect(applyTableNamesPrefix(sqlText, "st__")).toContain(
      "CONSTRAINT st__apps_pkey",
    );
    expect(applyTableNamesPrefix(sqlText, "st__")).toContain(
      "CREATE INDEX st__user_roles_role_index ON st__user_roles",
    );
  });

  it("supports custom prefixes", () => {
    const sqlText = "CREATE TABLE saml_clients (id INT);";

    expect(applyTableNamesPrefix(sqlText, "supertokens_")).toContain(
      "CREATE TABLE supertokens_saml_clients",
    );
  });
});
