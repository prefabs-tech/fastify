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

vi.mock("../migrations/runMigrations", () => ({ default: mockRunMigrations }));
vi.mock("../lib/seedRoles", () => ({ default: mockSeedRoles }));

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

const buildFastify = (userConfig: Record<string, unknown> = {}) => {
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
    user: {
      supertokens: { connectionUri: "http://localhost:3567" },
      ...userConfig,
    },
  });
  fastify.decorate("slonik", {});

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
