# 02 — `@prefabs.tech/fastify-error-handler`

Turns anything thrown anywhere in the application into one response shape, and
decides how much of it the client is allowed to see.

Peers: `fastify`, `fastify-plugin`. Bundles `@fastify/sensible` and
`stacktracey` as implementation dependencies.

## Registration

```typescript
import errorHandlerPlugin, {
  CustomError,
  type ErrorHandlerOptions,
} from "@prefabs.tech/fastify-error-handler";

await fastify.register(errorHandlerPlugin, {
  domainErrorStatusMap: new Map([["NotFoundError", 404]]),
  preErrorHandler: supertokensErrorHandler,
  stackTrace: config.env !== "production",
});
```

| Option | Type | Default | Effect |
|---|---|---|---|
| `stackTrace` | `boolean` | `false` | Includes parsed stack frames **and** unmasks message/name/code for unmapped errors |
| `preErrorHandler` | `(error, request, reply) => void \| Promise<void>` | — | Runs before the built-in handler |
| `domainErrorStatusMap` | `ReadonlyMap<string, number>` | empty | Maps `error.name` to an HTTP status |

`domainErrorStatusMap` is validated at registration. Every status must be an
integer in **400–599**, or registration throws:

```
domainErrorStatusMap: invalid HTTP status for "NotFoundError": 200 (expected integer 400-599)
```

Registration also registers `@fastify/sensible` (no options exposed), installs
the error handler with `setErrorHandler`, and adds the `ErrorResponse` schema.

## What it adds

| Surface | Value |
|---|---|
| `fastify.httpErrors` | the `@fastify/sensible` helpers |
| `ErrorResponse` schema | `$id: "ErrorResponse"`, referenced as `$ref: "ErrorResponse#"` |

Every route schema in every sibling package references that `$ref`. Registering
one of those packages without this one fails at boot with an unresolved
reference — and in tests you must call `fastify.addSchema(errorResponseSchema)`
on the instance for the same reason.

## The response shape

```typescript
{
  code?: string;               // error code
  error?: string;              // HTTP status text
  message: string;
  name: string;
  stack?: StackTracey.Entry[]; // only when stackTrace: true and error.stack exists
  statusCode: number;
}
```

## Resolution order

A thrown value is resolved in exactly this order.

**0. Normalisation.** Anything that is not an `Error` — a string, `null`, an
object — becomes `new Error("UNKNOWN_ERROR")` first.

**1. `preErrorHandler`**, if configured. If it sends the reply
(`reply.sent === true`), processing stops there. If it *throws*, the exception
is caught and discarded and processing continues.

**2. `HttpError`** — anything thrown via `fastify.httpErrors.*`. Responds with
the original status code, the HTTP status text in `error`, and the original
`message`, `name`, and `code`. Nothing is masked, at any `stackTrace` setting.

**3. `domainErrorStatusMap`** — when `error.name` is a key in the map. Responds
with the mapped status, HTTP status text in `error`, the thrown `message` and
`name`, and, for a `CustomError`, its `code`. Again nothing is masked;
`stackTrace` only adds the `stack` field.

**4. Everything else** — status `500`, and this is the only branch that masks:

| | `stackTrace: true` | `stackTrace: false` |
|---|---|---|
| `Error` | real `message`, `name`, `code: "INTERNAL_SERVER_ERROR"` | `"Server error, please contact support"`, `"Error"`, `"INTERNAL_SERVER_ERROR"` |
| `CustomError` | real `message`, `name`, real `.code` | `"Server has an error that is not handled, please contact support"`, `"Error"`, `"INTERNAL_SERVER_ERROR"` |

The practical consequence: **a `CustomError` thrown from a service reaches the
client as an opaque 500 unless you map its `name` in `domainErrorStatusMap`.**
Error codes defined by the sibling packages (`ERROR_CODES.FILE_NOT_FOUND`,
`ERROR_CODES.USER_ALREADY_EXISTS`, and the rest) are only visible to clients in
production if you either map them or convert them in a handler.

### Logging severity

`HttpError` and mapped domain errors log by status range — `5xx` at `error`,
`4xx` at `info`, below `400` at `error`. Everything in branch 4 logs at `error`
regardless of `stackTrace`.

## `CustomError`

```typescript
export class CustomError extends Error {
  public code?: string;
  constructor(message: string, code?: string);
}
```

`name` is set to the constructor name, so it survives logging and works as a
`domainErrorStatusMap` key. The prototype is restored with
`Object.setPrototypeOf`, so `instanceof CustomError` and `instanceof Error`
both hold — including across subclasses:

```typescript
class NotFoundError extends CustomError {}
// error.name === "NotFoundError" → map it to 404
```

## Exports

| Export | Kind |
|---|---|
| `default` | the plugin |
| `errorHandler` | the handler function standalone — `(error, request, reply, options?)` |
| `CustomError` | class |
| `HttpErrors` | type, re-exported from `@fastify/sensible` |
| `StackTracey` | default re-export from `stacktracey` |
| `ErrorHandler`, `ErrorHandlerOptions`, `ErrorResponse` | types |

`errorHandler` is exported for use outside a plugin context; pass `stackTrace`
and `domainErrorStatusMap` in the fourth argument. With no map supplied, the
domain branch is skipped exactly as an empty map would skip it.
