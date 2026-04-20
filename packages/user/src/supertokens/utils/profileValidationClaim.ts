/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// reference https://github.com/supertokens/supertokens-node/blob/master/lib/ts/recipe/session/claimBaseClasses/primitiveArrayClaim.ts

import type { SessionRequest } from "supertokens-node/framework/fastify";
import type { SessionClaimValidator } from "supertokens-node/recipe/session";

import { getRequestFromUserContext } from "supertokens-node";
import { SessionClaim } from "supertokens-node/lib/build/recipe/session/claims";

interface Response {
  gracePeriodEndsAt?: number;
  isVerified: boolean;
}

class ProfileValidationClaim extends SessionClaim<Response> {
  public static defaultMaxAgeInSeconds: number | undefined = undefined;
  public static key = "profileValidation";

  validators = {
    isVerified: (
      maxAgeInSeconds:
        | number
        | undefined = ProfileValidationClaim.defaultMaxAgeInSeconds,
      id?: string,
    ): SessionClaimValidator => {
      return {
        claim: this,
        id: id ?? this.key,
        shouldRefetch: () => true,
        validate: async (payload, context) => {
          const expectedValue = true;

          const claimValue = this.getValueFromPayload(payload, context);

          if (claimValue === undefined) {
            return {
              isValid: false,
              reason: {
                actualValue: undefined,
                expectedValue,
                message: "value does not exist",
              },
            };
          }

          if (
            claimValue.isVerified !== expectedValue &&
            (claimValue.gracePeriodEndsAt
              ? claimValue.gracePeriodEndsAt <= Date.now()
              : true)
          ) {
            return {
              isValid: false,
              reason: {
                actualValue: claimValue.isVerified,
                expectedValue,
                message: "User profile is incomplete",
              },
            };
          }

          return { isValid: true };
        },
      };
    },
  };

  constructor() {
    super("profileValidation");
  }

  addToPayload_internal(payload: any, value: Response, _userContext: any): any {
    return {
      ...payload,
      [this.key]: {
        t: Date.now(),
        v: value,
      },
    };
  }

  fetchValue = async (userId: string, userContext: any): Promise<Response> => {
    const request = getRequestFromUserContext(userContext)?.original as
      | SessionRequest
      | undefined;

    if (!request) {
      throw new Error("Request not set in userContext");
    }

    const profileValidation = request.config.user?.features?.profileValidation;

    if (!profileValidation?.enabled) {
      throw new Error("Profile validation is not enabled");
    }

    const user = request?.user;

    if (!user) {
      throw new Error("User not found");
    }

    const fields = profileValidation.fields || [];

    // Verify that none of the specified fields in the user are null
    const isVerified = !fields.some((field) => user[field] === null);

    // Calculate the grace period expiry date if the user is not verified
    const gracePeriodEndsAt =
      !isVerified && profileValidation.gracePeriodInDays
        ? user.signedUpAt +
          profileValidation.gracePeriodInDays * (24 * 60 * 60 * 1000)
        : undefined;

    return {
      gracePeriodEndsAt,
      isVerified,
    };
  };

  getLastRefetchTime(payload: any, _userContext: any): number | undefined {
    return payload[this.key]?.t;
  }

  getValueFromPayload(payload: any, _userContext: any): Response | undefined {
    return payload[this.key]?.v;
  }

  removeFromPayload(payload: any, _userContext: any): any {
    const res = {
      ...payload,
    };
    delete res[this.key];

    return res;
  }

  removeFromPayloadByMerge_internal(payload: any, _userContext: any): any {
    const res = {
      ...payload,
      [this.key]: null,
    };

    return res;
  }
}

export default ProfileValidationClaim;
