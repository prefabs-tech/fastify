import { Job, JobsOptions } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BullMQAdapter from "../../../queue/adapters/bullmq";

const {
  mockQueueAdd,
  mockQueueClose,
  mockWorkerClose,
  mockWorkerOn,
  capturedHandler,
  eventListeners,
  MockQueue,
  MockWorker,
} = vi.hoisted(() => {
  const mockQueueAdd = vi.fn().mockResolvedValue({ id: "job-123" });
  // eslint-disable-next-line unicorn/no-useless-undefined
  const mockQueueClose = vi.fn().mockResolvedValue(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined
  const mockWorkerClose = vi.fn().mockResolvedValue(undefined);

  const eventListeners: Record<string, (...arguments_: unknown[]) => void> = {};
  const mockWorkerOn = vi
    .fn()
    .mockImplementation(
      (event: string, callback: (...arguments_: unknown[]) => void) => {
        eventListeners[event] = callback;
      },
    );

  const capturedHandler = {
    fn: undefined as ((job: unknown) => Promise<void>) | undefined,
  };

  const MockQueue = vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    close: mockQueueClose,
  }));

  const MockWorker = vi
    .fn()
    .mockImplementation(
      (_name: string, handler: (job: unknown) => Promise<void>) => {
        capturedHandler.fn = handler;
        return { on: mockWorkerOn, close: mockWorkerClose };
      },
    );

  return {
    MockQueue,
    MockWorker,
    capturedHandler,
    eventListeners,
    mockQueueAdd,
    mockQueueClose,
    mockWorkerClose,
    mockWorkerOn,
  };
});

vi.mock("bullmq", () => ({
  Job: class {},
  Queue: MockQueue,
  Worker: MockWorker,
}));

const baseConfig = {
  // eslint-disable-next-line unicorn/no-useless-undefined
  handler: vi.fn().mockResolvedValue(undefined),
  queueOptions: {
    connection: { host: "localhost", port: 6379 },
  },
};

describe("BullMQAdapter", () => {
  let adapter: BullMQAdapter<{ key: string }>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockResolvedValue({ id: "job-123" });
    adapter = new BullMQAdapter("test-queue", baseConfig);
  });

  describe("start", () => {
    it("should create a BullMQ Queue with the given name and options", async () => {
      await adapter.start();

      expect(MockQueue).toHaveBeenCalledWith(
        "test-queue",
        baseConfig.queueOptions,
      );
    });

    it("should create a Worker with the queue name and connection", async () => {
      await adapter.start();

      expect(MockWorker).toHaveBeenCalledWith(
        "test-queue",
        expect.any(Function),
        { connection: baseConfig.queueOptions.connection },
      );
    });

    it("should merge workerOptions with connection from queueOptions", async () => {
      const config = {
        ...baseConfig,
        workerOptions: {
          concurrency: 5,
          connection: baseConfig.queueOptions.connection,
        },
      };
      const adapterWithWorkerOptions = new BullMQAdapter("test-queue", config);

      await adapterWithWorkerOptions.start();

      expect(MockWorker).toHaveBeenCalledWith(
        "test-queue",
        expect.any(Function),
        { connection: baseConfig.queueOptions.connection, concurrency: 5 },
      );
    });

    it("should register error and failed event listeners on the worker", async () => {
      await adapter.start();

      expect(mockWorkerOn).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockWorkerOn).toHaveBeenCalledWith("failed", expect.any(Function));
    });

    it("should invoke the job handler when the worker processes a job", async () => {
      await adapter.start();

      const mockJob = { data: { key: "value" } } as Job;
      await capturedHandler.fn!(mockJob);

      expect(baseConfig.handler).toHaveBeenCalledWith(mockJob);
    });
  });

  describe("shutdown", () => {
    it("should close the worker and queue", async () => {
      await adapter.start();
      await adapter.shutdown();

      expect(mockWorkerClose).toHaveBeenCalledOnce();
      expect(mockQueueClose).toHaveBeenCalledOnce();
    });

    it("should not throw if called before start", async () => {
      await expect(adapter.shutdown()).resolves.not.toThrow();
    });
  });

  describe("getClient", () => {
    it("should return the underlying BullMQ Queue instance", async () => {
      await adapter.start();

      expect(adapter.getClient()).toBeDefined();
      expect(adapter.getClient()).toHaveProperty("add");
    });
  });

  describe("push", () => {
    it("should add a job to the queue and return the job id", async () => {
      await adapter.start();

      const id = await adapter.push({ key: "value" });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        "test-queue",
        { key: "value" },
        undefined,
      );
      expect(id).toBe("job-123");
    });

    it("should pass job options to queue.add", async () => {
      await adapter.start();
      const options: JobsOptions = { delay: 1000 };

      await adapter.push({ key: "value" }, options);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        "test-queue",
        { key: "value" },
        options,
      );
    });

    it("should throw a descriptive error when queue.add fails", async () => {
      await adapter.start();
      mockQueueAdd.mockRejectedValueOnce(new Error("Redis connection refused"));

      await expect(adapter.push({ key: "value" })).rejects.toThrowError(
        "Failed to push job to BullMQ queue: test-queue. Error: Redis connection refused",
      );
    });
  });

  describe("event handlers", () => {
    it("should call onError when the worker emits an error", async () => {
      const onError = vi.fn();
      const adapterWithError = new BullMQAdapter("test-queue", {
        ...baseConfig,
        onError,
      });
      await adapterWithError.start();

      const error = new Error("worker error");
      eventListeners["error"](error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should not throw when an error is emitted with no onError handler", async () => {
      await adapter.start();

      expect(() => eventListeners["error"](new Error("error"))).not.toThrow();
    });

    it("should call onFailed when the worker emits a failed event", async () => {
      const onFailed = vi.fn();
      const adapterWithFailed = new BullMQAdapter("test-queue", {
        ...baseConfig,
        onFailed,
      });
      await adapterWithFailed.start();

      const job = { id: "job-1" } as Job;
      const error = new Error("job failed");
      eventListeners["failed"](job, error);

      expect(onFailed).toHaveBeenCalledWith(job, error);
    });

    it("should not throw when a failed event is emitted with no onFailed handler", async () => {
      await adapter.start();

      expect(() =>
        eventListeners["failed"]({ id: "job-1" }, new Error("error")),
      ).not.toThrow();
    });
  });
});
