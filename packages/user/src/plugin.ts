import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import FastifyPlugin from "fastify-plugin";

import hasUserPermission from "./lib/hasUserPermission.js";
import seedRoles from "./lib/seedRoles.js";
import mercuriusAuthPlugin from "./mercurius-auth/plugin.js";
import hasPermission from "./middlewares/hasPermission.js";
import runMigrations from "./migrations/runMigrations.js";
import invitationsRoutes from "./model/invitations/controller.js";
import permissionsRoutes from "./model/permissions/controller.js";
import profileFieldsRoutes from "./model/profileFields/controller.js";
import rolesRoutes from "./model/roles/controller.js";
import usersRoutes from "./model/users/controller.js";
import supertokensPlugin from "./supertokens/index.js";
import userContext from "./userContext.js";

const checkRequestPermission = async (
  request: FastifyRequest,
  permission: string,
  context: Record<string, unknown>,
): Promise<boolean> => {
  if (!request.user) {
    return false;
  }

  const { hasPermission: check, mapPermissionName } =
    request.server.config.user.accessControl ?? {};

  if (check) {
    return (
      (await check(
        request,
        mapPermissionName ? mapPermissionName(permission) : permission,
        context,
      )) === true
    );
  }

  return hasUserPermission(request.server, request.user.id, permission);
};

const userPlugin: FastifyPluginAsync = async (fastify) => {
  const { graphql, user } = fastify.config;

  await fastify.register(supertokensPlugin);

  fastify.addHook("onReady", async () => {
    await seedRoles(user);
  });

  await runMigrations(fastify.config, fastify.slonik);

  fastify.decorate("hasPermission", hasPermission);
  // The one permission check: the guard and the @hasPermission directive call it.
  fastify.decorateRequest(
    "hasPermission",
    function (
      this: FastifyRequest,
      permission: string,
      // Without one, only unconditional grants count: a back-end check never
      // asks "on some object?"
      context: Record<string, unknown> = {},
    ): Promise<boolean> {
      // Fastify hands a request decorator its request only as this.
      // eslint-disable-next-line unicorn/no-this-outside-of-class
      return checkRequestPermission(this, permission, context);
    },
  );

  if (graphql?.enabled) {
    await fastify.register(mercuriusAuthPlugin);
  }

  const { routePrefix, routes } = user;

  if (!routes?.invitations?.disabled) {
    await fastify.register(invitationsRoutes, { prefix: routePrefix });
  }

  if (!routes?.permissions?.disabled) {
    await fastify.register(permissionsRoutes, { prefix: routePrefix });
  }

  if (!routes?.profileFields?.disabled) {
    await fastify.register(profileFieldsRoutes, { prefix: routePrefix });
  }

  if (!routes?.roles?.disabled) {
    await fastify.register(rolesRoutes, { prefix: routePrefix });
  }

  if (!routes?.users?.disabled) {
    await fastify.register(usersRoutes, { prefix: routePrefix });
  }
};

const plugin = Object.assign(FastifyPlugin(userPlugin), {
  updateContext: userContext,
}) satisfies GraphqlEnabledPlugin;

export default plugin;
