import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ROUTE_INVITATIONS,
  ROUTE_ME,
  ROUTE_PERMISSIONS,
  ROUTE_ROLES,
  ROUTE_USERS,
} from "../constants";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRunMigrations = vi.fn().mockResolvedValue();
const mockSeedRoles = vi.fn().mockResolvedValue();
const mockMercuriusAuthPlugin = vi.fn().mockResolvedValue();
const mockHasUserPermission = vi.fn();

vi.mock("../migrations/runMigrations", () => ({ default: mockRunMigrations }));
vi.mock("../lib/seedRoles", () => ({ default: mockSeedRoles }));
vi.mock("../lib/hasUserPermission", () => ({
  default: mockHasUserPermission,
}));
vi.mock("../mercurius-auth/plugin", () => ({
  default: mockMercuriusAuthPlugin,
}));

// Mock the supertokens plugin as a noop so it doesn't try to connect to a
// real SuperTokens server. verifySession is pre-decorated in buildFastify below.
vi.mock("../supertokens", () => ({
  default: async () => {},
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

// The route schemas reference "ErrorResponse#" which is registered by
// @prefabs.tech/fastify-error-handler in production. Register it manually here.
const errorResponseSchema = {
  $id: "ErrorResponse",
  additionalProperties: true,
  properties: {
    code: { type: "string" },
    error: { type: "string" },
    message: { type: "string" },
    statusCode: { type: "number" },
  },
  type: "object",
};

const buildFastify = (
  userConfig: Record<string, unknown> = {},
  rootConfig: Record<string, unknown> = {},
  slonik: Record<string, unknown> = {},
) => {
  // Disable AJV strict mode so that custom keywords registered by
  // peer plugins (e.g. `isFile` from @fastify/multipart) do not
  // cause schema-compilation errors in the test environment.
  const fastify = Fastify({
    ajv: { customOptions: { strict: false } },
    logger: false,
  });
  fastify.addSchema(errorResponseSchema);

  fastify.decorate("config", {
    appName: "TestApp",
    appOrigin: ["http://localhost"],
    baseUrl: "http://localhost",
    ...rootConfig,
    user: {
      supertokens: { connectionUri: "http://localhost:3567" },
      ...userConfig,
    },
  });
  fastify.decorate("slonik", slonik);

  // verifySession is normally added by the supertokens plugin. Since that plugin
  // is mocked as a noop (to avoid real network calls), we add it here instead.
  // It must return a function (a preHandler) when called with any options.
  fastify.decorate(
    "verifySession",
    vi.fn().mockReturnValue(async () => {}),
  );

  fastify.decorate("httpErrors", {
    forbidden: (message: string) =>
      Object.assign(new Error(message), { statusCode: 403 }),
    notFound: (message: string) =>
      Object.assign(new Error(message), { statusCode: 404 }),
    unauthorized: (message: string) =>
      Object.assign(new Error(message), { statusCode: 401 }),
  });

  return fastify;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("userPlugin — decorators", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("decorates the instance with hasPermission", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasPermission).toBeDefined();
    expect(typeof fastify.hasPermission).toBe("function");
    await fastify.close();
  });

  it("calls runMigrations during registration", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(mockRunMigrations).toHaveBeenCalledOnce();
    await fastify.close();
  });

  it("calls seedRoles on ready", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(mockSeedRoles).toHaveBeenCalledOnce();
    await fastify.close();
  });
});

describe("userPlugin — config.user.accessControl.roleMap", async () => {
  const { default: plugin } = await import("../plugin");

  beforeEach(() => vi.clearAllMocks());

  it("refuses to register when roleMap has no admin to give roles through", async () => {
    const fastify = buildFastify({
      accessControl: { roleMap: { ADMIN: ["user-admin"] } },
    });

    await expect(fastify.register(plugin)).rejects.toThrow(
      "config.user.accessControl.roleMap needs config.user.accessControl.admin",
    );
    expect(mockRunMigrations).not.toHaveBeenCalled();
    await fastify.close();
  });

  it("registers with roleMap and an admin object", async () => {
    const fastify = buildFastify({
      accessControl: { admin: {}, roleMap: { ADMIN: ["user-admin"] } },
    });

    await fastify.register(plugin);
    await fastify.ready();

    expect(mockRunMigrations).toHaveBeenCalledOnce();
    await fastify.close();
  });
});

