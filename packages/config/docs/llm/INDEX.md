# @prefabs.tech/fastify-config — LLM index

Typed Fastify configuration: `fastify.config` / `request.config` from env and optional JSON, with Ajv-backed schema validation and a small `parse()` helper for env coercion.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin registration** → [src/plugin.ts](../../src/plugin.ts)
- **Register + inject (smallest story)** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)
- **Parse / env helpers** → [src/__test__/parse.test.ts](../../src/__test__/parse.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#config) → [EXAMPLES.md](./EXAMPLES.md) → open only paths linked from REFERENCE or EXAMPLES (not a full `src/` scan).

## Boundaries

Do not scan all of `src/` unless REFERENCE or EXAMPLES links are missing or clearly stale; prefer tests after those links.

| Capability | Notes |
|----------|-------|
| Instance + request config | `ApiConfig`, hostname helper |
| Parsing | `parse()` for env values |
| Validation | Schema + Ajv at plugin boundary |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
