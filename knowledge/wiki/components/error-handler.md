---
type: Component
title: fastify-error-handler
description: The package that installs @fastify/sensible, the root error handler with response masking and a domain-error status map, the shared ErrorResponse JSON schema, and the CustomError class.
tags: [errors, error-handler, sensible, custom-error, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: plugin
    resource: repo://packages/error-handler/src/plugin.ts#L11-L72
    title: Plugin registration and domain map validation
  - id: handler
    resource: repo://packages/error-handler/src/errorHandler.ts#L10-L131
    title: errorHandler
  - id: custom-error
    resource: repo://packages/error-handler/src/utils/error.ts#L1-L13
    title: CustomError
  - id: schema
    resource: repo://packages/error-handler/src/utils/errorSchema.ts#L1-L19
    title: ErrorResponse schema
  - id: types
    resource: repo://packages/error-handler/src/types.ts#L4-L25
    title: Options and response types
  - id: index
    resource: repo://packages/error-handler/src/index.ts#L1-L19
    title: Exports
  - id: pkg-scripts
    resource: repo://packages/error-handler/package.json#L25-L31
    title: Package scripts (no test script)
  - id: registration-test
    resource: repo://packages/error-handler/src/__test__/registration.test.ts#L8-L67
    title: Registration tests
  - id: readme
    resource: repo://packages/error-handler/README.md
    title: README (register before routes)
  - id: commit-stacktracey
    resource: repo://packages/error-handler/src/errorHandler.ts
    title: "Commit 05cdb033, 2025-08-13: replace stack-trace package with stacktracey to support commonjs (#1009)"
---

# fastify-error-handler

**Responsibility:** one consistent error response shape for the whole app, safe by default.

## What registering it does
1. Validates `domainErrorStatusMap`. Every value must be a safe integer from 400 to 599; otherwise registration throws `domainErrorStatusMap: invalid HTTP status for "<name>"`.[^plugin]
2. Registers `@fastify/sensible`, which provides `fastify.httpErrors`. Other packages call `request.server.httpErrors.*` and `fastify.httpErrors.*`.
3. `setErrorHandler(async (error, request, reply) => ...)`:
   - If `preErrorHandler` is set, it is awaited first. **Exceptions it throws are swallowed.**
   - If it sent the reply, processing stops.
   - Otherwise `errorHandler(...)` runs.[^plugin]
4. `addSchema(errorSchema)` registers `$id: "ErrorResponse"`, which route schemas across the repo reference as `ErrorResponse#`.[^schema]

The README says to register it **before all routes and other plugins**.[^readme]

## Mapping
| Input | Status | Log level | Body |
|-------|--------|-----------|------|
| `HttpError` | `statusCode` or 500 | error if ≥500, info if 4xx | `{ code, error, message, name, statusCode }` |
| `error.name` found in `domainErrorStatusMap` | mapped | same rule | `{ code (CustomError only), error: status text, message, name, statusCode }` |
| any other `Error` | 500 | error | masked (below) |
| non-`Error` thrown value | coerced to `new Error("UNKNOWN_ERROR")` first | | |

With `stackTrace: false` (the default), a 500 returns `code: "INTERNAL_SERVER_ERROR"`, `name: "Error"`, and one of two fixed messages: "Server error, please contact support", or the "not handled" variant for `CustomError`. The real message, name and `CustomError.code` are returned **only** when `stackTrace: true`, which also adds parsed stack frames.[^handler]

## `CustomError`
`new CustomError(message, code?)` sets `name = this.constructor.name` and fixes the prototype chain. Subclasses therefore keep their own class name, and that name is what `domainErrorStatusMap` matches on.[^custom-error] Packages throw `CustomError` with `ERROR_CODES.*` constants for domain failures.

## Exports
The default plugin, `errorHandler` (usable standalone), `CustomError`, `StackTracey`, and the types `ErrorHandler`, `ErrorHandlerOptions`, `ErrorResponse`, `HttpErrors`.[^index][^types]

## Interplay with SuperTokens
The user package installs its own SuperTokens error handler unless `supertokens.setErrorHandler === false`. The documented pairing is to disable that and pass `supertokensErrorHandler` as `preErrorHandler`. See [Plugin registration order](../architecture/plugin-registration-order.md#two-root-error-handlers).

## Quirks
- `options.stackTrace ||= options.stackTrace || false` **mutates the options object you passed in**, as does the `domainErrorStatusMap` normalisation.[^plugin]
- **This package has no `test` script.**[^pkg-scripts] `turbo run test` skips it, so its ten files under `src/__test__/` run neither in `pnpm test` nor in CI. See [Test suite workflow](../ci/test-suite-workflow.md).
- `stack-trace` was replaced by `stacktracey` for CommonJS compatibility.[^commit-stacktracey]

## Tests
Registration, masking, HTTP errors, domain status map, logging, `preErrorHandler`, stack trace.[^registration-test] Run them directly with `pnpm --filter @prefabs.tech/fastify-error-handler exec vitest run`.

## Open question
- Is the missing `test` script intentional, for example a known failure, or an oversight?

[^plugin]: `buildDomainErrorStatusMap` L14-39; handler wiring L53-67; `addSchema` L69.
[^schema]: `additionalProperties: true` on both the object and the stack items.
[^handler]: `canSendDomainMappedError` L13-50; masking L110-131.
[^custom-error]: `Object.setPrototypeOf(this, new.target.prototype)`.
[^index]: L9-19.
[^types]: `ErrorHandlerOptions { domainErrorStatusMap?, preErrorHandler?, stackTrace? }`.
[^readme]: README line 75.
[^pkg-scripts]: The scripts are build, lint, lint:fix, sort-package, typecheck.
[^registration-test]: Includes "throws when domainErrorStatusMap has invalid HTTP status".
[^commit-stacktracey]: Commit 05cdb033.
