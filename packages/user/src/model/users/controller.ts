import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";

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
import {
  PERMISSIONS_USERS_DISABLE,
  PERMISSIONS_USERS_ENABLE,
  PERMISSIONS_USERS_READ,
  PERMISSIONS_USERS_LIST,
  ROUTE_CHANGE_EMAIL,
  ROUTE_CHANGE_PASSWORD,
  ROUTE_SIGNUP_ADMIN,
  ROUTE_ME,
  ROUTE_USERS,
  ROUTE_USERS_DISABLE,
  ROUTE_USERS_ENABLE,
  ROUTE_USERS_FIND_BY_ID,
  ROUTE_ME_PHOTO,
} from "../../constants";
import ProfileValidationClaim from "../../supertokens/utils/profileValidationClaim";

import type { FastifyInstance } from "fastify";

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
    },
    handlersConfig?.users || handlers.users,
  );

  fastify.get(
    ROUTE_USERS_FIND_BY_ID,
    {
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
      preHandler: fastify.verifySession(),
      schema: changePasswordSchema,
    },
    handlersConfig?.changePassword || handlers.changePassword,
  );

  fastify.post(
    ROUTE_CHANGE_EMAIL,
    {
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
