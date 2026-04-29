<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-error-handler — Features

## Plugin Registration

1. **Registers `@fastify/sensible` with fixed defaults** — adds `fastify.httpErrors` and `HttpError` support automatically; this package does not expose `@fastify/sensible` registration options.

2. **Adds `ErrorResponse` JSON schema** — registers the `ErrorResponse` schema (`$id: "ErrorResponse"`) with Fastify so routes can reference it in response schemas.

3. **`stackTrace` and `domainErrorStatusMap` decorators** — decorates the Fastify instance with `fastify.stackTrace: boolean` (default `false`) and `fastify.domainErrorStatusMap: Map<string, number>` built from the optional registration option (empty map when omitted). Each configured status code must be an integer in **`400`–`599`** or registration throws.

## Error Handler

4. **Global `setErrorHandler`** — installs a single error handler that catches all unhandled errors thrown from routes and plugins.

5. **Unknown error normalization** — non-`Error` values thrown (e.g. strings, null) are coerced to `new Error("UNKNOWN_ERROR")` before processing.

6. **HttpError branch** — errors that are `instanceof HttpError` (thrown via `fastify.httpErrors.*`) respond with the original status code, HTTP status text in `error`, and the original message and name.

7. **Optional `domainErrorStatusMap` branch** — when `error.name` exists as a key in the configured map, the error responds with that HTTP status, `error` (HTTP status text), `message`, `name`, and (for `CustomError`) `code`; **`stackTrace`** only adds the parsed `stack` field (it does not mask or replace these fields for mapped errors). Logging follows the same status-range rules as **severity-based logging** below.

8. **Non-mapped non-HttpError branch** — all other plain `Error`, `CustomError`, and subclass errors that are not matched by item 7 respond with status `500`.

9. **`CustomError` code extraction (unmapped)** — when the thrown error is `instanceof CustomError` and not handled by item 7, its `.code` is used in the response (only when `stackTrace: true`; otherwise `"INTERNAL_SERVER_ERROR"` is used).

10. **Error detail masking (`stackTrace: false`, unmapped only)** — for non-HttpErrors not handled by item 7, the response replaces message, name, and code with safe generic values:
   - Plain `Error`: message → `"Server error, please contact support"`, name → `"Error"`, code → `"INTERNAL_SERVER_ERROR"`
   - `CustomError`: message → `"Server has an error that is not handled, please contact support"`, name → `"Error"`, code → `"INTERNAL_SERVER_ERROR"`

11. **Severity-based logging** — `HttpError` instances and **`domainErrorStatusMap`** matches use status ranges (`5xx` logged at `error` level; `4xx` at `info`; below `400` at `error`). Non-mapped non-HttpErrors log at `error` level regardless of `stackTrace`.

## Stack Traces

12. **Optional stack trace in responses** — when `stackTrace: true`, error responses include a `stack` array of parsed `StackTracey.Entry` objects (file, line, column, callee) for both HttpErrors and non-HttpErrors.

13. **Stack trace gated on `error.stack` presence** — if the error has no `.stack` property, the `stack` field is omitted from the response even when `stackTrace: true`.

## Pre-Error Handler

14. **`preErrorHandler` option** — an optional async function called before the default handler, receiving `(error, request, reply)`. Useful for third-party library error handling (e.g. SuperTokens, Passport.js).

15. **Reply-sent short-circuit** — if `preErrorHandler` sends the reply (`reply.sent === true`), the default error handler is skipped entirely.

16. **Silent exception suppression in `preErrorHandler`** — if `preErrorHandler` throws, the exception is caught and discarded; the default error handler always runs after.

## Error Response Format

17. **Consistent `ErrorResponse` shape** — every error response conforms to:
    ```typescript
    {
      code?: string;              // error code (HttpErrors / mapped CustomError: from .code; unmapped: see items 9–10)
      error?: string;             // HTTP status text (HttpErrors and mapped domain errors)
      message: string;            // error message (masked for unmapped non-HttpErrors when stackTrace: false; mapped errors use the thrown message)
      name: string;               // error class name (masked for unmapped non-HttpErrors when stackTrace: false; mapped errors use the thrown name)
      stack?: StackTracey.Entry[] // parsed stack frames (only when stackTrace: true)
      statusCode: number;         // HTTP status code
    }
    ```

## Exports

18. **`errorHandler` function** — exported standalone for use outside the plugin registration context. The instance should still provide **`stackTrace`** (decorator). **`domainErrorStatusMap`** is optional: if absent, the domain-map branch is skipped (same as an empty map).

19. **`CustomError` class** — base class for application errors with a `code` string field.

20. **Type exports** — `ErrorHandlerOptions`, `ErrorHandler`, `ErrorResponse` exported for use in consuming code.

21. **Re-exports** — `HttpErrors` (from `@fastify/sensible`) and `StackTracey` (from `stacktracey`) re-exported for convenience.
