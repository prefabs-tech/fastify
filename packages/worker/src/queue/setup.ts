import QueueProcessor from "./processor";
import QueueProcessorRegistry from "./registry";
import { QueueConfig } from "../types";

const setupQueueProcessors = (queueConfigs: QueueConfig[]) => {
  if (queueConfigs.length === 0) {
    return;
  }

  for (const queueConfig of queueConfigs) {
    const queueProcessor = new QueueProcessor(queueConfig);

    QueueProcessorRegistry.add(queueProcessor);
  }
};

export default setupQueueProcessors;
