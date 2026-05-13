import type { FastifyInstance } from "fastify";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLE_SUPERADMIN } from "../../constants";
import hasUserPermission from "../hasUserPermission";

// Mock supertokens UserRoles so we can control what roles/permissions come back
// without needing a running SuperTokens server.
vi.mock("supertokens-node/recipe/userroles", () => ({
  default: {
    getPermissionsForRole: vi.fn(),
    getRolesForUser: vi.fn(),
  },
}));

import UserRoles from "supertokens-node/recipe/userroles";

const mockGetRolesForUser = vi.mocked(UserRoles.getRolesForUser);
const mockGetPermissionsForRole = vi.mocked(UserRoles.getPermissionsForRole);

const makeFastify = (permissions?: string[]) =>
  ({ config: { user: { permissions } } }) as unknown as FastifyInstance;

describe("hasUserPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("short-circuit: permission not registered in config", () => {
    it("returns true when config.user.permissions is undefined", async () => {
      const result = await hasUserPermission(
        makeFastify(),
        "user-1",
        "reports:export",
      );

      expect(result).toBe(true);
      expect(mockGetRolesForUser).not.toHaveBeenCalled();
    });

    it("returns true when config.user.permissions is an empty array", async () => {
      const result = await hasUserPermission(
        makeFastify([]),
        "user-1",
        "reports:export",
      );

      expect(result).toBe(true);
      expect(mockGetRolesForUser).not.toHaveBeenCalled();
    });

    it("returns true when the requested permission is not in the configured list", async () => {
      const result = await hasUserPermission(
        makeFastify(["billing:manage"]),
        "user-1",
        "reports:export", // not in the list
      );

      expect(result).toBe(true);
      expect(mockGetRolesForUser).not.toHaveBeenCalled();
    });
  });

  describe("SUPERADMIN bypass", () => {
    it("returns true for a SUPERADMIN regardless of the requested permission", async () => {
      mockGetRolesForUser.mockResolvedValue({
        roles: [ROLE_SUPERADMIN],
        status: "OK",
      });

      const result = await hasUserPermission(
        makeFastify(["billing:manage"]),
        "superadmin-1",
        "billing:manage",
      );

      expect(result).toBe(true);
      expect(mockGetPermissionsForRole).not.toHaveBeenCalled();
    });
  });

  describe("permission check via role", () => {
    it("returns true when the user holds a role that grants the required permission", async () => {
      mockGetRolesForUser.mockResolvedValue({
        roles: ["EDITOR"],
        status: "OK",
      });
      mockGetPermissionsForRole.mockResolvedValue({
        permissions: ["content:publish", "billing:manage"],
        status: "OK",
      });

      const result = await hasUserPermission(
        makeFastify(["billing:manage"]),
        "user-1",
        "billing:manage",
      );

      expect(result).toBe(true);
    });

    it("returns false when none of the user's roles grant the required permission", async () => {
      mockGetRolesForUser.mockResolvedValue({
        roles: ["VIEWER"],
        status: "OK",
      });
      mockGetPermissionsForRole.mockResolvedValue({
        permissions: ["content:read"],
        status: "OK",
      });

      const result = await hasUserPermission(
        makeFastify(["billing:manage"]),
        "user-1",
        "billing:manage",
      );

      expect(result).toBe(false);
    });

    it("de-duplicates permissions when multiple roles grant the same permission", async () => {
      mockGetRolesForUser.mockResolvedValue({
        roles: ["ROLE_A", "ROLE_B"],
        status: "OK",
      });
      // Both roles grant the same permission
      mockGetPermissionsForRole.mockResolvedValue({
        permissions: ["billing:manage"],
        status: "OK",
      });

      const result = await hasUserPermission(
        makeFastify(["billing:manage"]),
        "user-1",
        "billing:manage",
      );

      expect(result).toBe(true);
    });
  });
});
