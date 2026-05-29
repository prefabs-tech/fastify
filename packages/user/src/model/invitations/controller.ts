import type {
  FastifyInstance,
  RouteHandler,
  RouteShorthandOptions,
} from "fastify";

import {
  PERMISSIONS_INVITATIONS_CREATE,
  PERMISSIONS_INVITATIONS_DELETE,
  PERMISSIONS_INVITATIONS_LIST,
  PERMISSIONS_INVITATIONS_RESEND,
  PERMISSIONS_INVITATIONS_REVOKE,
  ROUTE_INVITATIONS,
  ROUTE_INVITATIONS_ACCEPT,
  ROUTE_INVITATIONS_CREATE,
  ROUTE_INVITATIONS_DELETE,
  ROUTE_INVITATIONS_GET_BY_TOKEN,
  ROUTE_INVITATIONS_RESEND,
  ROUTE_INVITATIONS_REVOKE,
} from "../../constants";
import handlers from "./handlers";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  deleteInvitationSchema,
  getInvitationByTokenSchema,
  getInvitationsListSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
} from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  const handlersConfig = fastify.config.user.handlers?.invitation;

  fastify.get(
    ROUTE_INVITATIONS,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_INVITATIONS_LIST),
      ],
      schema: getInvitationsListSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.list ||
      handlers.listInvitation) as unknown as RouteHandler,
  );

  fastify.post(
    ROUTE_INVITATIONS_CREATE,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_INVITATIONS_CREATE),
      ],
      schema: createInvitationSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.create ||
      handlers.createInvitation) as unknown as RouteHandler,
  );

  fastify.get(
    ROUTE_INVITATIONS_GET_BY_TOKEN,
    {
      schema: getInvitationByTokenSchema,
    },
    handlersConfig?.getByToken || handlers.getInvitationByToken,
  );

  fastify.post(
    ROUTE_INVITATIONS_ACCEPT,
    {
      schema: acceptInvitationSchema,
    },
    handlersConfig?.accept || handlers.acceptInvitation,
  );

  fastify.put(
    ROUTE_INVITATIONS_REVOKE,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_INVITATIONS_REVOKE),
      ],
      schema: revokeInvitationSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.revoke ||
      handlers.revokeInvitation) as unknown as RouteHandler,
  );

  fastify.post(
    ROUTE_INVITATIONS_RESEND,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_INVITATIONS_RESEND),
      ],
      schema: resendInvitationSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.resend ||
      handlers.resendInvitation) as unknown as RouteHandler,
  );

  fastify.delete(
    ROUTE_INVITATIONS_DELETE,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_INVITATIONS_DELETE),
      ],
      schema: deleteInvitationSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.delete ||
      handlers.deleteInvitation) as unknown as RouteHandler,
  );
};

export default plugin;
