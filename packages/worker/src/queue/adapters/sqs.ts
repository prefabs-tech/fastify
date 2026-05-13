import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  SendMessageCommand,
  SQSClient,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";

import QueueAdapter from "./base";

export interface SQSAdapterConfig<Payload = unknown> {
  clientConfig: SQSClientConfig;
  handler: (data: Payload) => Promise<void>;
  onError?: (error: Error, message?: Message) => void;
  queueUrl: string;
  receiveMessageOptions?: ReceiveMessageCommandInput;
}

const DEFAULT_WAIT_TIME_SECONDS = 20;
const POLL_ERROR_BASE_DELAY_MS = 500;
const POLL_ERROR_MAX_DELAY_MS = 8000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

class SQSAdapter<Payload = unknown> extends QueueAdapter<Payload> {
  public client?: SQSClient;
  private config: SQSAdapterConfig<Payload>;
  private isPolling: boolean = false;
  private pollPromise?: Promise<void>;
  private queueUrl: string;

  constructor(name: string, config: SQSAdapterConfig<Payload>) {
    super(name);

    this.config = config;
    this.queueUrl = config.queueUrl;
  }

  getClient(): SQSClient {
    return this.client!;
  }

  async push(
    data: Payload,
    options?: Record<string, unknown>,
  ): Promise<string> {
    try {
      const command = new SendMessageCommand({
        MessageBody: JSON.stringify(data),
        QueueUrl: this.queueUrl,
        ...options,
      });

      const response = await this.client!.send(command);

      return response.MessageId!;
    } catch (error) {
      throw new Error(
        `Failed to push job to SQS queue: ${this.queueName}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async shutdown(): Promise<void> {
    this.isPolling = false;

    // Wait for the in-flight poll iteration to finish before destroying the
    // underlying client. This avoids "client destroyed" errors from in-flight
    // SDK calls and gives in-progress handlers a chance to complete.
    if (this.pollPromise) {
      try {
        await this.pollPromise;
      } catch {
        // Errors are already surfaced via onError inside the poll loop.
      }
    }

    this.client?.destroy();
  }

  async start(): Promise<void> {
    this.client = new SQSClient(this.config.clientConfig);
    this.startPolling();
  }

  private computeBackoffMs(attempt: number): number {
    const exponential = POLL_ERROR_BASE_DELAY_MS * 2 ** (attempt - 1);
    const capped = Math.min(exponential, POLL_ERROR_MAX_DELAY_MS);
    const jitter = Math.random() * capped * 0.25;

    return capped + jitter;
  }

  private async poll(): Promise<void> {
    let consecutiveErrors = 0;

    while (this.isPolling) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          WaitTimeSeconds: DEFAULT_WAIT_TIME_SECONDS,
          ...this.config.receiveMessageOptions,
        });

        const response = await this.client!.send(command);
        consecutiveErrors = 0;

        if (response.Messages && response.Messages.length > 0) {
          await Promise.all(
            response.Messages.map((message: Message) =>
              this.processMessage(message),
            ),
          );
        }
      } catch (error) {
        consecutiveErrors++;
        if (this.config.onError) {
          this.config.onError(
            error instanceof Error ? error : new Error(String(error)),
          );
        }

        if (this.isPolling) {
          await sleep(this.computeBackoffMs(consecutiveErrors));
        }
      }
    }
  }

  private async processMessage(message: Message): Promise<void> {
    let data: Payload;

    try {
      if (message.Body === undefined || message.Body === null) {
        throw new Error("SQS message has no Body");
      }

      data = JSON.parse(message.Body) as Payload;
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(
          new Error(
            `Failed to parse SQS message body: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
          message,
        );
      }

      return;
    }

    try {
      await this.config.handler(data);

      await this.client!.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(
          error instanceof Error ? error : new Error(String(error)),
          message,
        );
      }
    }
  }

  private startPolling(): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    this.pollPromise = this.poll();
  }
}

export default SQSAdapter;
