import { SQSClientConfig } from "@aws-sdk/client-sqs";
import { RedisOptions, Job } from "bullmq";

import { QueueProvider } from "../enum";

export interface QueueConfig<T = unknown> {
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
    handler: (job: Job) => Promise<void>;
  };
  sqsConfig?: {
    clientConfig: SQSClientConfig;
    queueUrl: string;
    handler: (data: T) => Promise<void>;
  };
  concurrency?: number;
  name: string;
  provider: QueueProvider;
}
