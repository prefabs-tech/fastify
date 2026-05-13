import { QueueProvider } from "../enum";
import { QueueConfig } from "../types";
import { BullMQAdapter, QueueAdapter, SQSAdapter } from "./adapters";

const createQueueAdapter = <Payload = unknown>(
  config: QueueConfig<Payload>,
): QueueAdapter<Payload> => {
  switch (config.provider) {
    case QueueProvider.BULLMQ: {
      if (!config.bullmqConfig) {
        throw new Error(
          `BullMQ configuration is required for queue: ${config.name}`,
        );
      }

      return new BullMQAdapter<Payload>(config.name, config.bullmqConfig);
    }

    case QueueProvider.SQS: {
      if (!config.sqsConfig) {
        throw new Error(
          `SQS configuration is required for queue: ${config.name}`,
        );
      }

      return new SQSAdapter<Payload>(config.name, config.sqsConfig);
    }

    default: {
      throw new Error(`Unsupported queue provider: ${config.provider}`);
    }
  }
};

export default createQueueAdapter;
