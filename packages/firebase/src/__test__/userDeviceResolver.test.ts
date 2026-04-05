import type { MercuriusContext } from "mercurius";

/* istanbul ignore file */
import { mercurius } from "mercurius";
import { describe, expect, it, vi } from "vitest";

import userDeviceResolver from "../model/userDevice/graphql/resolver";

const mockCreate = vi
  .fn()
  .mockResolvedValue({ deviceToken: "token-abc", id: 1, userId: "user-1" });
const mockGetByUserId = vi
  .fn()
  .mockResolvedValue([{ deviceToken: "token-abc", id: 1, userId: "user-1" }]);
const mockRemoveByDeviceToken = vi
  .fn()
  .mockResolvedValue({ deviceToken: "token-abc", id: 1, userId: "user-1" });

vi.mock("../model/userDevice/service", () => ({
  default: vi.fn().mockImplementation(() => ({
    create: mockCreate,
    getByUserId: mockGetByUserId,
    removeByDeviceToken: mockRemoveByDeviceToken,
  })),
}));

const makeContext = (
  overrides: Partial<MercuriusContext> = {},
): MercuriusContext =>
  ({
    app: { log: { error: vi.fn() } },
    config: { firebase: { enabled: true } },
    database: {},
    dbSchema: "",
    user: { id: "user-1" },
    ...overrides,
  }) as unknown as MercuriusContext;

describe("userDeviceResolver.addUserDevice", () => {
  it("returns 404 ErrorWithProps when firebase is disabled", async () => {
    const context = makeContext({
      config: {
        firebase: { enabled: false },
      } as unknown as MercuriusContext["config"],
    });
    const result = await userDeviceResolver.Mutation.addUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(404);
  });

  it("returns 401 ErrorWithProps when user is not in context", async () => {
    const context = makeContext({ user: undefined });
    const result = await userDeviceResolver.Mutation.addUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(401);
  });

  it("calls service.create with userId and deviceToken and returns result", async () => {
    const context = makeContext();
    const result = await userDeviceResolver.Mutation.addUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(mockCreate).toHaveBeenCalledWith({
      deviceToken: "token-abc",
      userId: "user-1",
    });
    expect(result).toEqual({
      deviceToken: "token-abc",
      id: 1,
      userId: "user-1",
    });
  });
});

describe("userDeviceResolver.removeUserDevice", () => {
  it("returns 404 ErrorWithProps when firebase is disabled", async () => {
    const context = makeContext({
      config: {
        firebase: { enabled: false },
      } as unknown as MercuriusContext["config"],
    });
    const result = await userDeviceResolver.Mutation.removeUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(404);
  });

  it("returns 401 ErrorWithProps when user is not in context", async () => {
    const context = makeContext({ user: undefined });
    const result = await userDeviceResolver.Mutation.removeUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(401);
  });

  it("returns 403 ErrorWithProps when user has no registered devices", async () => {
    mockGetByUserId.mockResolvedValueOnce([]);
    const context = makeContext();
    const result = await userDeviceResolver.Mutation.removeUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(403);
  });

  it("returns 403 ErrorWithProps when device is not owned by requesting user", async () => {
    mockGetByUserId.mockResolvedValueOnce([
      { deviceToken: "different-token", id: 2, userId: "user-1" },
    ]);
    const context = makeContext();
    const result = await userDeviceResolver.Mutation.removeUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(403);
  });

  it("calls service.removeByDeviceToken and returns result when device is owned by user", async () => {
    const context = makeContext();
    const result = await userDeviceResolver.Mutation.removeUserDevice(
      undefined,
      { data: { deviceToken: "token-abc" } },
      context,
    );

    expect(mockRemoveByDeviceToken).toHaveBeenCalledWith("token-abc");
    expect(result).toEqual({
      deviceToken: "token-abc",
      id: 1,
      userId: "user-1",
    });
  });
});
