# @prefabs.tech/fastify-graphql — Developer Guide

## Installation

### For package consumers (npm + pnpm)

```bash
# npm
npm install @prefabs.tech/fastify-graphql

# pnpm
pnpm add @prefabs.tech/fastify-graphql
```

Peer dependencies you must also install:

```bash
pnpm add fastify fastify-plugin graphql mercurius \
         @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik \
         slonik zod
```

### For monorepo development (pnpm install / test / build)

```bash
# from repo root
pnpm install

# run tests for this package only
pnpm --filter @prefabs.tech/fastify-graphql test

# build
pnpm --filter @prefabs.tech/fastify-graphql build
```

---

## Setup

Register the plugin once, after `@prefabs.tech/fastify-config` and `@prefabs.tech/fastify-slonik` (the context builder reads from request decorators those plugins add).

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import graphqlPlugin, {
  baseSchema,
  mergeTypeDefs,
  gql,
} from "@prefabs.tech/fastify-graphql";
import Fastify from "fastify";

const resolvers = {
  Query: {
    ping: async () => "pong",
  },
};

const schema = mergeTypeDefs([
  baseSchema,
  gql`
    type Query {
      ping: String
    }
  `,
]);

const fastify = Fastify({ logger: true });

await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin, config.slonik);
await fastify.register(graphqlPlugin, {
  enabled: true,
  schema,
  resolvers,
});

await fastify.listen({ port: 3000 });
```

All later examples assume the Fastify instance is set up as above.

---

## Base Libraries

### mercurius — Partial Passthrough

Docs: https://mercurius.dev / https://www.npmjs.com/package/mercurius

The plugin wraps `mercurius` and passes the full options object through to `mercurius.register()`. We add two extra option fields (`enabled` and `plugins`) and always override the `context` option with our own context-building function.

What we add on top:

- The `enabled` guard — mercurius is only registered when `enabled: true`.
- A config-fallback path — reads `fastify.config.graphql` when no options are provided directly.
- A `buildContext` factory that seeds the Mercurius context with `config`, `database`, and `dbSchema`, then calls each `GraphqlEnabledPlugin.updateContext` in order.

### @graphql-tools/merge — Full Passthrough

Docs: https://the-guild.dev/graphql/tools/docs/schema-merging / https://www.npmjs.com/package/@graphql-tools/merge

`mergeTypeDefs` is re-exported unchanged. No modifications.

### graphql-tag — Full Passthrough

Docs: https://www.npmjs.com/package/graphql-tag

`gql` is re-exported unchanged. No modifications.

### graphql — Type Re-export Only

Docs: https://graphql.org/graphql-js/ / https://www.npmjs.com/package/graphql

Only the `DocumentNode` type is re-exported. No runtime code from this library is executed by us.

---

## Features

### 1. Conditional mercurius registration

When `enabled` is falsy, the plugin logs `"GraphQL API not enabled"` and returns without registering mercurius. No `/graphql` route is mounted.

```typescript
await fastify.register(graphqlPlugin, {
  enabled: process.env.GRAPHQL_ENABLED !== "false",
  schema,
  resolvers,
});
// When enabled is false, POST /graphql → 404
```

### 2. Config fallback

When the options object passed to `register()` is empty, the plugin falls back to `fastify.config.graphql`. It logs a deprecation-style warning. If `fastify.config.graphql` is also not present, it throws:

> `"Missing graphql configuration. Did you forget to pass it to the graphql plugin?"`

```typescript
// Direct options (preferred):
await fastify.register(graphqlPlugin, config.graphql);

// Config fallback (legacy — triggers a warn log):
// fastify.config.graphql must be set by @prefabs.tech/fastify-config
await fastify.register(graphqlPlugin);
```

### 3. Automatic context building

On every GraphQL request, three fields are injected into the Mercurius context from the Fastify request object automatically — no resolver-level wiring required.

| Context field      | Source                                                   |
| ------------------ | -------------------------------------------------------- |
| `context.config`   | `request.config` (from `@prefabs.tech/fastify-config`)   |
| `context.database` | `request.slonik` (from `@prefabs.tech/fastify-slonik`)   |
| `context.dbSchema` | `request.dbSchema` (from `@prefabs.tech/fastify-slonik`) |

```typescript
const resolvers = {
  Query: {
    user: async (_parent, { id }, context) => {
      // context.config, context.database, context.dbSchema are ready to use
      return context.database.pool.one(
        context.database.sql`
          SELECT * FROM ${context.database.sql.identifier([context.dbSchema, "users"])}
          WHERE id = ${id}
        `,
      );
    },
  },
};
```

### 4. Plugin-based context extension

Pass an array of `GraphqlEnabledPlugin` objects in the `plugins` option. Each plugin's `updateContext(context, request, reply)` method is called on every GraphQL request, in array order, after the base context is built. Plugins can add any fields they need to the shared context.

```typescript
import type { FastifyInstance } from "fastify";
import type { MercuriusContext } from "mercurius";
import FastifyPlugin from "fastify-plugin";
import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";

