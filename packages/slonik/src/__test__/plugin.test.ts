import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SlonikOptions } from "../types";

const runMigrationsMock = vi.fn().mockResolvedValue();
const stringifyDsnMock = vi
  .fn()
  .mockReturnValue("postgresql://user:pass@localhost/test");
const createClientConfigurationMock = vi
  .fn()
  .mockReturnValue({ interceptors: [] });

// fastifySlonik must be wrapped with fastify-plugin so its decorations escape
// the child scope and reach the parent fastify instance.
vi.mock("../slonik", async () => {
  const { default: FastifyPlugin } = await import("fastify-plugin");

  const fakeSlonik = {
    connect: vi.fn(),
    pool: {},
    query: vi.fn(),
  };

  return {
    fastifySlonik: FastifyPlugin(async (fastify: FastifyInstance) => {
      if (!fastify.hasDecorator("slonik"))
        fastify.decorate("slonik", fakeSlonik);
      if (!fastify.hasDecorator("sql")) fastify.decorate("sql", {});
      if (!fastify.hasRequestDecorator("slonik"))
        fastify.decorateRequest("slonik");
      if (!fastify.hasRequestDecorator("sql")) fastify.decorateRequest("sql");
    }),
  };
});

vi.mock("../migrations/runMigrations", () => ({
  default: runMigrationsMock,
}));

vi.mock("slonik", () => ({
  stringifyDsn: stringifyDsnMock,
}));

vi.mock("../factories/createClientConfiguration", () => ({
  default: createClientConfigurationMock,
}));

const baseOptions: SlonikOptions = {
  db: {
    databaseName: "test",
    host: "localhost",
    password: "pass",
    username: "user",
  },
};

describe("slonikPlugin — registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  it("registers without throwing", async () => {
    await expect(fastify.register(plugin, baseOptions)).resolves.not.toThrow();
  });

  it("decorates fastify.slonik after registration", async () => {
    await fastify.register(plugin, baseOptions);
    await fastify.ready();
    expect(fastify.slonik).toBeDefined();
  });

  it("decorates fastify.sql after registration", async () => {
    await fastify.register(plugin, baseOptions);
    await fastify.ready();
    expect(fastify.sql).toBeDefined();
  });

  it("decorates req.dbSchema as empty string in route handlers", async () => {
    await fastify.register(plugin, baseOptions);

    fastify.get("/test", async (req) => {
      return { dbSchema: req.dbSchema };
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().dbSchema).toBe("");
  });

  it("calls stringifyDsn with options.db", async () => {
    await fastify.register(plugin, baseOptions);
    await fastify.ready();
    expect(stringifyDsnMock).toHaveBeenCalledWith(baseOptions.db);
  });

  it("calls createClientConfiguration with clientConfiguration and queryLogging.enabled", async () => {
    const options: SlonikOptions = {
      ...baseOptions,
      queryLogging: { enabled: true },
    };
    await fastify.register(plugin, options);
    await fastify.ready();
    expect(createClientConfigurationMock).toHaveBeenCalledWith(
      options.clientConfiguration,
      true,
    );
  });

  it("passes undefined for queryLogging.enabled when queryLogging is not set", async () => {
    await fastify.register(plugin, baseOptions);
    await fastify.ready();
    expect(createClientConfigurationMock).toHaveBeenCalledWith(
      undefined,
      undefined,
    );
  });

  it("passes false for queryLogging.enabled when query logging is explicitly disabled", async () => {
    const options: SlonikOptions = {
      ...baseOptions,
      queryLogging: { enabled: false },
    };
    await fastify.register(plugin, options);
    await fastify.ready();
    expect(createClientConfigurationMock).toHaveBeenCalledWith(
      options.clientConfiguration,
      false,
    );
  });

  it("runs extension and migration setup after the pool is decorated", async () => {
    const options: SlonikOptions = {
      ...baseOptions,
      extensions: ["uuid-ossp"],
    };
    await fastify.register(plugin, options);
    await fastify.ready();
    expect(runMigrationsMock).toHaveBeenCalledTimes(1);
    expect(runMigrationsMock).toHaveBeenCalledWith(fastify.slonik, options);
  });
});

describe("slonikPlugin — legacy config fallback", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  it("reads options from fastify.config.slonik when no options passed", async () => {
    const warnSpy = vi.spyOn(fastify.log, "warn").mockImplementation(() => {});
    fastify.decorate("config", { slonik: baseOptions });
    await fastify.register(plugin);
    await fastify.ready();
    expect(stringifyDsnMock).toHaveBeenCalledWith(baseOptions.db);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "The slonik plugin now recommends passing slonik options directly",
      ),
    );
  });

  it("fastify.slonik is available after legacy registration", async () => {
    fastify.decorate("config", { slonik: baseOptions });
    await fastify.register(plugin);
    await fastify.ready();
    expect(fastify.slonik).toBeDefined();
  });

  it("throws descriptive error when no options and no fastify.config.slonik", async () => {
    await expect(fastify.register(plugin)).rejects.toThrow(
      "Missing slonik configuration. Did you forget to pass it to the slonik plugin?",
    );
  });

  it("runs extension setup with config resolved from fastify.config.slonik", async () => {
    fastify.decorate("config", { slonik: baseOptions });
    await fastify.register(plugin);
    await fastify.ready();
    expect(runMigrationsMock).toHaveBeenCalledWith(fastify.slonik, baseOptions);
  });
});