describe("userPlugin — request.hasPermission", async () => {
  const { default: plugin } = await import("../plugin");

  // Asks request.hasPermission from a route, as an app's handler would.
  const check = async (
    userConfig: Record<string, unknown>,
    {
      context,
      permission = "users:list",
      signedIn = true,
    }: {
      context?: Record<string, unknown>;
      permission?: string;
      signedIn?: boolean;
    } = {},
  ) => {
    const fastify = buildFastify(userConfig);
    fastify.addHook("onRequest", async (request) => {
      request.user = signedIn ? ({ id: "user-1" } as never) : undefined;
    });
    await fastify.register(plugin);
    fastify.get("/check", async (request) => ({
      allowed: await request.hasPermission(permission, context),
    }));
    await fastify.ready();

    const response = await fastify.inject({ method: "GET", url: "/check" });
    await fastify.close();

    return response;
  };

  beforeEach(() => vi.clearAllMocks());

  it("falls back to hasUserPermission without config.user.accessControl.hasPermission", async () => {
    mockHasUserPermission.mockResolvedValue(true);

    const response = await check({});

    expect(response.json()).toEqual({ allowed: true });
    expect(mockHasUserPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "users:list",
    );
  });

  it("calls config.user.accessControl.hasPermission with the request, the permission and the context", async () => {
    const delegate = vi.fn().mockResolvedValue(true);

    const response = await check(
      { accessControl: { hasPermission: delegate } },
      { context: { orgId: 7 }, permission: "report.edit" },
    );

    expect(response.json()).toEqual({ allowed: true });
    expect(delegate).toHaveBeenCalledOnce();
    expect(delegate.mock.calls[0]?.[0]).toHaveProperty("user", {
      id: "user-1",
    });
    expect(delegate.mock.calls[0]?.slice(1)).toEqual([
      "report.edit",
      { orgId: 7 },
    ]);
  });

  it("passes {} when no context is given", async () => {
    const delegate = vi.fn().mockResolvedValue(true);

    await check({ accessControl: { hasPermission: delegate } });

    expect(delegate.mock.calls[0]?.[2]).toEqual({});
  });

  it("lets config.user.accessControl.hasPermission decide where config.user.permissions would allow", async () => {
    const delegate = vi.fn().mockResolvedValue(false);

    const response = await check({
      accessControl: { hasPermission: delegate },
      permissions: [],
    });

    expect(response.json()).toEqual({ allowed: false });
    expect(mockHasUserPermission).not.toHaveBeenCalled();
  });

  it("refuses anything but true from config.user.accessControl.hasPermission", async () => {
    const response = await check({
      accessControl: {
        hasPermission: vi.fn().mockResolvedValue("yes"),
      },
    });

    expect(response.json()).toEqual({ allowed: false });
  });

  it("fails the request when config.user.accessControl.hasPermission throws", async () => {
    const response = await check({
      accessControl: {
        hasPermission: vi.fn().mockRejectedValue(new Error("database down")),
      },
    });

    expect(response.statusCode).toBe(500);
  });

  it("answers false without a user, checking nothing", async () => {
    const delegate = vi.fn().mockResolvedValue(true);

    const response = await check(
      { accessControl: { hasPermission: delegate } },
      { signedIn: false },
    );

    expect(response.json()).toEqual({ allowed: false });
    expect(delegate).not.toHaveBeenCalled();
    expect(mockHasUserPermission).not.toHaveBeenCalled();
  });

  it("passes the name mapPermissionName returns", async () => {
    const delegate = vi.fn().mockResolvedValue(true);

    await check({
      accessControl: {
        hasPermission: delegate,
        mapPermissionName: (permission: string) =>
          permission.replaceAll(":", "."),
      },
    });

    expect(delegate.mock.calls[0]?.[1]).toBe("users.list");
  });

  it("ignores mapPermissionName without config.user.accessControl.hasPermission", async () => {
    mockHasUserPermission.mockResolvedValue(false);

    const response = await check({
      accessControl: {
        mapPermissionName: (permission: string) =>
          permission.replaceAll(":", "."),
      },
    });

    expect(response.json()).toEqual({ allowed: false });
    expect(mockHasUserPermission.mock.calls[0]?.[2]).toBe("users:list");
  });

  it("fails the request when mapPermissionName throws, never checking", async () => {
    const delegate = vi.fn().mockResolvedValue(true);

    const response = await check({
      accessControl: {
        hasPermission: delegate,
        mapPermissionName: vi.fn(() => {
          throw new Error("bad name");
        }),
      },
    });

    expect(response.statusCode).toBe(500);
    expect(delegate).not.toHaveBeenCalled();
  });
});

