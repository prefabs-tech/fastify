import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueueProvider } from "../enum";
import JobOrchestrator from "../jobOrchestrator";

const { mockAdapterShutdown, mockAdapterStart, mockSchedule, mockStopAll } =
  vi.hoisted(() => ({
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockAdapterShutdown: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockAdapterStart: vi.fn().mockResolvedValue(undefined),
    mockSchedule: vi.fn(),
    mockStopAll: vi.fn(),
  }));

vi.mock("../cron", () => ({
  CronScheduler: vi.fn().mockImplementation(() => ({
    schedule: mockSchedule,
    stopAll: mockStopAll,
  })),
}));

vi.mock("../queue", async (importOriginal) => {
  const original = await importOriginal<typeof import("../queue")>();

  return {
    ...original,
    createQueueAdapter: vi
      .fn()
      .mockImplementation((config: { name: string }) => ({
        getClient: vi.fn(),
        push: vi.fn(),
        queueName: config.name,
        shutdown: mockAdapterShutdown,
        start: mockAdapterStart,
      })),
  };
});

describe("JobOrchestrator", () => {
  let orchestrator: JobOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockAdapterStart.mockResolvedValue(undefined);
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockAdapterShutdown.mockResolvedValue(undefined);
  });

  describe("constructor", () => {
    it("should create a CronScheduler instance", async () => {
      const { CronScheduler } = vi.mocked(await import("../cron"));

      orchestrator = new JobOrchestrator({ cronJobs: [], queues: [] });

      expect(CronScheduler).toHaveBeenCalledOnce();
      expect(orchestrator.cron).toBeDefined();
    });

    it("should create a per-instance AdapterRegistry", () => {
      orchestrator = new JobOrchestrator({ cronJobs: [], queues: [] });

      expect(orchestrator.adapters).toBeDefined();
      expect(orchestrator.adapters.getAll()).toEqual([]);
    });
  });

  describe("start", () => {
    it("should schedule all cron jobs on start", async () => {
      const task = vi.fn();
      orchestrator = new JobOrchestrator({
        cronJobs: [
          { expression: "* * * * *", task },
          { expression: "0 * * * *", task },
        ],
      });

      await orchestrator.start();

      expect(mockSchedule).toHaveBeenCalledTimes(2);
      expect(mockSchedule).toHaveBeenCalledWith({
        expression: "* * * * *",
        task,
      });
      expect(mockSchedule).toHaveBeenCalledWith({
        expression: "0 * * * *",
        task,
      });
    });

    it("should create and start all queue adapters on start", async () => {
      const { createQueueAdapter } = vi.mocked(await import("../queue"));

      orchestrator = new JobOrchestrator({
        queues: [
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "queue-1",
            provider: QueueProvider.BULLMQ,
          },
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "queue-2",
            provider: QueueProvider.BULLMQ,
          },
        ],
      });

      await orchestrator.start();

      expect(createQueueAdapter).toHaveBeenCalledTimes(2);
      expect(mockAdapterStart).toHaveBeenCalledTimes(2);
    });

    it("should register adapters in the per-instance registry", async () => {
      orchestrator = new JobOrchestrator({
        queues: [
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "my-queue",
            provider: QueueProvider.BULLMQ,
          },
        ],
      });

      await orchestrator.start();

      expect(orchestrator.adapters.has("my-queue")).toBe(true);
    });

    it("should not schedule any cron jobs when cronJobs is undefined", async () => {
      orchestrator = new JobOrchestrator({ queues: [] });

      await orchestrator.start();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it("should not create any adapters when queues is undefined", async () => {
      const { createQueueAdapter } = vi.mocked(await import("../queue"));
      orchestrator = new JobOrchestrator({ cronJobs: [] });

      await orchestrator.start();

      expect(createQueueAdapter).not.toHaveBeenCalled();
      expect(mockAdapterStart).not.toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("should stop all cron jobs on shutdown", async () => {
      orchestrator = new JobOrchestrator({ cronJobs: [], queues: [] });
      await orchestrator.start();

      await orchestrator.shutdown();

      expect(mockStopAll).toHaveBeenCalledOnce();
    });

    it("should shut down all registered adapters on shutdown", async () => {
      orchestrator = new JobOrchestrator({
        queues: [
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "shutdown-queue",
            provider: QueueProvider.BULLMQ,
          },
        ],
      });

      await orchestrator.start();
      await orchestrator.shutdown();

      expect(mockAdapterShutdown).toHaveBeenCalledOnce();
    });

    it("should clear the adapter registry after shutdown", async () => {
      orchestrator = new JobOrchestrator({
        queues: [
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "clear-queue",
            provider: QueueProvider.BULLMQ,
          },
        ],
      });

      await orchestrator.start();
      await orchestrator.shutdown();

      expect(orchestrator.adapters.getAll()).toHaveLength(0);
    });

    it("should not affect another instance's adapters when one shuts down", async () => {
      const first = new JobOrchestrator({
        queues: [
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "queue-first",
            provider: QueueProvider.BULLMQ,
          },
        ],
      });
      const second = new JobOrchestrator({
        queues: [
          {
            bullmqConfig: {
              handler: vi.fn(),
              queueOptions: { connection: {} },
            },
            name: "queue-second",
            provider: QueueProvider.BULLMQ,
          },
        ],
      });

      await first.start();
      await second.start();
      await first.shutdown();

      expect(first.adapters.has("queue-first")).toBe(false);
      expect(second.adapters.has("queue-second")).toBe(true);
    });
  });

  describe("instance isolation", () => {
    it("should give each instance its own AdapterRegistry", () => {
      const first = new JobOrchestrator({ cronJobs: [], queues: [] });
      const second = new JobOrchestrator({ cronJobs: [], queues: [] });

      expect(first.adapters).not.toBe(second.adapters);
    });
  });
});
