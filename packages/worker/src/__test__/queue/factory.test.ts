import { describe, expect, it, vi } from "vitest";

import { QueueProvider } from "../../enum";
import BullMQAdapter from "../../queue/adapters/bullmq";
import SQSAdapter from "../../queue/adapters/sqs";
import createQueueAdapter from "../../queue/factory";

vi.mock("../../queue/adapters/bullmq", () => ({
  default: vi.fn().mockImplementation((name: string) => ({
    queueName: name,
  })),
}));

vi.mock("../../queue/adapters/sqs", () => ({
  default: vi.fn().mockImplementation((name: string) => ({
    queueName: name,
  })),
}));

const mockBullMQConfig = {
  handler: vi.fn(),
  queueOptions: {
    connection: { host: "localhost", port: 6379 },
  },
};

const mockSQSConfig = {
  clientConfig: { region: "us-east-1" },
  handler: vi.fn(),
  queueUrl: "https://sqs.us-east-1.amazonaws.com/123/test-queue",
};

describe("createQueueAdapter", () => {
  describe("BullMQ provider", () => {
    it("should create a BullMQAdapter for BULLMQ provider", () => {
      const config = {
        bullmqConfig: mockBullMQConfig,
        name: "test-queue",
        provider: QueueProvider.BULLMQ,
      };

      const adapter = createQueueAdapter(config);

      expect(BullMQAdapter).toHaveBeenCalledWith(
        "test-queue",
        mockBullMQConfig,
      );
      expect(adapter).toBeDefined();
    });

    it("should throw when BullMQ config is missing", () => {
      const config = {
        name: "test-queue",
        provider: QueueProvider.BULLMQ,
      };

      expect(() => createQueueAdapter(config)).toThrowError(
        "BullMQ configuration is required for queue: test-queue",
      );
    });
  });

  describe("SQS provider", () => {
    it("should create an SQSAdapter for SQS provider", () => {
      const config = {
        name: "sqs-queue",
        provider: QueueProvider.SQS,
        sqsConfig: mockSQSConfig,
      };

      const adapter = createQueueAdapter(config);

      expect(SQSAdapter).toHaveBeenCalledWith("sqs-queue", mockSQSConfig);
      expect(adapter).toBeDefined();
    });

    it("should throw when SQS config is missing", () => {
      const config = {
        name: "sqs-queue",
        provider: QueueProvider.SQS,
      };

      expect(() => createQueueAdapter(config)).toThrowError(
        "SQS configuration is required for queue: sqs-queue",
      );
    });
  });

  describe("unsupported provider", () => {
    it("should throw for an unsupported provider value", () => {
      const config = {
        name: "unknown-queue",
        provider: "kafka" as QueueProvider,
      };

      expect(() => createQueueAdapter(config)).toThrowError(
        "Unsupported queue provider: kafka",
      );
    });
  });
});
