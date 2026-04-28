import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProfileValidationClaim from "../profileValidationClaim";

const FIXED_NOW = new Date("2024-06-15T12:00:00.000Z").getTime();

const makePayload = (
  value: { gracePeriodEndsAt?: number; isVerified: boolean } | undefined,
) => {
  if (value === undefined) {
    return {};
  }

  return {
    profileValidation: {
      t: FIXED_NOW,
      v: value,
    },
  };
};

describe("ProfileValidationClaim", () => {
  let claim: ProfileValidationClaim;

  beforeEach(() => {
    claim = new ProfileValidationClaim();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("static properties", () => {
    it("has key 'profileValidation'", () => {
      expect(ProfileValidationClaim.key).toBe("profileValidation");
    });

    it("has defaultMaxAgeInSeconds as undefined", () => {
      expect(ProfileValidationClaim.defaultMaxAgeInSeconds).toBeUndefined();
    });
  });

  describe("getValueFromPayload", () => {
    it("returns undefined when key is absent from payload", () => {
      expect(claim.getValueFromPayload({}, {})).toBeUndefined();
    });

    it("returns the value when present in payload", () => {
      const payload = makePayload({ isVerified: true });

      expect(claim.getValueFromPayload(payload, {})).toEqual({
        isVerified: true,
      });
    });
  });

  describe("getLastRefetchTime", () => {
    it("returns undefined when key is absent from payload", () => {
      expect(claim.getLastRefetchTime({}, {})).toBeUndefined();
    });

    it("returns the timestamp when present in payload", () => {
      const payload = makePayload({ isVerified: true });

      expect(claim.getLastRefetchTime(payload, {})).toBe(FIXED_NOW);
    });
  });

  describe("addToPayload_internal", () => {
    it("adds profileValidation to the payload with value and current timestamp", () => {
      const result = claim.addToPayload_internal({}, { isVerified: true }, {});

      expect(result.profileValidation).toBeDefined();
      expect(result.profileValidation.v).toEqual({ isVerified: true });
      expect(result.profileValidation.t).toBe(FIXED_NOW);
    });

    it("preserves existing payload properties", () => {
      const result = claim.addToPayload_internal(
        { other: "value" },
        { isVerified: true },
        {},
      );

      expect(result.other).toBe("value");
    });
  });

  describe("removeFromPayload", () => {
    it("removes the profileValidation key from payload", () => {
      const payload = makePayload({ isVerified: true });
      const result = claim.removeFromPayload(payload, {});

      expect(result.profileValidation).toBeUndefined();
    });

    it("preserves other payload properties", () => {
      const payload = { ...makePayload({ isVerified: true }), other: "value" };
      const result = claim.removeFromPayload(payload, {});

      expect(result.other).toBe("value");
    });

    it("does not mutate the original payload", () => {
      const payload = makePayload({ isVerified: true });
      claim.removeFromPayload(payload, {});

      expect(payload.profileValidation).toBeDefined();
    });
  });

  describe("removeFromPayloadByMerge_internal", () => {
    it("sets the profileValidation key to null (merge-style removal)", () => {
      const payload = makePayload({ isVerified: true });
      const result = claim.removeFromPayloadByMerge_internal(payload, {});

      expect(result.profileValidation).toBeNull();
    });

    it("preserves other payload properties", () => {
      const payload = { ...makePayload({ isVerified: true }), other: "value" };
      const result = claim.removeFromPayloadByMerge_internal(payload, {});

      expect(result.other).toBe("value");
    });
  });

  describe("validators.isVerified", () => {
    describe("shouldRefetch", () => {
      it("always returns true", () => {
        const validator = claim.validators.isVerified();

        expect(validator.shouldRefetch({})).toBe(true);
      });
    });

    describe("validate", () => {
      it("returns isValid: false with 'value does not exist' when claim is absent", async () => {
        const validator = claim.validators.isVerified();
        const result = await validator.validate({}, {});

        expect(result.isValid).toBe(false);
        if (!result.isValid) {
          expect(result.reason.message).toBe("value does not exist");
          expect(result.reason.expectedValue).toBe(true);
          expect(result.reason.actualValue).toBeUndefined();
        }
      });

      it("returns isValid: true when profile is verified", async () => {
        const validator = claim.validators.isVerified();
        const payload = makePayload({ isVerified: true });

        const result = await validator.validate(payload, {});

        expect(result.isValid).toBe(true);
      });

      it("returns isValid: false with 'User profile is incomplete' when not verified and no grace period", async () => {
        const validator = claim.validators.isVerified();
        const payload = makePayload({ isVerified: false });

        const result = await validator.validate(payload, {});

        expect(result.isValid).toBe(false);
        if (!result.isValid) {
          expect(result.reason.message).toBe("User profile is incomplete");
          expect(result.reason.expectedValue).toBe(true);
          expect(result.reason.actualValue).toBe(false);
        }
      });

      it("returns isValid: true when not verified but still within grace period", async () => {
        const validator = claim.validators.isVerified();
        const gracePeriodEndsAt = FIXED_NOW + 1000 * 60 * 60 * 24; // 1 day from now
        const payload = makePayload({ gracePeriodEndsAt, isVerified: false });

        const result = await validator.validate(payload, {});

        expect(result.isValid).toBe(true);
      });

      it("returns isValid: false when not verified and grace period has expired", async () => {
        const validator = claim.validators.isVerified();
        const gracePeriodEndsAt = FIXED_NOW - 1; // 1ms in the past
        const payload = makePayload({ gracePeriodEndsAt, isVerified: false });

        const result = await validator.validate(payload, {});

        expect(result.isValid).toBe(false);
        if (!result.isValid) {
          expect(result.reason.message).toBe("User profile is incomplete");
        }
      });

      it("uses the custom id when provided to isVerified()", () => {
        const validator = claim.validators.isVerified(
          undefined,
          "custom-claim-id",
        );

        expect(validator.id).toBe("custom-claim-id");
      });

      it("defaults to the claim key as validator id", () => {
        const validator = claim.validators.isVerified();

        expect(validator.id).toBe("profileValidation");
      });
    });
  });
});
