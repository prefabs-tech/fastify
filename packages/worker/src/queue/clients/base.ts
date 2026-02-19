abstract class BaseQueueClient<Payload = unknown> {
  public queueName: string;

  constructor(name: string) {
    this.queueName = name;
  }

  abstract getClient(): Payload;

  abstract process(
    handler: (data: Payload) => Promise<void>,
    concurrency?: number,
  ): void;

  abstract push(
    data: Payload,
    options?: Record<string, unknown>,
  ): Promise<string>;
}

export default BaseQueueClient;
