import { Message, SQSClientConfig } from "@aws-sdk/client-sqs";
import { RedisOptions, Job } from "bullmq";

import { QueueProvider } from "../enum";

export interface QueueConfig<T = unknown> {
  bullmqConfig?: {
    concurrency?: number;
    connection: RedisOptions;
    defaultJobOptions?: {
      attempts?: number;
      backoff?: {
        delay: number;
        type: string;
      };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
    };
    handler: (job: Job) => Promise<void>;
    onError?: (error: Error) => void;
    onFailed?: (job: Job, error: Error) => void;
  };
  name: string;
  provider: QueueProvider;
  sqsConfig?: {
    clientConfig: SQSClientConfig;
    handler: (data: T) => Promise<void>;
    maxNumberOfMessages?: number;
    onError?: (error: Error, message?: Message) => void;
    queueUrl: string;
    waitTimeSeconds?: number;
  };
}
