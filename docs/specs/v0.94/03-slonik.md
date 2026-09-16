# 03 — `@prefabs.tech/fastify-slonik`

The data layer every other package builds on. It supplies the pool, the
camelCase/snake_case boundary, Zod row validation, and the two base classes —
`BaseService` and `DefaultSqlFactory` — that all sibling models extend.

Peers: `@prefabs.tech/fastify-config`, `fastify`, `fastify-plugin`, `slonik >= 46.8.0`,
`zod >= 3.25.76`, `pg-mem >= 3.0.14`.

> Changes to `BaseService`, `DefaultSqlFactory`, `filters`, or the interceptors
> affect every package and every consuming application. Treat them as frozen
> public API.

## Registration

```typescript
import slonikPlugin, { migrationPlugin } from "@prefabs.tech/fastify-slonik";

await fastify.register(slonikPlugin, {
  db: {
    databaseName: "app",
    host: "localhost",
    password: "secret",
    port: 5432,
    username: "app",
  },
  extensions: ["postgis"],
  migrations: { path: "migrations" },
  pagination: { defaultLimit: 20, maxLimit: 50 },
  queryLogging: { enabled: false },
});
```

`SlonikOptions`:

| Field | Type | Notes |
|---|---|---|
| `db` | `ConnectionOptions` | Required. Slonik's DSN parts; stringified with `stringifyDsn` |
| `clientConfiguration` | `ClientConfigurationInput` | Merged over the defaults below |
| `extensions` | `string[]` | Added to the always-created `citext`, `unaccent` |
| `migrations.path` | `string` | Used by `migrationPlugin` / `migrate`; default `"migrations"` |
| `pagination` | `{ defaultLimit, maxLimit }` | Read by `DefaultSqlFactory` |
| `queryLogging.enabled` | `boolean` | Adds the logging interceptor; also needs `ROARR_LOG=true` |

At registration the plugin creates the pool, **opens a connection to verify the
database is reachable** (logging `✅ Connected to Postgres DB` or
`🔴 Error happened while connecting to Postgres DB` and rethrowing), then runs
`CREATE EXTENSION IF NOT EXISTS` for each extension.

## What it adds

| Surface | Value |
|---|---|
| `fastify.slonik` | `Database` — `{ pool, connect, query }` |
| `fastify.sql` | slonik's `sql` tagged template |
| `request.slonik`, `request.sql` | the same, set in an `onRequest` hook |
| `request.dbSchema` | `""` — set it yourself for per-request schema routing |

Decoration is guarded by `hasDecorator` / `hasRequestDecorator`, so the inner
plugin can be registered more than once without conflict.

## Client defaults

`createClientConfig` applies these, then shallow-merges your
`clientConfiguration` on top:

```
captureStackTrace: false          maximumPoolSize: 10
connectionRetryLimit: 3           queryRetryLimit: 5
connectionTimeout: 5000           statementTimeout: 60000
idleInTransactionSessionTimeout: 60000    transactionRetryLimit: 5
idleTimeout: 5000
```

Type parsers are slonik's `createTypeParserPreset()` plus
`createBigintTypeParser()`, which maps the `int8` OID through
`Number.parseInt` so `bigint` columns do not arrive as strings.

**Interceptor order is fixed and not overridable at the front:**

1. `fieldNameCaseConverter` — `humps.camelizeKeys` on every row
2. `resultParser` — validates each row against the schema from `sql.type(...)`,
   throwing `SchemaValidationError`; passes rows through untouched when the
   query carries no schema
3. the query-logging interceptor, when `queryLogging.enabled`
4. anything in `clientConfiguration.interceptors`

## `BaseService<T, C, U>`

The abstract class every model service extends. `T` is the entity, `C` the
create input, `U` the update input.

```typescript
class UserDeviceService extends BaseService<
  UserDevice, UserDeviceCreateInput, UserDeviceUpdateInput
> {
  get factory(): UserDeviceSqlFactory {
    return super.factory as UserDeviceSqlFactory;
  }
  get sqlFactoryClass() {
    return UserDeviceSqlFactory;
  }
}

const service = new UserDeviceService(config, slonik, dbSchema);
```

