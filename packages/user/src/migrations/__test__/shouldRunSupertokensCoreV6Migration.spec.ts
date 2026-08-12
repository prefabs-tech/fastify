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
    const sqlToken = query.mock.calls[0]?.[0] as {
      values?: unknown[];
    };
    expect(sqlToken.values).toEqual(["public", "public"]);
  });

  it("binds a custom table schema when provided", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ shouldRun: false }],
    });

    await expect(
      shouldRunSupertokensCoreV6Migration({ query }, "supertokens"),
    ).resolves.toBe(false);

    const sqlToken = query.mock.calls[0]?.[0] as {
      values?: unknown[];
    };
    expect(sqlToken.values).toEqual(["supertokens", "supertokens"]);
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
