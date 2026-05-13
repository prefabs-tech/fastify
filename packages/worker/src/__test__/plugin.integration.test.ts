import type { ApiConfig } from "@prefabs.tech/fastify-config";

import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import JobOrchestrator from "../jobOrchestrator";

describe("Worker plugin integration", () => {
  let api: ReturnType<typeof fastify> | undefined;

  afterEach(async () => {
    await api?.close().catch(() => {});
    api = undefined;
  });

  it("decorates Fastify with a live JobOrchestrator when worker config exists", async () => {
    const { default: plugin } = await import("../plugin");

    api = fastify({ logger: false });
    api.decorate("config", {
      worker: { cronJobs: [], queues: [] },
    } as ApiConfig as never);

    await api.register(plugin);
    await api.ready();

    expect(api.worker).toBeInstanceOf(JobOrchestrator);
    await api.close();
  });

  it("does not add the worker decorator when worker config is missing", async () => {
    const { default: plugin } = await import("../plugin");

    api = fastify({ logger: false });
    api.decorate("config", {} as ApiConfig as never);

    await api.register(plugin);
    await api.ready();

    expect("worker" in api).toBe(false);
  });
});
