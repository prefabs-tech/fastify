import { describe, expect, it } from "vitest";

import type { Invitation } from "../../types/invitation";

import isInvitationValid from "../isInvitationValid";

const baseInvitation: Invitation = {
  createdAt: Date.now(),
  email: "user@example.com",
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days from now
  id: 1,
  invitedById: "inviter-id",
  role: "USER",
  token: "abc-token-uuid",
  updatedAt: Date.now(),
};

describe("isInvitationValid", () => {
  it("returns true for a pending, non-expired invitation", () => {
    expect(isInvitationValid(baseInvitation)).toBe(true);
  });

  it("returns false when invitation has been accepted", () => {
    const invitation: Invitation = {
      ...baseInvitation,
      acceptedAt: Date.now() - 1000,
    };

    expect(isInvitationValid(invitation)).toBe(false);
  });

  it("returns false when invitation has been revoked", () => {
    const invitation: Invitation = {
      ...baseInvitation,
      revokedAt: Date.now() - 1000,
    };

    expect(isInvitationValid(invitation)).toBe(false);
  });

  it("returns false when invitation has expired", () => {
    const invitation: Invitation = {
      ...baseInvitation,
      expiresAt: Date.now() - 1,
    };

    expect(isInvitationValid(invitation)).toBe(false);
  });

  it("returns false when invitation is accepted, revoked, and expired simultaneously", () => {
    const past = Date.now() - 1000;
    const invitation: Invitation = {
      ...baseInvitation,
      acceptedAt: past,
      expiresAt: past,
      revokedAt: past,
    };

    expect(isInvitationValid(invitation)).toBe(false);
  });

  it("returns true when expiry is exactly in the future", () => {
    const invitation: Invitation = {
      ...baseInvitation,
      expiresAt: Date.now() + 1000,
    };

    expect(isInvitationValid(invitation)).toBe(true);
  });
});
