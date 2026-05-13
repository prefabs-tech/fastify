# @prefabs.tech/fastify-slonik — Developer Guide

## Installation

### For package consumers (npm + pnpm)

```bash
# npm
npm install @prefabs.tech/fastify-slonik slonik fastify fastify-plugin zod

# pnpm
pnpm add @prefabs.tech/fastify-slonik slonik fastify fastify-plugin zod
```

Peer dependencies that are always required:

| Peer                           | Version    |
| ------------------------------ | ---------- |
| `fastify`                      | `>=5.2.1`  |
| `fastify-plugin`               | `>=5.0.1`  |
| `slonik`                       | `>=46.1.0` |
| `zod`                          | `>=3.23.8` |
| `@prefabs.tech/fastify-config` | `0.93.5`   |

`pg-mem` is an optional peer — only needed for in-memory testing:

```bash
pnpm add -D pg-mem
```

### For monorepo development (pnpm install / test / build)

```bash
# from the repo root
pnpm install

# run tests for this package only
pnpm --filter @prefabs.tech/fastify-slonik test

# build
pnpm --filter @prefabs.tech/fastify-slonik build
```

---

## Setup

Register the plugin once during application bootstrap. All later examples assume this setup is in place.

```typescript
import Fastify from "fastify";
import slonikPlugin from "@prefabs.tech/fastify-slonik";

const fastify = Fastify({ logger: true });

await fastify.register(slonikPlugin, {
  db: {
    host: "localhost",
    port: 5432,
    databaseName: "mydb",
    username: "app",
    password: "secret",
  },
  // optional: run SQL migrations on startup
  migrations: {
    path: "migrations", // default: "migrations"
  },
  // optional: add extra PostgreSQL extensions (citext + unaccent are always added)
  extensions: ["postgis"],
  // optional: enable query logging (requires ROARR_LOG=true at runtime)
  queryLogging: {
    enabled: process.env.NODE_ENV !== "production",
  },
  // optional: override pagination defaults
  pagination: {
    defaultLimit: 25,
    maxLimit: 100,
  },
  // optional: override any slonik ClientConfigurationInput defaults
  clientConfiguration: {
    maximumPoolSize: 20,
  },
});

await fastify.listen({ port: 3000 });
```

After registration the following are available everywhere in your application:

| Symbol             | Available on           |
| ------------------ | ---------------------- |
| `fastify.slonik`   | Fastify instance       |
| `fastify.sql`      | Fastify instance       |
| `request.slonik`   | Every `FastifyRequest` |
| `request.sql`      | Every `FastifyRequest` |
| `request.dbSchema` | Every `FastifyRequest` |

---

## Base Libraries

### slonik — Partial Passthrough

