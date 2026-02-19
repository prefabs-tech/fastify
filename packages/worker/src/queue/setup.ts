import { QueueProvider } from "../enum";
import { WorkerConfig } from "../types";
import BullMQQueue from "./bullmq";
import SQSQueue from "./sqs";

import { registerQueue } from ".";

const setupQueues = (config: WorkerConfig) => {
  if (!config.queues || config.queues.length === 0) {
    return;
  }

  const { queues } = config;

  for (const queueConfig of queues) {
    switch (queueConfig.provider) {
      case QueueProvider.BULLMQ: {
        if (!queueConfig.bullmqConfig) {
          throw new Error(
            `BullMQ configuration is required for queue: ${queueConfig.name}`,
          );
        }

        const queue = new BullMQQueue({
          name: queueConfig.name,
          bullmqConfig: queueConfig.bullmqConfig,
        });

        registerQueue(queueConfig.name, queue);

        break;
      }

      case QueueProvider.SQS: {
        if (!queueConfig.sqsConfig) {
          throw new Error(
            `SQS configuration is required for queue: ${queueConfig.name}`,
          );
        }

        const queue = new SQSQueue({
          name: queueConfig.name,
          sqsConfig: queueConfig.sqsConfig,
        });

        registerQueue(queueConfig.name, queue);

        break;
      }
      default: {
        throw new Error(`Unsupported queue provider: ${queueConfig.provider}`);
      }
    }
  }
};

export default setupQueues;
