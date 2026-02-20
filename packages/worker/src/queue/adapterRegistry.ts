import QueueAdapter from "./adapters/base";

class AdapterRegistry {
  private adapters = new Map<string, QueueAdapter>();

  add(adapter: QueueAdapter): void {
    this.adapters.set(adapter.queueName, adapter);
  }

  get(name: string): QueueAdapter | undefined {
    return this.adapters.get(name);
  }

  getAll(): QueueAdapter[] {
    return [...this.adapters.values()];
  }

  has(name: string): boolean {
    return this.adapters.has(name);
  }

  remove(name: string): void {
    this.adapters.delete(name);
  }

  async shutdownAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.shutdown();
    }

    this.adapters.clear();
  }
}

export default AdapterRegistry;
