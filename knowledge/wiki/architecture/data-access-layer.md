---
type: Architecture
title: Data Access Layer
description: How BaseService, DefaultSqlFactory, the filter builder, and the slonik interceptors turn a service call into typed SQL, including hook dispatch, soft delete, pagination, and the camelCase/snake_case boundary.
tags: [slonik, postgres, service, sql-factory, filters, humps, zod]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: service
    resource: repo://packages/slonik/src/service.ts#L14-L317
    title: BaseService
  - id: factory
    resource: repo://packages/slonik/src/sqlFactory.ts#L30-L335
    title: DefaultSqlFactory
  - id: sql-helpers
    resource: repo://packages/slonik/src/sql.ts#L38-L149
    title: SQL fragment helpers
  - id: filters
    resource: repo://packages/slonik/src/filters.ts#L8-L222
    title: Filter builder
  - id: client-config
    resource: repo://packages/slonik/src/factories/createClientConfig.ts#L10-L39
    title: Client configuration defaults and interceptors
  - id: case-interceptor
    resource: repo://packages/slonik/src/interceptors/fieldNameCaseConverter.ts#L11-L22
    title: camelize rows
  - id: result-parser
    resource: repo://packages/slonik/src/interceptors/resultParser.ts#L11-L42
    title: zod result parsing
  - id: bigint
    resource: repo://packages/slonik/src/typeParsers/createBigintTypeParser.ts#L1-L13
    title: int8 parsed as Number
  - id: config-types
    resource: repo://packages/config/src/types.ts#L42-L45
    title: ApiConfig.pagination (snake_case)
  - id: slonik-config-types
    resource: repo://packages/slonik/src/types/config.ts#L5-L19
    title: SlonikOptions.pagination (camelCase)
  - id: device-factory
    resource: repo://packages/firebase/src/model/userDevice/sqlFactory.ts#L6-L29
    title: Canonical factory subclass
  - id: device-service
    resource: repo://packages/firebase/src/model/userDevice/service.ts#L10-L54
    title: Canonical service subclass with preCreate
  - id: user-update-profile
    resource: repo://packages/user/src/model/users/service.ts#L166-L191
    title: JSON column written via JSON.stringify
  - id: get-user-service
    resource: repo://packages/user/src/lib/getUserService.ts#L6-L14
    title: Service class override from config
  - id: commit-dwithin
    resource: repo://packages/slonik/src/filters.ts#L36-L44
    title: "dwithin (lat,lng order fixed in commit 4f403fbe, 2025-09-23)"
  - id: hooks-test
    resource: repo://packages/slonik/src/__test__/serviceWithHooks.test.ts
    title: Hook behaviour tests (pg-mem)
---

# Data Access Layer

Every package that stores data (s3, firebase, user) builds on the same stack exported by [slonik](../components/slonik.md):

```
handler / resolver
  └─ XService extends BaseService<T, CreateInput, UpdateInput>   business logic + pre/post hooks
       └─ XSqlFactory extends DefaultSqlFactory                   builds QuerySqlToken (sql.type)
            └─ Database { connect, pool, query }                  slonik pool
                 └─ interceptors: camelize → zod parse → [query log] → [app]
```

## Construction and state
- Services are created **per request** with `new Service(config, database, schema)`. They hold no state across requests.[^service]
- The factory is created lazily from the `sqlFactoryClass` getter and cached on the instance. Subclasses override **both** `get sqlFactoryClass()` and a `get factory()` that casts to their own type.[^service][^device-service]
- `schema` falls back to `"public"` when an empty `dbSchema` is passed.

## Table resolution
- A factory declares `static readonly TABLE`, and `get table()` returns `config.<pkg>.table.name || super.table`.[^device-factory]
- `tableFragment` is **schema-qualified** (`"schema"."table"`). `tableIdentifier` is **not** (`"table"`).[^factory] Column references in WHERE and ORDER BY, and the soft-delete filter, use the unqualified identifier. They therefore rely on the FROM item being addressable by the bare table name.

## Hook dispatch
`preProcess(action, data)` and `postProcess(action, result)` look up a method named `pre`/`post` + capitalised action (`preCreate`, `postFindById`, …) and call it with `this` bound.[^service] The value a hook returns is used **only if** it is not `undefined` **and** passes `isCompatibleType`: same `typeof`, and array-ness matches when both are objects. A hook that returns a different shape is silently ignored and the original is kept. `serviceWithHooks.test.ts` pins this behaviour.[^hooks-test]

Hooks exist for `all, count, create, delete, find, findById, findOne, list, update`. Only `postCreate` has a default (identity) implementation.

## Writes
`getCreateSql` and `getUpdateSql` decamelize each key into an identifier and **skip any value that is not a slonik `ValueExpression`**: plain objects, `undefined`, functions.[^factory][^sql-helpers] A JSON column must be passed as a string, which is why `UserService.updateProfile` calls `JSON.stringify` on the merged profile.[^user-update-profile]

## Soft delete
A factory opts in with `protected _softDeleteEnabled = true`.[^factory] When enabled:
- `delete(id)` becomes `UPDATE ... SET deleted_at = NOW()`, unless `force` is true.
- `getWhereFragment` appends `<table>.deleted_at IS NULL` unless `includeSoftDelete: false`.

