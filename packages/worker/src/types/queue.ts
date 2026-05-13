import { QueueProvider } from "../enum";
import { BullMQAdapterConfig } from "../queue/adapters/bullmq";
import { SQSAdapterConfig } from "../queue/adapters/sqs";

export interface QueueConfig<Payload = unknown> {
  bullmqConfig?: BullMQAdapterConfig<Payload>;
  name: string;
  provider: QueueProvider;
  sqsConfig?: SQSAdapterConfig<Payload>;
}
