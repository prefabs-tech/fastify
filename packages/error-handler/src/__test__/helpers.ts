import Fastify from "fastify";
import { MockInstance, vi } from "vitest";

import type { ErrorHandlerOptions } from "../index";

import errorHandlerPlugin from "../index";

export type FastifyInstance = ReturnType<typeof Fastify>;

export interface LogSpy {
  child: MockInstance;
  debug: MockInstance;
  error: MockInstance;
  fatal: MockInstance;
  info: MockInstance;
  level: string;
  silent: MockInstance;
  trace: MockInstance;
  warn: MockInstance;
}

export async function buildFastify(options: ErrorHandlerOptions = {}) {
  const fastify = Fastify({ logger: false });
  await fastify.register(errorHandlerPlugin, options);
  return fastify;
}

export function makeLogSpy(): LogSpy {
  const spy: LogSpy = {
    child: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    info: vi.fn(),
    level: "trace",
    silent: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
  };
  spy.child.mockImplementation(() => spy);
  return spy;
}
