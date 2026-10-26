import type { FastifyInstance, FastifyRequest } from "fastify";

import type { User } from "./user";

/** Manages the access-control library's roles and grants, identifying roles by name. */
interface AccessControlAdmin {
  createRole: (
    request: FastifyRequest,
    role: AccessControlRoleInput,
  ) => Promise<AccessControlRole>;
  /** Refuses a role that is still assigned. */
  deleteRole: (request: FastifyRequest, name: string) => Promise<void>;
  getCapabilities: (request: FastifyRequest) => AccessControlCapabilities;
  getRoleGrants: (
    request: FastifyRequest,
    name: string,
  ) => Promise<AccessControlGrant[]>;
  /** Missing, or never called, when `directGrants` is false. */
  getUserGrants?: (
    request: FastifyRequest,
    userId: string,
  ) => Promise<AccessControlGrant[]>;
  getUserRoles: (request: FastifyRequest, userId: string) => Promise<string[]>;
  listPermissions: (
    request: FastifyRequest,
  ) => Promise<AccessControlPermission[]>;
  listRoles: (request: FastifyRequest) => Promise<AccessControlRole[]>;
  /** Replaces the role's grants. */
  setRoleGrants: (
    request: FastifyRequest,
    name: string,
    grants: AccessControlGrant[],
  ) => Promise<AccessControlGrant[]>;
  /** Replaces the user's direct grants. Missing when `directGrants` is false. */
  setUserGrants?: (
    request: FastifyRequest,
    userId: string,
    grants: AccessControlGrant[],
  ) => Promise<AccessControlGrant[]>;
  /** Replaces the user's roles. */
  setUserRoles: (
    request: FastifyRequest,
    userId: string,
    roles: string[],
  ) => Promise<string[]>;
}

/** What the library can store. */
interface AccessControlCapabilities {
  conditions: boolean;
  deny: boolean;
  directGrants: boolean;
}

interface AccessControlGrant {
  /** Attribute conditions, the name of a registered condition, or none. */
  conditions?: null | Record<string, unknown> | string;
  /** Defaults to "allow". */
  effect?: "allow" | "deny";
  permission: string;
}

interface AccessControlPermission {
  description?: null | string;
  name: string;
}

/** The access-control library the app uses in place of SuperTokens roles. */
interface AccessControlProvider {
  /** Manages the library's roles and grants; `roleMap` gives roles through it. */
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

interface AccessControlRole {
  description?: null | string;
  grants: AccessControlGrant[];
  name: string;
}

interface AccessControlRoleInput {
  description?: null | string;
  name: string;
}

export type {
  AccessControlAdmin,
  AccessControlCapabilities,
  AccessControlGrant,
  AccessControlPermission,
  AccessControlProvider,
  AccessControlRole,
  AccessControlRoleInput,
};

// getGrants is handed a User, so an implementation's declarations name it from here.
export type { User } from "./user";
