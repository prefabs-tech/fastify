import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SQSAdapter from "../../../queue/adapters/sqs";

const { mockClientSend, mockClientDestroy, MockSQSClient } = vi.hoisted(() => {
  const mockClientSend = vi.fn();
  const mockClientDestroy = vi.fn();
  const MockSQSClient = vi.fn().mockImplementation(() => ({
    destroy: mockClientDestroy,
    send: mockClientSend,
  }));

  return { mockClientSend, mockClientDestroy, MockSQSClient };
});

vi.mock("@aws-sdk/client-sqs", () => {
  class ReceiveMessageCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  class DeleteMessageCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  class SendMessageCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return {
    DeleteMessageCommand,
    ReceiveMessageCommand,
    SendMessageCommand,
    SQSClient: MockSQSClient,
  };
});

const waitFor = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
const neverResolve = () => new Promise<never>(() => {});

const baseConfig = {
  clientConfig: { region: "us-east-1" },
  // eslint-disable-next-line unicorn/no-useless-undefined
  handler: vi.fn().mockResolvedValue(undefined),
  queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789/test-queue",
};

describe("SQSAdapter", () => {
  let adapter: SQSAdapter<{ key: string }>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClientSend.mockImplementation(neverResolve);
    adapter = new SQSAdapter("sqs-queue", baseConfig);
  });

  describe("start", () => {
    it("should create an SQSClient with the provided config", async () => {
      await adapter.start();

      expect(MockSQSClient).toHaveBeenCalledWith(baseConfig.clientConfig);
    });

    it("should set isPolling to true when start is called", async () => {
      await adapter.start();

      expect(adapter["isPolling"]).toBe(true);
    });

    it("should send a ReceiveMessageCommand once polling starts", async () => {
      await adapter.start();

      // poll() calls send() synchronously before its first await
      expect(mockClientSend).toHaveBeenCalledWith(
        expect.any(ReceiveMessageCommand),
      );
    });

    it("should include custom receiveMessageOptions in the ReceiveMessageCommand", async () => {
      const configWithOptions = {
        ...baseConfig,
        receiveMessageOptions: {
          MaxNumberOfMessages: 5,
          QueueUrl: baseConfig.queueUrl,
        },
      };
      const customAdapter = new SQSAdapter("sqs-queue", configWithOptions);

      await customAdapter.start();

      const callArgument = mockClientSend.mock
        .calls[0][0] as ReceiveMessageCommand;
      expect(callArgument.input).toMatchObject({
        MaxNumberOfMessages: 5,
        QueueUrl: baseConfig.queueUrl,
      });
    });
  });

  describe("shutdown", () => {
    it("should set isPolling to false and destroy the client", async () => {
      await adapter.start();
      await adapter.shutdown();

      expect(adapter["isPolling"]).toBe(false);
      expect(mockClientDestroy).toHaveBeenCalledOnce();
    });

    it("should not throw if called before start", async () => {
      await expect(adapter.shutdown()).resolves.not.toThrow();
    });
  });

  describe("getClient", () => {
    it("should return the underlying SQSClient instance", async () => {
      await adapter.start();

      expect(adapter.getClient()).toBeDefined();
      expect(adapter.getClient()).toHaveProperty("send");
    });
  });

  describe("push", () => {
    it("should send a SendMessageCommand and return the message id", async () => {
      await adapter.start();
      // The poll loop is suspended on neverResolve — this once-value goes to push
      mockClientSend.mockResolvedValueOnce({ MessageId: "msg-abc-123" });

      const id = await adapter.push({ key: "value" });

      const sendCall = mockClientSend.mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand,
      );
      expect(sendCall).toBeDefined();
      expect((sendCall![0] as SendMessageCommand).input).toMatchObject({
        MessageBody: JSON.stringify({ key: "value" }),
        QueueUrl: baseConfig.queueUrl,
      });
      expect(id).toBe("msg-abc-123");
    });

    it("should spread extra options into the SendMessageCommand", async () => {
      await adapter.start();
      mockClientSend.mockResolvedValueOnce({ MessageId: "msg-xyz" });

      await adapter.push(
        { key: "value" },
        { MessageGroupId: "group-1", MessageDeduplicationId: "dedup-1" },
      );

      const sendCall = mockClientSend.mock.calls.find(
        (call) => call[0] instanceof SendMessageCommand,
      );
      expect((sendCall![0] as SendMessageCommand).input).toMatchObject({
        MessageDeduplicationId: "dedup-1",
        MessageGroupId: "group-1",
      });
    });

    it("should throw a descriptive error when send fails", async () => {
      await adapter.start();
      mockClientSend.mockRejectedValueOnce(new Error("SQS unavailable"));

      await expect(adapter.push({ key: "value" })).rejects.toThrowError(
        "Failed to push job to SQS queue: sqs-queue. Error: SQS unavailable",
      );
    });
  });

  describe("polling", () => {
    it("should call the handler and delete the message when a message is received", async () => {
      // Create the adapter first so we can reference it inside the mock
      const pollingAdapter = new SQSAdapter("sqs-queue", baseConfig);
      let sendCallCount = 0;
      mockClientSend.mockImplementation(async () => {
        sendCallCount++;
        if (sendCallCount === 1) {
          return {
            Messages: [
              { Body: '{"key":"polled"}', ReceiptHandle: "receipt-handle-1" },
            ],
          };
        }
        // After first receive + delete, stop the loop
        pollingAdapter["isPolling"] = false;
        return {};
      });

      await pollingAdapter.start();
      await waitFor();

      expect(baseConfig.handler).toHaveBeenCalledWith({ key: "polled" });

      const deleteCall = mockClientSend.mock.calls.find(
        (call) => call[0] instanceof DeleteMessageCommand,
      );
      expect(deleteCall).toBeDefined();
      expect((deleteCall![0] as DeleteMessageCommand).input).toMatchObject({
        QueueUrl: baseConfig.queueUrl,
        ReceiptHandle: "receipt-handle-1",
      });
    });

    it("should call onError when the handler throws during message processing", async () => {
      const onError = vi.fn();
      const errorAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        handler: vi.fn().mockRejectedValueOnce(new Error("handler error")),
        onError,
      });
      let sendCallCount = 0;

      mockClientSend.mockImplementation(async () => {
        sendCallCount++;
        if (sendCallCount === 1) {
          return {
            Messages: [
              { Body: '{"key":"value"}', ReceiptHandle: "receipt-handle-1" },
            ],
          };
        }
        errorAdapter["isPolling"] = false;
        return {};
      });

      await errorAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "handler error" }),
        expect.objectContaining({ ReceiptHandle: "receipt-handle-1" }),
      );
    });

    it("should call onError when ReceiveMessageCommand itself fails", async () => {
      const onError = vi.fn();
      const errorAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        onError,
      });
      let sendCallCount = 0;

      mockClientSend.mockImplementation(async () => {
        sendCallCount++;
        if (sendCallCount === 1) {
          throw new Error("SQS network error");
        }
        errorAdapter["isPolling"] = false;
        return { Messages: [] };
      });

      await errorAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "SQS network error" }),
      );
    });

    it("should not start a second polling loop if already polling", async () => {
      await adapter.start();
      // Calling startPolling again while isPolling=true should be a no-op
      adapter["startPolling"]();

      // Only the initial ReceiveMessageCommand should have been dispatched
      expect(mockClientSend).toHaveBeenCalledTimes(1);
    });
  });
});
