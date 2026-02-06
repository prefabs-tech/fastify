import cron from "node-cron";

import { WorkerConfig } from "src/types";

const setupCronJobs = (config: WorkerConfig) => {
  if (!config.cronJobs || config.cronJobs.length === 0) {
    return;
  }

  const { cronJobs } = config;

  for (const job of cronJobs) {
    cron.schedule(job.expression, job.task, job.options);
  }
};

export default setupCronJobs;
