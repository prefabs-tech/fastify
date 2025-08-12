import { FastifyError, FastifyRequest, FastifyReply } from "fastify";

import type { StackFrame } from "stack-trace";

type ErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => void | Promise<void>;

interface ErrorHandlerOptions {
  preErrorHandler?: ErrorHandler;
  stackTrace?: boolean;
}

type ErrorResponse = {
  error?: string;
  code?: string;
  message: string;
  name: string;
  stack?: StackFrame[];
  statusCode: number;
};

export type { ErrorHandler, ErrorHandlerOptions, ErrorResponse };

export { type StackFrame } from "stack-trace";
