import { HttpError } from "@fastify/sensible";
import { FastifyReply, FastifyRequest } from "fastify";

import { parseStack, StackFrame } from "./httpError";

import type { ErrorResponse } from "./types";

export const errorHandler = (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { log: logger } = request;

  const isHttpError = error instanceof HttpError;

  if (isHttpError) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      logger.error(error);
    } else {
      logger.info(error);
    }

    const response: ErrorResponse = {
      code: error.code ?? "INTERNAL_ERROR",
      message: error.message,
      name: error.name,
      statusCode,
    };

    if (error.stack) {
      response.stack = parseStack(error.stack);
    }

    void reply.code(statusCode).send(response);

    return;
  }

  // Unhandled error
  logger.error(error);

  const response = {
    code: "INTERNAL_ERROR",
    message: error.message,
    name: error.name,
    stack: [] as StackFrame[],
    statusCode: 500,
  };

  if (error.stack) {
    response.stack = parseStack(error.stack);
  }

  void reply.code(500).send(response);
};