## Reads and pagination
- The default sort is `id ASC` (`SORT_KEY`, `SORT_DIRECTION`).
- `limit = Math.min(limit ?? limitDefault, limitMax)`. Defaults are 20 and 50, overridable by `config.slonik.pagination.{defaultLimit,maxLimit}`.[^factory]
  - **Two pagination keys exist.** The base `ApiConfig` declares `pagination.default_limit` and `max_limit` in snake_case.[^config-types] The factory reads the camelCase `slonik.pagination` shape.[^slonik-config-types] Only the latter has any effect in this code.
- `list()` runs three queries **concurrently**: an unfiltered `count()` (`totalCount`), `count(filters)` (`filteredCount`), and the page itself.[^service]
  > Inference: each goes through `database.connect`, so one `list()` can hold up to three pool connections at once. The default pool size is 10.[^client-config]

## Filters
`FilterInput` is either a leaf `{ key, operator, value, not?, insensitive? }` or a nested `{ AND: [...] }` / `{ OR: [...] }`. Empty groups are dropped.[^filters]

- **Keys**: `a.b` splits into `"a"."b"`, and each part is decamelized. A single key is qualified with the table identifier.
- **`not` and `insensitive`** accept `true`, `"true"` or `"1"`, so string flags from query strings work.
- **`eq` with value `null` or `NULL`** becomes `IS NULL` (or `IS NOT NULL` with `not`).
- **Case-insensitive** comparisons wrap both sides in `unaccent(lower(...))`. That needs the `unaccent` extension, which the slonik plugin creates at boot.

| operator | SQL | with `not` |
|----------|-----|-----------|
| `eq` (default) | `=` | `!=` |
| `ct` / `sw` / `ew` | `ILIKE %v%` / `v%` / `%v` | `NOT ILIKE` |
| `gt` / `gte` | `>` / `>=` | `<` / `<` |
| `lt` / `lte` | `<` / `<=` | `>` / `>` |
| `in` | `IN (a, b, …)` from a comma list; throws if empty | `NOT IN` |
| `bt` | `BETWEEN a AND b`; throws without two values | `NOT BETWEEN` |
| `dwithin` | `ST_DWithin(col::geography, ST_MakePoint(lng, lat), radius)` from `"lat,lng,radius"` | n/a |

`dwithin` needs PostGIS, which is **not** among the default extensions; add it through `extensions`. The longitude/latitude argument order was corrected in commit `4f403fbe`.[^commit-dwithin] The negation mapping for `gt`/`gte` and `lt`/`lte` is recorded exactly as the code has it.

## Row pipeline
- `fieldNameCaseConverter` runs `humps.camelizeKeys` on every row.[^case-interceptor] This interceptor and the factories' `decamelize` calls are the **only** places case conversion happens.
- `resultParser` validates a row with the query's zod schema when one exists and throws `SchemaValidationError` on mismatch.[^result-parser] Factories default to `z.any()`.
- `int8` is parsed with `Number.parseInt`, so values above `Number.MAX_SAFE_INTEGER` lose precision. A `@todo` in the code acknowledges this.[^bigint] `COUNT(*)` results pass through this parser.
- Pool defaults: `maximumPoolSize` 10, `connectionTimeout` 5000 ms, `statementTimeout` 60000 ms, `idleInTransactionSessionTimeout` 60000 ms, `queryRetryLimit` 5, `transactionRetryLimit` 5, `connectionRetryLimit` 3, `captureStackTrace` false. Any key in `clientConfiguration` overrides these, but the interceptors are always prepended.[^client-config]

## Extension seams
- Subclass the service and factory, following the firebase `userDevice` slice.[^device-service][^device-factory]
- Add custom SQL methods that use `sql.type(this.validationSchema)`, `this.tableFragment` and `this.getWhereFragment({ filterFragment })`. Hand-written fragments use snake_case column names.
- Override `getAdditionalFilterFragments()` to scope every query, for example by tenant.
- The user package lets apps substitute service classes through `config.user.services.{user,invitation,userProfileField}`.[^get-user-service]

[^service]: Factory getter L25-37, `list` L155-180, `getHook` L194-198, `isCompatibleType` L199-228, `postProcess`/`preProcess` L252-312.
[^factory]: Table getters L70-80, create L143-164, delete L166-181, limit L274-281, where L306-332.
[^sql-helpers]: `isValueExpression` accepts null, string, number, boolean, Date, Buffer, or arrays of these.
[^filters]: `applyFilter` L8-147, `buildFilterFragment` L158-222.
[^client-config]: Defaults L14-28; interceptor order L30-38.
[^case-interceptor]: `transformRow` returns `humps.camelizeKeys(row)`.
[^result-parser]: Uses `queryContext.resultParser.safeParse(row)`.
[^bigint]: `// @todo Use bigint when value is greater than Number.MAX_SAFE_INTEGER.`
[^config-types]: `pagination?: { default_limit: number; max_limit: number }`.
[^slonik-config-types]: `pagination?: { defaultLimit: number; maxLimit: number }`.
[^device-factory]: `getDeleteExistingTokenSql` and `getFindByUserIdSql` use snake_case fragments.
[^device-service]: `preCreate` removes an existing row with the same device token.
[^user-update-profile]: `profile: JSON.stringify(updatedProfile)`.
[^get-user-service]: `config.user.services?.user || UserService`.
[^commit-dwithin]: Commit 4f403fbe "fix(slonik): fix incorrect latitude-longitude order in ST_MakePoint (#1023)".
[^hooks-test]: Runs against pg-mem, so no Postgres server is needed.
