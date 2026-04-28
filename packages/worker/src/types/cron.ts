import { TaskOptions } from "node-cron";

export interface CronJob {
  expression: string;
  task: () => Promise<void>;
  options?: TaskOptions;
}
