import {
  Queue as BullQueue,
  Job,
  JobsOptions,
  QueueOptions,
  Worker,
  WorkerOptions,
} from "bullmq";

import QueueAdapter from "./base";

export interface BullMQAdapterConfig<Payload = unknown> {
  handler: (job: Job<Payload>) => Promise<void>;
  onError?: (error: Error) => void;
  onFailed?: (job: Job<Payload>, error: Error) => void;
  queueOptions: QueueOptions;
  workerOptions?: WorkerOptions;
}

class BullMQAdapter<Payload = unknown> extends QueueAdapter<Payload> {
  public queue?: BullQueue;
  public worker?: Worker;
  private config: BullMQAdapterConfig<Payload>;
  private queueOptions: QueueOptions;
  private workerOptions: WorkerOptions;

  constructor(name: string, config: BullMQAdapterConfig<Payload>) {
    super(name);

    this.config = config;
    this.queueOptions = config.queueOptions;
    this.workerOptions = {
      connection: config.queueOptions.connection,
      ...config.workerOptions,
    };
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

  async shutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async start(): Promise<void> {
    this.queue = new BullQueue(this.queueName, this.queueOptions);
    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        await this.config.handler(job as Job<Payload>);
      },
      this.workerOptions,
    );

    this.worker.on("error", (error) => {
      if (this.config.onError) {
        this.config.onError(error);
      }
    });

    this.worker.on("failed", (job, error) => {
      if (this.config.onFailed && job) {
        this.config.onFailed(job as Job<Payload>, error);
      }
    });
  }
}

export default BullMQAdapter;
