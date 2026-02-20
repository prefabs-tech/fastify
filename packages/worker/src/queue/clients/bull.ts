import {
  Queue as BullQueue,
  Worker,
  Job,
  QueueOptions,
  WorkerOptions,
  JobsOptions,
} from "bullmq";

import BaseQueueClient from "./base";

export interface BullMQClientConfig {
  queueOptions: QueueOptions;
  workerOptions?: WorkerOptions;
  handler: (job: Job) => Promise<void>;
  onError?: (error: Error) => void;
  onFailed?: (job: Job, error: Error) => void;
}

class BullMqClient<Payload> extends BaseQueueClient {
  public queue: BullQueue;
  public worker?: Worker;
  private handler: (job: Job) => Promise<void>;
  private onError?: (error: Error) => void;
  private onFailed?: (job: Job, error: Error) => void;
  private queueOptions: QueueOptions;
  private workerOptions?: WorkerOptions;

  constructor(name: string, config: BullMQClientConfig) {
    super(name);

    this.queueOptions = config.queueOptions;
    this.workerOptions = {
      connection: config.queueOptions.connection,
      ...config.workerOptions,
    };
    this.handler = config.handler;
    this.onError = config.onError;
    this.onFailed = config.onFailed;
    this.queue = new BullQueue(this.queueName, this.queueOptions);
    this.process();
  }

  getClient(): BullQueue {
    return this.queue;
  }

  async push(data: Payload, options?: JobsOptions): Promise<string> {
    try {
      const job = await this.queue.add(this.queueName, data, options);

      return job.id!;
    } catch (error) {
      throw new Error(
        `Failed to push job to BullMQ queue: ${this.queueName}. Error: ${(error as Error).message}`,
      );
    }
  }

  process(): void {
    try {
      this.worker = new Worker(
        this.queueName,
        async (job: Job<Payload>) => {
          await this.handler(job);
        },
        this.workerOptions,
      );

      this.worker.on("error", (error) => {
        if (this.onError) {
          this.onError(error);
        }
      });

      this.worker.on("failed", (job, error) => {
        if (this.onFailed) {
          this.onFailed(job as Job<Payload>, error);
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
