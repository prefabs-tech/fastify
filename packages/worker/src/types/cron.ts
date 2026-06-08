import { TaskOptions } from "node-cron";

export interface CronJob {
  expression: string;
  options?: TaskOptions;
  task: () => Promise<void>;
}
