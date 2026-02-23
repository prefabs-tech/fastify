abstract class QueueAdapter<Payload = unknown> {
  public queueName: string;

  constructor(name: string) {
    this.queueName = name;
  }

  abstract start(): Promise<void>;
  abstract shutdown(): Promise<void>;
  abstract getClient(): unknown;
  abstract push(
    data: Payload,
    options?: Record<string, unknown>,
  ): Promise<string>;
}

export default QueueAdapter;
