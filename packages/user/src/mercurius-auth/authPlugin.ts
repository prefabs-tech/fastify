import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";
import { mercurius } from "mercurius";
import mercuriusAuth from "mercurius-auth";
import emailVerificationRecipe from "supertokens-node/recipe/emailverification";
import { Error } from "supertokens-node/recipe/session";

import createUserContext from "../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../supertokens/utils/profileValidationClaim";

const plugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(mercuriusAuth, {
    async applyPolicy(authDirectiveAST, parent, arguments_, context) {
      if (!context.user) {
        return new mercurius.ErrorWithProps("unauthorized", {}, 401);
      }

      if (context.user.disabled) {
        return new mercurius.ErrorWithProps("user is disabled", {}, 401);
      }

      if (fastify.config.user.features?.signUp?.emailVerification) {
        const emailVerification = authDirectiveAST.arguments.find(
          (argument: { name: { value: string } }) =>
            argument?.name?.value === "emailVerification",
        );

        if (
          emailVerification?.value?.value !== false &&
          !(await emailVerificationRecipe.isEmailVerified(context.user.id))
        ) {
          // Added the claim validation errors to match with rest endpoint
          // response for email verification
          return new mercurius.ErrorWithProps(
            "invalid claim",
            {
              claimValidationErrors: [
                {
                  id: "st-ev",
                  reason: {
                    actualValue: false,
                    expectedValue: true,
                    message: "wrong value",
                  },
                },
              ],
            },
            403,
          );
        }
      }

      if (fastify.config.user.features?.profileValidation?.enabled) {
        const profileValidation = authDirectiveAST.arguments.find(
          (argument: { name: { value: string } }) =>
            argument?.name?.value === "profileValidation",
        );

        if (profileValidation?.value?.value != false) {
          const request = context.reply.request;

          const profileValidationClaim = new ProfileValidationClaim();

          const userContext = createUserContext(
            undefined,
            context.reply.request,
          );

          await request.session?.fetchAndSetClaim(
            profileValidationClaim,
            userContext,
          );

          try {
            await request.session?.assertClaims(
              [profileValidationClaim.validators.isVerified()],
              userContext,
            );
          } catch (error) {
            if (error instanceof Error) {
              return new mercurius.ErrorWithProps(
                "invalid claim",
                {
                  claimValidationErrors: error.payload,
                },
                403,
              );
            }

            throw error;
          }
        }
      }

      return true;
    },

    authDirective: "auth",
  });
});

export default plugin;
