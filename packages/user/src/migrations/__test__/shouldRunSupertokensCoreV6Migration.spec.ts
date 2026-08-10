import { describe, expect, it, vi } from "vitest";

import shouldRunSupertokensCoreV6Migration from "../shouldRunSupertokensCoreV6Migration";

describe("shouldRunSupertokensCoreV6Migration", () => {
  it("returns true when the probe reports a legacy SuperTokens schema", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ shouldRun: true }],
    });

    await expect(shouldRunSupertokensCoreV6Migration({ query })).resolves.toBe(
      true,
    );

    expect(query).toHaveBeenCalledOnce();
    const sqlToken = query.mock.calls[0]?.[0] as { sql?: string };
    expect(sqlToken.sql).toContain("st__all_auth_recipe_users");
    expect(sqlToken.sql).toContain("primary_or_recipe_user_id");
  });

  it("returns false when the probe reports a core 7+ or empty schema", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ shouldRun: false }],
    });

    await expect(shouldRunSupertokensCoreV6Migration({ query })).resolves.toBe(
      false,
    );
  });

  it("returns false when the probe returns no rows", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await expect(shouldRunSupertokensCoreV6Migration({ query })).resolves.toBe(
      false,
    );
  });
});
