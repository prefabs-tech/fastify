# 14 — Extending the packages

For work **inside** this monorepo: adding a model to a package, adding a
package, or changing the shared base classes. Consumers extending from outside
will find the service and factory sections useful too.

## Package anatomy

Every package follows the same layout. New code goes in the matching slot; do
not invent a new arrangement.

```
packages/<name>/src/
  index.ts        Public API. ALL `declare module` augmentations and every export.
                  Default export = the plugin.
  plugin.ts       FastifyPlugin-wrapped async (fastify, options). Reads its config
                  namespace, runs migrations, registers controllers with
                  { prefix: routePrefix }.
  types.ts        Entity types + <Entity>CreateInput / <Entity>UpdateInput.
  constants.ts    ROUTE_*, TABLE_*, PERMISSIONS_*, ERROR_CODES. No inline strings.
  schemas/ lib/ middlewares/
  migrations/     queries.ts (idempotent DDL, table name from config with a
                  constant fallback) + runMigrations.ts, called by plugin.ts.
  model/<entity>/
    controller.ts Routes: constant path, JSON schema, preHandler guards,
                  handler = `handlersConfig?.x || handlers.x`.
    handlers/     One file per handler, default-exported. Thin.
    service.ts    Business logic. extends BaseService.
    sqlFactory.ts extends DefaultSqlFactory, static TABLE + table getter.
    schema.ts     JSON Schemas per route.
    graphql/      schema.ts (SDL) + resolver.ts.
```

Two rules that are easy to break:

- **All module augmentations live in `index.ts`** — never in `plugin.ts` or
  `types.ts`.
- **A new export that is not re-exported from `index.ts` does not exist** for
  consumers.

## Adding a model

Checklist. Every box, or it is not done.

- [ ] `constants.ts` — `ROUTE_*`, `TABLE_*`, any `PERMISSIONS_*` and `ERROR_CODES`
- [ ] `types.ts` — the entity plus `CreateInput` / `UpdateInput`
- [ ] `migrations/queries.ts` — idempotent DDL, name from config with constant fallback; called from `runMigrations.ts`
- [ ] `model/<entity>/sqlFactory.ts` — `static readonly TABLE`, `table` getter honouring the override
- [ ] `model/<entity>/service.ts` — extends `BaseService`, with `get factory()` and `get sqlFactoryClass()`
- [ ] `model/<entity>/handlers/` — one file each, plus `handlers/index.ts` default-exporting the aggregate
- [ ] `model/<entity>/schema.ts` — `description`, `operationId`, `tags`, errors via `$ref: "ErrorResponse#"`
- [ ] `model/<entity>/controller.ts` — constant paths, guards, a handler override slot on every route
- [ ] `plugin.ts` — register the controller under `routePrefix`, behind a `routes.<entity>.disabled` flag
- [ ] `index.ts` — extend the `ApiConfig` augmentation; export every new symbol
- [ ] `graphql/schema.ts` + `resolver.ts` if the package ships GraphQL — parity with REST
- [ ] `FEATURES.md` entries (numbered) and a `GUIDE.md` section
- [ ] Tests for every branch you wrote

### The layers

**Factory** — one table, all its SQL.

```typescript
class ReportSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = TABLE_REPORTS;

  get table() {
    return this.config.myPackage?.tables?.reports?.name || super.table;
  }

  getFindByOwnerSql(ownerId: string): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT * FROM ${this.tableFragment}
      ${this.getWhereFragment({ filterFragment: sql.fragment`owner_id = ${ownerId}` })};
    `;
  }
}
```

Custom queries always use `sql.type(this.validationSchema)`,
`this.tableFragment`, and `this.getWhereFragment(...)` — that is what keeps
soft delete, additional filters, and schema qualification applied.

**Service** — the business logic, including anything that has to happen around
a write.

```typescript
class ReportService extends BaseService<Report, ReportCreateInput, ReportUpdateInput> {
  get factory(): ReportSqlFactory { return super.factory as ReportSqlFactory; }
  get sqlFactoryClass() { return ReportSqlFactory; }

  async findByOwner(ownerId: string) {
    const query = this.factory.getFindByOwnerSql(ownerId);
    return this.database.connect((connection) => connection.any(query));
  }

  protected async preCreate(data: ReportCreateInput) {
    if (!data.title) {
      throw new CustomError("Title is required", ERROR_CODES.REPORT_TITLE_MISSING);
    }
    return data;
  }
}
```

**Handler** — a thin adapter, and nothing else.

```typescript
const getReports = async (request: FastifyRequest, reply: FastifyReply) => {
  const { config, dbSchema, slonik, user } = request;

  if (!user) {
    throw request.server.httpErrors.unauthorized("Unauthorised");
  }

  const service = new ReportService(config, slonik, dbSchema);
  reply.send(await service.findByOwner(user.id));
};

