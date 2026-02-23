import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FastifyInstance } from "fastify";

const { mockStart, mockShutdown, MockJobOrchestrator } = vi.hoisted(() => {
  // eslint-disable-next-line unicorn/no-useless-undefined
  const mockStart = vi.fn().mockResolvedValue(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined
  const mockShutdown = vi.fn().mockResolvedValue(undefined);
  const MockJobOrchestrator = vi.fn().mockImplementation(() => ({
    cron: {},
    shutdown: mockShutdown,
    start: mockStart,
  }));

  return { mockStart, mockShutdown, MockJobOrchestrator };
});

vi.mock("../jobOrchestrator", () => ({
  default: MockJobOrchestrator,
}));

describe("Worker plugin", async () => {
  let api: FastifyInstance;
  const { default: plugin } = await import("../plugin");

  const workerConfig = {
    cronJobs: [],
    queues: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockStart.mockResolvedValue(undefined);
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockShutdown.mockResolvedValue(undefined);
    api = fastify();
  });

  afterEach(async () => {
    // Suppress error if api was already closed inside the test
    await api.close().catch(() => {});
  });

  it("should log a warning and skip registration when worker config is missing", async () => {
    api.decorate("config", {} as never);

    await api.register(plugin);
    await api.ready();

    expect(MockJobOrchestrator).not.toHaveBeenCalled();
  });

  it("should create a JobOrchestrator and call start when worker config is present", async () => {
    api.decorate("config", { worker: workerConfig } as never);

    await api.register(plugin);
    await api.ready();

    expect(MockJobOrchestrator).toHaveBeenCalledWith(workerConfig);
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("should decorate the fastify instance with the worker orchestrator", async () => {
    api.decorate("config", { worker: workerConfig } as never);

    await api.register(plugin);
    await api.ready();

    expect((api as FastifyInstance & { worker: unknown }).worker).toBeDefined();
  });

  it("should call shutdown on the orchestrator when fastify closes", async () => {
    api.decorate("config", { worker: workerConfig } as never);

    await api.register(plugin);
    await api.ready();
    await api.close();

    expect(mockShutdown).toHaveBeenCalledOnce();
  });
});
