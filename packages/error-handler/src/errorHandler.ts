import { HttpError } from "@fastify/sensible";
import { FastifyReply, FastifyRequest } from "fastify";
import { STATUS_CODES } from "node:http";
import StackTracey from "stacktracey";

import type { ErrorHandlerOptions, ErrorResponse } from "./types";

import { CustomError } from "./utils/error";

const getHttpStatusText = (statusCode: number): string =>
  STATUS_CODES[statusCode] ?? "Internal Server Error";

function trySendDomainMappedError(
  error: Error,
  domainErrorStatusMap: ReadonlyMap<string, number> | undefined,
  reply: FastifyReply,
  logger: FastifyRequest["log"],
  isStackTraceEnabled: boolean,
  stack: StackTracey,
): boolean {
  const mappedStatusCode = domainErrorStatusMap?.get(error.name);

  if (mappedStatusCode === undefined) {
    return false;
  }

  if (mappedStatusCode >= 500) {
    logger.error(error);
  } else if (mappedStatusCode >= 400) {
    logger.info(error);
  } else {
    logger.error(error);
  }

  const response: ErrorResponse = {
    code: error instanceof CustomError ? error.code : undefined,
    error: getHttpStatusText(mappedStatusCode),
    message: error.message,
    name: error.name,
    statusCode: mappedStatusCode,
  };

  if (isStackTraceEnabled && error.stack) {
    response.stack = stack.items;
  }

  void reply.code(mappedStatusCode).send(response);

  return true;
}

export const errorHandler = (
  unknownError: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  options: ErrorHandlerOptions = {},
) => {
  const error =
    unknownError instanceof Error ? unknownError : new Error("UNKNOWN_ERROR");

  const { log: logger } = request;

  const isStackTraceEnabled = options.stackTrace || false;

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

  if (
    trySendDomainMappedError(
      error,
      options.domainErrorStatusMap,
      reply,
      logger,
      isStackTraceEnabled,
      stack,
    )
  ) {
    return;
  }

  let code = "INTERNAL_SERVER_ERROR";
  let message = "Server error, please contact support";

  if (error instanceof CustomError) {
    code = error.code || code;
    message = "Server has an error that is not handled, please contact support";
  }

  const response: ErrorResponse = {
    code: isStackTraceEnabled ? code : "INTERNAL_SERVER_ERROR",
    message: isStackTraceEnabled ? error.message : message,
    name: isStackTraceEnabled ? error.name : "Error",
    statusCode: 500,
  };

  if (isStackTraceEnabled && error.stack) {
    response.stack = stack.items;
  }

  logger.error(error);

  void reply.code(500).send(response);
};
