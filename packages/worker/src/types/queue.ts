import { QueueProvider } from "../enum";
import { BullMQAdapterConfig } from "../queue/adapters/bullmq";
import { SQSAdapterConfig } from "../queue/adapters/sqs";

export interface QueueConfig {
  bullmqConfig?: BullMQAdapterConfig;
  name: string;
  provider: QueueProvider;
  sqsConfig?: SQSAdapterConfig;
}
