# @prefabs.tech/fastify-error-handler — LLM index

Central Fastify error handling: consistent error payloads, stack masking in production, and hooks such as `preParsing` integration for early failures.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin + global handler** → [src/plugin.ts](../../src/plugin.ts)
- **Registration, schema, `stackTrace`** → [src/__test__/registration.test.ts](../../src/__test__/registration.test.ts)
- **Masking / `CustomError` / stacks** → [src/__test__/errorHandling.test.ts](../../src/__test__/errorHandling.test.ts)
- **`preErrorHandler`** → [src/__test__/preErrorHandler.test.ts](../../src/__test__/preErrorHandler.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#error-handler) → [EXAMPLES.md](./EXAMPLES.md) → linked sources/tests from REFERENCE or EXAMPLES only.

## Boundaries

Do not scan full `src/` without going through REFERENCE/EXAMPLES first; nested helpers are implementation details.

| Capability | Notes |
|----------|-------|
| Global errors | Unified shape, logging alignment |
| Security | Stack traces hidden where configured |
| Hooks | Registration order matters—see GUIDE |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
