import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/session/types";

import { getRequestFromUserContext } from "supertokens-node";

import ProfileValidationClaim from "../../../utils/profileValidationClaim";

const getGlobalClaimValidators = (
  originalImplementation: RecipeInterface,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fastify: FastifyInstance,
): RecipeInterface["getGlobalClaimValidators"] => {
  return async (input) => {
    if (originalImplementation.getGlobalClaimValidators === undefined) {
      throw new Error("Should never come here");
    }

    const request = getRequestFromUserContext(input.userContext)?.original as
      | FastifyRequest
      | undefined;

    if (request && request.config.user.features?.profileValidation?.enabled) {
      return [
        ...input.claimValidatorsAddedByOtherRecipes,
        new ProfileValidationClaim().validators.isVerified(),
      ];
    }

    return input.claimValidatorsAddedByOtherRecipes;
  };
};

export default getGlobalClaimValidators;
