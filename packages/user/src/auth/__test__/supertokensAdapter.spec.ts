import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockListUsersByAccountInfo = vi.fn();

vi.mock("supertokens-node", () => ({
  getUser: (...arguments_: unknown[]) => mockGetUser(...arguments_),
  listUsersByAccountInfo: (...arguments_: unknown[]) =>
    mockListUsersByAccountInfo(...arguments_),
  RecipeUserId: class RecipeUserId {
    constructor(public readonly recipeUserId: string) {}
  },
}));

vi.mock("supertokens-node/framework/fastify", () => ({
  wrapResponse: vi.fn(),
}));

vi.mock("supertokens-node/recipe/emailverification", () => ({
  default: {},
  EmailVerificationClaim: { key: "st-ev" },
}));

vi.mock("supertokens-node/recipe/session", () => ({
  default: {},
  Error: class STError extends Error {},
}));

vi.mock("supertokens-node/recipe/thirdpartyemailpassword", () => ({
  default: {},
}));

vi.mock("supertokens-node/recipe/userroles", () => ({
  default: {},
}));

vi.mock("../../supertokens", () => ({ default: vi.fn() }));

import { supertokensProvider } from "../providers";

describe("supertokens adapter user mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps emails[0] to email and thirdParty[0] on getUserById", async () => {
    mockGetUser.mockResolvedValue({
      emails: ["user@example.com"],
      id: "user-id",
      thirdParty: [{ id: "google", userId: "google-user-id" }],
      timeJoined: 1_700_000_000,
    });

    const user =
      await supertokensProvider.adapter.emailPassword.getUserById("user-id");

    expect(user).toEqual({
      email: "user@example.com",
      id: "user-id",
      thirdParty: { id: "google", userId: "google-user-id" },
      timeJoined: 1_700_000_000,
    });
  });

  it("omits thirdParty when the SuperTokens user has none", async () => {
    mockGetUser.mockResolvedValue({
      emails: ["user@example.com"],
      id: "user-id",
      thirdParty: [],
      timeJoined: 1_700_000_000,
    });

    const user =
      await supertokensProvider.adapter.emailPassword.getUserById("user-id");

    expect(user).toEqual({
      email: "user@example.com",
      id: "user-id",
      timeJoined: 1_700_000_000,
    });
    expect(user?.thirdParty).toBeUndefined();
  });

  it("maps listUsersByAccountInfo results the same way", async () => {
    mockListUsersByAccountInfo.mockResolvedValue([
      {
        emails: ["a@example.com"],
        id: "a",
        thirdParty: [{ id: "github", userId: "gh-1" }],
        timeJoined: 1,
      },
      {
        emails: ["b@example.com"],
        id: "b",
        timeJoined: 2,
      },
    ]);

    const users =
      await supertokensProvider.adapter.emailPassword.getUsersByEmail(
        "a@example.com",
      );

    expect(users).toEqual([
      {
        email: "a@example.com",
        id: "a",
        thirdParty: { id: "github", userId: "gh-1" },
        timeJoined: 1,
      },
      {
        email: "b@example.com",
        id: "b",
        timeJoined: 2,
      },
    ]);
  });
});
