import type { FastifyInstance } from "fastify";

import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";

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
import ProfileValidationClaim from "../../supertokens/utils/profileValidationClaim";
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
      config: { permission: PERMISSIONS_USERS_LIST },
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_LIST),
      ],
      schema: getUsersSchema,
    },
    handlersConfig?.users || handlers.users,
  );

  fastify.get(
    ROUTE_USERS_FIND_BY_ID,
    {
      config: { permission: PERMISSIONS_USERS_READ },
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_READ),
      ],
      schema: getUserSchema,
    },
    handlersConfig?.user || handlers.user,
  );

  fastify.post(
    ROUTE_CHANGE_PASSWORD,
    {
      config: { permissionMiddleware: false },
      preHandler: fastify.verifySession(),
      schema: changePasswordSchema,
    },
    handlersConfig?.changePassword || handlers.changePassword,
  );

  fastify.post(
    ROUTE_CHANGE_EMAIL,
    {
      config: {
        permissionMiddleware: false,
        profileValidated: false,
        verified: false,
      },
      preHandler: fastify.verifySession({
        overrideGlobalClaimValidators: async (globalValidators) =>
          globalValidators.filter(
            (sessionClaimValidator) =>
              ![
                EmailVerificationClaim.key,
                ProfileValidationClaim.key,
              ].includes(sessionClaimValidator.id),
          ),
      }),
      schema: changeEmailSchema,
    },
    handlers.changeEmail,
  );

  fastify.get(
    ROUTE_ME,
    {
      config: {
        permissionMiddleware: false,
        profileValidated: false,
        verified: false,
      },
      preHandler: fastify.verifySession({
        overrideGlobalClaimValidators: async (globalValidators) =>
          globalValidators.filter(
            (sessionClaimValidator) =>
              ![
                EmailVerificationClaim.key,
                ProfileValidationClaim.key,
              ].includes(sessionClaimValidator.id),
          ),
      }),
      schema: getMeSchema,
    },
    handlersConfig?.me || handlers.me,
  );

  fastify.put(
    ROUTE_ME,
    {
      config: {
        permissionMiddleware: false,
        profileValidated: false,
        verified: false,
      },
      preHandler: fastify.verifySession({
        overrideGlobalClaimValidators: async (globalValidators) =>
          globalValidators.filter(
            (sessionClaimValidator) =>
              ![
                EmailVerificationClaim.key,
                ProfileValidationClaim.key,
              ].includes(sessionClaimValidator.id),
          ),
      }),
      schema: updateMeSchema,
    },
    handlersConfig?.updateMe || handlers.updateMe,
  );

  fastify.delete(
    ROUTE_ME,
    {
      config: { permissionMiddleware: false, profileValidated: false },
      preHandler: fastify.verifySession({
        overrideGlobalClaimValidators: async (globalValidators) =>
          globalValidators.filter(
            (sessionClaimValidator) =>
              sessionClaimValidator.id !== ProfileValidationClaim.key,
          ),
      }),
      schema: deleteMeSchema,
    },
    handlersConfig?.deleteMe || handlers.deleteMe,
  );

  fastify.put(
    ROUTE_ME_PHOTO,
    {
      config: {
        permissionMiddleware: false,
        profileValidated: false,
        verified: false,
      },
      preHandler: fastify.verifySession({
        overrideGlobalClaimValidators: async (globalValidators) =>
          globalValidators.filter(
            (sessionClaimValidator) =>
              ![
                EmailVerificationClaim.key,
                ProfileValidationClaim.key,
              ].includes(sessionClaimValidator.id),
          ),
      }),
      schema: uploadPhotoSchema,
    },
    handlers.uploadPhoto,
  );

  fastify.delete(
    ROUTE_ME_PHOTO,
    {
      config: {
        permissionMiddleware: false,
        profileValidated: false,
        verified: false,
      },
      preHandler: fastify.verifySession({
        overrideGlobalClaimValidators: async (globalValidators) =>
          globalValidators.filter(
            (sessionClaimValidator) =>
              ![
                EmailVerificationClaim.key,
                ProfileValidationClaim.key,
              ].includes(sessionClaimValidator.id),
          ),
      }),
      schema: removePhotoSchema,
    },
    handlers.removePhoto,
  );

  fastify.put(
    ROUTE_USERS_DISABLE,
    {
      config: { permission: PERMISSIONS_USERS_DISABLE },
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_DISABLE),
      ],
      schema: disableUserSchema,
    },
    handlersConfig?.disable || handlers.disable,
  );

  fastify.put(
    ROUTE_USERS_ENABLE,
    {
      config: { permission: PERMISSIONS_USERS_ENABLE },
      preHandler: [
        fastify.verifySession(),
        fastify.hasPermission(PERMISSIONS_USERS_ENABLE),
      ],
      schema: enableUserSchema,
    },
    handlersConfig?.enable || handlers.enable,
  );

  fastify.post(
    ROUTE_SIGNUP_ADMIN,
    {
      config: { public: true },
      schema: adminSignUpSchema,
    },
    handlersConfig?.adminSignUp || handlers.adminSignUp,
  );

  fastify.get(
    ROUTE_SIGNUP_ADMIN,
    {
      config: { public: true },
      schema: canAdminSignUpSchema,
    },
    handlersConfig?.canAdminSignUp || handlers.canAdminSignUp,
  );
};

export default plugin;
