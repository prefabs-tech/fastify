import { QueueProvider } from "../enum";
import { BaseQueueClient, BullMQQueueClient, SQSQueueClient } from "./clients";
import { QueueConfig } from "../types/queue";

class QueueProcessor {
  private queueClient: BaseQueueClient;

  constructor(config: QueueConfig) {
    this.queueClient = this.initializeQueueClient(config);
  }

  protected initializeQueueClient(config: QueueConfig) {
    let queueClient: BaseQueueClient;

    switch (config.provider) {
      case QueueProvider.BULLMQ: {
        if (!config.bullmqConfig) {
          throw new Error(
            `BullMQ configuration is required for queue: ${config.name}`,
          );
        }

        queueClient = new BullMQQueueClient(config.name, config.bullmqConfig);

        break;
      }

      case QueueProvider.SQS: {
        if (!config.sqsConfig) {
          throw new Error(
            `SQS configuration is required for queue: ${config.name}`,
          );
        }

        queueClient = new SQSQueueClient(config.name, config.sqsConfig);

        break;
      }
      default: {
        throw new Error(`Unsupported queue provider: ${config.provider}`);
      }
    }

    return queueClient;
  }

  public getQueueClient() {
    return this.queueClient;
  }

  public getName() {
    return this.queueClient.queueName;
  }
}

export default QueueProcessor;
