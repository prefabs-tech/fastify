import { QueueProvider } from "../enum";
import { WorkerConfig } from "../types";
import BullMQQueue from "./bullmq";

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
          concurrency: queueConfig.concurrency,
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
