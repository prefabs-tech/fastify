# @prefabs.tech/fastify — extended reference (on-demand)

Paths below are **relative to the monorepo root** (the `fastify` folder containing `packages/` and this `docs/` tree).

**Convention:** `src/index.ts` is the public entry; `src/plugin.ts` is the Fastify plugin implementation. **GUIDE.md** is the primary long-form doc; **README** is the package overview. **Tests** under `src/__test__` (or nested `__test__`) are the most reliable “how to register and use” examples next to the code.

---

<!-- docgen:packages:start -->

## config

- **npm:** `@prefabs.tech/fastify-config`
- **docs:** [packages/config/GUIDE.md](../../packages/config/GUIDE.md) · [packages/config/README.md](../../packages/config/README.md)
- **source:** [packages/config/src/index.ts](../../packages/config/src/index.ts) · [packages/config/src/plugin.ts](../../packages/config/src/plugin.ts)
- **usage / “demo”:** [packages/config/src/**test**/parse.test.ts](../../packages/config/src/__test__/parse.test.ts) · [packages/config/src/**test**/plugin.test.ts](../../packages/config/src/__test__/plugin.test.ts)

---

## error-handler

- **npm:** `@prefabs.tech/fastify-error-handler`
- **docs:** [packages/error-handler/GUIDE.md](../../packages/error-handler/GUIDE.md) · [packages/error-handler/README.md](../../packages/error-handler/README.md)
- **source:** [packages/error-handler/src/index.ts](../../packages/error-handler/src/index.ts) · [packages/error-handler/src/plugin.ts](../../packages/error-handler/src/plugin.ts)
- **usage / “demo”:** [packages/error-handler/src/**test**/registration.test.ts](../../packages/error-handler/src/__test__/registration.test.ts) · [packages/error-handler/src/**test**/errorHandling.test.ts](../../packages/error-handler/src/__test__/errorHandling.test.ts) · [packages/error-handler/src/**test**/preErrorHandler.test.ts](../../packages/error-handler/src/__test__/preErrorHandler.test.ts)

---

## swagger

- **npm:** `@prefabs.tech/fastify-swagger`
- **docs:** [packages/swagger/GUIDE.md](../../packages/swagger/GUIDE.md) · [packages/swagger/README.md](../../packages/swagger/README.md)
- **source:** [packages/swagger/src/index.ts](../../packages/swagger/src/index.ts) · [packages/swagger/src/plugin.ts](../../packages/swagger/src/plugin.ts)
- **usage / “demo”:** [packages/swagger/src/**test**/plugin.test.ts](../../packages/swagger/src/__test__/plugin.test.ts)

---

## slonik

- **npm:** `@prefabs.tech/fastify-slonik`
- **docs:** [packages/slonik/GUIDE.md](../../packages/slonik/GUIDE.md) · [packages/slonik/README.md](../../packages/slonik/README.md) · [packages/slonik/feature.md](../../packages/slonik/feature.md)
- **source:** [packages/slonik/src/index.ts](../../packages/slonik/src/index.ts) · [packages/slonik/src/plugin.ts](../../packages/slonik/src/plugin.ts)
- **usage / “demo”:** [packages/slonik/src/**test**/filters.test.ts](../../packages/slonik/src/__test__/filters.test.ts) · [packages/slonik/src/**test**/formatDate.spec.ts](../../packages/slonik/src/__test__/formatDate.spec.ts) · [packages/slonik/src/**test**/migrate.test.ts](../../packages/slonik/src/__test__/migrate.test.ts) · [packages/slonik/src/**test**/migrationPlugin.test.ts](../../packages/slonik/src/__test__/migrationPlugin.test.ts) · [packages/slonik/src/**test**/plugin.test.ts](../../packages/slonik/src/__test__/plugin.test.ts) · [packages/slonik/src/**test**/service.test.ts](../../packages/slonik/src/__test__/service.test.ts) · [packages/slonik/src/**test**/serviceWithHooks.test.ts](../../packages/slonik/src/__test__/serviceWithHooks.test.ts) · [packages/slonik/src/**test**/sql.test.ts](../../packages/slonik/src/__test__/sql.test.ts) · [packages/slonik/src/**test**/sqlFactory.test.ts](../../packages/slonik/src/__test__/sqlFactory.test.ts) · [packages/slonik/src/factories/**test**/createClientConfiguration.test.ts](../../packages/slonik/src/factories/__test__/createClientConfiguration.test.ts) · [packages/slonik/src/interceptors/**test**/fieldNameCaseConverter.test.ts](../../packages/slonik/src/interceptors/__test__/fieldNameCaseConverter.test.ts) · [packages/slonik/src/interceptors/**test**/resultParser.test.ts](../../packages/slonik/src/interceptors/__test__/resultParser.test.ts) · [packages/slonik/src/migrations/**test**/queryToCreateExtensions.test.ts](../../packages/slonik/src/migrations/__test__/queryToCreateExtensions.test.ts) · [packages/slonik/src/migrations/**test**/runMigrations.test.ts](../../packages/slonik/src/migrations/__test__/runMigrations.test.ts) · [packages/slonik/src/typeParsers/**test**/createBigintTypeParser.test.ts](../../packages/slonik/src/typeParsers/__test__/createBigintTypeParser.test.ts)

