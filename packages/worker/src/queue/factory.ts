import { QueueProvider } from "../enum";
import { QueueConfig } from "../types";
import { QueueAdapter, BullMQAdapter, SQSAdapter } from "./adapters";

const createQueueAdapter = (config: QueueConfig): QueueAdapter => {
  switch (config.provider) {
    case QueueProvider.BULLMQ: {
      if (!config.bullmqConfig) {
        throw new Error(
          `BullMQ configuration is required for queue: ${config.name}`,
        );
      }

      return new BullMQAdapter(config.name, config.bullmqConfig);
    }

    case QueueProvider.SQS: {
      if (!config.sqsConfig) {
        throw new Error(
          `SQS configuration is required for queue: ${config.name}`,
        );
      }

      return new SQSAdapter(config.name, config.sqsConfig);
    }

    default: {
      throw new Error(`Unsupported queue provider: ${config.provider}`);
    }
  }
};

export default createQueueAdapter;
