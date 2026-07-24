import type { MercuriusContext } from "mercurius";

/* istanbul ignore file */
import { mercurius } from "mercurius";
import { describe, expect, it, vi } from "vitest";

import feedbackResolver from "../model/feedback/graphql/resolver";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("../model/feedback/service", () => ({
  default: vi.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

const makeContext = (
  overrides: Partial<MercuriusContext> = {},
): MercuriusContext =>
  ({
    app: { log: { error: vi.fn() } },
    config: { feedback: { enabled: true } },
    database: {},
    dbSchema: "",
    user: { id: "user-1" },
    ...overrides,
  }) as unknown as MercuriusContext;

const arguments_ = {
  data: {
    appVersion: "1.0.0",
    deviceModel: "Pixel 8",
    message: "Great app",
    platform: "android",
    typeId: 1,
  },
};

describe("feedbackResolver.createFeedback", () => {
  it("returns 404 ErrorWithProps when feedback is disabled", async () => {
    const context = makeContext({
      config: {
        feedback: { enabled: false },
      } as unknown as MercuriusContext["config"],
    });

    const result = await feedbackResolver.Mutation.createFeedback(
      undefined,
      arguments_,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(404);
  });

  it("returns 401 ErrorWithProps when user is not in context", async () => {
    const context = makeContext({ user: undefined });

    const result = await feedbackResolver.Mutation.createFeedback(
      undefined,
      arguments_,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(401);
  });

  it("creates a feedback with the context userId", async () => {
    mockCreate.mockResolvedValue({ id: 1 });

    const context = makeContext();

    await feedbackResolver.Mutation.createFeedback(
      undefined,
      arguments_,
      context,
    );

    expect(mockCreate).toHaveBeenCalledWith({
      appVersion: "1.0.0",
      deviceModel: "Pixel 8",
      message: "Great app",
      platform: "android",
      typeId: 1,
      userId: "user-1",
    });
  });

  it("returns 500 ErrorWithProps when the service throws", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));

    const context = makeContext();

    const result = await feedbackResolver.Mutation.createFeedback(
      undefined,
      arguments_,
      context,
    );

    expect(result).toBeInstanceOf(mercurius.ErrorWithProps);
    expect((result as mercurius.ErrorWithProps).statusCode).toBe(500);
  });
});
