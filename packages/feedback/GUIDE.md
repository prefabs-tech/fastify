# @prefabs.tech/fastify-feedback — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-feedback
```

```bash
pnpm add @prefabs.tech/fastify-feedback
```

Install the peer dependencies alongside it (see [README.md](./README.md) for the full command).

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-feedback test
pnpm --filter @prefabs.tech/fastify-feedback build
```

## Setup

Register the plugin after the plugins it reads decorators from: `@prefabs.tech/fastify-config`
(provides `fastify.config`), `@prefabs.tech/fastify-error-handler` (provides `fastify.httpErrors`
and the `ErrorResponse#` schema referenced by the route schema), `@prefabs.tech/fastify-slonik`
(provides `fastify.slonik`), and the plugin that provides `fastify.verifySession`
(`@prefabs.tech/fastify-user`). All subsequent examples assume this setup.

```typescript
import feedbackPlugin from "@prefabs.tech/fastify-feedback";

await fastify.register(feedbackPlugin);
```

On registration (unless disabled), the plugin runs an idempotent migration that creates the
`feedbacks` table, then registers `POST {routePrefix}/feedbacks`.

Configuration lives under the `feedback` namespace of your `ApiConfig`:

```typescript
const config: ApiConfig = {
  // ...base config
  feedback: {
    enabled: true,
    routePrefix: "/api",
  },
};
```

The `feedback` namespace is required — the plugin reads `config.feedback.enabled` without an
optional chain.

---

## Features

### Automatic migration

When `config.feedback.enabled !== false`, registering the plugin runs `CREATE TABLE IF NOT EXISTS`
for the `feedbacks` table, plus an index on `user_id`. Columns:

| Column         | Type           | Nullable |
| -------------- | -------------- | -------- |
| `id`           | identity PK    | no       |
| `type_id`      | `INTEGER`      | no       |
| `message`      | `TEXT`         | no       |
| `user_id`      | `VARCHAR(255)` | yes      |
| `app_version`  | `VARCHAR(255)` | yes      |
| `device_model` | `VARCHAR(255)` | yes      |
| `platform`     | `VARCHAR(255)` | yes      |
| `created_at`   | `TIMESTAMP`    | no       |
| `updated_at`   | `TIMESTAMP`    | no       |

The migration query is also exported, if you prefer to run migrations yourself:

```typescript
import { createFeedbacksTableQuery } from "@prefabs.tech/fastify-feedback";

await slonik.connect((connection) =>
  connection.query(createFeedbacksTableQuery(config)),
);
```

### Enable / disable

`config.feedback.enabled === false` skips the migration. The flag defaults ON — an `undefined`
value is treated as enabled.

Note the asymmetry: the REST route is registered regardless of `enabled` (it is controlled only by
`routes.feedbacks.disabled`), while the GraphQL resolver checks `enabled` on every call and returns
a `404` when it is `false`. To turn the REST endpoint off, disable the route.

### REST endpoint

`POST {routePrefix}/feedbacks` — creates a feedback entry for the authenticated user. Runs behind
`fastify.verifySession()`; returns `401` when there is no session.

Request body:

```json
{
  "typeId": 1,
  "message": "The dashboard is great",
  "appVersion": "1.2.3",
  "deviceModel": "Pixel 8",
  "platform": "android"
}
```

`typeId` and `message` are required; `appVersion`, `deviceModel`, and `platform` are optional. The
`userId` is taken from the session and is never read from the request body.

The route ships OpenAPI metadata — `operationId: "createFeedback"`, `tags: ["feedback"]`, and
`401`/`500` responses declared via `$ref: "ErrorResponse#"` — so it documents itself under
`@prefabs.tech/fastify-swagger`. The `200` response schema enumerates its properties, so any extra
field a custom handler or service returns is stripped during serialization.

### GraphQL mutation

The package exports a schema (`feedbackSchema`) and resolver (`feedbackResolver`) with a
`createFeedback(data: FeedbackCreateInput): Feedback @auth` mutation, at feature parity with the
REST route:

```typescript
import { feedbackResolver, feedbackSchema } from "@prefabs.tech/fastify-feedback";
```

`feedbackSchema` is the feedback SDL **already merged with the `@prefabs.tech/fastify-graphql` base
schema** (`mergeTypeDefs([baseSchema, feedbackSchema])`). Do not merge `baseSchema` in again
alongside it, or you will define the base types twice.