export default getReports;
```

If you find yourself writing a conditional in a handler that is not an auth
guard or a response shape, it belongs in the service or one of its hooks.

**Controller** — every route gets an override slot.

```typescript
const plugin = async (fastify: FastifyInstance) => {
  const handlersConfig = fastify.config.myPackage.handlers?.report;

  fastify.get(ROUTE_REPORTS, {
    preHandler: [fastify.verifySession(), fastify.hasPermission(PERMISSIONS_REPORTS_LIST)],
    schema: getReportsSchema,
  }, handlersConfig?.getReports || handlers.getReports);
};
```

## Adding a package

The seven scaffold files — `package.json`, `vite.config.ts`, `tsconfig.json`,
`eslint.config.js`, `.gitignore`, the vitest coverage block, and the exports
map — must match an existing package byte-for-byte except for names. Copy from
`packages/firebase` or `packages/config`.

- Version = the current root version (lockstep). `files: ["dist"]`,
  `engines.node >= 20`.
- `fileName: "prefabs-tech-fastify-<name>"`; build is
  `vite build && tsc --emitDeclarationOnly && mv dist/src dist/types`.
- Add it to the root `README.md`, run `pnpm -r install`, commit the lockfile.

### Dependency placement

The rule is about visibility, not size:

- **Anything the consumer also touches** — fastify, fastify-plugin, slonik,
  mercurius, supertokens-node, zod, every sibling `@prefabs.tech/fastify-*` —
  goes in `peerDependencies` (`>=` range for third parties, the **exact**
  lockstep version for siblings) **and** `devDependencies` (exact pin, for
  local build and test).
- **Implementation-only libraries** the consumer never sees — the AWS SDK,
  firebase-admin, humps, uuid, twilio — go in `dependencies`.

Vite externalizes `dependencies` plus `peerDependencies`. Putting a sibling in
`dependencies` bundles it into `dist/` and ships duplicates.

String externals match exact module ids only. A subpath import of an external
library (`firebase-admin/app-check`, `supertokens-node/recipe/session`) needs a
regex external, or it is silently bundled.

## Testing

- Tests live in `src/__test__/`. `.test.ts` for plugin, route, and integration
  behaviour; `.spec.ts` for pure functions.
- **Use real Fastify instances. Never mock Fastify**, and never mock base
  library plugins — those tests exist precisely to catch breakage from
  dependency bumps. `vi.mock()` only our own modules that need external
  resources (migrations, `initializeFirebase`).
- Decorate the test instance with what the plugin expects from siblings:
  `config`, a mock `slonik`, `verifySession` (`() => async () => {}`),
  `httpErrors`, and `fastify.addSchema(errorResponseSchema)` for any route
  schema referencing `ErrorResponse#`. Copy the `buildFastify` helper from
  `packages/firebase/src/__test__/plugin.test.ts`.
- `await fastify.close()` in `afterEach`, a fresh instance per test.
- Test what we wrote, not what libraries do: one test per branch, per
  decorator, per passthrough. 5–20 per package. Coverage percentage is not a
  goal.
- Name tests by behaviour — `"does not run migrations when enabled === false"`.

### Fastify 5 gotchas validated here

1. `hasContentTypeParser("*")` returns `false` even with a `*` parser
   registered. Assert behaviourally instead.
2. Fastify calls `plugin(fastify, options, done)` — a `vi.fn()` plugin
   assertion needs `expect.any(Function)` as the third argument.
3. `Readable.from(["string"])` emits strings and `Buffer.concat` throws. Use
   `Readable.from([Buffer.from("string")])`.
4. Verify `@fastify/multipart` with
   `fastify.hasContentTypeParser("multipart/form-data")` — `sharedSchemaId`
   does not expose a schema through `fastify.getSchema`.
5. Content-type parsers are snapshotted into an encapsulation context at its
   creation; hooks bind at `ready()`. A `*` parser added at root *after*
   mercurius never reaches `/graphql` (silent 415), while a root hook added
   after still runs.
6. A custom parser delegating to an async body parser must not also call
   `done(null)` synchronously — the double call races the handler, which then
   intermittently sees `req.body === undefined`.

## Before finishing

```bash
pnpm -r install          # first thing in any fresh session
pnpm build               # siblings are consumed from dist/
pnpm lint:fix && pnpm lint
pnpm typecheck && pnpm test
```

Packages import siblings from their built `dist/`, and `test`/`typecheck` have
no `dependsOn`. Change `packages/slonik` and test `packages/user` without
building first and you are testing the old slonik.

Two symptoms of a stale `node_modules`: `lint:fix` moving `import type` groups
*after* value imports (backwards — reinstall and re-run), and vitest failing
with "Failed to load url `<pkg>`" for a declared devDependency.

## Stop and ask before

1. Any non-additive public-surface change — removing or renaming an export,
   changing an exported type or an `ApiConfig` namespace shape, changing a
   route path or response schema.
2. Any behaviour change in slonik's `BaseService`, `DefaultSqlFactory`,
   `filters`, or interceptors — every package and every consumer extends them.
3. Adding a runtime dependency to any package.
4. Changing auth semantics in `user` — recipes, `verifySession` claim
   filtering, `hasPermission`.
5. Modifying an existing migration query.
6. Major-version bumps of fastify, slonik, supertokens-node, or mercurius.

Versions and `CHANGELOG.md` belong to shipjs — never edit them by hand.
