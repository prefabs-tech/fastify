import type { FastifyRequest } from "fastify";

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
  AccessControlRole,
  AccessControlRoleInput,
};
