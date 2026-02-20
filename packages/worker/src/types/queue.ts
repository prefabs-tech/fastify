import { QueueProvider } from "../enum";
import { BullMQClientConfig } from "../queue/clients/bull";
import { SQSQueueClientConfig } from "../queue/clients/sqs";

export interface QueueConfig {
  bullmqConfig?: BullMQClientConfig;
  name: string;
  provider: QueueProvider;
  sqsConfig?: SQSQueueClientConfig;
}
