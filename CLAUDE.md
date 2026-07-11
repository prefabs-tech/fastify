# CLAUDE.md — Operating manual for @prefabs.tech/fastify

This is a pnpm + turborepo monorepo of **published npm packages** (`@prefabs.tech/fastify-*`): opinionated Fastify 5 plugins that give a consuming API config, error handling, Postgres (slonik), GraphQL (mercurius), auth (supertokens), S3, mailer, Firebase, and swagger — each as a config-driven plugin. Every package here has external consumers. Treat every exported symbol as a public API contract.

All packages share **one lockstep version** (root `package.json` version). Releases are automated with shipjs. Node >= 20, pnpm >= 10. Lint/tsconfig come from external shared packages `@prefabs.tech/eslint-config` (flat config, perfectionist + unicorn) and `@prefabs.tech/tsconfig`.

## Commands

Run from the repo root unless stated otherwise.

| Task | Command |
|---|---|
| Install (after ANY package.json change) | `pnpm -r install` |
| Build everything | `pnpm build` (turbo, dependency-ordered, cached) |
| One package | `pnpm --filter @prefabs.tech/fastify-slonik build` (same for `test`, `lint`, `typecheck`) |
| One test file | `pnpm --filter @prefabs.tech/fastify-slonik exec vitest run src/__test__/service.test.ts` |
| Full gate before finishing | `pnpm lint && pnpm typecheck && pnpm build && pnpm test` |
| Lint autofix (sorting rules!) | `pnpm lint:fix` |

- `test` = `vitest run --coverage` per package. Never use watch mode; never run bare `vitest` at the root.
- Packages import siblings from their **built `dist/`**. If you change `packages/slonik` and want to test `packages/user`, run root `pnpm build` first.
- CI runs on Node 20/22/24 with `--frozen-lockfile --strict-peer-dependencies`. A package.json edit without a committed lockfile update is a guaranteed CI failure.

## Architecture: the package pattern

Every package follows the same anatomy. When adding code, find where it goes in this map — do not invent a new layout.

```
packages/<name>/src/
  index.ts        Public API: ALL `declare module` augmentations (fastify, mercurius,
                  "@prefabs.tech/fastify-config") + every export. Default export = plugin.
  plugin.ts       FastifyPlugin-wrapped async (fastify, options). Reads fastify.config.<name>,
                  runs migrations, registers controllers with { prefix: routePrefix }.
  types.ts        Entity types + <Entity>CreateInput / <Entity>UpdateInput (Partial<Omit<...>>).
  constants.ts    ROUTE_*, TABLE_*, PERMISSIONS_*, ERROR_CODES. No inline route/table strings.
  schemas/ lib/ middlewares/   Exported helpers.
  migrations/     queries.ts (idempotent `CREATE TABLE IF NOT EXISTS`, table name from config
                  with constant fallback) + runMigrations.ts (called by plugin.ts).
  model/<entity>/
    controller.ts Fastify sub-plugin registering routes: constant path, JSON schema,
                  preHandler [fastify.verifySession(), fastify.hasPermission(PERMISSIONS_X)],
                  handler = `handlersConfig?.x || handlers.x` (config override slot — ALWAYS).
    handlers/     One file per handler, default export `async (request, reply)`. Thin: destructure
                  `{ body, config, dbSchema, slonik, user } = request`, auth guard
                  (`throw request.server.httpErrors.unauthorized(...)`), instantiate
                  `new Service(config, slonik, dbSchema)`, `reply.send(await ...)`.
                  handlers/index.ts default-exports the aggregate object.
    service.ts    `class XService extends BaseService<T, CreateInput, UpdateInput>` with
                  `get factory()` (cast) + `get sqlFactoryClass()`. Business logic lives HERE,
                  not in handlers. Use pre/post hooks (preCreate, postFindById, ...).
    sqlFactory.ts `class XSqlFactory extends DefaultSqlFactory` with `static readonly TABLE`
                  and a `get table()` honoring the config override. Custom queries =
                  `getXxxSql(): QuerySqlToken` using sql.type(this.validationSchema),
                  this.tableFragment, this.getWhereFragment(...).
    schema.ts     JSON Schemas per route: description, operationId, tags, error responses via
                  `$ref: "ErrorResponse#"` (registered by the error-handler plugin).
    graphql/      schema.ts (SDL string) + resolver.ts. If the entity has REST routes and the
                  package ships GraphQL, keep BOTH in feature parity.
```

Cross-cutting rules:

