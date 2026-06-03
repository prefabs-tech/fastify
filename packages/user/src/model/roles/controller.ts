import type { FastifyInstance } from "fastify";

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
    },
    handlers.deleteRole,
  );

  fastify.get(
    ROUTE_ROLES,
    {
      preHandler: [fastify.verifySession()],
      schema: getRolesSchema,
    },
    handlers.getRoles,
  );

  fastify.get(
    ROUTE_ROLES_PERMISSIONS,
    {
      preHandler: [fastify.verifySession()],
      schema: getRolePermissionsSchema,
    },
    handlers.getPermissions,
  );

  fastify.post(
    ROUTE_ROLES,
    {
      preHandler: [fastify.verifySession()],
      schema: createRoleSchema,
    },
    handlers.createRole,
  );

  fastify.put(
    ROUTE_ROLES_PERMISSIONS,
    {
      preHandler: [fastify.verifySession()],
      schema: updateRoleSchema,
    },
    handlers.updatePermissions,
  );
};

export default plugin;
