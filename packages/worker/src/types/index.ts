import { CronJob } from "./cron";
import { QueueConfig } from "./queue";

export interface WorkerConfig {
  cronJobs?: CronJob[];
  queues?: QueueConfig[];
}

export * from "./cron";
export * from "./queue";
