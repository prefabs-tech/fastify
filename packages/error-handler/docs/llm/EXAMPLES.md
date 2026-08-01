# @prefabs.tech/fastify-error-handler — task → file

Paths are relative to the package root (`packages/error-handler/`).

| Task | Open first | Why |
|------|------------|-----|
| Plugin registration, schema, `stackTrace`, sensible | [src/__test__/registration.test.ts](../../src/__test__/registration.test.ts) | Smallest registration story |
| `CustomError`, masking, stack traces | [src/__test__/errorHandling.test.ts](../../src/__test__/errorHandling.test.ts) | Response shape and `stackTrace` |
| `preErrorHandler` (short-circuit, errors) | [src/__test__/preErrorHandler.test.ts](../../src/__test__/preErrorHandler.test.ts) | Third-party hook behavior |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | `setErrorHandler` wiring |