// Augment the MercuriusContext type so resolvers get type safety
declare module "mercurius" {
  interface MercuriusContext {
    currentUser: User | null;
  }
}

const authPlugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  // Fastify-level setup (decorators, hooks, etc.)
}) as unknown as GraphqlEnabledPlugin;

// Called once per GraphQL request
authPlugin.updateContext = async (context, request, _reply) => {
  context.currentUser = request.user ?? null;
};

export default authPlugin;
```

Register it:

```typescript
await fastify.register(graphqlPlugin, {
  enabled: true,
  plugins: [authPlugin],
  schema,
  resolvers,
});
```

### 5. `GraphqlConfig` interface

Extends `MercuriusOptions` with two plugin-specific fields:

```typescript
import type { GraphqlConfig } from "@prefabs.tech/fastify-graphql";

const graphqlConfig: GraphqlConfig = {
  enabled: true, // our addition — guards mercurius registration
  plugins: [authPlugin], // our addition — context-extending plugins
  schema, // passed through to mercurius
  resolvers, // passed through to mercurius
  graphiql: false, // passed through to mercurius
};
```

### 6. `GraphqlOptions` type alias

`GraphqlOptions` is an alias for `GraphqlConfig`. Use whichever name feels more natural in your codebase.

```typescript
import type { GraphqlOptions } from "@prefabs.tech/fastify-graphql";

const opts: GraphqlOptions = { enabled: true, schema, resolvers };
```

### 7. `GraphqlEnabledPlugin` interface

A Fastify plugin (sync or async) that also carries a mandatory `updateContext` method. Implement this interface to create plugins that extend the GraphQL request context.

```typescript
import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";
import type { MercuriusContext } from "mercurius";
import FastifyPlugin from "fastify-plugin";

const myPlugin = FastifyPlugin(async (fastify) => {
  fastify.decorate("myService", new MyService());
}) as unknown as GraphqlEnabledPlugin;

myPlugin.updateContext = async (context: MercuriusContext, request, reply) => {
  context.myValue = await computeSomething(request);
};
```

### 8. `MercuriusContext` augmentation

This package extends the global `mercurius` module's `MercuriusContext` interface with three typed fields. Importing the package is enough for TypeScript to pick up the augmentation in your resolvers.

```typescript
// Automatically available after importing the package:
// context.config   → ApiConfig
// context.database → Database
// context.dbSchema → string

const resolvers = {
  Query: {
    appInfo: (_parent, _args, context) => ({
      name: context.config.appName, // typed as string
      env: context.config.env, // typed as string
    }),
  },
};
```

### 9. `ApiConfig` augmentation

Importing this package extends `@prefabs.tech/fastify-config`'s `ApiConfig` interface with a `graphql` property typed as `GraphqlConfig`. This allows `fastify.config.graphql` to be fully typed throughout your application.

```typescript
import type { ApiConfig } from "@prefabs.tech/fastify-config";
// After importing @prefabs.tech/fastify-graphql, ApiConfig gains:
// graphql: GraphqlConfig

const config: ApiConfig = {
  graphql: {
    enabled: true,
    schema,
    resolvers,
  },
  // ... other fields
};
```

### 10. `baseSchema` export

A pre-built `DocumentNode` with common GraphQL primitives ready to merge into your application schema. Use `mergeTypeDefs` to combine it with your own type definitions.

```typescript
import { baseSchema, mergeTypeDefs, gql } from "@prefabs.tech/fastify-graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";

const appTypeDefs = gql`
  type Query {
    users(filters: Filters, sort: [SortInput]): [User!]!
    deleteUser(id: ID!): DeleteResult
  }

  type User {
    id: ID!
    email: String!
    createdAt: DateTime!
    metadata: JSON
  }
`;

const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs([baseSchema, appTypeDefs]),
});
```

Provided by `baseSchema`:

| Name             | Kind      | Description                                                                              |
| ---------------- | --------- | ---------------------------------------------------------------------------------------- |
| `@auth`          | directive | `profileValidation: Boolean`, `emailVerification: Boolean` on OBJECT or FIELD_DEFINITION |
| `@hasPermission` | directive | `permission: String!` on OBJECT or FIELD_DEFINITION                                      |
| `DateTime`       | scalar    | Date/time values                                                                         |
| `JSON`           | scalar    | Arbitrary JSON values                                                                    |
| `Filters`        | input     | Recursive `AND`/`OR` filter tree with `key`, `operator`, `value`                         |
| `SortDirection`  | enum      | `ASC` or `DESC`                                                                          |
| `SortInput`      | input     | `key: String`, `direction: SortDirection`                                                |
| `DeleteResult`   | type      | `result: Boolean!`                                                                       |

### 11. `mergeTypeDefs` re-export

`mergeTypeDefs` from `@graphql-tools/merge` is re-exported so you do not need a separate import. Merges an array of `DocumentNode` objects or SDL strings into a single `DocumentNode`.

```typescript
import { baseSchema, mergeTypeDefs, gql } from "@prefabs.tech/fastify-graphql";

