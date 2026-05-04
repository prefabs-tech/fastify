# @prefabs.tech/fastify-slonik

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of slonik in a fastify API.

The plugin is a thin wrapper around the [`fastify-slonik`](https://github.com/spa5k/fastify-slonik) plugin.

The plugin also includes logic to run migrations via [`@prefabs.tech/postgres-migrations`](https://github.com/prefabs-tech/postgres-migrations#readme) which is forked from [`postgres-migrations`](https://github.com/thomwright/postgres-migrations#readme).

## Why this plugin?

Connecting an application to a PostgreSQL database isn't just about initiating a connection pool; it requires structurally sound ways to handle schema migrations, enforce strict type safety across SQL payloads, and quickly bootstrap generic data services. We created this plugin to:

- **Unify Connections**: Bootstraps the PostgreSQL connection pool across Fastify, providing type-safe decorators (`fastify.slonik` and `fastify.sql`) to easily execute queries heavily verified at compile time.
- **Automate Migrations**: Safely executes pending database migrations directly at application boot-up (via `@prefabs.tech/postgres-migrations`), avoiding complex external CLI requirements in automated deployments.
- **Provide Data-Layer Scaffolding**: It isn't just a basic database driver wrapper; it ships with standard `BaseService` and `DefaultSqlFactory` abstract classes that natively handle boilerplate CRUD tasks, geo-filtering (`dwithin`), and API sorting conventions.

### Design Decisions: Why not Prisma or TypeORM? Why Slonik?

1. **Performance and Predictability**: Traditional heavyweight ORMs like Prisma or TypeORM often generate unpredictable, wildly inefficient SQL queries at massive scale. Slonik forces you to write explicit, hyper-optimized raw SQL while flawlessly protecting you from SQL injection vulnerabilities through tagged template literals.
2. **First-Class TypeScript Types**: By using Slonik, we retain total architectural control over strict database interactions and execution planning while enjoying near-perfect TypeScript synchronization—without suffering the penalty of learning a restrictive proprietary query dialect.

## Requirements

- [@prefabs.tech/fastify-config](../config/)
- [slonik](https://github.com/gajus/slonik)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik slonik
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik slonik
```

## Usage

Add a `slonik` block to your config:

```typescript
import { parse } from "@prefabs.tech/fastify-config";
import dotenv from "dotenv";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

dotenv.config();

const config: ApiConfig = {
  ...
  slonik: {
    db: {
      databaseName: process.env.DB_NAME as string,
      host: process.env.DB_HOST as string,
      password: process.env.DB_PASSWORD as string,
      port: parse(process.env.DB_PORT, 5432) as number,
      username: process.env.DB_USER as string,
    },
    migrations: {
      development: parse(
        process.env.MIGRATIONS_DEVELOPMENT_FOLDER,
        "migrations"
      ) as string,
      production: parse(
        process.env.MIGRATIONS_PRODUCTION_FOLDER,
        "apps/api/build/migrations"
      ) as string,
    },
  },
  ...
};

export default config;
```

Register the plugin with your Fastify instance:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import slonikPlugin, { migrationPlugin } from "@prefabs.tech/fastify-slonik";
import Fastify from "fastify";

import config from "./config";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register fastify-config plugin
  await fastify.register(configPlugin, { config });

  // Register fastify-slonik plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Run database migrations
  await fastify.register(migrationPlugin, config.slonik);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```

**Note: `migrationPlugin` should be registered after all the plugins.**

### Support for geo-filtering using `dwithin`

This package supports the filter for fetching the data from specific geographic area. This can return the data within specific area from the given co-ordinate point.

Prerequisite: Ensure that PostGIS extension is enabled before using this filter. Reference: [Setting up PostGIS](https://postgis.net/documentation/getting_started/install_windows/enabling_postgis/)

Example:

```
{ "key": "<column>", "operator": "dwithin", "value": "<latitude>,<longitude>,<radius_in_meters>" }
```

## Configuration

### `db`

| Attribute  | Type     | Description                                  |
| ---------- | -------- | -------------------------------------------- |
| `database` | `string` | The name of the database to connect to.      |
| `host`     | `string` | The database's host.                         |
| `password` | `string` | The password for connecting to the database. |
| `port`     | `number` | The database's port.                         |
| `username` | `string` | The username for connecting to the database. |

### `migrations`

Paths to the migrations files. You can specify 1 path per environment. Currently the only environments supported are: `development` and`production`.

The path must be relative to node.js `process.cwd()`.

### Enabling query logging

To enable query logging, set `queryLogging.enabled` to `true` in the slonik config and set `ROARR_LOG=true` environment variable to ensure logs are printed to the console.

```typescript
const config: ApiConfig = {
  ...
  slonik: {
    queryLogging: {
      enabled: true,
    },
    ...
  },
};
```

This setup activates the [slonik-interceptor-query-logging](https://github.com/gajus/slonik/tree/main/packages/slonik-interceptor-query-logging) interceptor, which uses [roarr](https://github.com/gajus/roarr) to log SQL queries directly to the console.

**Limitation**: The roarr logger used here is independent of the fastify logger (like pino) and logs directly to the console. Unlike pino, roarr does not natively support logging to files or prettifying the console output.

With this setup, all SQL queries will be logged to the console, making it easier to debug and monitor database interactions.
