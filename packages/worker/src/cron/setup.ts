import cron from "node-cron";

import { CronJob } from "src/types";

const setupCronJobs = (cronJobs: CronJob[]) => {
  if (cronJobs.length === 0) {
    return;
  }

  for (const job of cronJobs) {
    cron.schedule(job.expression, job.task, job.options);
  }
};

export default setupCronJobs;