const merged = mergeTypeDefs([
  baseSchema,
  gql`
    type Query {
      ping: String
    }
  `,
  `type Mutation { noop: Boolean }`,
]);
```

### 12. `gql` tag re-export

`gql` from `graphql-tag` is re-exported so you do not need a separate import. Parses a tagged template literal into a `DocumentNode`.

```typescript
import { gql } from "@prefabs.tech/fastify-graphql";

const userTypeDefs = gql`
  type User {
    id: ID!
    email: String!
  }
`;
```

### 13. `DocumentNode` type re-export

The `DocumentNode` type from the `graphql` package is re-exported for use in function signatures and type annotations without adding a direct `graphql` dependency to your code.

```typescript
import type { DocumentNode } from "@prefabs.tech/fastify-graphql";

function buildSchema(extra: DocumentNode[]): DocumentNode {
  return mergeTypeDefs([baseSchema, ...extra]);
}
```

---

## Use Cases

### Use Case 1: Minimal GraphQL API

Stand up a GraphQL endpoint with just `enabled`, `schema`, and `resolvers`.

```typescript
import graphqlPlugin, { gql } from "@prefabs.tech/fastify-graphql";
import Fastify from "fastify";

const fastify = Fastify({ logger: true });

await fastify.register(graphqlPlugin, {
  enabled: true,
  schema: gql`
    type Query {
      hello: String
    }
  `,
  resolvers: {
    Query: {
      hello: async () => "world",
    },
  },
});

await fastify.listen({ port: 3000 });
```

### Use Case 2: Full app setup with config, database, and auth context

Realistic production setup: config plugin seeds `fastify.config`, slonik plugin seeds `request.slonik` and `request.dbSchema`, a custom auth plugin extends context with the current user.

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import graphqlPlugin, {
  baseSchema,
  mergeTypeDefs,
  gql,
  type GraphqlEnabledPlugin,
} from "@prefabs.tech/fastify-graphql";
import FastifyPlugin from "fastify-plugin";
import Fastify from "fastify";
import type { MercuriusContext } from "mercurius";

// --- Auth plugin ---
declare module "mercurius" {
  interface MercuriusContext {
    currentUser: User | null;
  }
}

const authPlugin = FastifyPlugin(async (fastify) => {
  fastify.addHook("onRequest", async (request) => {
    // decode JWT, set request.user
  });
}) as unknown as GraphqlEnabledPlugin;

authPlugin.updateContext = async (context, request) => {
  context.currentUser = request.user ?? null;
};

// --- Schema & resolvers ---
const appTypeDefs = gql`
  type Query {
    me: User
    users(filters: Filters): [User!]!
  }

  type User {
    id: ID!
    email: String!
    createdAt: DateTime!
  }
`;

const resolvers = {
  Query: {
    me: (_parent, _args, context) => context.currentUser,
    users: async (_parent, { filters }, context) =>
      userService.find(context.database, context.dbSchema, filters),
  },
};

// --- App bootstrap ---
const fastify = Fastify({ logger: config.logger });

await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin, config.slonik);
await fastify.register(authPlugin);
await fastify.register(graphqlPlugin, {
  ...config.graphql,
  schema: mergeTypeDefs([baseSchema, appTypeDefs]),
  resolvers,
  plugins: [authPlugin],
});

await fastify.listen({ port: config.port });
```

### Use Case 3: Feature-flag GraphQL off in non-production environments

```typescript
const graphqlConfig = {
  enabled: process.env.GRAPHQL_ENABLED === "true",
  schema,
  resolvers,
};

await fastify.register(graphqlPlugin, graphqlConfig);
// When GRAPHQL_ENABLED is not "true", /graphql returns 404
```

### Use Case 4: Composing schemas from multiple modules

Each feature module exports its own type definitions and resolvers, merged at startup.

```typescript
import { baseSchema, mergeTypeDefs, gql } from "@prefabs.tech/fastify-graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";

import {
  typeDefs as userTypeDefs,
  resolvers as userResolvers,
} from "./modules/user";
import {
  typeDefs as orderTypeDefs,
  resolvers as orderResolvers,
} from "./modules/order";

const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs([baseSchema, userTypeDefs, orderTypeDefs]),
  resolvers: [userResolvers, orderResolvers],
});

await fastify.register(graphqlPlugin, { enabled: true, schema });
```

### Use Case 5: Multiple context-extending plugins in order

```typescript
import { authPlugin } from "./plugins/auth";
import { tenantPlugin } from "./plugins/tenant";
import { auditPlugin } from "./plugins/audit";

await fastify.register(graphqlPlugin, {
  enabled: true,
  schema,
  resolvers,
  // Each plugin's updateContext runs in this order on every request:
  plugins: [authPlugin, tenantPlugin, auditPlugin],
});
```

Each plugin receives the already-built context, so `tenantPlugin.updateContext` can read `context.currentUser` set by `authPlugin`, and `auditPlugin` can read both.
