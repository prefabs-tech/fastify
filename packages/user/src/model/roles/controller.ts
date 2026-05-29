import type {
  FastifyInstance,
  RouteHandler,
  RouteShorthandOptions,
} from "fastify";

import { ROUTE_ROLES, ROUTE_ROLES_PERMISSIONS } from "../../constants";
import handlers from "./handlers";
import {
  createRoleSchema,
  deleteRoleSchema,
  getRolePermissionsSchema,
  getRolesSchema,
  updateRoleSchema,
} from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  fastify.delete(
    ROUTE_ROLES,
    {
      preHandler: [fastify.verifySession()],
      schema: deleteRoleSchema,
    } as unknown as RouteShorthandOptions,
    handlers.deleteRole as unknown as RouteHandler,
  );

  fastify.get(
    ROUTE_ROLES,
    {
      preHandler: [fastify.verifySession()],
      schema: getRolesSchema,
    } as unknown as RouteShorthandOptions,
    handlers.getRoles as unknown as RouteHandler,
  );

  fastify.get(
    ROUTE_ROLES_PERMISSIONS,
    {
      preHandler: [fastify.verifySession()],
      schema: getRolePermissionsSchema,
    } as unknown as RouteShorthandOptions,
    handlers.getPermissions as unknown as RouteHandler,
  );

  fastify.post(
    ROUTE_ROLES,
    {
      preHandler: [fastify.verifySession()],
      schema: createRoleSchema,
    } as unknown as RouteShorthandOptions,
    handlers.createRole as unknown as RouteHandler,
  );

  fastify.put(
    ROUTE_ROLES_PERMISSIONS,
    {
      preHandler: [fastify.verifySession()],
      schema: updateRoleSchema,
    } as unknown as RouteShorthandOptions,
    handlers.updatePermissions as unknown as RouteHandler,
  );
};

export default plugin;