Constructor: `(config: ApiConfig, database: Database, schema?: string)`.
`schema` defaults to `"public"`. The factory is instantiated lazily on first
access to `this.factory`.

### Methods

| Method | Returns |
|---|---|
| `all(fields, sort?)` | `Partial<readonly T[]>` — restricted field set, no pagination |
| `count(filters?)` | `number` |
| `create(data)` | `T \| undefined` (`undefined` when the insert returns no row) |
| `delete(id, force?)` | `T \| null` — soft-deletes when the factory enables it, unless `force` |
| `find(filters?, sort?)` | `readonly T[]` |
| `findById(id)` | `T \| null` |
| `findOne(filters?, sort?)` | `T \| null` |
| `list(limit?, offset?, filters?, sort?)` | `PaginatedList<T>` = `{ data, totalCount, filteredCount }` |
| `update(id, data)` | `T` |

`list` issues **three** queries concurrently: the unfiltered count, the
filtered count, and the page itself. On a large table this is the expensive
call in the API; prefer `find` when you do not need the counts.

### Lifecycle hooks

Business logic belongs here, not in route handlers. Every method dispatches
`pre<Action>` before and `post<Action>` after:

```typescript
protected async preCreate(data: UserDeviceCreateInput) {
  await this.removeByDeviceToken(data.deviceToken as string);
  return data;                                  // dedupe before insert
}
```

Available: `preAll`, `preCount`, `preCreate`, `preDelete`, `preFind`,
`preFindById`, `preFindOne`, `preList`, `preUpdate`; and `postAll`, `postCount`,
`postCreate`, `postDelete`, `postFind`, `postFindById`, `postFindOne`,
`postList`, `postUpdate`.

A hook's return value is applied only if it is type-compatible with the
original (same `typeof`; for objects, both arrays or both non-arrays).
**Returning an incompatible value is silently ignored** — no error, the
original is used. Returning `undefined` also keeps the original, which is what
makes void hooks work.

## `DefaultSqlFactory`

Generates every query `BaseService` runs. Subclass it per table:

```typescript
class FileSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = TABLE_FILES;

  get table() {
    return this.config.s3?.table?.name || super.table;   // config override
  }
}
```

The `static readonly TABLE` plus a `table` getter honouring the config override
is the required shape — a factory without `TABLE` produces `undefined` table
names.

### Statics and getters

| Member | Default |
|---|---|
| `static LIMIT_DEFAULT` | `20` |
| `static LIMIT_MAX` | `50` |
| `static SORT_DIRECTION` | `"ASC"` |
| `static SORT_KEY` | `"id"` |
| `limitDefault` / `limitMax` | `config.slonik.pagination.defaultLimit` / `.maxLimit`, falling back to the statics |
| `validationSchema` | `z.any()` — override to get real row validation |
| `softDeleteEnabled` | `false` — protected `_softDeleteEnabled` |
| `tableFragment`, `tableIdentifier` | built from `table` and `schema` |

Requested limits are clamped: `Math.min(limit ?? limitDefault, limitMax)`. A
client asking for 1000 rows gets `limitMax`.

### Generated queries

`getAllSql`, `getCountSql`, `getCreateSql`, `getDeleteSql`, `getFindByIdSql`,
`getFindOneSql`, `getFindSql`, `getListSql`, `getUpdateSql`.

- `getCreateSql` / `getUpdateSql` run every key through `humps.decamelize`, and
  **skip any value that is not a valid slonik value expression** — objects and
  functions are dropped silently, not rejected.
- `getAllSql` narrows `validationSchema` to the requested fields when it is a
  `ZodObject`.
- `getCountSql` validates with `z.object({ count: z.number() })`.

### Soft delete

Set `_softDeleteEnabled = true` and `getDeleteSql` issues
`UPDATE ... SET deleted_at = NOW()` instead of `DELETE` (unless `force`), and
every read query appends `deleted_at IS NULL`. The table needs a `deleted_at`
column. `UserSqlFactory` is the in-repo example.

