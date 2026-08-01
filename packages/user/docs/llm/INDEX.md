# @prefabs.tech/fastify-user — LLM index

Authentication and user model: SuperTokens integration, roles, sessions, and user-related Fastify decorators/context used by APIs.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Primary integration test** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)
- **More behavior** → nested `**/__test__` under [src/](../../src/) only after the above
- **User creation / bootstrap admin / invitations / SuperTokens sign-up** → task → file table in [EXAMPLES.md](./EXAMPLES.md)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#user) → [EXAMPLES.md](./EXAMPLES.md) → plugin test, then nested tests only as needed.

## Boundaries

Do not recursively read all nested tests without cause; start with REFERENCE/EXAMPLES and the primary plugin test.

| Capability | Notes |
|----------|-------|
| SuperTokens | Plugin and session lifecycle |
| Roles / user | Decorators and types |
| Integration | Often depends on `config` and `graphql` |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md) · [FEATURES.md](../../FEATURES.md)
