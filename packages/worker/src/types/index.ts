import { CronJob } from "./cron";

export interface WorkerConfig {
  cronJobs?: CronJob[];
}
