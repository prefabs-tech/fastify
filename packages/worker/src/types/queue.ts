import { RedisOptions, Job } from "bullmq";

import { QueueProvider } from "../enum";

export interface QueueConfig {
  bullmqConfig?: {
    connection: RedisOptions;
    defaultJobOptions?: {
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
    };
  };
  handler: (job: Job) => Promise<void>;
  concurrency?: number;
  name: string;
  provider: QueueProvider;
}
