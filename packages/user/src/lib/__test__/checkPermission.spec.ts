import type { FastifyRequest } from "fastify";

import { beforeEach, describe, expect, it, vi } from "vitest";

import checkPermission from "../checkPermission";

const { mockHasUserPermission } = vi.hoisted(() => ({
  mockHasUserPermission: vi.fn(),
}));

vi.mock("../hasUserPermission", () => ({
  default: mockHasUserPermission,
}));

const makeRequest = (hasPermission?: unknown) =>
  ({
    server: { config: { user: { hasPermission, permissions: [] } } },
    user: { id: "user-1" },
  }) as unknown as FastifyRequest;

describe("checkPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to hasUserPermission when no delegate is configured", async () => {
    mockHasUserPermission.mockResolvedValue(true);
    const request = makeRequest();

    expect(await checkPermission(request, "users:list")).toBe(true);
    expect(mockHasUserPermission).toHaveBeenCalledWith(
      request.server,
      "user-1",
      "users:list",
    );
  });

  it("calls the delegate with the request, the permission and the context", async () => {
    const delegate = vi.fn().mockResolvedValue(true);
    const request = makeRequest(delegate);

    expect(await checkPermission(request, "report.edit", { orgId: 7 })).toBe(
      true,
    );
    expect(delegate).toHaveBeenCalledWith(request, "report.edit", {
      orgId: 7,
    });
  });

  it("passes {} when no context is given", async () => {
    const delegate = vi.fn().mockResolvedValue(true);

    await checkPermission(makeRequest(delegate), "report.edit");

    expect(delegate).toHaveBeenCalledWith(expect.anything(), "report.edit", {});
  });

  it("lets a set delegate decide even where config.user.permissions would allow", async () => {
    const delegate = vi.fn().mockResolvedValue(false);

    expect(await checkPermission(makeRequest(delegate), "users:list")).toBe(
      false,
    );
    expect(mockHasUserPermission).not.toHaveBeenCalled();
  });

  it("refuses anything but true from the delegate", async () => {
    const delegate = vi.fn().mockResolvedValue("yes");

    expect(await checkPermission(makeRequest(delegate), "users:list")).toBe(
      false,
    );
  });

  it("rejects when the delegate throws", async () => {
    const delegate = vi.fn().mockRejectedValue(new Error("database down"));

    await expect(
      checkPermission(makeRequest(delegate), "users:list"),
    ).rejects.toThrow("database down");
  });

  it("returns false without a user, never calling the delegate", async () => {
    const delegate = vi.fn().mockResolvedValue(true);
    const request = { ...makeRequest(delegate), user: undefined };

    expect(await checkPermission(request as FastifyRequest, "users:list")).toBe(
      false,
    );
    expect(delegate).not.toHaveBeenCalled();
    expect(mockHasUserPermission).not.toHaveBeenCalled();
  });
});
