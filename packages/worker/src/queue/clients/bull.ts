import { Queue as BullQueue, Worker, Job, RedisOptions } from "bullmq";

import BaseQueueClient from "./base";
import { QueueConfig } from "../../types";

class BullMqClient<Payload> extends BaseQueueClient {
  public queue: BullQueue;
  public worker?: Worker;
  private connection: RedisOptions;

  constructor(config: Required<Pick<QueueConfig, "name" | "bullmqConfig">>) {
    super(config.name);

    this.connection = config.bullmqConfig.connection;
    this.queue = new BullQueue(this.queueName, {
      connection: this.connection,
      defaultJobOptions: config.bullmqConfig.defaultJobOptions,
    });

    this.process(
      config.bullmqConfig.handler,
      config.bullmqConfig.concurrency,
      config.bullmqConfig.onError,
      config.bullmqConfig.onFailed,
    );
  }

  getClient(): BullQueue {
    return this.queue;
  }

  async push(
    data: Payload,
    options?: Record<string, unknown>,
  ): Promise<string> {
    try {
      const job = await this.queue.add(this.queueName, data, options);

      return job.id!;
    } catch (error) {
      throw new Error(
        `Failed to push job to BullMQ queue: ${this.queueName}. Error: ${(error as Error).message}`,
      );
    }
  }

  process(
    handler: (job: Job<Payload>) => Promise<void>,
    concurrency = 1,
    onError?: (error: Error) => void,
    onFailed?: (job: Job, error: Error) => void,
  ): void {
    try {
      this.worker = new Worker(
        this.queueName,
        async (job: Job<Payload>) => {
          await handler(job);
        },
        {
          connection: this.connection,
          concurrency,
        },
      );

      this.worker.on("error", (error) => {
        if (onError) {
          onError(error);
        }
      });

      this.worker.on("failed", (job, error) => {
        if (onFailed) {
          onFailed(job as Job<Payload>, error);
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to process jobs from BullMQ queue: ${this.queueName}. Error: ${(error as Error).message}`,
      );
    }
  }
}

export default BullMqClient;
