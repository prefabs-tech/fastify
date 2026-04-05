# @prefabs.tech/fastify-firebase

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of Firebase Admin in a fastify API.

## Why this plugin?

Integrating Firebase Admin into a Node.js API typically involves much more than just calling `initializeApp()`. To support features like push notifications securely, you must manage user device tokens in a database, expose REST routes or GraphQL mutations to clients to register those devices, and define secure dispatch handlers. We created this plugin to:

- **Provide a Complete Feature Slice**: Rather than just wrapping the SDK, this plugin provides a fully functioning User Device and Notification management system out-of-the-box, automatically taking advantage of your `@prefabs.tech/fastify-slonik` database setup.
- **Bootstrap APIs Instantly**: It automatically provides and wires up both REST routes and GraphQL resolvers/schemas (`userDevice`, `notification`) so you don't have to manually write the boilerplate to add, remove, and manage FCM tokens across your applications.
- **Centralize Configuration**: By extending our `@prefabs.tech/fastify-config` interface, we ensure that your Firebase credentials, database table preferences, and route configurations are strictly typed and managed in one central place alongside the rest of your app.
- **Allow Clean Overrides**: While we provide default controllers and services for handling devices and notifications, the plugin architecture allows you to easily override them via the config (`config.firebase.handlers`) whenever your business logic requires custom behavior.

## Requirements

- [@prefabs.tech/fastify-config](../config/)
- [@prefabs.tech/fastify-slonik](../slonik/)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik @prefabs.tech/fastify-firebase
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik @prefabs.tech/fastify-firebase
```

## Usage

### Register Plugin

Register the fastify-firebase plugin with your Fastify instance:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import firebasePlugin from "@prefabs.tech/fastify-firebase";
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

  // Register fastify-firebase plugin
  await fastify.register(firebasePlugin);

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });
};

start();
```

## Configuration

Add firebase configuration

```typescript
const config: ApiConfig = {
  // ...
  firebase: {
    credentials: {
      clientEmail: "...",
      privateKey: "...",
      projectId: "...",
    }
    table: {
      userDevices: {
        name: "user-devices";
      }
    }
    notification: {
      test: {
        enabled: true,
        path: '/send-notification'
      }
    };
    handlers: {
      userDevice?: {
        addUserDevice: (request: SessionRequest, reply: FastifyReply) => Promise<void>
      },
      notification: {
        sendNotification: (request: SessionRequest, reply: FastifyReply) => Promise<void>
      },
    };
  }
};
```

## Using GraphQL

This package supports integration with [@prefabs.tech/fastify-graphql](../graphql/).

### Schema Integration

The GraphQL schema provided by this package is located at [src/graphql/schema.ts](./src/graphql/schema.ts) and is exported as `firebaseSchema`.

To load and merge this schema with your application's custom schemas, update your schema file as follows:

```typescript
import { firebaseSchema } from "@prefabs.tech/fastify-firebase";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "";
import { makeExecutableSchema } from "@graphql-tools/schema";

const schemas: string[] = loadFilesSync("./src/**/*.gql");

const typeDefs = mergeTypeDefs([firebaseSchema, ...schemas]);
const schema = makeExecutableSchema({ typeDefs });

export default schema;
```

### Resolver Integration

To integrate the resolvers provided by this package, import them and merge with your application's resolvers:

```typescript
import {
  notificationResolver,
  userDeviceResolver,
} from "@prefabs.tech/fastify-firebase";

import type { IResolvers } from "mercurius";

const resolvers: IResolvers = {
  Mutation: {
    // ...other mutations ...
    ...userDeviceResolver.Mutation,
    ...notificationResolver.Mutation,
  },
  Query: {
    // ...other queries ...
    ...userDeviceResolver.Query,
    ...notificationResolver.Query,
  },
};

export default resolvers;
```
