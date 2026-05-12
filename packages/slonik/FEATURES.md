<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

## Plugin Registration

1. **Main plugin (default export)** — Registers as a Fastify 5 plugin (via `fastify-plugin`). Accepts `SlonikOptions` directly. When called with no options, falls back to `fastify.config.slonik` and logs a deprecation warning. Throws a descriptive error if neither source provides configuration.

2. **Idempotent decorator registration** — Checks `fastify.hasDecorator` and `fastify.hasRequestDecorator` before decorating, so the internal `fastifySlonik` plugin can be registered multiple times without conflict.

3. **Connection verification on startup** — After creating the pool, calls `pool.connect()` to verify the database is reachable. Logs success (`"Connected to Postgres DB"`) or error (`"Error happened while connecting to Postgres DB"`) and rethrows on failure.

4. **Auto-provisioned PostgreSQL extensions** — On startup, runs `CREATE EXTENSION IF NOT EXISTS` for `citext` and `unaccent` by default. Merges and deduplicates with any extensions listed in `options.extensions`.

5. **`migrationPlugin`** — Standalone Fastify plugin that runs SQL file migrations via `@prefabs.tech/postgres-migrations`. Applies the same config-fallback logic (direct options or `fastify.config.slonik`). Default migration directory is `"migrations"`.

## Fastify Decorators

6. **`fastify.slonik`** — Decorates the Fastify instance with a `Database` object `{ pool, connect, query }` wrapping the Slonik `DatabasePool`.

7. **`fastify.sql`** — Decorates the Fastify instance with slonik's `sql` tagged-template helper.

8. **`request.slonik`** — Decorates every `FastifyRequest` with the same `Database` object, populated via an `onRequest` hook.

9. **`request.sql`** — Decorates every `FastifyRequest` with the `sql` helper, populated via the same `onRequest` hook.

10. **`request.dbSchema`** — Decorates every `FastifyRequest` with an empty string (`""`). Consuming code sets this to support per-request schema routing.

## Module Augmentation

11. **`FastifyInstance` augmentation** — Extends `fastify`'s `FastifyInstance` interface with `slonik: Database` and `sql: typeof sql`.

12. **`FastifyRequest` augmentation** — Extends `fastify`'s `FastifyRequest` interface with `slonik: Database`, `sql: typeof sql`, and `dbSchema: string`.

13. **`ApiConfig` augmentation** — Extends `@prefabs.tech/fastify-config`'s `ApiConfig` interface with `slonik: SlonikConfig`.

## Client Configuration

14. **`createClientConfiguration` factory** — Builds a `ClientConfigurationInput` with opinionated defaults: `captureStackTrace: false`, `connectionRetryLimit: 3`, `connectionTimeout: 5000 ms`, `idleInTransactionSessionTimeout: 60000 ms`, `idleTimeout: 5000 ms`, `maximumPoolSize: 10`, `queryRetryLimit: 5`, `statementTimeout: 60000 ms`, `transactionRetryLimit: 5`. Caller-supplied `config` is shallow-merged on top.

15. **Built-in interceptor chain** — `fieldNameCaseConverter` (snake_case → camelCase via `humps.camelizeKeys`) and `resultParser` (Zod row validation) are always prepended to the interceptor list, before any optional or user-supplied interceptors.

16. **Optional query-logging interceptor** — Added to the chain (after built-in interceptors) when `options.queryLogging.enabled === true`. Uses `slonik-interceptor-query-logging`. Requires `ROARR_LOG=true` at runtime.

17. **User interceptors merged** — Interceptors in `clientConfiguration.interceptors` are appended after built-in and logging interceptors.

18. **Extended type parsers** — `createTypeParserPreset()` (slonik built-ins) plus `createBigintTypeParser()` (`int8` → `Number.parseInt`) are registered on every pool.

## Field Name Conversion

19. **Automatic snake_case → camelCase** — The `fieldNameCaseConverter` interceptor calls `humps.camelizeKeys()` on every query result row, so DB columns like `created_at` become `createdAt` in application code.

## Result Validation

20. **Zod row validation** — The `resultParser` interceptor validates each row against the Zod schema passed to `sql.type(...)`. Throws `SchemaValidationError` on failure. Passes rows through unchanged when no schema is attached to the query.

## Type Parsers

21. **`createBigintTypeParser`** — Exported factory returning a `DriverTypeParser` that maps the `int8` OID to `Number.parseInt`, preventing PostgreSQL `bigint` columns from being returned as strings.

## Database Creation

22. **`createDatabase` utility** — Exported function that creates a Slonik pool and wraps it in the `Database` interface `{ pool, connect, query }`.

