import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ROUTE_INVITATIONS,
  ROUTE_ME,
  ROUTE_PERMISSIONS,
  ROUTE_ROLES,
  ROUTE_USERS,
} from "../constants";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRunMigrations = vi.fn(async () => {});
const mockSeedRoles = vi.fn(async () => {});
const { mockMercuriusAuthPlugin } = vi.hoisted(() => ({
  mockMercuriusAuthPlugin: vi.fn<(...parameters: unknown[]) => Promise<void>>(
    async () => {},
  ),
}));

vi.mock("../migrations/runMigrations", () => ({ default: mockRunMigrations }));
vi.mock("../lib/seedRoles", () => ({ default: mockSeedRoles }));
vi.mock("../mercurius-auth/plugin", () => ({
  default: mockMercuriusAuthPlugin,
}));

vi.mock("../supertokens", () => ({
  default: async () => {},
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const defaultSlonik = { pool: "default-test-pool" };

const buildFastify = (
  userConfig: Record<string, unknown> = {},
  rootConfig: Record<string, unknown> = {},
  slonik: unknown = defaultSlonik,
) => {
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
    ...rootConfig,
  });
  fastify.decorate("slonik", slonik);

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
  } as FastifyInstance["httpErrors"]);

  return fastify;
};

/** Host instance shape after registering the user plugin (decorators not on base Fastify types). */
type UserPluginHost = {
  config: Record<string, unknown>;
  hasPermission: unknown;
} & FastifyInstance;

describe("userPlugin", async () => {
  const { default: plugin } = await import("../plugin");
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("decorators", () => {
    it("decorates the instance with hasPermission", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      const app = fastify as UserPluginHost;
      expect(app.hasPermission).toBeDefined();
      expect(typeof app.hasPermission).toBe("function");
    });

    it("calls runMigrations during registration", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockRunMigrations).toHaveBeenCalledOnce();
    });

    it("calls seedRoles on ready", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockSeedRoles).toHaveBeenCalledOnce();
    });

    it("passes fastify config and slonik to runMigrations", async () => {
      const slonikReference = { pool: "test-pool" };
      fastify = buildFastify({}, {}, slonikReference);
      await fastify.register(plugin);
      await fastify.ready();

      const app = fastify as UserPluginHost;
      expect(mockRunMigrations).toHaveBeenCalledWith(
        app.config,
        slonikReference,
      );
    });
  });

  describe("invitations routes", () => {
    it("registers GET /invitations by default", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_INVITATIONS })).toBe(
        true,
      );
    });

    it("skips invitations routes when routes.invitations.disabled === true", async () => {
      fastify = buildFastify({ routes: { invitations: { disabled: true } } });
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_INVITATIONS })).toBe(
        false,
      );
    });
  });

  describe("permissions routes", () => {
    it("registers GET /permissions by default", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_PERMISSIONS })).toBe(
        true,
      );
    });

    it("skips permissions routes when routes.permissions.disabled === true", async () => {
      fastify = buildFastify({ routes: { permissions: { disabled: true } } });
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_PERMISSIONS })).toBe(
        false,
      );
    });
  });

  describe("roles routes", () => {
    it("registers GET /roles by default", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_ROLES })).toBe(true);
    });

    it("skips roles routes when routes.roles.disabled === true", async () => {
      fastify = buildFastify({ routes: { roles: { disabled: true } } });
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_ROLES })).toBe(false);
    });
  });

  describe("users routes", () => {
    it("registers GET /users by default", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_USERS })).toBe(true);
    });

    it("registers GET /me by default", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_ME })).toBe(true);
    });

    it("skips users routes when routes.users.disabled === true", async () => {
      fastify = buildFastify({ routes: { users: { disabled: true } } });
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_USERS })).toBe(false);
    });
  });

  describe("routePrefix", () => {
    it("mounts routes under the configured routePrefix", async () => {
      fastify = buildFastify({ routePrefix: "/api/v1" });
      await fastify.register(plugin);
      await fastify.ready();

      expect(
        fastify.hasRoute({ method: "GET", url: `/api/v1${ROUTE_USERS}` }),
      ).toBe(true);
      expect(
        fastify.hasRoute({ method: "GET", url: `/api/v1${ROUTE_ME}` }),
      ).toBe(true);
    });

    it("mounts routes without a prefix when routePrefix is not set", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(fastify.hasRoute({ method: "GET", url: ROUTE_USERS })).toBe(true);
    });
  });

  describe("seedRoles receives user config", () => {
    it("passes the user config to seedRoles", async () => {
      const customRoles = ["MODERATOR", "EDITOR"];
      fastify = buildFastify({ roles: customRoles });
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockSeedRoles).toHaveBeenCalledWith(
        expect.objectContaining({ roles: customRoles }),
      );
    });
  });

  describe("GraphQL mercurius-auth wiring", () => {
    it("does not register mercurius auth when graphql is disabled", async () => {
      fastify = buildFastify(
        {},
        {
          graphql: {
            enabled: false,
            resolvers: {},
            schema: "type Query { _: Boolean }",
          },
        },
      );
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockMercuriusAuthPlugin).not.toHaveBeenCalled();
    });

    it("does not register mercurius auth when graphql is omitted from config", async () => {
      fastify = buildFastify();
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockMercuriusAuthPlugin).not.toHaveBeenCalled();
    });

    it("does not register mercurius-auth when graphql.enabled is false", async () => {
      fastify = buildFastify({}, { graphql: { enabled: false } });
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockMercuriusAuthPlugin).not.toHaveBeenCalled();
    });

    it("registers mercurius auth when graphql.enabled is true", async () => {
      fastify = buildFastify(
        {},
        {
          graphql: {
            enabled: true,
            resolvers: {},
            schema: "type Query { _: Boolean }",
          },
        },
      );
      await fastify.register(plugin);
      await fastify.ready();

      expect(mockMercuriusAuthPlugin.mock.calls.length).toBe(1);
      expect(mockMercuriusAuthPlugin.mock.calls[0]?.[2]).toBeTypeOf("function");
    });
  });
});

describe("userPlugin — default export", async () => {
  const { default: plugin } = await import("../plugin");

  it("exposes updateContext for Mercurius context wiring", () => {
    expect(plugin.updateContext).toBeDefined();
    expect(typeof plugin.updateContext).toBe("function");
  });
});