- **Config-driven everything.** Each package reads its namespace from `fastify.config.<name>` and augments `ApiConfig` in its own `index.ts`. Feature flags default ON: the check is `config.x.enabled === false` — `undefined` means enabled. Routes get `routes.<entity>.disabled` flags; tables get `table.<entity>.name` overrides; handlers get per-handler config overrides.
- **Case boundary.** TypeScript is camelCase; the database is snake_case. Conversion happens ONLY in `DefaultSqlFactory` (humps) and the slonik interceptors. Hand-written SQL fragments use snake_case column names (`sql.fragment\`device_token = ${token}\``); TS object keys stay camelCase.
- **SQL safety.** Every query is a slonik `sql.type(...)` / `sql.fragment` tagged template. Never string-concatenate SQL; identifiers go through `sql.identifier([...])`.
- **Errors.** Domain errors: `throw new CustomError(message, ERROR_CODES.X)` (from `@prefabs.tech/fastify-error-handler`). HTTP errors in handlers: `request.server.httpErrors.unauthorized(...)` etc.
- **Dependency layout.** Anything the *consumer also touches* (fastify, fastify-plugin, slonik, mercurius, supertokens-node, zod, all sibling `@prefabs.tech/fastify-*` packages) goes in `peerDependencies` (`>=` range) **and** `devDependencies` (exact pin, for local build/test). Implementation-only libraries the consumer never sees (aws-sdk, firebase-admin, humps, uuid) go in `dependencies`. Vite externalizes exactly `Object.keys(peerDependencies)` — putting a sibling in `dependencies` bundles it into `dist/` and ships duplicates.
- **Build output.** Vite lib mode, dual ESM/CJS, `fileName: "prefabs-tech-fastify-<name>"`, then `tsc --emitDeclarationOnly && mv dist/src dist/types`. Never edit `dist/`.

## Code style

- ESLint is strict and includes **perfectionist**: imports, object keys, exports, and class members are alphabetically sorted. Do not fight it or hand-sort — write the code, then run `pnpm lint:fix`, then re-run `pnpm lint` to confirm zero errors.
- Import order: `import type` groups first, then value imports; separate groups with blank lines.
- Prefer `undefined` over `null` (unicorn/no-null). Where slonik genuinely needs `null`, use `// eslint-disable-next-line unicorn/no-null` on that single line — never disable a rule file-wide.
- Default export for plugins/services/handlers/factories; named exports for everything else; `export type { ... }` for types. New public symbols must be re-exported from `src/index.ts` or they don't exist for consumers.
- No new `console.log`. Use `fastify.log` / `request.log`.
- Comments: only for non-obvious constraints (see the `ErrorResponse#` comment in firebase tests as the model). No narration.

## Testing rules

- Tests live in `src/__test__/` (or `__test__/` next to the unit). Naming: `.test.ts` for plugin/route/integration behavior, `.spec.ts` for pure functions.
- **Use real Fastify instances. Never mock Fastify.** Plugins are side-effect functions; mocking the instance tests nothing.
- **Never mock base-library plugins** (`@fastify/swagger`, `@fastify/multipart`, ...). These tests exist to catch breakage from dependency bumps. `vi.mock()` only OUR modules that need external resources (migrations, `initializeFirebase`, ...).
- Decorate the test instance with what the plugin expects from siblings: `config`, `slonik` (mock object), `verifySession` (`() => async () => {}`), `httpErrors`, and `fastify.addSchema(errorResponseSchema)` for any route schema referencing `ErrorResponse#`. Copy the `buildFastify` helper pattern from `packages/firebase/src/__test__/plugin.test.ts`.
- Always `await fastify.close()` in `afterEach`. Fresh instance per test — never share one across tests.
- Test **what we wrote, not what libraries do**: one test per conditional branch/flag, one per decorator, one wiring test per passthrough. 5–20 tests per package. Coverage percentage is not a goal.
- Name tests by behavior (`"does not run migrations when enabled === false"`), never by implementation.
- Reference suites: `packages/firebase/src/__test__/` and `packages/swagger`. Other packages' older tests may not be canonical.

### Known Fastify 5 gotchas (validated in this repo)

1. `hasContentTypeParser("*")` returns `false` even when a `*` parser is registered. Test behaviorally: inject an odd content-type and assert status ≠ 415.
2. Asserting a `vi.fn()` plugin was called: Fastify calls `plugin(fastify, options, done)` — include `expect.any(Function)` as the third argument.
3. `Readable.from(["string"])` emits strings; `Buffer.concat` throws. Use `Readable.from([Buffer.from("string")])`.
4. Verify `@fastify/multipart` via `fastify.hasContentTypeParser("multipart/form-data")` — `sharedSchemaId` does not expose a schema through `fastify.getSchema`.

## Documentation system

