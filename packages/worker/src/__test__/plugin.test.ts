import type { FastifyInstance } from "fastify";

import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockJobOrchestrator, mockShutdown, mockStart } = vi.hoisted(() => {
  // eslint-disable-next-line unicorn/no-useless-undefined
  const mockStart = vi.fn().mockResolvedValue(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined
  const mockShutdown = vi.fn().mockResolvedValue(undefined);
  const MockJobOrchestrator = vi.fn().mockImplementation(() => ({
    cron: {},
    shutdown: mockShutdown,
    start: mockStart,
  }));

  return { MockJobOrchestrator, mockShutdown, mockStart };
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

  it("warns when worker configuration is missing and skips registration", async () => {
    const warnSpy = vi.spyOn(api.log, "warn");
    api.decorate("config", {} as never);

    await api.register(plugin);
    await api.ready();

    expect(warnSpy).toHaveBeenCalledWith(
      "Worker configuration is missing. Skipping plugin registration",
    );
    expect(MockJobOrchestrator).not.toHaveBeenCalled();
  });

  it("should create a JobOrchestrator and call start when worker config is present", async () => {
    const infoSpy = vi.spyOn(api.log, "info");
    api.decorate("config", { worker: workerConfig } as never);

    await api.register(plugin);
    await api.ready();

    expect(infoSpy).toHaveBeenCalledWith("Registering worker plugin");
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
    const infoSpy = vi.spyOn(api.log, "info");
    api.decorate("config", { worker: workerConfig } as never);

    await api.register(plugin);
    await api.ready();
    await api.close();

    expect(infoSpy).toHaveBeenCalledWith("Shutting down worker");
    expect(mockShutdown).toHaveBeenCalledOnce();
  });
});
