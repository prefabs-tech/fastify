import type { FastifyInstance, FastifyRequest } from "fastify";

import type { SupertokensConfig } from "../supertokens/index.js";
import type { Invitation } from "./invitation.js";
import type { IsEmailOptions } from "./isEmailOptions.js";
import type { StrongPasswordOptions } from "./strongPasswordOptions.js";
import type { User, UserUpdateInput } from "./user.js";

import invitationHandlers from "../model/invitations/handlers/index.js";
import InvitationService from "../model/invitations/service.js";
import ProfileFieldService from "../model/profileFields/service.js";
import userHandlers from "../model/users/handlers/index.js";
import UserService from "../model/users/service.js";

/** The access-control library the app uses in place of SuperTokens roles. */
interface AccessControlProvider {
  /**
   * Adds `grants` to the user returned by sign-in, sign-up, accepting an
   * invitation and `GET /me`, so the front end stores them with the user.
   */
  getGrants?: (user: User, fastify: FastifyInstance) => Promise<unknown[]>;
  /**
   * Decides every `hasPermission` check, in place of SuperTokens roles,
   * `permissions` and the superadmin role.
   */
  hasPermission?: (
    request: FastifyRequest,
    permission: string,
    context: Record<string, unknown>,
  ) => Promise<boolean>;
  /**
   * Renames each permission before `hasPermission` checks it, such as
   * `users:list` to `users.list`. Ignored without `hasPermission`: the
   * SuperTokens check allows any name missing from `permissions`, so a renamed
   * one would pass.
   */
  mapPermissionName?: (permission: string) => string;
}
interface EmailOptions {
  subject?: string;
  templateName?: string;
}

interface UserConfig {
  /**
   * @default undefined
   */
  accessControl?: AccessControlProvider;
  email?: IsEmailOptions;
  emailOverrides?: {
    duplicateEmail?: EmailOptions;
    emailVerification?: EmailOptions;
    invitation?: EmailOptions;
    resetPassword?: EmailOptions;
    resetPasswordNotification?: EmailOptions;
  };
  features?: {
    profileFields?: {
      enabled?: boolean;
    };
    profileValidation?: {
      /**
       * @default false
       */
      enabled?: boolean;
      fields?: Array<keyof UserUpdateInput>;
      /**
       * Number of days in which grace period expire.
       * @default undefined
       */
      gracePeriodInDays?: number;
    };
    signUp?: {
      /**
       * @default false
       */
      emailVerification?: boolean;
      /**
       * @default true
       */
      enabled?: boolean;
    };
    updateEmail?: {
      enabled?: boolean;
    };
  };
  handlers?: {
    invitation?: {
      accept?: typeof invitationHandlers.acceptInvitation;
      create?: typeof invitationHandlers.createInvitation;
      delete?: typeof invitationHandlers.deleteInvitation;
      getByToken?: typeof invitationHandlers.getInvitationByToken;
      list?: typeof invitationHandlers.listInvitation;
      resend?: typeof invitationHandlers.resendInvitation;
      revoke?: typeof invitationHandlers.revokeInvitation;
    };
    user?: {
      adminSignUp?: typeof userHandlers.adminSignUp;
      canAdminSignUp?: typeof userHandlers.canAdminSignUp;
      changePassword?: typeof userHandlers.changePassword;
      deleteMe?: typeof userHandlers.deleteMe;
      disable?: typeof userHandlers.disable;
      enable?: typeof userHandlers.enable;
      me?: typeof userHandlers.me;
      updateMe?: typeof userHandlers.updateMe;
      user?: typeof userHandlers.user;
      users?: typeof userHandlers.users;
    };
  };
  invitation?: {
    acceptLinkPath?: string;
    /**
     * Number of days in which invitation expire.
     * @default 30
     */
    expireAfterInDays?: number;
    postAccept?: (
      request: FastifyRequest,
      invitation: Invitation,
      user: User,
    ) => Promise<void>;
  };
  password?: StrongPasswordOptions;
  permissions?: string[];
  photoMaxSizeInMB?: number;
  role?: string;
  roles?: string[];
  routePrefix?: string;
  routes?: {
    invitations?: {
      disabled: boolean;
    };
    permissions?: {
      disabled: boolean;
    };
    profileFields?: {
      disabled: boolean;
    };
    roles?: {
      disabled: boolean;
    };
    users?: {
      disabled: boolean;
    };
  };
  s3?: {
    bucket: string;
  };
  services?: {
    invitation?: typeof InvitationService;
    user?: typeof UserService;
    userProfileField?: typeof ProfileFieldService;
  };
  supertokens: SupertokensConfig;
  tables?: {
    invitations?: {
      name?: string;
    };
    userProfileFieldOptions?: {
      name?: string;
    };
    userProfileFieldOptionsI18n?: {
      name?: string;
    };
    userProfileFields?: {
      name?: string;
    };
    userProfileFieldsI18n?: {
      name?: string;
    };
    users?: {
      name?: string;
    };
  };
}

export type { AccessControlProvider, EmailOptions, UserConfig };
