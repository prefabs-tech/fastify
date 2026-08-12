import { describe, expect, it } from "vitest";

import type { AuthSession } from "../adapter";

import { getSupertokensSession } from "../supertokensSession";

describe("getSupertokensSession", () => {
  it("returns the same object reference cast as a SuperTokens session", () => {
    const session = {
      fetchAndSetClaim: async () => {
        /* no-op for cast smoke test */
      },
      getAccessTokenPayload: () => ({}),
      getUserId: () => "user-1",
      revokeSession: async () => {
        /* no-op for cast smoke test */
      },
    } as AuthSession & { fetchAndSetClaim: () => Promise<void> };

    const stSession = getSupertokensSession(session);

    expect(stSession).toBe(session);
    expect(stSession.getUserId()).toBe("user-1");
  });
});
