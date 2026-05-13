import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SQSAdapter from "../../../queue/adapters/sqs";

const { mockClientDestroy, mockClientSend, MockSQSClient } = vi.hoisted(() => {
  const mockClientSend = vi.fn();
  const mockClientDestroy = vi.fn();
  const MockSQSClient = vi.fn().mockImplementation(() => ({
    destroy: mockClientDestroy,
    send: mockClientSend,
  }));

  return { mockClientDestroy, mockClientSend, MockSQSClient };
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

      expect(mockClientSend).toHaveBeenCalledWith(
        expect.any(ReceiveMessageCommand),
      );
    });

    it("should default WaitTimeSeconds to 20 (long-poll) when not provided", async () => {
      await adapter.start();

      const callArgument = mockClientSend.mock
        .calls[0][0] as ReceiveMessageCommand;
      expect(callArgument.input).toMatchObject({
        QueueUrl: baseConfig.queueUrl,
        WaitTimeSeconds: 20,
      });
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

    it("should allow the caller to override the default WaitTimeSeconds", async () => {
      const customAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        receiveMessageOptions: {
          QueueUrl: baseConfig.queueUrl,
          WaitTimeSeconds: 5,
        },
      });

      await customAdapter.start();

      const callArgument = mockClientSend.mock
        .calls[0][0] as ReceiveMessageCommand;
      expect(callArgument.input).toMatchObject({ WaitTimeSeconds: 5 });
    });
  });

  describe("shutdown", () => {
    it("should set isPolling to false and destroy the client", async () => {
      // Use an immediately-resolving send so the in-flight poll iteration
      // can complete (shutdown now awaits the in-flight poll before destroying).
      const shutdownAdapter = new SQSAdapter("sqs-queue", baseConfig);
      mockClientSend.mockImplementation(async () => ({}));

      await shutdownAdapter.start();
      await shutdownAdapter.shutdown();

      expect(shutdownAdapter["isPolling"]).toBe(false);
      expect(mockClientDestroy).toHaveBeenCalledOnce();
    });

    it("should not throw if called before start", async () => {
      await expect(adapter.shutdown()).resolves.not.toThrow();
    });

    it("should await the in-flight poll iteration before destroying the client", async () => {
      const events: string[] = [];
      let resolveInFlight: ((value: unknown) => void) | undefined;

      mockClientSend.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInFlight = resolve;
          }),
      );
      mockClientDestroy.mockImplementation(() => {
        events.push("destroy");
      });

      const drainAdapter = new SQSAdapter("drain-queue", baseConfig);
      await drainAdapter.start();

      const shutdownPromise = drainAdapter.shutdown();

      // Destroy must not have fired yet — the poll iteration is still in flight.
      expect(events).toEqual([]);

      events.push("resolve-in-flight");
      resolveInFlight?.({});

      await shutdownPromise;

      expect(events).toEqual(["resolve-in-flight", "destroy"]);
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
        { MessageDeduplicationId: "dedup-1", MessageGroupId: "group-1" },
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

      mockClientSend.mockImplementation(async () => {
        errorAdapter["isPolling"] = false;
        throw new Error("SQS network error");
      });

      await errorAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "SQS network error" }),
      );
    });

    it("wraps non-Error rejects from ReceiveMessage in an Error passed to onError", async () => {
      const onError = vi.fn();
      const stringErrorAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        onError,
      });

      mockClientSend.mockImplementation(async () => {
        stringErrorAdapter["isPolling"] = false;
        throw "plain-string-throw";
      });

      await stringErrorAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "plain-string-throw" }),
      );
    });

    it("processes multiple received messages concurrently in one batch", async () => {
      const handler = vi.fn().mockResolvedValue();
      const batchAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        handler,
      });
      let sendCallCount = 0;

      mockClientSend.mockImplementation(async () => {
        sendCallCount++;
        if (sendCallCount === 1) {
          return {
            Messages: [
              { Body: '{"a":1}', ReceiptHandle: "receipt-handle-a" },
              { Body: '{"b":2}', ReceiptHandle: "receipt-handle-b" },
            ],
          };
        }
        batchAdapter["isPolling"] = false;

        return {};
      });

      await batchAdapter.start();
      await waitFor(50);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({ a: 1 });
      expect(handler).toHaveBeenCalledWith({ b: 2 });

      const deleteCalls = mockClientSend.mock.calls.filter(
        (call) => call[0] instanceof DeleteMessageCommand,
      );
      expect(deleteCalls).toHaveLength(2);
    });

    it("wraps handler rejections that are not Error instances before onError", async () => {
      const onError = vi.fn();
      const badRejectAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        handler: vi.fn().mockRejectedValueOnce("not-an-error-object"),
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
        badRejectAdapter["isPolling"] = false;

        return {};
      });

      await badRejectAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "not-an-error-object",
        }),
        expect.objectContaining({ ReceiptHandle: "receipt-handle-1" }),
      );
    });

    it("should call onError with a parse error when message Body is not valid JSON", async () => {
      const onError = vi.fn();
      const parseAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        onError,
      });
      let sendCallCount = 0;

      mockClientSend.mockImplementation(async () => {
        sendCallCount++;
        if (sendCallCount === 1) {
          return {
            Messages: [{ Body: "not-json", ReceiptHandle: "receipt-handle-1" }],
          };
        }
        parseAdapter["isPolling"] = false;
        return {};
      });

      await parseAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Failed to parse SQS message body"),
        }),
        expect.objectContaining({ ReceiptHandle: "receipt-handle-1" }),
      );
      expect(baseConfig.handler).not.toHaveBeenCalled();
    });

    it("should call onError when the message Body is missing", async () => {
      const onError = vi.fn();
      const missingBodyAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        onError,
      });
      let sendCallCount = 0;

      mockClientSend.mockImplementation(async () => {
        sendCallCount++;
        if (sendCallCount === 1) {
          return {
            Messages: [{ ReceiptHandle: "receipt-handle-1" }],
          };
        }
        missingBodyAdapter["isPolling"] = false;
        return {};
      });

      await missingBodyAdapter.start();
      await waitFor();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Failed to parse SQS message body"),
        }),
        expect.objectContaining({ ReceiptHandle: "receipt-handle-1" }),
      );
    });

    it("should back off (sleep) between iterations after receive errors", async () => {
      const onError = vi.fn();
      const backoffAdapter = new SQSAdapter("sqs-queue", {
        ...baseConfig,
        onError,
      });

      const sendTimes: number[] = [];
      mockClientSend.mockImplementation(async () => {
        sendTimes.push(Date.now());
        if (sendTimes.length >= 2) {
          backoffAdapter["isPolling"] = false;
          return {};
        }
        throw new Error("transient");
      });

      await backoffAdapter.start();
      // Backoff base delay is 500ms; allow enough time for two iterations.
      await waitFor(900);

      expect(sendTimes.length).toBeGreaterThanOrEqual(2);
      // The second send should occur after the configured base backoff (500ms),
      // less a small fudge factor for scheduling jitter.
      expect(sendTimes[1] - sendTimes[0]).toBeGreaterThanOrEqual(450);
    });

    it("should not start a second polling loop if already polling", async () => {
      await adapter.start();
      adapter["startPolling"]();

      expect(mockClientSend).toHaveBeenCalledTimes(1);
    });
  });
});
