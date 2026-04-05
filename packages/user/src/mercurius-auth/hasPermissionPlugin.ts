import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";
import { mercurius } from "mercurius";
import mercuriusAuth from "mercurius-auth";

import hasUserPermission from "../lib/hasUserPermission";

const plugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(mercuriusAuth, {
    applyPolicy: async (authDirectiveAST, parent, arguments_, context) => {
      const permission = authDirectiveAST.arguments.find(
        (argument: { name: { value: string } }) =>
          argument.name.value === "permission",
      ).value.value;

      if (!context.user) {
        return new mercurius.ErrorWithProps("unauthorized", {}, 401);
      }

      const hasPermission = await hasUserPermission(
        context.app,
        context.user?.id,
        permission,
      );

      if (!hasPermission) {
        // Added the claim validation errors to match with rest endpoint
        // response for hasPermission
        return new mercurius.ErrorWithProps(
          "invalid claim",
          {
            claimValidationErrors: [
              {
                id: "st-perm",
                reason: {
                  expectedToInclude: permission,
                  message: "Not have enough permission",
                },
              },
            ],
          },
          403,
        );
      }

      return true;
    },
    authDirective: "hasPermission",
  });
});

export default plugin;
