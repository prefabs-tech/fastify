# @prefabs.tech/fastify-slonik

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of slonik  in a fastify API.

The plugin is a thin wrapper around the [`fastify-slonik`](https://github.com/spa5k/fastify-slonik) plugin.

The plugin also includes logic to run migrations via [`@prefabs.tech/postgres-migrations`](https://github.com/prefabs-tech/postgres-migrations#readme) which is forked from [`postgres-migrations`](https://github.com/thomwright/postgres-migrations#readme).

## Requirements

* [@prefabs.tech/fastify-config](../config/)
* [slonik](https://github.com/gajus/slonik)

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


| Attribute  | Type | Description |
|------------|------|-------------|
| `database` | `string` | The name of the database to connect to. |
| `host`     | `string` | The database's host. |
| `password` | `string` | The password for connecting to the database. |
| `port`     | `number` | The database's port. |
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
