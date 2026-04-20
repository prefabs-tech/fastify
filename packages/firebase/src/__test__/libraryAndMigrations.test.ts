/* istanbul ignore file */
import { describe, expect, it, vi } from "vitest";

const {
  createUserDevicesTableQueryMock,
  messagingMock,
  mockQueryToken,
  sendEachForMulticastMock,
} = vi.hoisted(() => ({
  createUserDevicesTableQueryMock: vi.fn(),
  messagingMock: vi.fn(),
  mockQueryToken: { sql: "SELECT 1", type: "SLONIK_TOKEN" },
  sendEachForMulticastMock: vi.fn(),
}));

vi.mock("../migrations/queries", () => ({
  createUserDevicesTableQuery: createUserDevicesTableQueryMock,
}));

vi.mock("firebase-admin", () => ({
  default: {
    messaging: messagingMock,
  },
}));

describe("runMigrations", async () => {
  const { default: runMigrations } =
    await import("../migrations/runMigrations");

  it("executes createUserDevicesTableQuery inside a database connection", async () => {
    createUserDevicesTableQueryMock.mockReturnValue(mockQueryToken);

    const query = vi.fn().mockResolvedValue();
    const connect = vi.fn().mockImplementation(async (handler) => {
      await handler({ query });
    });

    const database = {
      connect,
    };
    const config = {
      firebase: { enabled: true },
    };

    await runMigrations(
      database as Parameters<typeof runMigrations>[0],
      config as Parameters<typeof runMigrations>[1],
    );

    expect(createUserDevicesTableQueryMock).toHaveBeenCalledWith(config);
    expect(connect).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith(mockQueryToken);
  });
});

describe("sendPushNotification", async () => {
  const { default: sendPushNotification } =
    await import("../lib/sendPushNotification");

  it("forwards multicast messages to firebase-admin messaging", async () => {
    sendEachForMulticastMock.mockResolvedValue();
    messagingMock.mockReturnValue({
      sendEachForMulticast: sendEachForMulticastMock,
    });

    const message = {
      notification: {
        body: "Body",
        title: "Title",
      },
      tokens: ["token-a", "token-b"],
    };

    await sendPushNotification(message);

    expect(messagingMock).toHaveBeenCalledOnce();
    expect(sendEachForMulticastMock).toHaveBeenCalledWith(message);
  });
});