describe("userPlugin — invitations routes", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("registers GET /invitations by default", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_INVITATIONS })).toBe(
      true,
    );
    await fastify.close();
  });

  it("skips invitations routes when routes.invitations.disabled === true", async () => {
    fastify = buildFastify({ routes: { invitations: { disabled: true } } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_INVITATIONS })).toBe(
      false,
    );
    await fastify.close();
  });
});

describe("userPlugin — permissions routes", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("registers GET /permissions by default", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_PERMISSIONS })).toBe(
      true,
    );
    await fastify.close();
  });

  it("skips permissions routes when routes.permissions.disabled === true", async () => {
    fastify = buildFastify({ routes: { permissions: { disabled: true } } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_PERMISSIONS })).toBe(
      false,
    );
    await fastify.close();
  });
});

describe("userPlugin — roles routes", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("registers GET /roles by default", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_ROLES })).toBe(true);
    await fastify.close();
  });

  it("skips roles routes when routes.roles.disabled === true", async () => {
    fastify = buildFastify({ routes: { roles: { disabled: true } } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_ROLES })).toBe(false);
    await fastify.close();
  });
});

describe("userPlugin — users routes", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("registers GET /users by default", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_USERS })).toBe(true);
    await fastify.close();
  });

  it("registers GET /me by default", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_ME })).toBe(true);
    await fastify.close();
  });

  it("skips users routes when routes.users.disabled === true", async () => {
    fastify = buildFastify({ routes: { users: { disabled: true } } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "GET", url: ROUTE_USERS })).toBe(false);
    await fastify.close();
  });
});

describe("userPlugin — routePrefix", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("mounts routes under the configured routePrefix", async () => {
    fastify = buildFastify({ routePrefix: "/api/v1" });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({ method: "GET", url: `/api/v1${ROUTE_USERS}` }),
    ).toBe(true);
    expect(fastify.hasRoute({ method: "GET", url: `/api/v1${ROUTE_ME}` })).toBe(
      true,
    );
    await fastify.close();
  });

  it("mounts routes without a prefix when routePrefix is not set", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    // Routes should exist at the root path (no prefix)
    expect(fastify.hasRoute({ method: "GET", url: ROUTE_USERS })).toBe(true);
    await fastify.close();
  });
});

describe("userPlugin — seedRoles receives user config", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("passes the user config to seedRoles", async () => {
    const customRoles = ["MODERATOR", "EDITOR"];
    fastify = buildFastify({ roles: customRoles });
    await fastify.register(plugin);
    await fastify.ready();

    expect(mockSeedRoles).toHaveBeenCalledWith(
      expect.objectContaining({ roles: customRoles }),
    );
    await fastify.close();
  });
});

describe("userPlugin — runMigrations wiring", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("passes fastify config and slonik to runMigrations", async () => {
    const slonik = { pool: "test-pool" };
    fastify = buildFastify({}, {}, slonik);
    await fastify.register(plugin);
    await fastify.ready();

    expect(mockRunMigrations).toHaveBeenCalledWith(fastify.config, slonik);
    await fastify.close();
  });
});

describe("userPlugin — GraphQL mercurius-auth wiring", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  beforeEach(() => vi.clearAllMocks());

  it("does not register mercurius-auth integration when graphql is omitted from config", async () => {
    fastify = buildFastify();
    await fastify.register(plugin);
    await fastify.ready();

    expect(mockMercuriusAuthPlugin).not.toHaveBeenCalled();
    await fastify.close();
  });

  it("does not register mercurius-auth integration when graphql.enabled is false", async () => {
    fastify = buildFastify({}, { graphql: { enabled: false } });
    await fastify.register(plugin);
    await fastify.ready();

    expect(mockMercuriusAuthPlugin).not.toHaveBeenCalled();
    await fastify.close();
  });

  it("registers mercurius-auth integration when graphql.enabled is true", async () => {
    fastify = buildFastify({}, { graphql: { enabled: true } });
    await fastify.register(plugin);
    await fastify.ready();

    // Avoid matchers that traverse the Fastify instance in mock call records
    // (e.g. toHaveBeenCalledOnce, toEqual on args containing fastify) — they can
    // trip Fastify's listeningOrigin getter before listen().
    expect(mockMercuriusAuthPlugin.mock.calls.length).toBe(1);
    expect(mockMercuriusAuthPlugin.mock.calls[0]?.[2]).toBeTypeOf("function");

    await fastify.close();
  });
});

