import {
  Queue as BullQueue,
  Worker,
  Job,
  QueueOptions,
  WorkerOptions,
  JobsOptions,
} from "bullmq";

import QueueAdapter from "./base";

export interface BullMQAdapterConfig {
  queueOptions: QueueOptions;
  workerOptions?: WorkerOptions;
  handler: (job: Job) => Promise<void>;
  onError?: (error: Error) => void;
  onFailed?: (job: Job, error: Error) => void;
}

class BullMQAdapter<Payload> extends QueueAdapter {
  public queue?: BullQueue;
  public worker?: Worker;
  private config: BullMQAdapterConfig;
  private queueOptions: QueueOptions;
  private workerOptions: WorkerOptions;

  constructor(name: string, config: BullMQAdapterConfig) {
    super(name);

    this.config = config;
    this.queueOptions = config.queueOptions;
    this.workerOptions = {
      connection: config.queueOptions.connection,
      ...config.workerOptions,
    };
  }

  async start(): Promise<void> {
    this.queue = new BullQueue(this.queueName, this.queueOptions);
    this.worker = new Worker(
      this.queueName,
      async (job: Job<Payload>) => {
        await this.config.handler(job);
      },
      this.workerOptions,
    );

    this.worker.on("error", (error) => {
      if (this.config.onError) {
        this.config.onError(error);
      }
    });

    this.worker.on("failed", (job, error) => {
      if (this.config.onFailed) {
        this.config.onFailed(job as Job<Payload>, error);
      }
    });
  }

  async shutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  getClient(): BullQueue {
    return this.queue!;
  }

  async push(data: Payload, options?: JobsOptions): Promise<string> {
    try {
      const job = await this.queue!.add(this.queueName, data, options);

      return job.id!;
    } catch (error) {
      throw new Error(
        `Failed to push job to BullMQ queue: ${this.queueName}. Error: ${(error as Error).message}`,
      );
    }
  }
}

export default BullMQAdapter;
