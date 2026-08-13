import { describe, expect, it, vi } from "vitest";

import detectSupertokensCoreSchemaStage from "../detectSupertokensCoreSchemaStage";

describe("detectSupertokensCoreSchemaStage", () => {
  it("returns fresh when no legacy SuperTokens table exists", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          hasAccountLinking: false,
          hasAppsTable: false,
          hasLegacyUsersTable: false,
          hasSamlTables: false,
        },
      ],
    });

    await expect(detectSupertokensCoreSchemaStage({ query })).resolves.toBe(
      "fresh",
    );
  });

  it("binds custom schema and prefix names", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          hasAccountLinking: false,
          hasAppsTable: true,
          hasLegacyUsersTable: true,
          hasSamlTables: false,
        },
      ],
    });

    await expect(
      detectSupertokensCoreSchemaStage(
        { query },
        { tableNamesPrefix: "st__", tableSchema: "supertokens" },
      ),
    ).resolves.toBe("needs_v7");

    const sqlToken = query.mock.calls[0]?.[0] as { values?: unknown[] };
    expect(sqlToken.values).toEqual([
      "supertokens",
      "st__all_auth_recipe_users",
      "supertokens",
      "st__apps",
      "supertokens",
      "st__app_id_to_user_id",
      "supertokens",
      "st__saml_clients",
    ]);
  });

  it("returns needs_v6 for pre-multitenancy schemas", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          hasAccountLinking: false,
          hasAppsTable: false,
          hasLegacyUsersTable: true,
          hasSamlTables: false,
        },
      ],
    });

    await expect(detectSupertokensCoreSchemaStage({ query })).resolves.toBe(
      "needs_v6",
    );
  });

  it("returns ready when the schema already has the Core 9 marker", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          hasAccountLinking: true,
          hasAppsTable: true,
          hasLegacyUsersTable: true,
          hasSamlTables: true,
        },
      ],
    });

    await expect(detectSupertokensCoreSchemaStage({ query })).resolves.toBe(
      "ready",
    );
  });
});