describe("userPlugin — the authentication hook", async () => {
  const { default: plugin } = await import("../plugin");

  // An app route registered after the plugin, as an app's routers are.
  const requestAppRoute = async (userConfig: Record<string, unknown>) => {
    const fastify = buildFastify(userConfig);
    await fastify.register(plugin);
    fastify.get("/app-route", async () => ({ ok: true }));
    await fastify.ready();
    const verifySession = fastify.verifySession as unknown as ReturnType<
      typeof vi.fn
    >;
    verifySession.mockClear();

    await fastify.inject({ method: "GET", url: "/app-route" });
    const calls = verifySession.mock.calls.length;
    await fastify.close();

    return calls;
  };

  beforeEach(() => vi.clearAllMocks());

  it("verifies the session on every route by default", async () => {
    expect(await requestAppRoute({})).toBe(1);
  });

  it("leaves routes to their own verifySession with middlewareEnabled false", async () => {
    expect(await requestAppRoute({ middlewareEnabled: false })).toBe(0);
  });
});

describe("userPlugin — each route's config", async () => {
  const { default: plugin } = await import("../plugin");

  // Each route keeps the access it had: a permission where it was guarded by
  // hasPermission, public where it needed no session, and otherwise any
  // signed-in user, so an access-control route hook changes nothing.
  const expected: Record<string, Record<string, unknown>> = {
    "DELETE /invitations/:id(^\\d+)": { permission: "invitations:delete" },
    "DELETE /me": { permissionMiddleware: false, profileValidated: false },
    "DELETE /me/photo": {
      permissionMiddleware: false,
      profileValidated: false,
      verified: false,
    },
    "DELETE /roles": { permissionMiddleware: false },
    "GET /invitations": { permission: "invitations:list" },
    "GET /invitations/token/:token": { public: true },
    "GET /me": {
      permissionMiddleware: false,
      profileValidated: false,
      verified: false,
    },
    "GET /permissions": { permissionMiddleware: false },
    "GET /profile/fields": { permissionMiddleware: false },
    "GET /roles": { permissionMiddleware: false },
    "GET /roles/permissions": { permissionMiddleware: false },
    "GET /signup/admin": { public: true },
    "GET /users": { permission: "users:list" },
    "GET /users/:id": { permission: "users:read" },
    "PATCH /users/profile": { permissionMiddleware: false },
    "POST /change-email": {
      permissionMiddleware: false,
      profileValidated: false,
      verified: false,
    },
    "POST /change_password": { permissionMiddleware: false },
    "POST /invitations": { permission: "invitations:create" },
    "POST /invitations/resend/:id(^\\d+)": { permission: "invitations:resend" },
    "POST /invitations/token/:token": { public: true },
    "POST /roles": { permissionMiddleware: false },
    "POST /signup/admin": { public: true },
    "PUT /invitations/revoke/:id(^\\d+)": { permission: "invitations:revoke" },
    "PUT /me": {
      permissionMiddleware: false,
      profileValidated: false,
      verified: false,
    },
    "PUT /me/photo": {
      permissionMiddleware: false,
      profileValidated: false,
      verified: false,
    },
    "PUT /roles/permissions": { permissionMiddleware: false },
    "PUT /users/:id/disable": { permission: "users:disable" },
    "PUT /users/:id/enable": { permission: "users:enable" },
  };

  it("declares every route's access in its config", async () => {
    const fastify = buildFastify();
    const configs: Record<string, Record<string, unknown>> = {};
    fastify.addHook("onRoute", (route) => {
      const methods = [route.method].flat();
      for (const method of methods) {
        if (method === "HEAD") continue;
        // Fastify adds the route's own method and url to its config
        const config = { ...(route.config as Record<string, unknown>) };
        delete config.method;
        delete config.url;
        configs[`${method} ${route.url}`] = config;
      }
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(configs).toEqual(expected);
    await fastify.close();
  });
});

describe("userPlugin — default export", async () => {
  const { default: plugin } = await import("../plugin");

  it("exposes updateContext for Mercurius context wiring", () => {
    expect(plugin.updateContext).toBeDefined();
    expect(typeof plugin.updateContext).toBe("function");
  });
});