The resolver returns (rather than throws) a mercurius `ErrorWithProps`: `404` when feedback is
disabled, `401` when there is no authenticated user in the context, and `500` — logged via
`app.log.error` — when the service throws.

### Route toggle

Set `config.feedback.routes.feedbacks.disabled = true` to skip registering the REST route entirely
(for example, when you only expose feedback over GraphQL).

### Custom route prefix

The route is registered under `config.feedback.routePrefix`.

### Custom table name

`config.feedback.table.feedbacks.name` overrides the default `feedbacks` table name, honored by
both the migration and the SQL factory.

### Handler override

Replace the default create handler without forking the package:

```typescript
config.feedback.handlers = {
  feedback: {
    createFeedback: myCreateFeedbackHandler,
  },
};
```

### Service

`FeedbackService` extends `BaseService` from `@prefabs.tech/fastify-slonik`, so query building and
camelCase ⇄ snake_case conversion happen in `DefaultSqlFactory`. Instantiate it anywhere you have a
config, a database, and a schema:

```typescript
import { FeedbackService } from "@prefabs.tech/fastify-feedback";

const service = new FeedbackService(config, slonik, dbSchema);
await service.create({ message: "Hello", typeId: 1, userId: user.id });
```

### Exports

| Export                                 | Kind  | What it is                                     |
| -------------------------------------- | ----- | ---------------------------------------------- |
| default                                | value | the Fastify plugin                             |
| `FeedbackService`                      | value | `BaseService` subclass for the feedbacks table |
| `feedbackRoutes`                       | value | the controller sub-plugin                      |
| `feedbackResolver`, `feedbackSchema`   | value | GraphQL resolver and merged type defs          |
| `createFeedbacksTableQuery`            | value | the migration query builder                    |
| `ROUTE_FEEDBACK`, `TABLE_FEEDBACKS`    | value | route path and default table name constants    |
| `Feedback`, `FeedbackCreateInput`, `FeedbackUpdateInput`, `User` | type | entity and input types |

Registering the package also augments `FastifyInstance` (`verifySession`), `FastifyRequest`
(`user?: User`), `MercuriusContext` (`user`), and `ApiConfig` (the `feedback` namespace).

---

## Use Cases

### GraphQL-only feedback

When your clients talk to the API exclusively over GraphQL, drop the REST route and expose only the
mutation. The migration still runs, so the table is created for you.

```typescript
const config: ApiConfig = {
  // ...base config
  feedback: {
    routes: { feedbacks: { disabled: true } },
  },
};
```

```typescript
import { feedbackResolver, feedbackSchema } from "@prefabs.tech/fastify-feedback";

await fastify.register(graphqlPlugin, {
  resolvers: feedbackResolver,
  schema: feedbackSchema,
});
```

### Notifying support when feedback arrives

When feedback should trigger a side effect (a mail, a webhook) without changing the wire format,
override the handler and delegate to the service.

```typescript
import { FeedbackService } from "@prefabs.tech/fastify-feedback";

const createFeedback = async (request, reply) => {
  const { body, config, dbSchema, slonik, user } = request;

  if (!user) {
    throw request.server.httpErrors.unauthorized("Unauthorised");
  }

  const service = new FeedbackService(config, slonik, dbSchema);
  const feedback = await service.create({ ...body, userId: user.id });

  await request.server.mailer.send({
    subject: `New feedback #${feedback.id}`,
    template: "feedback",
    to: "support@example.com",
  });

  reply.send(feedback);
};

config.feedback.handlers = { feedback: { createFeedback } };
```

Keep durable business rules in a `FeedbackService` subclass (via `preCreate` / `postCreate`) rather
than in the handler — the handler is only an adapter.

### Namespacing the table and route

When the API already owns a `feedbacks` table, or routes must live under a versioned prefix, both
are config:

```typescript
const config: ApiConfig = {
  // ...base config
  feedback: {
    routePrefix: "/api/v1",
    table: { feedbacks: { name: "app_feedbacks" } },
  },
};
```

The endpoint becomes `POST /api/v1/feedbacks`, and both the migration and every query issued by
`FeedbackService` target `app_feedbacks`.

### Turning feedback collection off

To stop accepting feedback without removing the plugin, disable the flag *and* the route — the flag
alone only skips the migration and the GraphQL mutation.

```typescript
const config: ApiConfig = {
  // ...base config
  feedback: {
    enabled: false,
    routes: { feedbacks: { disabled: true } },
  },
};
```
