# @prefabs.tech/fastify-config — task → file

Compact routes to runnable tests and sources. Paths are relative to the package root (`packages/config/`).

| Task | Open first | Why |
|------|------------|-----|
| Register plugin, `fastify.config` / `request.config` | [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts) | End-to-end registration and config access |
| Parse env / JSON config helpers | [src/__test__/parse.test.ts](../../src/__test__/parse.test.ts) | `parse()` and coercion behavior |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | Fastify registration |
