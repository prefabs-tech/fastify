import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import { QueueConfig } from "src/types/queue";

import { Queue } from ".";

class SQSQueue<T> extends Queue {
  private config: Required<Pick<QueueConfig, "sqsConfig">>;
  public client: SQSClient;
  private queueUrl: string;
  private isPooling: boolean = false;

  constructor(config: Required<Pick<QueueConfig, "name" | "sqsConfig">>) {
    super(config.name);

    this.config = config;
    this.client = new SQSClient(config.sqsConfig.clientConfig);
    this.queueUrl = config.sqsConfig.queueUrl;

    this.process(config.sqsConfig.handler);
  }

  getClient(): SQSClient {
    return this.client;
  }

  async process(handler: (data: T) => Promise<void>): Promise<void> {
    if (this.isPooling) {
      return;
    }

    this.isPooling = true;

    const pool = async () => {
      while (this.isPooling) {
        try {
          const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: this.config.sqsConfig.maxNumberOfMessages,
            WaitTimeSeconds: this.config.sqsConfig.waitTimeSeconds,
          });

          const response = await this.client.send(command);

          if (response.Messages && response.Messages.length > 0) {
            await Promise.all(
              response.Messages.map(async (message: Message) => {
                try {
                  const data = JSON.parse(message.Body!) as T;

                  await handler(data);

                  await this.client.send(
                    new DeleteMessageCommand({
                      QueueUrl: this.queueUrl,
                      ReceiptHandle: message.ReceiptHandle,
                    }),
                  );
                } catch (error) {
                  console.error(
                    `Error processing message from SQS queue: ${this.queueName}. Message ID: ${message.MessageId}. Error: ${(error as Error).message}`,
                  );
                }
              }),
            );
          }
        } catch (error) {
          console.error(
            `Error processing job from SQS queue: ${this.queueName}. Error: ${(error as Error).message}`,
          );
        }
      }
    };

    pool();
  }

  async push(data: T, options?: Record<string, unknown>): Promise<string> {
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

export default SQSQueue;
