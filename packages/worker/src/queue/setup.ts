import { WorkerConfig } from "../types";
import QueueProcessor from "./processor";
import QueueProcessorRegistry from "./registry";

const setupQueues = (config: WorkerConfig) => {
  if (!config.queues || config.queues.length === 0) {
    return;
  }

  const { queues } = config;

  for (const queueConfig of queues) {
    const queueProcessor = new QueueProcessor(queueConfig);

    QueueProcessorRegistry.add(queueProcessor);
  }
};

export default setupQueues;
