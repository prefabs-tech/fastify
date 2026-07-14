# @prefabs.tech/fastify-graphql

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of mercurius graphql server in a fastify API.

The plugin is a thin wrapper around the [mercurius](https://mercurius.dev/#/) plugin.

## Why this plugin?

While registering `mercurius` directly perfectly enables GraphQL in a Fastify backend, enterprise APIs require deep context injection—such as database connections and application configurations—to function effectively within resolvers. We created this plugin to:

- **Automate Context Injection**: Instead of manually building context objects on every request, this plugin automatically populates the `MercuriusContext` with the `fastify.config`, `slonik` database connection, and `dbSchema`, making them instantly and safely available to all your GraphQL resolvers out-of-the-box.
- **Unify Configuration**: The plugin takes a strictly typed `GraphqlOptions` object (all mercurius options plus our `enabled` and `uploads` flags), so schema paths, options, and feature flags are managed in one place.

### Design Decisions: Why not Apollo Server or bare Mercurius?

- **Why Mercurius instead of Apollo**: Mercurius is specifically built for Fastify, leveraging Fastify's lifecycle hooks to deliver significantly better performance and lower latency than typical Apollo setups.
- **Why intercept Mercurius**: Using bare Mercurius means maintaining your own context factory methods to inject database connections and app configurations recursively. By wrapping it, we enforce a standard, highly-typed context shape that is guaranteed to match the rest of our ecosystem, eliminating setup boilerplate completely.

## Requirements

- [@prefabs.tech/fastify-config](../config/)
- [@prefabs.tech/fastify-slonik](../slonik/)
- [graphql](https://github.com/graphql/graphql-js)
- [mercurius](https://mercurius.dev/#/)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-graphql graphql mercurius
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-graphql graphql mercurius
```

## Usage

To set up graphql in fastify project, follow these steps:

### Define schema and resolvers

Create a resolvers file at `src/graphql/resolvers.ts` to define all GraphQL mutations and queries.

```typescript
import type { IResolvers } from "mercurius";

const resolvers: IResolvers = {
  Mutation: {
    subtract: async (_, { x, y }) => x - y,
  },
  Query: {
    add: async (_, { x, y }) => x + y,
  },
};

export default resolvers;
```

Create a schema file at `src/graphql/schema.ts`:

```typescript
const schema = `
  type Mutation {
    subtract(x: Int, y: Int): Int
  }

  type Query {
    add(x: Int, y: Int): Int
  }
`;

export default schema;
```

Export the resolvers and schema from the `src/graphql/index.ts` file:

```typescript
export { default as resolvers } from "./resolvers";
export { default as schema } from "./schema";
```

### Add the config block

Add a `graphql` block (type `GraphqlOptions`) to your central config in `config/index.ts`. A single app-wide config from which every plugin's options are derived remains the recommended pattern — what changed is that the plugin no longer reads it from the fastify instance; you pass its slice explicitly at registration:

```typescript
import dotenv from "dotenv";

import { resolvers, schema } from "../src/graphql";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

dotenv.config();

const config: ApiConfig = {
  // ...other configurations...
  graphql: {
    enabled: true,
    graphiql: false,
    path: "/graphql",
    resolvers,
    schema,
  },
  // ...other configurations...
};

export default config;
```

### Register plugin

Register the plugin with your fastify instance in `src/index.ts`, passing its config slice as the second argument:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import graphqlPlugin from "@prefabs.tech/fastify-graphql";
import Fastify from "fastify";

import config from "../config";

const start = async () => {
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register fastify-config plugin (decorates the app with the global
  // config; also feeds the default graphql resolver context)
  await fastify.register(configPlugin, { config });

  // Register fastify-graphql plugin, passing its config slice explicitly
  await fastify.register(graphqlPlugin, config.graphql);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```

Registering the plugin without options is deprecated — see [Deprecated: configuration via `fastify.config`](#deprecated-configuration-via-fastifyconfig).

## Configuration

The plugin is configured with a `GraphqlOptions` object passed directly to `register()` — typically the `graphql` slice of your central `ApiConfig` (`config.graphql`). The plugin itself makes no assumption that a global config exists; deriving its options from one is an app-level choice. It supports all of the [original mercurius plugin's options](https://mercurius.dev/#/docs/api/options?id=plugin-options), plus:

- `enabled` (boolean) — feature switch for the GraphQL server. The plugin registration stays in your code unconditionally; this flag — typically driven by per-environment configuration — decides whether anything is actually mounted. When `true`, mercurius and the upload transport are registered; when `false` or omitted, the plugin logs `"GraphQL API not enabled"` and mounts nothing (no `/graphql` route, no catch-all content-type parser). This lets you turn GraphQL on or off per environment by flipping a config value instead of adding or removing the `register()` call.
- `uploads` — configure or disable GraphQL file uploads (see below).

### File uploads

GraphQL file uploads ([graphql multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec)) are supported out of the box: when the plugin is enabled it registers an upload transport (content-type parser + `graphql-upload-minimal` processing) before mercurius. Configure or disable it with the `uploads` option:

```typescript
// config/index.ts — inside the graphql block
graphql: {
  // ...
  uploads: { maxFileSize: 10485760 }, // or { enabled: false } to disable
},

// registration is unchanged
await fastify.register(graphqlPlugin, config.graphql);
```

Declare `scalar Upload` in your schema; resolvers receive `Upload` promises. See GUIDE.md (Feature 16) for gotchas, including plugin ordering when combining with REST uploads via `@prefabs.tech/fastify-s3`.

## Context

The fastify-graphql plugin will generate a graphql context on every request that will include the following attributes:

| Attribute  | Type        | Description                                                                              |
| ---------- | ----------- | ---------------------------------------------------------------------------------------- |
| `config`   | `ApiConfig` | The fastify servers' config (as per [@prefabs.tech/fastify-config](../config/))          |
| `database` | `Database`  | The fastify server's slonik instance (as per [@prefabs.tech/fastify-slonik](../slonik/)) |
| `dbSchema` | `string`    | The database schema (as per [@prefabs.tech/fastify-slonik](../slonik/))                  |

The `config` and `database` attributes are populated from the request decorations provided by the config and slonik plugins when those are registered; they are `undefined` otherwise.

## Supporting `.gql` files and external schema exports

To work with multiple schemas defined in `.gql` files or support GraphQL schema exports from external packages, ensure the following packages are installed in your API:

- [@graphql-tools/load](https://github.com/ardatan/graphql-tools/tree/master/packages/load)
- [@graphql-tools/load-files](https://github.com/ardatan/graphql-tools/tree/master/packages/load-files)
- [@graphql-tools/merge](https://github.com/ardatan/graphql-tools/tree/master/packages/merge)
- [@graphql-tools/schema](https://github.com/ardatan/graphql-tools/tree/master/packages/schema)

To load and merge your GraphQL schemas, update your `src/graphql/schema.ts` file as follows:

```typescript
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";

const schemas: string[] = loadFilesSync("./src/**/*.gql");

const typeDefs = mergeTypeDefs(schemas);
const schema = makeExecutableSchema({ typeDefs });

export default schema;
```

If you also need to include schemas defined in other packages update above code:

```typescript
import { graphqlSchema } from "example"; // example: importing schemas from external packages
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";

const schemaFiles: string[] = loadFilesSync("./src/**/*.gql");

const typeDefs = mergeTypeDefs([graphqlSchema, ...schemaFiles]);
const schema = makeExecutableSchema({ typeDefs });

export default schema;
```

You can define additional schemas within the `src/` directory, including any nested subdirectories, using `.gql` files. For example, create a new file at `src/graphql/schema.gql`:

```graphql
type Mutation {
  subtract(x: Int, y: Int): Int
}

type Query {
  add(x: Int, y: Int): Int
}
```

## Deprecated: configuration via `fastify.config`

Earlier versions of this plugin could be registered without options: it then read its configuration from the fastify instance (`fastify.config.graphql`, decorated by [@prefabs.tech/fastify-config](../config/)).

This approach is **deprecated**. For backward compatibility it is temporarily still supported: registering without options falls back to `fastify.config.graphql` and logs a deprecation warning; if `fastify.config.graphql` is missing too, registration throws. The fallback will be removed in a future release.

To migrate, pass the configuration you previously kept under `config.graphql` directly to `register()`:

```typescript
// Before (deprecated)
await fastify.register(configPlugin, { config }); // config.graphql
await fastify.register(graphqlPlugin);

// After
await fastify.register(graphqlPlugin, config.graphql);
```
