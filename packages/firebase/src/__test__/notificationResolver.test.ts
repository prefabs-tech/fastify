import type { MercuriusContext } from "mercurius";

/* istanbul ignore file */
import { mercurius } from "mercurius";
import { describe, expect, it, vi } from "vitest";

import notificationResolver from "../model/notification/graphql/resolver";

// vi.hoisted ensures these are available inside the vi.mock factory (which is hoisted)
const { sendPushNotificationMock } = vi.hoisted(() => ({
  sendPushNotificationMock: vi.fn().mockImplementation(async () => {}),
}));

vi.mock("../lib/sendPushNotification", () => ({
  default: sendPushNotificationMock,
}));

vi.mock("../model/userDevice/service", () => ({
  default: vi.fn().mockImplementation(() => ({
    getByUserId: vi
      .fn()
      .mockResolvedValue([{ deviceToken: "token-abc", userId: "user-1" }]),
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
    user: { id: "sender-1" },
    ...overrides,
  }) as unknown as MercuriusContext;

const arguments_ = {
  data: {
    body: "World",
    data: {},
    title: "Hello",
    userId: "user-1",
  },
};

describe("notificationResolver.sendNotification", () => {
  it("returns 401 ErrorWithProps when user is not in context", async () => {
    const context = makeContext({ user: undefined });
    const result = await notificationResolver.Mutation.sendNotification(
      undefined,
      arguments_,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(401);
  });

  it("returns 404 ErrorWithProps when firebase is disabled", async () => {
    const context = makeContext({
      config: {
        firebase: { enabled: false },
      } as unknown as MercuriusContext["config"],
    });
    const result = await notificationResolver.Mutation.sendNotification(
      undefined,
      arguments_,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(404);
  });

  it("returns 400 ErrorWithProps when userId is missing in args", async () => {
    const context = makeContext();
    const argumentsWithoutUserId = { data: { ...arguments_.data, userId: "" } };
    const result = await notificationResolver.Mutation.sendNotification(
      undefined,
      argumentsWithoutUserId,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(400);
  });

  it("returns 404 ErrorWithProps when receiver has no registered devices", async () => {
    const { default: UserDeviceService } =
      await import("../model/userDevice/service");
    vi.mocked(UserDeviceService).mockImplementationOnce(
      () =>
        ({
          getByUserId: vi.fn().mockResolvedValue([]),
        }) as unknown as ReturnType<typeof UserDeviceService>,
    );

    const context = makeContext();
    const result = await notificationResolver.Mutation.sendNotification(
      undefined,
      arguments_,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(404);
  });

  it("calls sendPushNotification and returns success message when all conditions met", async () => {
    const context = makeContext();
    const result = await notificationResolver.Mutation.sendNotification(
      undefined,
      arguments_,
      context,
    );

    expect(sendPushNotificationMock).toHaveBeenCalled();
    expect(result).toEqual({ message: "Notification sent successfully" });
  });
});
