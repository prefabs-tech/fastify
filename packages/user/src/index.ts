import type { SupertokensRecipeFactory } from "./supertokens/types/index.js";
import type { User, UserConfig } from "./types/index.js";

import hasPermission from "./middlewares/hasPermission.js";

declare module "fastify" {
  interface FastifyContextConfig {
    verified?: boolean;
  }

  interface FastifyInstance {
    hasPermission: typeof hasPermission;
    supertokensInitialized?: boolean;
    supertokensRecipes?: SupertokensRecipeFactory[];
  }

  interface FastifyRequest {
    hasPermission: (
      permission: string,
      context?: Record<string, unknown>,
    ) => Promise<boolean>;
    user?: User;
  }
}

declare module "mercurius" {
  interface MercuriusContext {
    roles: string[] | undefined;
    user: undefined | User;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    user: UserConfig;
  }
}

export * from "./constants.js";

export { default as userSchema } from "./graphql/schema.js";
export { default as computeInvitationExpiresAt } from "./lib/computeInvitationExpiresAt.js";
export { default as getInvitationService } from "./lib/getInvitationService.js";
export { default as getOrigin } from "./lib/getOrigin.js";
export { default as getUserService } from "./lib/getUserService.js";
export { default as hasUserPermission } from "./lib/hasUserPermission.js";
export { default as isInvitationValid } from "./lib/isInvitationValid.js";
export { default as sendEmail } from "./lib/sendEmail.js";
export { default as sendInvitation } from "./lib/sendInvitation.js";
export { default as verifyEmail } from "./lib/verifyEmail.js";
export * from "./migrations/queries.js";
export { default as invitationRoutes } from "./model/invitations/controller.js";
export { default as invitationResolver } from "./model/invitations/graphql/resolver.js";
export { default as InvitationService } from "./model/invitations/service.js";
export { default as InvitationSqlFactory } from "./model/invitations/sqlFactory.js";
export { default as permissionRoutes } from "./model/permissions/controller.js";
export { default as permissionResolver } from "./model/permissions/resolver.js";
export { default as profileFieldsRoutes } from "./model/profileFields/controller.js";
export { default as roleRoutes } from "./model/roles/controller.js";
export { default as roleResolver } from "./model/roles/graphql/resolver.js";
export { default as RoleService } from "./model/roles/service.js";
export { default as userRoutes } from "./model/users/controller.js";
export { default as userResolver } from "./model/users/graphql/resolver.js";
export { default as UserService } from "./model/users/service.js";
export {
  createRoleSortFragment,
  createUserFilterFragment,
} from "./model/users/sql.js";
export { default as UserSqlFactory } from "./model/users/sqlFactory.js";
export { default } from "./plugin.js";
export { errorHandler as supertokensErrorHandler } from "./supertokens/errorHandler.js";
export { default as addSupertokensRecipe } from "./supertokens/recipeRegistry.js";
export type { SupertokensRecipeFactory } from "./supertokens/types/index.js";
export { default as areRolesExist } from "./supertokens/utils/areRolesExist.js";
export { default as createUserContext } from "./supertokens/utils/createUserContext.js";
export { default as isRoleExists } from "./supertokens/utils/isRoleExists.js";
export { default as ProfileValidationClaim } from "./supertokens/utils/profileValidationClaim.js";

export type * from "./types/index.js";

export { default as validateEmail } from "./validator/email.js";

export { default as validatePassword } from "./validator/password.js";

// [DU 2023-AUG-07] use formatDate from "@prefabs.tech/fastify-slonik" package
export { formatDate } from "@prefabs.tech/fastify-slonik";