## SQL Fragment Helpers

23. **`createFilterFragment`** — Builds a `FragmentSqlToken` from a `FilterInput`; returns an empty fragment when `filters` is `undefined`.

24. **`createLimitFragment`** — Builds `LIMIT n` or `LIMIT n OFFSET m` as a `FragmentSqlToken`.

25. **`createSortFragment`** — Builds `ORDER BY col [ASC|DESC] [, ...]` from a `SortInput[]`. Supports dot-notation keys, camelCase-to-snake_case conversion, and `unaccent(lower(...))` for accent/case-insensitive sorting.

26. **`createTableFragment`** — Builds a `FragmentSqlToken` referencing `schema.table` or just `table`.

27. **`createTableIdentifier`** — Builds an `IdentifierSqlToken` for `[schema, table]` or `[table]`.

28. **`createWhereFragment`** — Merges a `FilterInput`, additional `FragmentSqlToken[]`, and an optional `IdentifierSqlToken` into a single `WHERE … AND …` fragment, or an empty fragment when nothing applies. Strips any leading `WHERE` keyword from provided fragments to avoid duplication.

29. **`createWhereIdFragment`** — Builds a `WHERE id = $1` fragment.

30. **`isValueExpression`** — Type-guard that returns `true` for values usable as a Slonik `ValueExpression` (`null`, `string`, `number`, `boolean`, `Date`, `Buffer`, or a uniform array thereof).

## Filter System

31. **Filter operators** — `eq` (equals), `ct` (ILIKE `%value%`), `sw` (ILIKE `value%`), `ew` (ILIKE `%value`), `gt` (`>`), `gte` (`>=`), `lt` (`<`), `lte` (`<=`), `in` (comma-separated list), `bt` (BETWEEN, comma-separated bounds), `dwithin` (PostGIS geography radius, `"lat,lng,radius_m"`).

32. **`not` flag** — Adding `not: true` (or `"true"` / `"1"`) to any filter negates the condition (e.g., `!=`, `NOT IN`, `NOT BETWEEN`, `IS NOT NULL`).

33. **`insensitive` flag** — Adding `insensitive: true` wraps both field and value in `unaccent(lower(...))` for accent- and case-insensitive comparisons. Works with `eq`, `ct`, `sw`, `ew`, `gt`, `gte`, `lt`, `lte`, `in`, `bt`.

34. **NULL check via `value: "null"`** — When `operator: "eq"` and `value` is `"null"` or `"NULL"`, generates `IS NULL` or `IS NOT NULL` (with `not: true`).

35. **`in` operator validation** — Throws `Error("IN operator requires at least one value")` if the comma-separated list is empty.

36. **`bt` (between) operator validation** — Throws `Error("BETWEEN operator requires exactly two values")` if either bound is missing.

37. **Recursive AND/OR composition** — `FilterInput` can be `{ AND: FilterInput[] }` or `{ OR: FilterInput[] }` at any nesting depth. Empty arrays produce an empty fragment (no condition).

38. **`applyFiltersToQuery`** — Wraps `buildFilterFragment` output in a `WHERE` clause, or returns an empty fragment if there are no conditions.

## DefaultSqlFactory

39. **`DefaultSqlFactory` class** — Concrete `SqlFactory` implementation. Requires a static `TABLE` name on the subclass. Constructor accepts `config: ApiConfig`, `database: Database`, and optional `schema` string (defaults to `"public"`).

40. **Static defaults** — `LIMIT_DEFAULT = 20`, `LIMIT_MAX = 50`, `SORT_DIRECTION = "ASC"`, `SORT_KEY = "id"`.

41. **Config-driven pagination** — `limitDefault` and `limitMax` are read from `config.slonik.pagination.defaultLimit` / `maxLimit` when present, falling back to static defaults.

42. **Soft-delete support** — Protected `_softDeleteEnabled = false`. When set to `true`, `getDeleteSql` issues `UPDATE … SET deleted_at = NOW()` instead of `DELETE` (unless `force = true`). All read queries automatically append `deleted_at IS NULL`.

43. **Zod validation schema** — `validationSchema` property (default `z.any()`). All generated queries use `sql.type(validationSchema)` so rows are parsed by Zod on return.

44. **camelCase → snake_case column mapping** — `getCreateSql` and `getUpdateSql` call `humps.decamelize` on every key, so callers pass camelCase field names.

45. **`getAllSql`** — Generates `SELECT <fields> FROM <table> [WHERE …] [ORDER BY …]`. Narrows the Zod schema to requested fields when the factory schema is a `ZodObject`.

