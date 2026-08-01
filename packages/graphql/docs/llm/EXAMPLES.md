# @prefabs.tech/fastify-graphql — task → file

Paths are relative to the package root (`packages/graphql/`).

| Task | Open first | Why |
|------|------------|-----|
| Register Mercurius plugin | [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts) | Default plugin setup |
| `buildContext` / request context | [src/__test__/context.spec.ts](../../src/__test__/context.spec.ts) | GraphQL context patterns |
| Base schema wiring | [src/__test__/baseSchema.test.ts](../../src/__test__/baseSchema.test.ts) | Shared schema behavior |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | Fastify registration |
