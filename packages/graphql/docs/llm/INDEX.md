# @prefabs.tech/fastify-graphql — LLM index

Mercurius GraphQL for Fastify: schema registration, `buildContext`, and shared base schema patterns for API graphs.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Register Mercurius** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)
- **GraphQL context** → [src/__test__/context.spec.ts](../../src/__test__/context.spec.ts)
- **Base schema** → [src/__test__/baseSchema.test.ts](../../src/__test__/baseSchema.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#graphql) → [EXAMPLES.md](./EXAMPLES.md) → context/schema tests linked from REFERENCE or EXAMPLES.

## Boundaries

Do not full-scan `src/` for resolvers; follow REFERENCE/EXAMPLES into `plugin.ts` and targeted tests first.

| Capability | Notes |
|----------|-------|
| Mercurius | Plugin registration and options |
| Context | Request-scoped GraphQL context |
| Base schema | Shared types / wiring |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