46. **`getCountSql`** — Generates `SELECT COUNT(*) FROM <table> [WHERE …]` validated with `z.object({ count: z.number() })`.

47. **`getCreateSql`** — Generates `INSERT INTO <table> (…) VALUES (…) RETURNING *`.

48. **`getDeleteSql`** — Generates `DELETE FROM <table> WHERE id = $1 RETURNING *` (or soft-delete UPDATE when enabled).

49. **`getFindByIdSql`** — Generates `SELECT * FROM <table> WHERE id = $1`.

50. **`getFindOneSql`** — Generates `SELECT * FROM <table> [WHERE …] [ORDER BY …] LIMIT 1`.

51. **`getFindSql`** — Generates `SELECT * FROM <table> [WHERE …] [ORDER BY …]`.

52. **`getListSql`** — Generates `SELECT * FROM <table> [WHERE …] [ORDER BY …] LIMIT n [OFFSET m]`. Limit is clamped to `limitMax`.

53. **`getUpdateSql`** — Generates `UPDATE <table> SET col = $1 [, …] WHERE id = $n RETURNING *`.

54. **`getAdditionalFilterFragments` hook** — Protected method returning `[]` by default; subclasses override to inject extra WHERE conditions into every read query.

55. **`getTableFragment` (deprecated)** — Returns `this.tableFragment`. Use the `tableFragment` getter directly.

## BaseService

56. **`BaseService` abstract class** — Generic `BaseService<T, C, U>` implementing `Service<T, C, U>`. Constructor accepts `config: ApiConfig`, `database: Database`, and optional `schema` string (defaults to `"public"`).

57. **Lazy factory instantiation** — The `SqlFactory` instance is created on first access of `this.factory`. Subclasses override `get sqlFactoryClass()` to supply a custom factory.

58. **`all(fields, sort?)`** — Fetches all rows with a restricted field set.

59. **`count(filters?)`** — Returns total row count, optionally filtered.

60. **`create(data)`** — Inserts one row and returns the created entity, or `undefined` if the DB returns nothing.

61. **`delete(id, force?)`** — Deletes (or soft-deletes) by `id`. Returns the deleted entity or `null`.

62. **`find(filters?, sort?)`** — Returns all rows matching optional filters and sort.

63. **`findById(id)`** — Returns one row by primary key or `null`.

64. **`findOne(filters?, sort?)`** — Returns the first matching row or `null`.

65. **`list(limit?, offset?, filters?, sort?)`** — Returns `PaginatedList<T>` with `{ data, totalCount, filteredCount }`. Total count and filtered count are fetched concurrently with the data query.

66. **`update(id, data)`** — Updates a row by `id` and returns the updated entity.

67. **Pre/post lifecycle hooks** — Optional `pre<Action>` / `post<Action>` protected methods (e.g., `preCreate`, `postCreate`) are called before and after every DB operation. Subclasses override to transform input data or output results. Hook results are validated for type compatibility before being applied.

## Standalone Migration Utility

68. **`migrate` utility** — Builds a `pg.Client` from `SlonikOptions.db` (includes SSL from `clientConfiguration.ssl` when set), runs `@prefabs.tech/postgres-migrations`, then disconnects. Default migrations path is `"migrations"`.

## Type Exports

69. **`SlonikConfig` / `SlonikOptions`** — Plugin configuration: `db` (required `ConnectionOptions`), optional `clientConfiguration`, `extensions`, `migrations.path`, `pagination.defaultLimit`/`maxLimit`, `queryLogging.enabled`.

70. **`Database`** — `{ pool: DatabasePool; connect; query }` — the shape decorated onto the Fastify instance and requests.

71. **`BaseFilterInput`** — Single filter condition shape: `key`, `operator`, `value`, optional `not`, `insensitive`.

72. **`FilterInput`** — Recursive union: `BaseFilterInput | { AND: FilterInput[] } | { OR: FilterInput[] }`.

73. **`SortInput`** — `{ key: string; direction: SortDirection; insensitive?: boolean | string }`.

74. **`SortDirection`** — `"ASC" | "DESC"`.

75. **`PaginatedList<T>`** — `{ data: readonly T[]; totalCount: number; filteredCount: number }`.

76. **`Service<T, C, U>`** — Interface contract for service classes.

77. **`SqlFactory`** — Interface contract for SQL factory classes.

## Utility Exports

78. **`formatDate(date)`** — Formats a `Date` as `"YYYY-MM-DD HH:mm:ss.SSS"` (ISO string truncated to 23 chars, `T` replaced with a space) — suitable for PostgreSQL timestamp columns.
