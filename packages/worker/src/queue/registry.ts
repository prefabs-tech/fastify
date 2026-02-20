import QueueProcessor from "./processor";

class QueueProcessorRegistry {
  public static queueProcessors: Map<string, QueueProcessor> = new Map();

  public static add(queueProcessor: QueueProcessor) {
    QueueProcessorRegistry.queueProcessors.set(
      queueProcessor.getName(),
      queueProcessor,
    );
  }

  public static get(queueName: string): QueueProcessor | undefined {
    return QueueProcessorRegistry.queueProcessors.get(queueName);
  }

  public static getAll(): QueueProcessor[] {
    return [...QueueProcessorRegistry.queueProcessors.values()];
  }

  public static has(queueName: string): boolean {
    return QueueProcessorRegistry.queueProcessors.has(queueName);
  }

  public static remove(queueName: string): void {
    QueueProcessorRegistry.queueProcessors.delete(queueName);
  }
}

export default QueueProcessorRegistry;
