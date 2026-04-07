import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SlonikOptions } from "../types";

const migrateMock = vi.fn().mockResolvedValue();

vi.mock("../migrate", () => ({
  default: migrateMock,
}));

const baseOptions: SlonikOptions = {
  db: {
    databaseName: "test",
    host: "localhost",
    password: "pass",
    username: "user",
  },
};

describe("migrationPlugin — registration", async () => {
  const { default: plugin } = await import("../migrationPlugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  it("registers without throwing", async () => {
    await expect(fastify.register(plugin, baseOptions)).resolves.not.toThrow();
  });

  it("calls migrate with the provided options", async () => {
    await fastify.register(plugin, baseOptions);
    await fastify.ready();
    expect(migrateMock).toHaveBeenCalledWith(baseOptions);
  });
});

describe("migrationPlugin — legacy config fallback", async () => {
  const { default: plugin } = await import("../migrationPlugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  it("reads options from fastify.config.slonik when no options passed", async () => {
    fastify.decorate("config", { slonik: baseOptions });
    await fastify.register(plugin);
    await fastify.ready();
    expect(migrateMock).toHaveBeenCalledWith(baseOptions);
  });

  it("throws descriptive error when no options and no fastify.config.slonik", async () => {
    await expect(fastify.register(plugin)).rejects.toThrow(
      "Missing migration configuration. Did you forget to pass it to the migration plugin?",
    );
  });
});
