import hasPermission from "./middlewares/hasPermission";

import type { User, UserConfig } from "./types";

declare module "fastify" {
  interface FastifyInstance {
    hasPermission: typeof hasPermission;
  }

  interface FastifyRequest {
    user?: User;
  }
}

declare module "mercurius" {
  interface MercuriusContext {
    roles: string[] | undefined;
    user: User | undefined;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    user: UserConfig;
  }
}

export { default } from "./plugin";

export { default as userResolver } from "./model/users/graphql/resolver";
export { default as UserSqlFactory } from "./model/users/sqlFactory";
export { default as UserService } from "./model/users/service";
export { default as getUserService } from "./lib/getUserService";
export { default as userRoutes } from "./model/users/controller";
export { default as invitationResolver } from "./model/invitations/graphql/resolver";
export { default as InvitationSqlFactory } from "./model/invitations/sqlFactory";
export { default as InvitationService } from "./model/invitations/service";
export { default as getInvitationService } from "./lib/getInvitationService";
export { default as invitationRoutes } from "./model/invitations/controller";
export { default as permissionResolver } from "./model/permissions/resolver";
export { default as permissionRoutes } from "./model/permissions/controller";
export { default as RoleService } from "./model/roles/service";
export { default as roleResolver } from "./model/roles/graphql/resolver";
export { default as roleRoutes } from "./model/roles/controller";
// [DU 2023-AUG-07] use formatDate from "@prefabs.tech/fastify-slonik" package
export { formatDate } from "@prefabs.tech/fastify-slonik";
export { default as computeInvitationExpiresAt } from "./lib/computeInvitationExpiresAt";
export { default as getOrigin } from "./lib/getOrigin";
export { default as isInvitationValid } from "./lib/isInvitationValid";
export { default as sendEmail } from "./lib/sendEmail";
export { default as sendInvitation } from "./lib/sendInvitation";
export { default as verifyEmail } from "./lib/verifyEmail";
export { default as isRoleExists } from "./supertokens/utils/isRoleExists";
export { default as areRolesExist } from "./supertokens/utils/areRolesExist";
export { default as validateEmail } from "./validator/email";
export { default as validatePassword } from "./validator/password";
export { default as hasUserPermission } from "./lib/hasUserPermission";
export { default as ProfileValidationClaim } from "./supertokens/utils/profileValidationClaim";
export { default as createUserContext } from "./supertokens/utils/createUserContext";
export { default as userSchema } from "./graphql/schema";
export { errorHandler as supertokensErrorHandler } from "./supertokens/errorHandler";

export * from "./migrations/queries";

export * from "./constants";

export type * from "./types";

export {
  createRoleSortFragment,
  createUserFilterFragment,
} from "./model/users/sql";
