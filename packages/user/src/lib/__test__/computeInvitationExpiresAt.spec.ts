import type { ApiConfig } from "@prefabs.tech/fastify-config";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { INVITATION_EXPIRE_AFTER_IN_DAYS } from "../../constants";
import computeInvitationExpiresAt from "../computeInvitationExpiresAt";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const FIXED_NOW = new Date("2024-06-15T12:00:00.000Z").getTime();

const baseConfig = {
  user: {},
} as unknown as ApiConfig;

describe("computeInvitationExpiresAt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the provided expireTime as-is when supplied", () => {
    const expireTime = "2099-12-31 23:59:59.000";

    expect(computeInvitationExpiresAt(baseConfig, expireTime)).toBe(expireTime);
  });

  it("returns a formatted date string when expireTime is not provided", () => {
    const result = computeInvitationExpiresAt(baseConfig);

    // Format: "YYYY-MM-DD HH:mm:ss.mmm"
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  it(`uses the default expiry of ${INVITATION_EXPIRE_AFTER_IN_DAYS} days when not configured`, () => {
    const result = computeInvitationExpiresAt(baseConfig);

    const expectedDate = new Date(
      FIXED_NOW + INVITATION_EXPIRE_AFTER_IN_DAYS * MS_PER_DAY,
    );
    const expectedString = expectedDate
      .toISOString()
      .slice(0, 23)
      .replace("T", " ");

    expect(result).toBe(expectedString);
  });

  it("uses expireAfterInDays from config when provided", () => {
    const config = {
      user: { invitation: { expireAfterInDays: 7 } },
    } as unknown as ApiConfig;

    const result = computeInvitationExpiresAt(config);

    const expectedDate = new Date(FIXED_NOW + 7 * MS_PER_DAY);
    const expectedString = expectedDate
      .toISOString()
      .slice(0, 23)
      .replace("T", " ");

    expect(result).toBe(expectedString);
  });

  it("expiry date is later than current time", () => {
    const result = computeInvitationExpiresAt(baseConfig);

    const now = new Date(FIXED_NOW)
      .toISOString()
      .slice(0, 23)
      .replace("T", " ");

    expect(result > now).toBe(true);
  });
});