→ Their docs: [https://www.npmjs.com/package/slonik](https://www.npmjs.com/package/slonik)

slonik provides the type-safe PostgreSQL client (`createPool`, `sql`, `DatabasePool`, `ConnectionRoutine`, etc.). This package does **not** re-export slonik's pool directly — it wraps it in the `Database` interface and surfaces it via Fastify decorators. You interact with the pool through `fastify.slonik.pool`, `fastify.slonik.connect(...)`, and `fastify.slonik.query(...)`.

What we add on top:

- Opinionated `ClientConfigurationInput` defaults (see [Client Configuration defaults](#feature-14-createclientconfiguration-factory)).
- Two always-active interceptors: snake_case → camelCase conversion and Zod row validation.
- Auto-provisioned PostgreSQL extensions on startup.
- The `Database` wrapper type exported from this package.

### fastify-plugin — Full Passthrough

→ Their docs: [https://www.npmjs.com/package/fastify-plugin](https://www.npmjs.com/package/fastify-plugin)

Used internally to register our plugins without encapsulation (so decorators are visible to the parent scope). You do not interact with `fastify-plugin` directly.

### @prefabs.tech/fastify-config — Partial Passthrough

→ Their docs: internal monorepo package (`packages/config`).

We augment the `ApiConfig` interface from this package with a `slonik: SlonikConfig` property. This makes `fastify.config.slonik` the fallback config source when no options are passed to the plugin directly.

### @prefabs.tech/postgres-migrations — Full Passthrough

→ Their docs: [https://www.npmjs.com/package/@prefabs.tech/postgres-migrations](https://www.npmjs.com/package/@prefabs.tech/postgres-migrations)

Used internally by `migrate.ts` and `migrationPlugin`. You never call it directly — the migration plugin and the `migrate` utility function handle it.

### humps — Full Passthrough

→ Their docs: [https://www.npmjs.com/package/humps](https://www.npmjs.com/package/humps)

Used internally by the `fieldNameCaseConverter` interceptor and by `DefaultSqlFactory` for camelCase ↔ snake_case column name mapping. Not re-exported.

### slonik-interceptor-query-logging — Full Passthrough

→ Their docs: [https://www.npmjs.com/package/slonik-interceptor-query-logging](https://www.npmjs.com/package/slonik-interceptor-query-logging)

Used internally when `queryLogging.enabled === true`. Not re-exported.

### zod — Partial Passthrough

→ Their docs: [https://zod.dev](https://zod.dev)

Used internally by `resultParser` and `DefaultSqlFactory`. You supply Zod schemas to your `DefaultSqlFactory` subclass via `_validationSchema`. Zod itself is not re-exported from this package.

---

## Features

### Feature 1 — Main plugin registration

Register `slonikPlugin` with direct options or let it fall back to `fastify.config.slonik`.

```typescript
// Direct options (recommended)
await fastify.register(slonikPlugin, { db: { host: "localhost", ... } });

// Fallback to fastify-config (deprecated path — logs a warning)
// fastify.config.slonik must be set by @prefabs.tech/fastify-config
await fastify.register(slonikPlugin);
```

If neither source provides configuration the plugin throws:

```
Error: Missing slonik configuration. Did you forget to pass it to the slonik plugin?
```

### Feature 2 — Idempotent decorator registration

The internal `fastifySlonik` plugin guards all `decorate` / `decorateRequest` calls with `hasDecorator` checks, so registering the plugin multiple times (e.g., in multiple scopes) will not throw a duplicate-decorator error.

### Feature 3 — Connection verification on startup

Immediately after pool creation the plugin opens a test connection:

```typescript
// No code needed — happens automatically on registration.
// On success:  fastify.log.info("✅ Connected to Postgres DB")
// On failure:  fastify.log.error("🔴 Error happened while connecting to Postgres DB")
//              + the error is rethrown
```

### Feature 4 — Auto-provisioned PostgreSQL extensions

On every startup, before your route handlers run, the plugin runs:

```sql
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- plus any extras from options.extensions
```

```typescript
await fastify.register(slonikPlugin, {
  db: { ... },
  extensions: ["postgis", "uuid-ossp"],  // merged with the defaults; duplicates removed
});
```

### Feature 5 — migrationPlugin

A standalone Fastify plugin that runs SQL file migrations on startup using `@prefabs.tech/postgres-migrations`.

```typescript
import { migrationPlugin } from "@prefabs.tech/fastify-slonik";

// Register before the main plugin if you want migrations to run first
await fastify.register(migrationPlugin, {
  db: {
    host: "localhost",
    port: 5432,
    databaseName: "mydb",
    username: "app",
    password: "secret",
  },
  migrations: { path: "db/migrations" }, // default: "migrations"
});
```

### Feature 6–9 — Fastify instance and request decorators

```typescript
fastify.get("/users", async (req, reply) => {
  // Both the instance and the request have slonik + sql
  const rows = await req.slonik.connect((conn) =>
    conn.any(req.sql`SELECT * FROM users`),
  );

  // Or use the instance-level decorator in plugins/hooks
  const count = await fastify.slonik.query(
    fastify.sql`SELECT COUNT(*) FROM users`,
  );

  return rows;
});
```

### Feature 10 — `request.dbSchema`

An empty string set on each request. Useful for multi-tenant applications where each request should query a different PostgreSQL schema.

```typescript
fastify.addHook("onRequest", async (req) => {
  req.dbSchema = getTenantSchema(req.headers["x-tenant-id"] as string);
});

fastify.get("/items", async (req) => {
  const factory = new ItemSqlFactory(fastify.config, req.slonik, req.dbSchema);
  // factory now queries `<tenant_schema>.items`
});
```

### Feature 11–13 — Module augmentation

The package extends three external interfaces so TypeScript knows about the added properties without any additional type imports.

```typescript
import type { FastifyInstance, FastifyRequest } from "fastify";

// FastifyInstance.slonik / .sql are typed automatically
// FastifyRequest.slonik / .sql / .dbSchema are typed automatically
// ApiConfig.slonik is typed automatically

// No extra imports needed in consuming code
const pool = fastify.slonik.pool; // DatabasePool
const tag = fastify.sql; // typeof sql
const schema = request.dbSchema; // string
```

### Feature 14 — `createClientConfiguration` factory

Creates a `ClientConfigurationInput` with safe production defaults. You can override any field via `options.clientConfiguration`.

```typescript
import { createDatabase } from "@prefabs.tech/fastify-slonik";

// createDatabase calls createClientConfiguration internally
const db = await createDatabase("postgres://localhost/mydb", {
  maximumPoolSize: 5, // overrides default of 10
  connectionTimeout: 10_000, // overrides default of 5000 ms
});
```

Default values applied when not overridden:

| Setting                           | Default    |
| --------------------------------- | ---------- |
| `captureStackTrace`               | `false`    |
| `connectionRetryLimit`            | `3`        |
| `connectionTimeout`               | `5000 ms`  |
| `idleInTransactionSessionTimeout` | `60000 ms` |
| `idleTimeout`                     | `5000 ms`  |
| `maximumPoolSize`                 | `10`       |
| `queryRetryLimit`                 | `5`        |
| `statementTimeout`                | `60000 ms` |
| `transactionRetryLimit`           | `5`        |

### Feature 15 — Built-in interceptor chain

Two interceptors are always active. You cannot disable them — if you need different behavior, do not use the main plugin and call `createDatabase` yourself.

**fieldNameCaseConverter** converts every result row:

```
{ created_at: "2024-01-01", user_name: "alice" }
→ { createdAt: "2024-01-01", userName: "alice" }
```

**resultParser** validates rows when a query has a Zod schema:

```typescript
import { sql } from "slonik";
import { z } from "zod";

const userSchema = z.object({ id: z.number(), name: z.string() });

// Throws SchemaValidationError if the DB returns unexpected shape
const users = await conn.any(sql.type(userSchema)`SELECT id, name FROM users`);
```

### Feature 16 — Optional query-logging interceptor

```typescript
await fastify.register(slonikPlugin, {
  db: { ... },
  queryLogging: { enabled: true },
});
// Also requires ROARR_LOG=true in the environment
```

### Feature 17 — User interceptors merged

```typescript
import type { Interceptor } from "slonik";

const myInterceptor: Interceptor = {
  afterQueryExecution(context, query, result) {
    metrics.recordQuery(query.sql, result.rowCount);
    return result;
  },
};

await fastify.register(slonikPlugin, {
  db: { ... },
  clientConfiguration: {
    interceptors: [myInterceptor],  // appended after built-ins
  },
});
```

### Feature 18 — Extended type parsers

`createBigintTypeParser` is always registered, converting PostgreSQL `bigint` / `int8` columns to JavaScript `number` instead of strings.

### Feature 21 — `createBigintTypeParser`

Exported for use outside the plugin (e.g., when calling `createDatabase` directly or building your own pool):

```typescript
import { createBigintTypeParser } from "@prefabs.tech/fastify-slonik";
import { createPool, createTypeParserPreset } from "slonik";

const pool = await createPool("postgres://...", {
  typeParsers: [...createTypeParserPreset(), createBigintTypeParser()],
});
```

### Feature 22 — `createDatabase` utility

Creates a `Database` object from a connection string, without registering any Fastify decorators. Useful for scripts, tests, or service-layer code.

```typescript
import { createDatabase } from "@prefabs.tech/fastify-slonik";

const db = await createDatabase("postgres://user:pw@localhost/mydb");

const rows = await db.connect((conn) =>
  conn.any(sql`SELECT id, name FROM users`),
);
```

### Features 23–30 — SQL fragment helpers

These are the building blocks used by `DefaultSqlFactory`. You can use them directly when constructing custom queries.

```typescript
import {
  createFilterFragment,
  createLimitFragment,
  createSortFragment,
  createTableFragment,
  createTableIdentifier,
  createWhereFragment,
  createWhereIdFragment,
  isValueExpression,
} from "@prefabs.tech/fastify-slonik";
import { sql } from "slonik";
import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";

const tableId = createTableIdentifier("users", "public");
const tableRef = createTableFragment("users", "public");

const filters: FilterInput = { key: "status", operator: "eq", value: "active" };
const sort: SortInput[] = [{ key: "createdAt", direction: "DESC" }];

const whereClause = createWhereFragment(tableId, filters, []);
const sortClause = createSortFragment(tableId, sort);
const limitClause = createLimitFragment(20, 40); // LIMIT 20 OFFSET 40

const query = sql.unsafe`
  SELECT * FROM ${tableRef}
  ${whereClause}
  ${sortClause}
  ${limitClause}
`;
```

`isValueExpression` is useful when building dynamic INSERT/UPDATE helpers:

```typescript
const safe = isValueExpression(someValue); // false for plain objects / functions
```

### Features 31–38 — Filter system

Build structured, composable WHERE clauses without writing raw SQL strings.

```typescript
import type { FilterInput } from "@prefabs.tech/fastify-slonik";

// Simple equality
const f1: FilterInput = { key: "status", operator: "eq", value: "active" };

// Case-insensitive contains
const f2: FilterInput = {
  key: "name",
  operator: "ct",
  value: "alice",
  insensitive: true,
};

// Negated IN
const f3: FilterInput = {
  key: "role",
  operator: "in",
  value: "admin,moderator",
  not: true,
};

// BETWEEN
const f4: FilterInput = {
  key: "createdAt",
  operator: "bt",
  value: "2024-01-01,2024-12-31",
};

// PostGIS proximity (lat, lng, radius in meters)
const f5: FilterInput = {
  key: "location",
  operator: "dwithin",
  value: "51.5074,-0.1278,1000",
};

// NULL check
const f6: FilterInput = { key: "deletedAt", operator: "eq", value: "null" };

// Recursive AND / OR
const composed: FilterInput = {
  AND: [f1, { OR: [f2, f3] }],
};
```

Pass any `FilterInput` to `BaseService` methods or `DefaultSqlFactory.getFindSql`:

```typescript
const users = await userService.find(composed, [
  { key: "name", direction: "ASC" },
]);
```

### Features 39–55 — DefaultSqlFactory

Extend `DefaultSqlFactory` to get type-safe, parameterized SQL for a table.

```typescript
import { DefaultSqlFactory } from "@prefabs.tech/fastify-slonik";
import { z } from "zod";

const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  deletedAt: z.string().nullable(),
});

class UserSqlFactory extends DefaultSqlFactory {
  static override readonly TABLE = "users";

  // Optional: use a Zod schema for automatic row validation
  protected override _validationSchema = userSchema;

  // Optional: enable soft delete
  protected override _softDeleteEnabled = true;
}
```

The factory generates all standard queries automatically:

```typescript
const factory = new UserSqlFactory(fastify.config, fastify.slonik, "public");

// SELECT id, name FROM public.users ORDER BY id ASC
const allSql = factory.getAllSql(["id", "name"]);

// SELECT COUNT(*) FROM public.users WHERE ...
const countSql = factory.getCountSql({
  key: "status",
  operator: "eq",
  value: "active",
});

// INSERT INTO public.users (name, email) VALUES ($1, $2) RETURNING *
const createSql = factory.getCreateSql({
  name: "Alice",
  email: "alice@example.com",
});

// UPDATE public.users SET name = $1 WHERE id = $2 RETURNING *
const updateSql = factory.getUpdateSql(1, { name: "Alice B." });

// UPDATE public.users SET deleted_at = NOW() WHERE id = $1 RETURNING *
// (soft delete, because _softDeleteEnabled = true)
const deleteSql = factory.getDeleteSql(1);

// DELETE FROM public.users WHERE id = $1 RETURNING *
// (force = true bypasses soft delete)
const hardDeleteSql = factory.getDeleteSql(1, true);
```

Override `getAdditionalFilterFragments` to inject permanent conditions into every read query:

```typescript
import { sql } from "slonik";

class TenantSqlFactory extends DefaultSqlFactory {
  static override readonly TABLE = "orders";

  constructor(
    config,
    database,
    schema,
    private tenantId: number,
  ) {
    super(config, database, schema);
  }

  protected override getAdditionalFilterFragments() {
    return [sql.fragment`${this.tableIdentifier}.tenant_id = ${this.tenantId}`];
  }
}
```

### Features 56–67 — BaseService

Extend `BaseService` to get a fully functional CRUD service backed by `DefaultSqlFactory`.

```typescript
import { BaseService } from "@prefabs.tech/fastify-slonik";
import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

type User = { id: number; name: string; email: string };
type CreateUserDto = { name: string; email: string };
type UpdateUserDto = Partial<CreateUserDto>;

class UserService extends BaseService<User, CreateUserDto, UpdateUserDto> {
  // Override to use a custom factory
  override get sqlFactoryClass() {
    return UserSqlFactory; // UserSqlFactory from previous example
  }
}

const service = new UserService(fastify.config, fastify.slonik, "public");

// CRUD
const user = await service.create({ name: "Alice", email: "a@example.com" });
const found = await service.findById(user!.id);
const updated = await service.update(user!.id, { name: "Alice B." });
const deleted = await service.delete(user!.id);

// Query
const activeUsers = await service.find({
  key: "status",
  operator: "eq",
  value: "active",
});
const firstActive = await service.findOne({
  key: "status",
  operator: "eq",
  value: "active",
});

// Paginated list: { data, totalCount, filteredCount }
const page = await service.list(25, 0, {
  key: "status",
  operator: "eq",
  value: "active",
});

// Count
const total = await service.count();
```

### Feature 67 — Pre/post lifecycle hooks

Override optional `pre<Action>` / `post<Action>` methods to transform data around DB calls.

```typescript
class AuditedUserService extends BaseService<
  User,
  CreateUserDto,
  UpdateUserDto
> {
  override get sqlFactoryClass() {
    return UserSqlFactory;
  }

  // Called before create — return modified data or undefined to use original
  protected override async preCreate(
    data: CreateUserDto,
  ): Promise<CreateUserDto> {
    return { ...data, name: data.name.trim() };
  }

  // Called after create — transform or enrich the result
  protected override async postCreate(result: User): Promise<User> {
    await auditLog.record("user.created", result.id);
    return result;
  }

  // Called after list — example: mask sensitive fields
  protected override async postList(
    result: PaginatedList<User>,
  ): Promise<PaginatedList<User>> {
    return {
      ...result,
      data: result.data.map((u) => ({ ...u, email: "***" })),
    };
  }
}
```

### Feature 68 — `migrate` standalone utility

Runs migrations outside of a Fastify application (e.g., in a CLI script):

```typescript
import { migrate } from "@prefabs.tech/fastify-slonik"; // not directly exported from index;
// use migrationPlugin or call @prefabs.tech/postgres-migrations directly for CLI use.
```

The `migrate` function is used internally by `migrationPlugin`. For standalone CLI migration scripts, use `@prefabs.tech/postgres-migrations` directly or register `migrationPlugin` in a minimal Fastify app.

### Feature 78 — `formatDate`

Formats a `Date` to `"YYYY-MM-DD HH:mm:ss.SSS"` — the format PostgreSQL accepts for `timestamp without time zone` columns.

```typescript
import { formatDate } from "@prefabs.tech/fastify-slonik";

const ts = formatDate(new Date()); // e.g. "2026-04-04 12:34:56.789"

await conn.query(sql`
  INSERT INTO events (name, occurred_at)
  VALUES (${"user.login"}, ${ts})
`);
```

---

## Use Cases

### Use case 1 — Basic CRUD API route

```typescript
import Fastify from "fastify";
import slonikPlugin, {
  BaseService,
  DefaultSqlFactory,
} from "@prefabs.tech/fastify-slonik";
import { z } from "zod";

const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
});
type Product = z.infer<typeof productSchema>;

class ProductFactory extends DefaultSqlFactory {
  static override readonly TABLE = "products";
  protected override _validationSchema = productSchema;
}

class ProductService extends BaseService<
  Product,
  Omit<Product, "id">,
  Partial<Omit<Product, "id">>
> {
  override get sqlFactoryClass() {
    return ProductFactory;
  }
}

const fastify = Fastify();
await fastify.register(slonikPlugin, {
  db: {
    host: "localhost",
    databaseName: "shop",
    username: "app",
    password: "s3cr3t",
  },
});

fastify.get("/products", async (req) => {
  const service = new ProductService(fastify.config, req.slonik);
  const { data, totalCount } = await service.list();
  return { data, total: totalCount };
});

fastify.post("/products", async (req, reply) => {
  const service = new ProductService(fastify.config, req.slonik);
  const product = await service.create(req.body as Omit<Product, "id">);
  return reply.status(201).send(product);
});
```

### Use case 2 — Filtered and paginated list endpoint

```typescript
import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";

fastify.get("/products/search", async (req) => {
  const {
    q,
    minPrice,
    maxPrice,
    page = 0,
    limit = 25,
  } = req.query as Record<string, string>;

  const filters: FilterInput = {
    AND: [
      ...(q
        ? [
            {
              key: "name",
              operator: "ct" as const,
              value: q,
              insensitive: true,
            },
          ]
        : []),
      ...(minPrice && maxPrice
        ? [
            {
              key: "price",
              operator: "bt" as const,
              value: `${minPrice},${maxPrice}`,
            },
          ]
        : []),
    ],
  };

  const sort: SortInput[] = [{ key: "name", direction: "ASC" }];

  const service = new ProductService(fastify.config, req.slonik);
  return service.list(
    Number(limit),
    Number(page) * Number(limit),
    filters,
    sort,
  );
});
```

### Use case 3 — Multi-tenant schema routing

```typescript
fastify.addHook("onRequest", async (req) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  req.dbSchema = tenantId ? `tenant_${tenantId}` : "public";
});

fastify.get("/orders", async (req) => {
  const service = new OrderService(fastify.config, req.slonik, req.dbSchema);
  return service.list();
});
```

### Use case 4 — Soft-delete with forced hard delete

```typescript
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  deletedAt: z.string().nullable(),
});
type User = z.infer<typeof userSchema>;

class SoftUserFactory extends DefaultSqlFactory {
  static override readonly TABLE = "users";
  protected override _validationSchema = userSchema;
  protected override _softDeleteEnabled = true;
}

class SoftUserService extends BaseService<
  User,
  Omit<User, "id" | "deletedAt">,
  { name?: string }
> {
  override get sqlFactoryClass() {
    return SoftUserFactory;
  }
}

fastify.delete("/users/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const { force } = req.query as { force?: string };
  const service = new SoftUserService(fastify.config, req.slonik);

  // Soft delete (sets deleted_at). Pass force=true for a hard DELETE.
  const result = await service.delete(Number(id), force === "true");
  return result ?? reply.status(404).send({ message: "Not found" });
});
```

### Use case 5 — Custom SQL with fragment helpers

When `DefaultSqlFactory` does not cover your query, compose it directly:

```typescript
import {
  createTableFragment,
  createTableIdentifier,
  createWhereFragment,
  createSortFragment,
} from "@prefabs.tech/fastify-slonik";
import { sql } from "slonik";
import { z } from "zod";

fastify.get("/reports/top-buyers", async (req) => {
  const tableId = createTableIdentifier("orders", "public");
  const tableRef = createTableFragment("orders", "public");

  const where = createWhereFragment(tableId, undefined, [
    sql.fragment`${tableId}.status = 'completed'`,
  ]);

  const sort = createSortFragment(tableId, [
    { key: "totalSpent", direction: "DESC" },
  ]);

  const reportSchema = z.object({ userId: z.number(), totalSpent: z.number() });

  const rows = await req.slonik.connect((conn) =>
    conn.any(sql.type(reportSchema)`
      SELECT user_id, SUM(amount) AS total_spent
      FROM ${tableRef}
      ${where}
      GROUP BY user_id
      ${sort}
      LIMIT 10
    `),
  );

  return rows;
});
```

### Use case 6 — Running database migrations on startup

```typescript
import Fastify from "fastify";
import { migrationPlugin } from "@prefabs.tech/fastify-slonik";
import slonikPlugin from "@prefabs.tech/fastify-slonik";

const fastify = Fastify();

const dbConfig = {
  db: {
    host: "localhost",
    port: 5432,
    databaseName: "mydb",
    username: "app",
    password: "s3cr3t",
  },
  migrations: { path: "db/migrations" },
};

// Run migrations before the main plugin so the schema is up to date
await fastify.register(migrationPlugin, dbConfig);
await fastify.register(slonikPlugin, dbConfig);

await fastify.listen({ port: 3000 });
```

### Use case 7 — Using `createDatabase` in a service / script

```typescript
import { createDatabase } from "@prefabs.tech/fastify-slonik";
import { sql } from "slonik";

// Standalone script — no Fastify instance needed
const db = await createDatabase("postgres://app:s3cr3t@localhost/mydb");

const rows = await db.connect((conn) =>
  conn.any(sql`SELECT id, name FROM users WHERE active = true`),
);

console.log(rows);
await db.pool.end();
```
