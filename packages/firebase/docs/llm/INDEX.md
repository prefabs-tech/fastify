# @prefabs.tech/fastify-firebase — LLM index

Firebase Admin integration: app initialization, FCM, SQL-related factories, and GraphQL-oriented resolvers/helpers where applicable.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Register plugin** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)
- **Initialize app** → [src/__test__/initializeFirebase.test.ts](../../src/__test__/initializeFirebase.test.ts)
- **Service usage** → [src/__test__/service.test.ts](../../src/__test__/service.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#firebase) → [EXAMPLES.md](./EXAMPLES.md) → [GUIDE.md](../../GUIDE.md) · [FEATURES.md](../../FEATURES.md) (human) → linked tests/source from REFERENCE or EXAMPLES.

## Boundaries

Do not scan all of `src/` without REFERENCE/EXAMPLES; feature surface is split across modules.

| Capability | Notes |
|----------|-------|
| Init | Firebase app and options |
| Messaging | FCM usage patterns |
| Data layer | Factories and service surface |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
