import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLE_ADMIN, ROLE_SUPERADMIN, ROLE_USER } from "../../constants";
import seedRoles from "../seedRoles";

vi.mock("supertokens-node/recipe/userroles", () => ({
  default: {
    createNewRoleOrAddPermissions: vi.fn().mockResolvedValue({ status: "OK" }),
  },
}));

import UserRoles from "supertokens-node/recipe/userroles";

const mockCreate = vi.mocked(UserRoles.createNewRoleOrAddPermissions);

describe("seedRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seeds ADMIN, SUPERADMIN, and USER by default", async () => {
    await seedRoles();

    const seededRoles = mockCreate.mock.calls.map(([role]) => role);

    expect(seededRoles).toContain(ROLE_ADMIN);
    expect(seededRoles).toContain(ROLE_SUPERADMIN);
    expect(seededRoles).toContain(ROLE_USER);
  });

  it("seeds exactly the three default roles when no extras are configured", async () => {
    await seedRoles();

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("seeds custom roles in addition to the three defaults", async () => {
    await seedRoles({ roles: ["MODERATOR", "EDITOR"] });

    const seededRoles = mockCreate.mock.calls.map(([role]) => role);

    expect(seededRoles).toContain("MODERATOR");
    expect(seededRoles).toContain("EDITOR");
    expect(seededRoles).toHaveLength(5); // 3 defaults + 2 custom
  });

  it("seeds only the three defaults when config.roles is an empty array", async () => {
    await seedRoles({ roles: [] });

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("seeds only the three defaults when userConfig is undefined", async () => {
    await seedRoles();

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("creates each role with an empty permissions array", async () => {
    await seedRoles();

    for (const [, permissions] of mockCreate.mock.calls) {
      expect(permissions).toEqual([]);
    }
  });
});
