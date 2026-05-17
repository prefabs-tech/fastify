# @prefabs.tech/fastify-slonik — LLM index

PostgreSQL via Slonik: connection pool, migrations plugin, and SQL helpers exposed on the Fastify instance for handlers and other plugins.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Register DB plugin** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)
- **Service API** → [src/__test__/service.test.ts](../../src/__test__/service.test.ts)
- **Migrations** → [src/__test__/migrate.test.ts](../../src/__test__/migrate.test.ts), [src/__test__/migrationPlugin.test.ts](../../src/__test__/migrationPlugin.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#slonik) → [EXAMPLES.md](./EXAMPLES.md) → [GUIDE.md](../../GUIDE.md) · [feature.md](../../feature.md) (human) → REFERENCE-linked sources/tests.

## Boundaries

Do not walk the entire `src/` tree; Slonik and migration code paths are large—use REFERENCE/EXAMPLES deep links.

| Capability | Notes |
|----------|-------|
| Database | Pool + query API |
| Migrations | Optional migration plugin |
| SQL helpers | See GUIDE and tests |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