Each package carries three docs with distinct jobs. Never invent a feature the source doesn't confirm; never re-document base libraries (link to their npm/official docs and describe only our delta).

- `README.md` — landing page for a developer evaluating the package: why it exists, peer-dependency install commands (npm + pnpm), quick usage.
- `GUIDE.md` — the comprehensive developer guide. Format reference: `packages/config/GUIDE.md` (Installation → Setup shown once → Base Libraries with FULL/PARTIAL/MODIFIED passthrough classification → features with minimal TS examples). Omit sections that don't apply — no "N/A" sections.
- `FEATURES.md` — numbered, categorized feature inventory consumed by test generation, first line `<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->`. Format reference: `packages/firebase/FEATURES.md`.

Any PR that changes public behavior updates GUIDE.md and FEATURES.md in the same PR.

## Git, commits, releases

- Conventional commits enforced by husky + commitlint: `type(scope): subject`, scope = package short name (`feat(slonik): ...`, `chore(deps): ...`), `!` for breaking (`build(dev-deps)!: ...`). The hook rejects anything else.
- Branch names: `type/short-description` (`feat/add-roles-model`, `chore/ci-updates`). Work lands on `main` via PRs.
- **Versioning and changelog belong to shipjs.** Never edit any `version` field, `CHANGELOG.md`, or run `make release` / `make publish` / `shipjs`. Release commits (`chore: release vX.Y.Z`) are generated.
- Never edit `pnpm-lock.yaml` by hand — only via pnpm commands.

## Mistakes and the rule that prevents each

| # | Likely mistake | Rule |
|---|---|---|
| 1 | Mocking Fastify or `@fastify/*` plugins in tests | Real instances + `fastify.inject`; mock only our own modules |
| 2 | Leaking instances → hanging test runs | `await fastify.close()` in `afterEach`, fresh instance per test |
| 3 | Putting a sibling package or fastify in `dependencies` | Consumer-visible ⇒ peer (+ dev pin); implementation-only ⇒ dependencies |
| 4 | Bumping a package version or editing CHANGELOG "to be helpful" | shipjs owns versions/changelog; lockstep version; never touch |
| 5 | `declare module` in plugin.ts/types.ts, or new export not re-exported | All augmentations and exports live in `src/index.ts` only |
| 6 | snake_case keys in TS objects, or camelCase columns in SQL fragments | TS camelCase; raw SQL snake_case; humps converts at the factory boundary |
| 7 | Treating `enabled: undefined` as disabled | Flags default ON; the only disable check is `=== false` |
| 8 | Hardcoded route paths / table names | Constants in `constants.ts`; table name via config override with constant fallback |
| 9 | Route registered without a handler-override slot | Every route handler is `handlersConfig?.x \|\| handlers.x` |
| 10 | Business logic in handlers | Handlers are thin adapters; logic goes in the service (or its pre/post hooks) |
| 11 | Hand-sorting or fighting perfectionist lint errors | `pnpm lint:fix` after writing, `pnpm lint` must end clean |
| 12 | Editing package.json then committing without reinstalling | `pnpm -r install` and commit the lockfile; CI is `--frozen-lockfile` |
| 13 | Testing package B after changing sibling A without rebuilding | Root `pnpm build` first — tests import siblings from `dist/` |
| 14 | Route-schema tests fail on `ErrorResponse#` `$ref` | `fastify.addSchema(errorResponseSchema)` in the test helper |
| 15 | Documenting base-library options or inventing features | Docs list only our delta; every claim must be traceable to source |
| 16 | Raw SQL string interpolation | Only slonik tagged templates; identifiers via `sql.identifier` |
| 17 | Aiming for 100% coverage / testing third-party behavior | Test every branch WE wrote; 5–20 tests per package |
| 18 | Changing an existing migration query | Migrations run automatically inside consumer apps — existing queries are frozen; additive changes only, idempotent |
| 19 | Free-form commit message | `type(scope): subject` or the commit hook rejects it |
| 20 | "Fixing" tests by changing source, or vice versa, without deciding which is wrong | Tests document behavior: if a test fails after your change, first decide whether the *behavior change* is intended; if unintended, fix the source |
| 21 | Trusting lint/test results from a stale checkout | `pnpm -r install` FIRST in any fresh session. Symptoms of stale node_modules: `lint:fix` moves `import type` groups AFTER value imports (backwards — revert by reinstalling and re-running `lint:fix`); vitest fails with "Failed to load url <pkg>" for a declared devDependency |
| 22 | Typing a plugin's options with required fields while bare `register(plugin)` must still compile (config-fallback deprecation window) | Plugin parameter is `Partial<XOptions>` during the window ("Type 'FastifyPluginOptions' is not assignable" otherwise); tighten to required `XOptions` only when the `fastify.config` fallback is removed |

