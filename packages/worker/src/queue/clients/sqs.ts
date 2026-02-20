import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  SendMessageCommand,
  SQSClient,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";

import BaseQueueClient from "./base";

export interface SQSQueueClientConfig {
  clientConfig: SQSClientConfig;
  handler: (data: unknown) => Promise<void>;
  receiveMessageOptions?: ReceiveMessageCommandInput;
  onError?: (error: Error, message?: Message) => void;
  queueUrl: string;
}

class SQSQueueClient<Payload> extends BaseQueueClient {
  private config: SQSQueueClientConfig;
  public client: SQSClient;
  private queueUrl: string;
  private isPooling: boolean = false;

  constructor(name: string, config: SQSQueueClientConfig) {
    super(name);

    this.config = config;
    this.client = new SQSClient(config.clientConfig);
    this.queueUrl = config.queueUrl;

    this.process(config.handler);
  }

  getClient(): SQSClient {
    return this.client;
  }

  async process(handler: (data: Payload) => Promise<void>): Promise<void> {
    if (this.isPooling) {
      return;
    }

    this.isPooling = true;

    const pool = async () => {
      while (this.isPooling) {
        try {
          const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            ...this.config.receiveMessageOptions,
          });

          const response = await this.client.send(command);

          if (response.Messages && response.Messages.length > 0) {
            await Promise.all(
              response.Messages.map(async (message: Message) => {
                try {
                  const data = JSON.parse(message.Body ?? "{}") as Payload;

                  await handler(data);

                  await this.client.send(
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
              }),
            );
          }
        } catch (error) {
          if (this.config.onError) {
            this.config.onError(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        }
      }
    };

    pool();
  }

  async push(
    data: Payload,
    options?: Record<string, unknown>,
  ): Promise<string> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(data),
        ...options,
      });

      const response = await this.client.send(command);

      return response.MessageId!;
    } catch (error) {
      throw new Error(
        `Failed to push job to SQS queue: ${this.queueName}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export default SQSQueueClient;
