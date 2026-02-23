import { beforeEach, describe, expect, it, vi } from "vitest";

import AdapterRegistry from "../../queue/adapterRegistry";
import QueueAdapter from "../../queue/adapters/base";

class MockAdapter extends QueueAdapter {
  // eslint-disable-next-line unicorn/no-useless-undefined
  start = vi.fn().mockResolvedValue(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined
  shutdown = vi.fn().mockResolvedValue(undefined);
  getClient = vi.fn().mockReturnValue({});
  push = vi.fn().mockResolvedValue("job-id");
}

describe("AdapterRegistry", () => {
  let registry: AdapterRegistry;
  let adapterA: MockAdapter;
  let adapterB: MockAdapter;

  beforeEach(() => {
    registry = new AdapterRegistry();
    adapterA = new MockAdapter("queue-a");
    adapterB = new MockAdapter("queue-b");
  });

  describe("add / get", () => {
    it("should add an adapter and retrieve it by name", () => {
      registry.add(adapterA);

      expect(registry.get("queue-a")).toBe(adapterA);
    });

    it("should return undefined for an unregistered adapter name", () => {
      expect(registry.get("non-existent")).toBeUndefined();
    });

    it("should overwrite an existing adapter with the same name", () => {
      const replacement = new MockAdapter("queue-a");
      registry.add(adapterA);
      registry.add(replacement);

      expect(registry.get("queue-a")).toBe(replacement);
    });
  });

  describe("getAll", () => {
    it("should return all registered adapters", () => {
      registry.add(adapterA);
      registry.add(adapterB);

      expect(registry.getAll()).toHaveLength(2);
      expect(registry.getAll()).toContain(adapterA);
      expect(registry.getAll()).toContain(adapterB);
    });

    it("should return an empty array when no adapters are registered", () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("has", () => {
    it("should return true when adapter exists", () => {
      registry.add(adapterA);

      expect(registry.has("queue-a")).toBe(true);
    });

    it("should return false when adapter does not exist", () => {
      expect(registry.has("queue-a")).toBe(false);
    });
  });

  describe("remove", () => {
    it("should remove an adapter by name", () => {
      registry.add(adapterA);
      registry.remove("queue-a");

      expect(registry.has("queue-a")).toBe(false);
      expect(registry.get("queue-a")).toBeUndefined();
    });

    it("should not throw when removing a non-existent adapter", () => {
      expect(() => registry.remove("non-existent")).not.toThrow();
    });
  });

  describe("shutdownAll", () => {
    it("should call shutdown on all adapters", async () => {
      registry.add(adapterA);
      registry.add(adapterB);

      await registry.shutdownAll();

      expect(adapterA.shutdown).toHaveBeenCalledOnce();
      expect(adapterB.shutdown).toHaveBeenCalledOnce();
    });

    it("should clear all adapters after shutdown", async () => {
      registry.add(adapterA);
      registry.add(adapterB);

      await registry.shutdownAll();

      expect(registry.getAll()).toEqual([]);
    });

    it("should resolve without error when no adapters are registered", async () => {
      await expect(registry.shutdownAll()).resolves.not.toThrow();
    });
  });
});
