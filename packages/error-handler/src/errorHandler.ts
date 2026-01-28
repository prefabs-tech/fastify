import { STATUS_CODES } from "node:http";

import { HttpError } from "@fastify/sensible";
import { FastifyReply, FastifyRequest } from "fastify";
import StackTracey from "stacktracey";

import { CustomError } from "./utils/error";

import type { ErrorResponse } from "./types";

const getHttpStatusText = (statusCode: number): string =>
  STATUS_CODES[statusCode] ?? "Internal Server Error";

export const errorHandler = (
  unknownError: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const error =
    unknownError instanceof Error ? unknownError : new Error("UNKNOWN_ERROR");

  const { log: logger } = request;

  const isStackTraceEnabled = request.server.stackTrace || false;

  const stack = new StackTracey(error);

  const isHttpError = error instanceof HttpError;

  if (isHttpError) {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      logger.error(error);
    } else if (statusCode >= 400) {
      logger.info(error);
    } else {
      logger.error(error);
    }

    const response: ErrorResponse = {
      code: error.code,
      error: error.error || getHttpStatusText(statusCode),
      message: error.message,
      name: error.name,
      statusCode,
    };

    if (isStackTraceEnabled && error.stack) {
      response.stack = stack.items;
    }

    void reply.code(statusCode).send(response);

    return;
  }

  let message = "Server error, please contact support";
  let code = "INTERNAL_SERVER_ERROR";

  if (error instanceof CustomError) {
    code = error.code || code;
    message = "Server has an error that is not handled, please contact support";
  }

  if (isStackTraceEnabled && error.stack) {
    const response: ErrorResponse = {
      code: code,
      message: error.message,
      name: error.name,
      statusCode: 500,
      stack: stack.items,
    };

    logger.error(error);

    void reply.code(500).send(response);

    return;
  }

  // remove stack and message from error
  delete error.stack;
  error.message = message;

  // let fastify handle the error
  throw error;
};
