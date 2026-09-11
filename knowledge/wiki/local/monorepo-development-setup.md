---
type: Setup
title: Monorepo Development Setup
description: Clone to green checks on a fresh machine (toolchain versions, install, build-before-test ordering, what the git hooks run) plus the snags, including why no database is needed and how to try a change inside a consuming app.
tags: [setup, local, pnpm, node, husky, turbo]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: root-pkg
    resource: repo://package.json#L9-L31
    title: Scripts, packageManager, engines
  - id: nvmrc
    resource: repo://.nvmrc
    title: Node version file
  - id: ci
    resource: repo://.github/workflows/test.yml#L8-L27
    title: CI Node matrix and steps
  - id: turbo
    resource: repo://turbo.json#L3-L27
    title: Task graph
  - id: husky-pre-commit
    resource: repo://.husky/pre-commit#L1-L3
    title: Pre-commit hook
  - id: husky-commit-msg
    resource: repo://.husky/commit-msg#L1
    title: Commit-msg hook
  - id: makefile
    resource: repo://makefile
    title: Make targets
  - id: readme
    resource: repo://README.md
    title: Root README (make targets, pnpm link, troubleshooting)
  - id: pg-mem-helper
    resource: repo://packages/slonik/src/__test__/helpers/createDatabase.ts#L1-L40
    title: Tests use pg-mem
  - id: user-test-mocks
    resource: repo://packages/user/src/__test__/plugin.test.ts#L16-L30
    title: SuperTokens and migrations mocked in tests
  - id: error-handler-scripts
    resource: repo://packages/error-handler/package.json#L25-L31
    title: error-handler has no test script
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Commands table and stale node_modules symptoms
---

# Monorepo Development Setup

## Toolchain
| Tool | Version | Source |
|------|---------|--------|
| Node | `>=20`; `.nvmrc` pins **24**; CI tests 20, 22 and 24 | [^root-pkg][^nvmrc][^ci] |
| pnpm | `packageManager: pnpm@10.29.3`, engines `>=10` | [^root-pkg] |

No Docker, database, SuperTokens core, S3, SMTP or Firebase project is needed to build and test. Service and factory tests run on **pg-mem**, an in-memory Postgres,[^pg-mem-helper] and plugin tests mock SuperTokens and migrations.[^user-test-mocks]

## Clone to green
```bash
pnpm -r install     # also runs "prepare": husky installs the git hooks
pnpm build          # REQUIRED before typecheck/test (see below)
pnpm lint
pnpm typecheck
pnpm test
```
The `make install`, `make build`, `make lint`, `make typecheck` and `make test` targets in the README wrap the same commands.[^makefile][^readme]

## Snags
1. **Build first.** Packages import siblings from `dist/`, and turbo's `test` and `typecheck` do not depend on `build`.[^turbo] Without a build, tests fail on unresolved `@prefabs.tech/fastify-*` imports. After changing a package, rebuild it before testing its dependents. See [Stale sibling build](../troubleshooting/stale-sibling-build.md).
2. **Your first commit runs the full check.** The pre-commit hook runs `pnpm lint`, `pnpm typecheck` and `pnpm test`, **without** a build.[^husky-pre-commit] On a fresh clone, build before committing. The commit-msg hook enforces conventional commits.[^husky-commit-msg]
3. **Reinstall after any `package.json` change, and at the start of a session on an old checkout.** Stale `node_modules` shows up as vitest "Failed to load url <pkg>" for a declared devDependency, or `lint:fix` moving `import type` groups after value imports.[^claude-md] CI uses `--frozen-lockfile`, so commit the lockfile.
4. **error-handler tests are not part of `pnpm test`**, because the package has no `test` script.[^error-handler-scripts] Run them directly:
   ```bash
   pnpm --filter @prefabs.tech/fastify-error-handler exec vitest run
   ```
5. **Some Make targets do nothing useful.** `make test.ci`, `make test.unit` and `make test.integration` call root scripts that do not exist.[^makefile][^root-pkg]
6. **Never run bare `vitest` at the root, and never use watch mode.** Use `pnpm --filter <pkg> test`, or `exec vitest run <file>` for a single file.[^claude-md]

## Trying a change inside a consuming app
The README describes linking the built package into the app with `pnpm link ./<path>/packages/<name>`, and unlinking with `pnpm unlink`.[^readme] Its troubleshooting notes add:
- Keep `package.json` and the lockfile in sync.
- Restart the API after linking or unlinking.
- Link **every** library that defines or uses a shared context together.

> Inference: the last point matters because siblings are peers that augment each other's types and decorators ([Dependency layout](../conventions/dependency-layout.md)). A linked package paired with an npm-installed sibling can load two copies.

## Environment variables
None are needed to build or test. `.env.example` lists only `GITHUB_TOKEN`, which is for Ship.js releases. See [Secrets and credentials](../security/secrets-and-credentials.md).

[^root-pkg]: `packageManager` L27; engines L28-31; the scripts block has no `test:ci`, `test:unit` or `test:integration`.
[^nvmrc]: Contents: `24`.
[^ci]: `matrix.node-version: [20, 22, 24]`.
[^pg-mem-helper]: `newDb()` then `db.adapters.createSlonik(...)`.
[^user-test-mocks]: `vi.mock("../supertokens", ...)`, `vi.mock("../migrations/runMigrations", ...)`.
[^makefile]: `install: pnpm -r install`; the `test.*` targets.
[^readme]: Sections "Installation & Usage", "Developing locally & testing", "Troubleshooting".
[^turbo]: Only `build` has `dependsOn: ["^build"]`.
[^husky-pre-commit]: Three commands, no build.
[^husky-commit-msg]: `pnpm commitlint --edit $1`.
[^error-handler-scripts]: No `test` entry.
[^claude-md]: "Commands" table and mistakes-table row 21.
