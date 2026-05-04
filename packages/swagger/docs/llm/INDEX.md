# @prefabs.tech/fastify-swagger — LLM index

OpenAPI spec exposure and Swagger UI wiring for Fastify, aligned with how routes and schemas are registered in consuming apps.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Registration + UI/spec (smallest story)** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#swagger) → [EXAMPLES.md](./EXAMPLES.md) → linked files from REFERENCE or EXAMPLES.

## Boundaries

Do not broad-scan `src/` unless docs are stale; UI and schema details live in GUIDE and tests linked from REFERENCE.

| Capability | Notes |
|----------|-------|
| OpenAPI | Spec generation / exposure |
| Swagger UI | Dev-facing documentation UI |
| Integration | Depends on app route/schema setup |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
