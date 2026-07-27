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
and the `ErrorResponse#` schema), `@prefabs.tech/fastify-slonik` (provides `fastify.slonik`), and
the plugin that provides `fastify.verifySession` (`@prefabs.tech/fastify-user`). All subsequent
examples assume this setup.

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

---

## Base Libraries

### `@prefabs.tech/fastify-slonik` — Full passthrough

The feedback table, service, and SQL factory are built on `BaseService` and `DefaultSqlFactory`
from `@prefabs.tech/fastify-slonik`. Case conversion (camelCase ⇄ snake_case) and query building
happen entirely inside those base classes — this package adds only the table definition and the
`feedbacks` table-name override.

-> **Their docs:** [@prefabs.tech/fastify-slonik](../slonik/)

### `mercurius` — Full passthrough

The GraphQL mutation is a standard mercurius resolver, secured with the `@auth` directive provided
by `@prefabs.tech/fastify-graphql`. Register the exported schema and resolver with your GraphQL
plugin to expose it.

-> **Their docs:** [`mercurius`](https://www.npmjs.com/package/mercurius)

---

## Features

### Automatic migration

When `config.feedback.enabled !== false`, registering the plugin runs `CREATE TABLE IF NOT EXISTS`
for the `feedbacks` table, plus an index on `user_id`. Columns:

| Column         | Type           | Nullable |
| -------------- | -------------- | -------- |
| `id`           | identity PK    | no       |
| `type_id`         | `INTEGER`      | no       |
| `message`      | `TEXT`         | no       |
| `user_id`      | `VARCHAR(255)` | yes      |
| `app_version`  | `VARCHAR(255)` | yes      |
| `device_model` | `VARCHAR(255)` | yes      |
| `platform`     | `VARCHAR(255)` | yes      |
| `created_at`   | `TIMESTAMP`    | no       |
| `updated_at`   | `TIMESTAMP`    | no       |

### Enable / disable

`config.feedback.enabled === false` skips the migration entirely. The flag defaults ON — an
`undefined` value is treated as enabled. Routes are still registered unless individually disabled
(see below), so disabling only affects the migration.

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

### GraphQL mutation

The package exports a schema (`feedbackSchema`) and resolver (`feedbackResolver`) with a
`createFeedback(data: FeedbackCreateInput): Feedback @auth` mutation, at feature parity with the
REST route. Register them with your GraphQL plugin:

```typescript
import { feedbackResolver, feedbackSchema } from "@prefabs.tech/fastify-feedback";
```

The resolver returns a `404` error when feedback is disabled and a `401` error when there is no
authenticated user in the context.

### Route toggle

Set `config.feedback.routes.feedbacks.disabled = true` to skip registering the REST route entirely
(for example, when you only expose feedback over GraphQL).

### Custom route prefix

All routes are registered under `config.feedback.routePrefix`.

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