### Extension points

```typescript
protected getAdditionalFilterFragments(): FragmentSqlToken[] { return []; }
```

Override it to inject a condition into every read query — tenant scoping, for
example. `getWhereFragment({ filters, filterFragment, includeSoftDelete, tableIdentifier })`
composes filters, the soft-delete condition, and these fragments.

Custom queries follow one shape:

```typescript
getFindByUserIdSql(userId: string): QuerySqlToken {
  return sql.type(this.validationSchema)`
    SELECT * FROM ${this.tableFragment}
    ${this.getWhereFragment({ filterFragment: sql.fragment`user_id = ${userId}` })};
  `;
}
```

## Filters

`FilterInput` is recursive: a condition, or `{ AND: [...] }`, or `{ OR: [...] }`,
nested to any depth. Empty arrays produce no condition.

```typescript
{ AND: [
  { key: "email", operator: "ct", value: "@example.com" },
  { OR: [
    { key: "disabled", operator: "eq", value: "false" },
    { key: "deletedAt", operator: "eq", value: "null" },
  ]},
]}
```

| Operator | SQL |
|---|---|
| `eq` | `=` (or `IS NULL` when value is `"null"` / `"NULL"`) |
| `ct` / `sw` / `ew` | `ILIKE %v%` / `v%` / `%v` |
| `gt` `gte` `lt` `lte` | `>` `>=` `<` `<=` |
| `in` | `IN (...)` — comma-separated; throws `IN operator requires at least one value` if empty |
| `bt` | `BETWEEN a AND b` — comma-separated; throws `BETWEEN operator requires exactly two values` |
| `dwithin` | PostGIS `ST_DWithin`, value `"lat,lng,radius_m"` |

Two modifiers apply to any condition: `not: true` negates it (`!=`, `NOT IN`,
`NOT BETWEEN`, `IS NOT NULL`), and `insensitive: true` wraps both field and
value in `unaccent(lower(...))` — which is why the plugin always creates the
`unaccent` extension. Both accept `true`, `"true"`, or `"1"`.

Filter and sort keys are `humps.decamelize`d, and a dotted key
(`"photo.originalFileName"`) becomes a qualified identifier rather than a
column on the current table.

## Migrations

Two mechanisms, for two different jobs.

**Package migrations** run automatically inside `register()`: idempotent
`CREATE TABLE IF NOT EXISTS` queries built from constants and config
overrides. Every sibling package does this for its own tables.

**Application migrations** are SQL files run by `migrationPlugin`, which wraps
`@prefabs.tech/postgres-migrations`:

```typescript
await fastify.register(migrationPlugin, config.slonik);   // after slonik
```

`migrate(slonikOptions)` does the same standalone: builds a `pg.Client` from
`db` (adding `clientConfiguration.ssl` when set), runs the files under
`migrations.path`, and disconnects.

> Migrations run automatically inside consumer applications, so an existing
> package migration query is **frozen**. Changes must be additive and
> idempotent.

## Exports

| Export | Kind |
|---|---|
| `default` | the plugin |
| `migrationPlugin` | SQL-file migration plugin |
| `BaseService` | abstract service base class |
| `DefaultSqlFactory` | SQL factory base class |
| `createDatabase(connectionString, clientConfig?)` | builds a `Database` outside Fastify |
| `createBigintTypeParser` | `int8` type parser factory |
| `formatDate(date)` | `"YYYY-MM-DD HH:mm:ss.SSS"` for timestamp columns |
| `createFilterFragment`, `createLimitFragment`, `createSortFragment`, `createTableFragment`, `createTableIdentifier`, `createWhereFragment`, `createWhereIdFragment`, `isValueExpression` | fragment builders |
| `applyFilter`, `applyFiltersToQuery`, `buildFilterFragment` | filter internals |
| `SlonikConfig`, `SlonikOptions`, `Database`, `BaseFilterInput`, `FilterInput`, `SortInput`, `SortDirection`, `PaginatedList`, `Service`, `SqlFactory` | types |
