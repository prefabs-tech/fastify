import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueueProvider } from "../enum";
import JobOrchestrator from "../jobOrchestrator";

const { mockSchedule, mockStopAll, mockAdapterStart, mockAdapterShutdown } =
  vi.hoisted(() => ({
    mockSchedule: vi.fn(),
    mockStopAll: vi.fn(),
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockAdapterStart: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockAdapterShutdown: vi.fn().mockResolvedValue(undefined),
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
        queueName: config.name,
        start: mockAdapterStart,
        shutdown: mockAdapterShutdown,
        getClient: vi.fn(),
        push: vi.fn(),
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

  afterEach(async () => {
    // Clear static registry between tests to prevent state leakage
    await JobOrchestrator.adapters.shutdownAll();
  });

  describe("constructor", () => {
    it("should create a CronScheduler instance", async () => {
      const { CronScheduler } = vi.mocked(await import("../cron"));

      orchestrator = new JobOrchestrator({ cronJobs: [], queues: [] });

      expect(CronScheduler).toHaveBeenCalledOnce();
      expect(orchestrator.cron).toBeDefined();
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

    it("should register adapters in the static registry", async () => {
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

      expect(JobOrchestrator.adapters.has("my-queue")).toBe(true);
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

      expect(JobOrchestrator.adapters.getAll()).toHaveLength(0);
    });
  });
});
