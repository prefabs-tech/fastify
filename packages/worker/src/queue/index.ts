abstract class Queue<T = unknown> {
  protected queueName: string;

  constructor(name: string) {
    this.queueName = name;
  }

  abstract push(data: T, options?: Record<string, unknown>): Promise<string>;

  abstract process(
    handler: (data: T) => Promise<void>,
    concurrency?: number,
  ): void;
}

export { Queue };
