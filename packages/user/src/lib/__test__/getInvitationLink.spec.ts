import type { ApiConfig } from "@prefabs.tech/fastify-config";

import { describe, expect, it } from "vitest";

import type { Invitation } from "../../types/invitation";

import { INVITATION_ACCEPT_LINK_PATH } from "../../constants";
import getInvitationLink from "../getInvitationLink";

const baseInvitation: Invitation = {
  createdAt: Date.now(),
  email: "user@example.com",
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  id: 1,
  invitedById: "inviter-id",
  role: "USER",
  token: "test-uuid-token",
  updatedAt: Date.now(),
};

const baseConfig = {
  user: {},
} as unknown as ApiConfig;

describe("getInvitationLink", () => {
  it("uses the default accept link path when not configured", () => {
    const link = getInvitationLink(
      baseConfig,
      baseInvitation,
      "https://app.example.com",
    );

    expect(link).toBe(
      `https://app.example.com/signup/token/${baseInvitation.token}`,
    );
  });

  it("substitutes the invitation token into the default path", () => {
    const invitation: Invitation = {
      ...baseInvitation,
      token: "my-special-token",
    };

    const link = getInvitationLink(
      baseConfig,
      invitation,
      "https://app.example.com",
    );

    expect(link).toContain("my-special-token");
    expect(link).not.toContain(":token");
  });

  it("uses custom acceptLinkPath from config", () => {
    const config = {
      user: {
        invitation: { acceptLinkPath: "/onboarding/accept/:token" },
      },
    } as unknown as ApiConfig;

    const link = getInvitationLink(
      config,
      baseInvitation,
      "https://app.example.com",
    );

    expect(link).toBe(
      `https://app.example.com/onboarding/accept/${baseInvitation.token}`,
    );
  });

  it("preserves origin correctly in the returned URL", () => {
    const link = getInvitationLink(
      baseConfig,
      baseInvitation,
      "https://staging.myapp.io",
    );

    expect(link.startsWith("https://staging.myapp.io/")).toBe(true);
  });

  it("replaces all occurrences of :token in the path", () => {
    const config = {
      user: {
        invitation: { acceptLinkPath: "/a/:token/verify/:token" },
      },
    } as unknown as ApiConfig;

    const link = getInvitationLink(
      config,
      baseInvitation,
      "https://app.example.com",
    );

    expect(link).toBe(
      `https://app.example.com/a/${baseInvitation.token}/verify/${baseInvitation.token}`,
    );
  });

  it("does not replace :token when followed by a word character", () => {
    const config = {
      user: {
        invitation: { acceptLinkPath: "/invite/:tokenizer" },
      },
    } as unknown as ApiConfig;

    const link = getInvitationLink(
      config,
      baseInvitation,
      "https://app.example.com",
    );

    // :tokenizer should NOT be replaced
    expect(link).toContain(":tokenizer");
    expect(link).not.toContain(baseInvitation.token);
  });

  it("default INVITATION_ACCEPT_LINK_PATH constant contains :token placeholder", () => {
    expect(INVITATION_ACCEPT_LINK_PATH).toContain(":token");
  });
});
