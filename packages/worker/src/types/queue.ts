import { RedisOptions } from "bullmq";

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
  name: string;
  provider: QueueProvider;
}
