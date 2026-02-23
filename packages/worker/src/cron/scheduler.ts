import cron, { ScheduledTask } from "node-cron";

import { CronJob } from "../types";

class CronScheduler {
  private tasks: ScheduledTask[] = [];

  schedule(job: CronJob): void {
    const task = cron.schedule(job.expression, job.task, job.options);

    this.tasks.push(task);
  }

  stopAll(): void {
    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
  }
}

export default CronScheduler;
