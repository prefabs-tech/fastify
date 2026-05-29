import type { FastifyInstance, FastifyRequest } from "fastify";

import FastifyPlugin from "fastify-plugin";
import { mercurius } from "mercurius";
import mercuriusAuth from "mercurius-auth";

import type { AuthSession } from "../auth/adapter";

import { auth } from "../auth/adapter";

const plugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(mercuriusAuth, {
    async applyPolicy(authDirectiveAST, parent, arguments_, context) {
      if (!context.user) {
        return new mercurius.ErrorWithProps("unauthorized", {}, 401);
      }

      if (context.user.disabled) {
        return new mercurius.ErrorWithProps("user is disabled", {}, 401);
      }

      if (
        fastify.config.user.features?.signUp?.emailVerification &&
        auth.emailVerification
      ) {
        const emailVerification = authDirectiveAST.arguments.find(
          (argument: { name: { value: string } }) =>
            argument?.name?.value === "emailVerification",
        );

        if (
          emailVerification?.value?.value !== false &&
          !(await auth.emailVerification.isEmailVerified(context.user.id))
        ) {
          return new mercurius.ErrorWithProps(
            "invalid claim",
            {
              claimValidationErrors: [
                {
                  id: auth.claims.keys.emailVerification,
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
          const session = (request as FastifyRequest & { session: AuthSession })
            .session;

          const userContext = auth.createUserContext(request);

          await auth.claims.refreshSessionClaims(
            session,
            request,
            ["profileValidation"],
            userContext,
          );

          try {
            const errors = await auth.claims.assertProfileValid(
              session,
              request,
              userContext,
            );

            if (errors && errors.length > 0) {
              return new mercurius.ErrorWithProps(
                "invalid claim",
                {
                  claimValidationErrors: errors,
                },
                403,
              );
            }
          } catch (error) {
            if (auth.errors.isAuthError(error)) {
              return new mercurius.ErrorWithProps(
                "invalid claim",
                {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  claimValidationErrors: (error as any).payload,
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
