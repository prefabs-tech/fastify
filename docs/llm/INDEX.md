# @prefabs.tech/fastify — LLM index

This repo is the `@prefabs.tech/fastify` workspace: **nine published Fastify plugins** (config, errors, HTTP docs, DB, GraphQL, object storage, mail, Firebase, auth/user), built with shared conventions (`src/index.ts` public surface, `src/plugin.ts` implementation).

**Read order:** stay on this page for orientation → open **one** row’s package LLM index (`packages/<name>/docs/llm/INDEX.md`) → open [REFERENCE.md](./REFERENCE.md) for that package’s anchor only → follow links to GUIDE / tests / source. Do not read unrelated packages’ `src/` trees in the same pass.

**Hard boundaries:** Do not scan full `packages/*/src/` unless this INDEX, the package LLM INDEX, and REFERENCE links are missing or obviously stale. Prefer integration tests listed in REFERENCE over raw exploration.

| Subpackage | npm package | Role | Package LLM index | Reference |
|------------|-------------|------|-------------------|-----------|
| **config** | `@prefabs.tech/fastify-config` | `fastify.config` from env/JSON, Ajv schema | [INDEX](../../packages/config/docs/llm/INDEX.md) | [config](./REFERENCE.md#config) |
| **error-handler** | `@prefabs.tech/fastify-error-handler` | Central errors, stack masking, hooks | [INDEX](../../packages/error-handler/docs/llm/INDEX.md) | [error-handler](./REFERENCE.md#error-handler) |
| **swagger** | `@prefabs.tech/fastify-swagger` | OpenAPI + Swagger UI | [INDEX](../../packages/swagger/docs/llm/INDEX.md) | [swagger](./REFERENCE.md#swagger) |
| **slonik** | `@prefabs.tech/fastify-slonik` | PostgreSQL (Slonik), migrations | [INDEX](../../packages/slonik/docs/llm/INDEX.md) | [slonik](./REFERENCE.md#slonik) |
| **graphql** | `@prefabs.tech/fastify-graphql` | Mercurius, context, base schema | [INDEX](../../packages/graphql/docs/llm/INDEX.md) | [graphql](./REFERENCE.md#graphql) |
| **s3** | `@prefabs.tech/fastify-s3` | S3 client, uploads, metadata Ajv | [INDEX](../../packages/s3/docs/llm/INDEX.md) | [s3](./REFERENCE.md#s3) |
| **mailer** | `@prefabs.tech/fastify-mailer` | Nodemailer + MJML, routes | [INDEX](../../packages/mailer/docs/llm/INDEX.md) | [mailer](./REFERENCE.md#mailer) |
| **firebase** | `@prefabs.tech/fastify-firebase` | Firebase, FCM, SQL factories | [INDEX](../../packages/firebase/docs/llm/INDEX.md) | [firebase](./REFERENCE.md#firebase) |
| **user** | `@prefabs.tech/fastify-user` | SuperTokens, roles, sessions | [INDEX](../../packages/user/docs/llm/INDEX.md) | [user](./REFERENCE.md#user) |

**Dependency hint (typical app):** register `error-handler` and `config` early; other plugins depend on app setup—see each package GUIDE and tests linked from [REFERENCE.md](./REFERENCE.md).
