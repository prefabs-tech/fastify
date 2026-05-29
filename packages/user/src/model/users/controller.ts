import type {
  FastifyInstance,
  RouteHandler,
  RouteShorthandOptions,
} from "fastify";

import { auth } from "../../auth/adapter";
import {
  PERMISSIONS_USERS_DISABLE,
  PERMISSIONS_USERS_ENABLE,
  PERMISSIONS_USERS_LIST,
  PERMISSIONS_USERS_READ,
  ROUTE_CHANGE_EMAIL,
  ROUTE_CHANGE_PASSWORD,
  ROUTE_ME,
  ROUTE_ME_PHOTO,
  ROUTE_SIGNUP_ADMIN,
  ROUTE_USERS,
  ROUTE_USERS_DISABLE,
  ROUTE_USERS_ENABLE,
  ROUTE_USERS_FIND_BY_ID,
} from "../../constants";
import handlers from "./handlers";
import {
  adminSignUpSchema,
  canAdminSignUpSchema,
  changeEmailSchema,
  changePasswordSchema,
  deleteMeSchema,
  disableUserSchema,
  enableUserSchema,
  getMeSchema,
  getUserSchema,
  getUsersSchema,
  removePhotoSchema,
  updateMeSchema,
  uploadPhotoSchema,
} from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  const handlersConfig = fastify.config.user.handlers?.user;

  fastify.get(
    ROUTE_USERS,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_LIST),
      ],
      schema: getUsersSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.users || handlers.users) as unknown as RouteHandler,
  );

  fastify.get(
    ROUTE_USERS_FIND_BY_ID,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_READ),
      ],
      schema: getUserSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.user || handlers.user) as unknown as RouteHandler,
  );

  fastify.post(
    ROUTE_CHANGE_PASSWORD,
    {
      preHandler: fastify.verifySession(),
      schema: changePasswordSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.changePassword ||
      handlers.changePassword) as unknown as RouteHandler,
  );

  fastify.post(
    ROUTE_CHANGE_EMAIL,
    {
      preHandler: fastify.verifySession(
        auth.claims.verifySessionOptions([
          "emailVerification",
          "profileValidation",
        ]),
      ),
      schema: changeEmailSchema,
    } as unknown as RouteShorthandOptions,
    handlers.changeEmail as unknown as RouteHandler,
  );

  fastify.get(
    ROUTE_ME,
    {
      preHandler: fastify.verifySession(
        auth.claims.verifySessionOptions([
          "emailVerification",
          "profileValidation",
        ]),
      ),
      schema: getMeSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.me || handlers.me) as unknown as RouteHandler,
  );

  fastify.put(
    ROUTE_ME,
    {
      preHandler: fastify.verifySession(
        auth.claims.verifySessionOptions([
          "emailVerification",
          "profileValidation",
        ]),
      ),
      schema: updateMeSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.updateMe || handlers.updateMe) as unknown as RouteHandler,
  );

  fastify.delete(
    ROUTE_ME,
    {
      preHandler: fastify.verifySession(
        auth.claims.verifySessionOptions(["profileValidation"]),
      ),
      schema: deleteMeSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.deleteMe || handlers.deleteMe) as unknown as RouteHandler,
  );

  fastify.put(
    ROUTE_ME_PHOTO,
    {
      preHandler: fastify.verifySession(
        auth.claims.verifySessionOptions([
          "emailVerification",
          "profileValidation",
        ]),
      ),
      schema: uploadPhotoSchema,
    } as unknown as RouteShorthandOptions,
    handlers.uploadPhoto as unknown as RouteHandler,
  );

  fastify.delete(
    ROUTE_ME_PHOTO,
    {
      preHandler: fastify.verifySession(
        auth.claims.verifySessionOptions([
          "emailVerification",
          "profileValidation",
        ]),
      ),
      schema: removePhotoSchema,
    } as unknown as RouteShorthandOptions,
    handlers.removePhoto as unknown as RouteHandler,
  );

  fastify.put(
    ROUTE_USERS_DISABLE,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_DISABLE),
      ],
      schema: disableUserSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.disable || handlers.disable) as unknown as RouteHandler,
  );

  fastify.put(
    ROUTE_USERS_ENABLE,
    {
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_ENABLE),
      ],
      schema: enableUserSchema,
    } as unknown as RouteShorthandOptions,
    (handlersConfig?.enable || handlers.enable) as unknown as RouteHandler,
  );

  fastify.post(
    ROUTE_SIGNUP_ADMIN,
    {
      schema: adminSignUpSchema,
    },
    handlersConfig?.adminSignUp || handlers.adminSignUp,
  );

  fastify.get(
    ROUTE_SIGNUP_ADMIN,
    {
      schema: canAdminSignUpSchema,
    },
    handlersConfig?.canAdminSignUp || handlers.canAdminSignUp,
  );
};

export default plugin;
