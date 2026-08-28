# @prefabs.tech/fastify-slonik — task → file

Paths are relative to the package root (`packages/slonik/`). Prefer these before broad `src/` scans.

| Task | Open first | Why |
|------|------------|-----|
| Register DB plugin | [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts) | Default pool + decorators |
| Query service API | [src/__test__/service.test.ts](../../src/__test__/service.test.ts) | Service usage |
| Migrations (runner / plugin) | [src/__test__/migrate.test.ts](../../src/__test__/migrate.test.ts), [src/__test__/migrationPlugin.test.ts](../../src/__test__/migrationPlugin.test.ts) | Migration flows |
| SQL helpers | [src/__test__/sql.test.ts](../../src/__test__/sql.test.ts), [src/__test__/sqlFactory.test.ts](../../src/__test__/sqlFactory.test.ts) | SQL utilities |
| Filters / hooks | [src/__test__/filters.test.ts](../../src/__test__/filters.test.ts), [src/__test__/serviceWithHooks.test.ts](../../src/__test__/serviceWithHooks.test.ts) | Advanced usage |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | Fastify registration |