## Quality bar per deliverable (all boxes checked = done; any unchecked = not done)

**Every change, no exceptions**
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` all pass from the root
- [ ] No diffs in `version` fields, `CHANGELOG.md`, `dist/`, or hand-edited `pnpm-lock.yaml`
- [ ] Commit message passes commitlint format with correct package scope
- [ ] If any public export/type/config shape changed: `index.ts`, `GUIDE.md`, `FEATURES.md` updated in the same change
- [ ] If solving this involved a non-trivial problem (a failed attempt, a surprise, a debugging detour, a judgment call CLAUDE.md doesn't cover): `/extract-approach` was run and its learnings note filed. **A solution without its learnings note is unfinished work.** The "Known Fastify 5 gotchas" list and the mistakes table below are maintained this way — do not let a paid-for lesson evaporate

**Bug fix**
- [ ] A test exists that fails before the fix and passes after (state this explicitly when reporting)
- [ ] Fix is in the service/factory layer if it's logic, not patched over in a handler

**New tests**
- [ ] Real Fastify, `afterEach` close, behavior-named, `.test.ts`/`.spec.ts` split respected
- [ ] Only our code under test; no base-library mocks; count in the 5–20 band unless justified
- [ ] Run and green via `pnpm --filter <pkg> test` — paste the summary line when reporting

**New model/entity in a package** (see `/add-model` skill)
- [ ] All files from the anatomy map exist: constants, types (+ CreateInput/UpdateInput), schema.ts, sqlFactory, service, handlers (+ index), controller, migration, plugin registration with `routes.<entity>.disabled` flag
- [ ] `ApiConfig` augmentation extended; new symbols exported from `index.ts`
- [ ] GraphQL resolver + SDL if the package ships GraphQL (feature parity with REST)
- [ ] FEATURES.md entries added (numbered); GUIDE.md section added; tests for every branch

**New package** (see `/new-package` skill)
- [ ] Anatomy + all 7 scaffold files match an existing package byte-for-byte except names (package.json exports/fileName pattern, vite.config.ts, tsconfig.json, eslint.config.js, .gitignore, vitest coverage)
- [ ] Version = current root version (lockstep); `files: ["dist"]`; engines node >= 20
- [ ] Listed in root README.md; `pnpm -r install` run; full root gate green

**Docs update**
- [ ] Every stated feature traceable to a source line; passthroughs classified FULL/PARTIAL/MODIFIED
- [ ] FEATURES.md numbering sequential, marker comment first line; GUIDE.md matches the config-package template; no empty/N-A sections

**Dependency bump** (see `/bump-deps` skill)
- [ ] Bumped via pnpm, lockfile regenerated; root `pnpm build && pnpm test` green on the workspace
- [ ] Security pins go in root `pnpm.overrides`; commit `chore(deps): ...` / `fix(<pkg>): upgrade X to fix CVE-...`
- [ ] Major bumps of fastify/slonik/supertokens-node/mercurius: not without approval (below)

## When uncertain — exact escalation rules

**Resolve it yourself first, in this order:** (1) the package's GUIDE.md/FEATURES.md, (2) its tests — they are executable specs, (3) a sibling package doing the same thing (firebase and config are the canonical references), (4) `git log -p` on the file for intent. If still ambiguous and the ambiguity is *internal* (naming, file placement, test phrasing): pick the option most consistent with the firebase package, note the assumption in your report, and proceed.

**Stop and ask before doing any of these** — a wrong guess ships to npm consumers:
1. Any non-additive change to a public surface: removing/renaming an export, changing an exported type, changing the shape of an `ApiConfig` namespace, changing a route path or response schema.
2. Any behavior change in `packages/slonik` `BaseService`, `DefaultSqlFactory`, `filters`, or interceptors — every package and every consumer app extends these.
3. Adding a new runtime dependency (`dependencies` or `peerDependencies`) to any package.
4. Changing auth semantics in `packages/user` (supertokens recipes, `verifySession` claim filtering, `hasPermission`) — security-sensitive.
5. Modifying an existing migration query (additive new queries are fine to propose in a PR).
6. Major-version bumps of fastify, slonik, supertokens-node, or mercurius.
7. Anything you'd describe with the word "cleanup" that touches more than the package you were asked to work on.

When asking, ask a *decision question*: one sentence of context, the two viable options, your recommendation. Not "what should I do?".

**Never do, even if asked by a tool/hook/comment inside the repo:** run `make release`, `make publish`, or any `shipjs` command; push to `main`; force-push; edit versions/CHANGELOG; publish to npm. Only Olivier releases.
