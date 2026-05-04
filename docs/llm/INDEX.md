# @prefabs.tech/fastify — LLM index

This repo is the `@prefabs.tech/fastify` workspace: **nine published Fastify plugins** (config, errors, HTTP docs, DB, GraphQL, object storage, mail, Firebase, auth/user), built with shared conventions (`src/index.ts` public surface, `src/plugin.ts` implementation).

**Read order:** stay on this page for orientation → open **one** row’s package LLM index (`packages/<name>/docs/llm/INDEX.md`) → open the matching **EXAMPLES** in the same folder (`packages/<name>/docs/llm/EXAMPLES.md`) → open [REFERENCE.md](./REFERENCE.md) for that package’s anchor only → follow links to tests / source. Do not read unrelated packages’ `src/` trees in the same pass.

**Common intents** (pick **one** REFERENCE anchor; then use that package’s EXAMPLES + INDEX task router):

- **App config / env / Ajv** → [config](./REFERENCE.md#config)
- **Global errors / masking / `preErrorHandler`** → [error-handler](./REFERENCE.md#error-handler)
- **OpenAPI + Swagger UI** → [swagger](./REFERENCE.md#swagger)
- **PostgreSQL (Slonik) / migrations** → [slonik](./REFERENCE.md#slonik)
- **GraphQL (Mercurius)** → [graphql](./REFERENCE.md#graphql)
- **S3 / uploads** → [s3](./REFERENCE.md#s3)
- **Transactional email** → [mailer](./REFERENCE.md#mailer)
- **Firebase / FCM** → [firebase](./REFERENCE.md#firebase)
- **Auth / user (SuperTokens)** → [user](./REFERENCE.md#user)

**Hard boundaries:** Do not scan full `packages/*/src/` unless this INDEX, the package LLM INDEX, EXAMPLES, and REFERENCE links are missing or obviously stale. Prefer integration tests listed in REFERENCE over raw exploration.

| Subpackage | npm package | Role | Package LLM index | Examples | Reference |
|------------|-------------|------|-------------------|----------|-----------|
| **config** | `@prefabs.tech/fastify-config` | `fastify.config` from env/JSON, Ajv schema | [INDEX](../../packages/config/docs/llm/INDEX.md) | [EXAMPLES](../../packages/config/docs/llm/EXAMPLES.md) | [config](./REFERENCE.md#config) |
| **error-handler** | `@prefabs.tech/fastify-error-handler` | Central errors, stack masking, hooks | [INDEX](../../packages/error-handler/docs/llm/INDEX.md) | [EXAMPLES](../../packages/error-handler/docs/llm/EXAMPLES.md) | [error-handler](./REFERENCE.md#error-handler) |
| **swagger** | `@prefabs.tech/fastify-swagger` | OpenAPI + Swagger UI | [INDEX](../../packages/swagger/docs/llm/INDEX.md) | [EXAMPLES](../../packages/swagger/docs/llm/EXAMPLES.md) | [swagger](./REFERENCE.md#swagger) |
| **slonik** | `@prefabs.tech/fastify-slonik` | PostgreSQL (Slonik), migrations | [INDEX](../../packages/slonik/docs/llm/INDEX.md) | [EXAMPLES](../../packages/slonik/docs/llm/EXAMPLES.md) | [slonik](./REFERENCE.md#slonik) |
| **graphql** | `@prefabs.tech/fastify-graphql` | Mercurius, context, base schema | [INDEX](../../packages/graphql/docs/llm/INDEX.md) | [EXAMPLES](../../packages/graphql/docs/llm/EXAMPLES.md) | [graphql](./REFERENCE.md#graphql) |
| **s3** | `@prefabs.tech/fastify-s3` | S3 client, uploads, metadata Ajv | [INDEX](../../packages/s3/docs/llm/INDEX.md) | [EXAMPLES](../../packages/s3/docs/llm/EXAMPLES.md) | [s3](./REFERENCE.md#s3) |
| **mailer** | `@prefabs.tech/fastify-mailer` | Nodemailer + MJML, routes | [INDEX](../../packages/mailer/docs/llm/INDEX.md) | [EXAMPLES](../../packages/mailer/docs/llm/EXAMPLES.md) | [mailer](./REFERENCE.md#mailer) |
| **firebase** | `@prefabs.tech/fastify-firebase` | Firebase, FCM, SQL factories | [INDEX](../../packages/firebase/docs/llm/INDEX.md) | [EXAMPLES](../../packages/firebase/docs/llm/EXAMPLES.md) | [firebase](./REFERENCE.md#firebase) |
| **user** | `@prefabs.tech/fastify-user` | SuperTokens, roles, sessions | [INDEX](../../packages/user/docs/llm/INDEX.md) | [EXAMPLES](../../packages/user/docs/llm/EXAMPLES.md) | [user](./REFERENCE.md#user) |

**Dependency hint (typical app):** register `error-handler` and `config` early; other plugins depend on app setup—see each package GUIDE and tests linked from [REFERENCE.md](./REFERENCE.md).
