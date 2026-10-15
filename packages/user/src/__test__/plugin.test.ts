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

describe("userPlugin — default export", async () => {
  const { default: plugin } = await import("../plugin");

  it("exposes updateContext for Mercurius context wiring", () => {
    expect(plugin.updateContext).toBeDefined();
    expect(typeof plugin.updateContext).toBe("function");
  });
});
