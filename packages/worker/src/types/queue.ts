import { SQSClientConfig } from "@aws-sdk/client-sqs";
import { RedisOptions, Job } from "bullmq";

import { QueueProvider } from "../enum";

export interface QueueConfig<T = unknown> {
  bullmqConfig?: {
    connection: RedisOptions;
    concurrency?: number;
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
  name: string;
  provider: QueueProvider;
  sqsConfig?: {
    clientConfig: SQSClientConfig;
    handler: (data: T) => Promise<void>;
    maxNumberOfMessages: number;
    waitTimeSeconds: number;
    queueUrl: string;
  };
}
