import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import StackTracey from "stacktracey";

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
  stack?: StackTracey.Entry[];
  statusCode: number;
};

export type { ErrorHandler, ErrorHandlerOptions, ErrorResponse };
