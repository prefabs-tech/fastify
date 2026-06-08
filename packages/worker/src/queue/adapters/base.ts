abstract class QueueAdapter<Payload = unknown> {
  public queueName: string;

  constructor(name: string) {
    this.queueName = name;
  }

  abstract getClient(): unknown;
  abstract push(
    data: Payload,
    options?: Record<string, unknown>,
  ): Promise<string>;
  abstract shutdown(): Promise<void>;
  abstract start(): Promise<void>;
}

export default QueueAdapter;
