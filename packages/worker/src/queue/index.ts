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

const queueRegistry = new Map<string, Queue>();

const registerQueue = (name: string, queue: Queue): void => {
  queueRegistry.set(name, queue);
};

const getQueue = (name: string): Queue | undefined => {
  return queueRegistry.get(name);
};

const addToQueue = async <T>(
  queueName: string,
  data: T,
  options?: Record<string, unknown>,
): Promise<string> => {
  const queue = getQueue(queueName);

  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  return queue.push(data, options);
};

export { Queue, registerQueue, addToQueue };
