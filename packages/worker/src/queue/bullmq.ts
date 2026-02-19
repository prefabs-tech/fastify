import { Queue as BullQueue, Worker, Job, RedisOptions } from "bullmq";

import { QueueConfig } from "../types/queue";

import { Queue } from ".";

class BullMQQueue<T = unknown> extends Queue {
  private queue: BullQueue;
  private worker?: Worker;
  private connection: RedisOptions;

  constructor(config: Required<Pick<QueueConfig, "name" | "bullmqConfig">>) {
    super(config.name);

    this.connection = config.bullmqConfig.connection;
    this.queue = new BullQueue(this.queueName, {
      connection: this.connection,
      defaultJobOptions: config.bullmqConfig.defaultJobOptions,
    });

    this.process(config.bullmqConfig.handler, config.bullmqConfig.concurrency);
  }

  async push(data: T, options?: Record<string, unknown>): Promise<string> {
    try {
      const job = await this.queue.add(this.queueName, data, options);

      return job.id!;
    } catch (error) {
      throw new Error(
        `Failed to push job to BullMQ queue: ${this.queueName}. Error: ${(error as Error).message}`,
      );
    }
  }

  process(handler: (job: Job) => Promise<void>, concurrency = 1): void {
    try {
      this.worker = new Worker(
        this.queueName,
        async (job: Job) => {
          await handler(job);
        },
        {
          connection: this.connection,
          concurrency,
        },
      );

      this.worker.on("error", (error) => {
        console.error(
          `Error in BullMQ worker for queue: ${this.queueName}. Error: ${(error as Error).message}`,
        );
      });

      this.worker.on("failed", (job, error) => {
        console.error(
          `Job failed in BullMQ queue: ${this.queueName}. Job ID: ${job?.id}. Error: ${(error as Error).message}`,
        );
      });
    } catch (error) {
      throw new Error(
        `Failed to process jobs from BullMQ queue: ${this.queueName}. Error: ${(error as Error).message}`,
      );
    }
  }
}

export default BullMQQueue;
