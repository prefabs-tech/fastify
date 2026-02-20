import { CronScheduler } from "./cron";
import { AdapterRegistry, createQueueAdapter } from "./queue";
import { WorkerConfig } from "./types";

class Worker {
  public readonly cron: CronScheduler;
  public readonly adapters: AdapterRegistry;
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.cron = new CronScheduler();
    this.adapters = new AdapterRegistry();
  }

  async start(): Promise<void> {
    if (this.config.cronJobs) {
      for (const job of this.config.cronJobs) {
        this.cron.schedule(job);
      }
    }

    if (this.config.queues) {
      for (const queueConfig of this.config.queues) {
        const adapter = createQueueAdapter(queueConfig);

        await adapter.start();
        this.adapters.add(adapter);
      }
    }
  }

  async shutdown(): Promise<void> {
    this.cron.stopAll();
    await this.adapters.shutdownAll();
  }
}

export default Worker;
