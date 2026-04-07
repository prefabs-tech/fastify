import { FastifyReply, FastifyRequest } from "fastify";
import StackTracey from "stacktracey";

type ErrorHandler = (
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void> | void;

interface ErrorHandlerOptions {
  preErrorHandler?: ErrorHandler;
  stackTrace?: boolean;
}

type ErrorResponse = {
  code?: string;
  error?: string;
  message: string;
  name: string;
  stack?: StackTracey.Entry[];
  statusCode: number;
};

export type { ErrorHandler, ErrorHandlerOptions, ErrorResponse };
