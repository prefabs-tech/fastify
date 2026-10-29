import type { FastifyInstance, FastifyRequest } from "fastify";

import type { User } from "./user";

/** Gives the access-control library's roles, by name, for `roleMap`. */
interface AccessControlAdmin {
  getUserRoles: (request: FastifyRequest, userId: string) => Promise<string[]>;
  /** Replaces the user's roles. */
  setUserRoles: (
    request: FastifyRequest,
    userId: string,
    roles: string[],
  ) => Promise<string[]>;
}

/** The access-control library the app uses in place of SuperTokens roles. */
interface AccessControlProvider {
  /** Reads and replaces a user's roles in the library, for `roleMap`. */
  admin?: AccessControlAdmin;
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
  /**
   * For each SuperTokens role given at sign-up, admin sign-up or on accepting
   * an invitation, the library's roles to give as well, through `admin`.
   * SuperTokens roles still decide who may enter an app, so they are kept.
   */
  roleMap?: Record<string, string[]>;
}

export type { AccessControlAdmin, AccessControlProvider };

// getGrants is handed a User, so an implementation's declarations name it from here.
export type { User } from "./user";
