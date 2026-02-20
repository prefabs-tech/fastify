import { setupCronJobs } from "../cron";
import { setupQueueProcessors } from "../queue";
import { CronJob, QueueConfig } from "../types";

const initializeCronJobs = async (cronConfigs?: CronJob[]) => {
  if (!cronConfigs) return;

  setupCronJobs(cronConfigs);
};

const initializeQueueProcessors = async (queueConfigs?: QueueConfig[]) => {
  if (!queueConfigs) return;

  setupQueueProcessors(queueConfigs);
};

export { initializeCronJobs, initializeQueueProcessors };
