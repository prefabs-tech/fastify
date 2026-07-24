# @prefabs.tech/fastify-feedback

A [Fastify](https://github.com/fastify/fastify) plugin that provides a config-driven feedback collection slice for a Fastify API.

## Why this plugin?

Collecting in-app feedback usually means writing the same boilerplate every time: a table to store it, a migration to create that table, an authenticated endpoint to accept submissions, and validation. This plugin gives you all of that as a single, config-driven package that plugs into your existing `@prefabs.tech/fastify-slonik` database setup:

- **A complete feedback slice out of the box** — a `feedbacks` table (created via an idempotent migration on registration) plus both a REST route and a GraphQL mutation to create entries.
- **Authenticated by default** — the create endpoint runs behind `verifySession()`; the submitter's `userId` is always taken from the session, never trusted from the client.
- **Centralized, typed configuration** — extends the `@prefabs.tech/fastify-config` `ApiConfig` interface so route prefix, table name, and route toggles live alongside the rest of your app config.
- **Clean overrides** — the default create handler can be replaced via `config.feedback.handlers.feedback.createFeedback` when your business logic needs custom behavior.

## Requirements

Peer dependencies (install compatible versions — see [package.json](./package.json)):

- [@prefabs.tech/fastify-config](../config/)
- [@prefabs.tech/fastify-error-handler](../error-handler/)
- [@prefabs.tech/fastify-graphql](../graphql/)
- [@prefabs.tech/fastify-slonik](../slonik/)
- [`fastify`](https://www.npmjs.com/package/fastify)
- [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin)
- [`mercurius`](https://www.npmjs.com/package/mercurius)
- [`slonik`](https://www.npmjs.com/package/slonik)
- [`supertokens-node`](https://www.npmjs.com/package/supertokens-node)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler @prefabs.tech/fastify-graphql @prefabs.tech/fastify-slonik @prefabs.tech/fastify-feedback fastify fastify-plugin mercurius slonik supertokens-node
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler @prefabs.tech/fastify-graphql @prefabs.tech/fastify-slonik @prefabs.tech/fastify-feedback fastify fastify-plugin mercurius slonik supertokens-node
```

## Usage

Register the plugin after the config, error-handler, slonik, and user (session) plugins it depends on:

```typescript
import feedbackPlugin from "@prefabs.tech/fastify-feedback";

await fastify.register(feedbackPlugin);
```

This runs the migration for the `feedbacks` table and registers `POST {routePrefix}/feedback`. See [GUIDE.md](./GUIDE.md) for configuration, the GraphQL mutation, and handler overrides.
