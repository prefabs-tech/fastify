import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";
import type { FastifyPluginAsync } from "fastify";

import FastifyPlugin from "fastify-plugin";

import { initAuth } from "./auth/adapter";
import { supertokensProvider } from "./auth/supertokens";
import seedRoles from "./lib/seedRoles";
import mercuriusAuthPlugin from "./mercurius-auth/plugin";
import hasPermission from "./middlewares/hasPermission";
import runMigrations from "./migrations/runMigrations";
import invitationsRoutes from "./model/invitations/controller";
import permissionsRoutes from "./model/permissions/controller";
import rolesRoutes from "./model/roles/controller";
import usersRoutes from "./model/users/controller";
import userContext from "./userContext";

const userPlugin: FastifyPluginAsync = async (fastify) => {
  const { graphql, user } = fastify.config;

  let provider;
  const providerName = user.authProvider || "supertokens";

  switch (providerName) {
    case "supertokens": {
      provider = supertokensProvider;
      break;
    }
    default: {
      throw new Error(`Unknown auth provider: ${providerName}`);
    }
  }

  await initAuth(fastify, provider);

  fastify.addHook("onReady", async () => {
    await seedRoles(user);
  });

  await runMigrations(fastify.config, fastify.slonik);

  fastify.decorate("hasPermission", hasPermission);

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