---

## graphql

- **npm:** `@prefabs.tech/fastify-graphql`
- **docs:** [packages/graphql/GUIDE.md](../../packages/graphql/GUIDE.md) · [packages/graphql/README.md](../../packages/graphql/README.md)
- **source:** [packages/graphql/src/index.ts](../../packages/graphql/src/index.ts) · [packages/graphql/src/plugin.ts](../../packages/graphql/src/plugin.ts)
- **usage / “demo”:** [packages/graphql/src/**test**/plugin.test.ts](../../packages/graphql/src/__test__/plugin.test.ts) · [packages/graphql/src/**test**/context.spec.ts](../../packages/graphql/src/__test__/context.spec.ts) · [packages/graphql/src/**test**/baseSchema.test.ts](../../packages/graphql/src/__test__/baseSchema.test.ts)

---

## s3

- **npm:** `@prefabs.tech/fastify-s3`
- **docs:** [packages/s3/GUIDE.md](../../packages/s3/GUIDE.md) · [packages/s3/README.md](../../packages/s3/README.md)
- **source:** [packages/s3/src/index.ts](../../packages/s3/src/index.ts) · [packages/s3/src/plugin.ts](../../packages/s3/src/plugin.ts)
- **usage / “demo”:** [packages/s3/src/**test**/plugin.test.ts](../../packages/s3/src/__test__/plugin.test.ts) · [packages/s3/src/**test**/service.test.ts](../../packages/s3/src/__test__/service.test.ts) · [packages/s3/src/plugins/**test**/graphqlUpload.test.ts](../../packages/s3/src/plugins/__test__/graphqlUpload.test.ts)

---

## mailer

- **npm:** `@prefabs.tech/fastify-mailer`
- **docs:** [packages/mailer/GUIDE.md](../../packages/mailer/GUIDE.md) · [packages/mailer/README.md](../../packages/mailer/README.md)
- **source:** [packages/mailer/src/index.ts](../../packages/mailer/src/index.ts) · [packages/mailer/src/plugin.ts](../../packages/mailer/src/plugin.ts)
- **usage / “demo”:** [packages/mailer/src/**test**/registration.test.ts](../../packages/mailer/src/__test__/registration.test.ts) · [packages/mailer/src/**test**/testRoute.test.ts](../../packages/mailer/src/__test__/testRoute.test.ts) · [packages/mailer/src/**test**/sendMail.test.ts](../../packages/mailer/src/__test__/sendMail.test.ts) · [packages/mailer/src/**test**/helpers/createMailerConfig.ts](../../packages/mailer/src/__test__/helpers/createMailerConfig.ts)

---

## firebase

- **npm:** `@prefabs.tech/fastify-firebase`
- **docs:** [packages/firebase/GUIDE.md](../../packages/firebase/GUIDE.md) · [packages/firebase/README.md](../../packages/firebase/README.md) · [packages/firebase/FEATURES.md](../../packages/firebase/FEATURES.md)
- **source:** [packages/firebase/src/index.ts](../../packages/firebase/src/index.ts) · [packages/firebase/src/plugin.ts](../../packages/firebase/src/plugin.ts)
- **usage / “demo”:** [packages/firebase/src/**test**/plugin.test.ts](../../packages/firebase/src/__test__/plugin.test.ts) · [packages/firebase/src/**test**/initializeFirebase.test.ts](../../packages/firebase/src/__test__/initializeFirebase.test.ts) · [packages/firebase/src/**test**/service.test.ts](../../packages/firebase/src/__test__/service.test.ts)

---

## user

- **npm:** `@prefabs.tech/fastify-user`
- **docs:** [packages/user/GUIDE.md](../../packages/user/GUIDE.md) · [packages/user/README.md](../../packages/user/README.md)
- **source:** [packages/user/src/index.ts](../../packages/user/src/index.ts) · [packages/user/src/plugin.ts](../../packages/user/src/plugin.ts)
- **usage / “demo”:** [packages/user/src/**test**/plugin.test.ts](../../packages/user/src/__test__/plugin.test.ts) (Additional behavior is covered in nested `**/__test__` under [packages/user/src](../../packages/user/src).)


<!-- docgen:packages:end -->

---

## meta

- **Last verified:** `5a209913753cc03cbd80ca456de8f90872bc42b9` — docs layout and links were checked against this commit; after meaningful public API, config, or route behavior changes, update [CHANGES.md](./CHANGES.md) if needed and bump this SHA with `pnpm docs:update-verified` once docs match reality.
- **This index + reference:** [docs/llm/INDEX.md](./INDEX.md) · [docs/llm/REFERENCE.md](./REFERENCE.md) (this file)
- **Workspace scripts:** [package.json](../../package.json) (`build`, `test`, `lint`, `typecheck` via Turborepo)

There are no separate standalone demo apps; integration tests and GUIDEs are the canonical “runnable story” for each package.
