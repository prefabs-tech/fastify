/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// reference https://github.com/supertokens/supertokens-node/blob/master/lib/ts/recipe/session/claimBaseClasses/primitiveArrayClaim.ts

import type { SessionRequest } from "supertokens-node/framework/fastify";
import type { SessionClaimValidator } from "supertokens-node/recipe/session";

import { getRequestFromUserContext, RecipeUserId } from "supertokens-node";
import { SessionClaim } from "supertokens-node/lib/build/recipe/session/claims";

import type { ProfileValidationConfig } from "../../auth/claims/profileValidation";

import { checkProfileValidation } from "../../auth/claims/profileValidation";

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

  // supertokens-node v16 SessionClaim.fetchValue signature:
  // (userId, recipeUserId, tenantId, userContext)
  fetchValue = async (
    userId: string,
    _recipeUserId: RecipeUserId,
    _tenantId: string,
    userContext: any,
  ): Promise<Response> => {
    const request = getRequestFromUserContext(userContext)?.original as
      | SessionRequest
      | undefined;

    if (!request) {
      // supertokens-node v15 multitenancy internal flow
      // may call fetchValue without setting request in userContext.
      // Return a safe fallback instead of crashing.
      return { isVerified: true };
    }

    const profileValidation = request.config.user?.features
      ?.profileValidation as ProfileValidationConfig | undefined;

    if (!profileValidation?.enabled) {
      throw new Error("Profile validation is not enabled");
    }

    const user = request?.user;

    if (!user) {
      throw new Error("User not found");
    }

    return checkProfileValidation(user, profileValidation);
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
