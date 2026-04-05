<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-error-handler — Features

## Plugin Registration

1. **Registers `@fastify/sensible`** — adds `fastify.httpErrors` and `HttpError` support automatically.

2. **Adds `ErrorResponse` JSON schema** — registers the `ErrorResponse` schema (`$id: "ErrorResponse"`) with Fastify so routes can reference it in response schemas.

3. **`stackTrace` decorator** — decorates the Fastify instance with `fastify.stackTrace: boolean`, defaulting to `false`.

## Error Handler

4. **Global `setErrorHandler`** — installs a single error handler that catches all unhandled errors thrown from routes and plugins.

5. **Unknown error normalization** — non-`Error` values thrown (e.g. strings, null) are coerced to `new Error("UNKNOWN_ERROR")` before processing.

6. **HttpError branch** — errors that are `instanceof HttpError` (thrown via `fastify.httpErrors.*`) respond with the original status code, HTTP status text in `error`, and the original message and name.

7. **Non-HttpError branch** — all other errors (plain `Error`, `CustomError`, subclasses) always respond with status `500`.

8. **`CustomError` code extraction** — when the thrown error is `instanceof CustomError`, its `.code` is used in the response (only when `stackTrace: true`; otherwise `"INTERNAL_SERVER_ERROR"` is used).

9. **Error detail masking** (`stackTrace: false`) — for non-HttpErrors, the response replaces message, name, and code with safe generic values:
   - Plain `Error`: message → `"Server error, please contact support"`, name → `"Error"`, code → `"INTERNAL_SERVER_ERROR"`
   - `CustomError`: message → `"Server has an error that is not handled, please contact support"`, name → `"Error"`, code → `"INTERNAL_SERVER_ERROR"`

10. **Severity-based logging for HttpErrors** — `5xx` logged at `error` level; `4xx` logged at `info` level; below `400` logged at `error` level.

11. **Non-HttpError always logged at `error` level** — regardless of `stackTrace` setting.

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
      code?: string;              // error code (HttpErrors: from .code; non-HttpErrors: custom or "INTERNAL_SERVER_ERROR")
      error?: string;             // HTTP status text (HttpErrors only)
      message: string;            // error message (masked for non-HttpErrors when stackTrace: false)
      name: string;               // error class name (masked to "Error" for non-HttpErrors when stackTrace: false)
      stack?: StackTracey.Entry[] // parsed stack frames (only when stackTrace: true)
      statusCode: number;         // HTTP status code
    }
    ```

## Exports

18. **`errorHandler` function** — exported standalone for use outside the plugin registration context.

19. **`CustomError` class** — base class for application errors with a `code` string field.

20. **Type exports** — `ErrorHandlerOptions`, `ErrorHandler`, `ErrorResponse` exported for use in consuming code.

21. **Re-exports** — `HttpErrors` (from `@fastify/sensible`) and `StackTracey` (from `stacktracey`) re-exported for convenience.
