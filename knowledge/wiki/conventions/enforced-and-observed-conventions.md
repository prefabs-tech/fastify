---
type: Convention
title: Enforced and Observed Conventions
description: Which contribution rules are actually enforced by a hook, linter, type check, or CI, and which are patterns the code follows by habit, including where the habitual patterns are broken.
tags: [conventions, lint, commitlint, husky, ci, feature-flags, handlers]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: husky-pre-commit
    resource: repo://.husky/pre-commit#L1-L3
    title: Pre-commit hook
  - id: husky-commit-msg
    resource: repo://.husky/commit-msg#L1
    title: Commit-msg hook
  - id: commitlint
    resource: repo://.commitlintrc.json
    title: commitlint config (config-conventional only)
  - id: ci-test
    resource: repo://.github/workflows/test.yml#L1-L27
    title: CI test workflow (build and test only)
  - id: eslint
    resource: repo://packages/slonik/eslint.config.js
    title: Per-package ESLint config
  - id: biome-spec
    resource: repo://docs/specs/biome-migration.md
    title: Biome migration spec (draft) with ESLint rule inventory
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Operating manual (states the conventions)
  - id: graphql-enabled
    resource: repo://packages/graphql/src/plugin.ts#L29-L34
    title: graphql enabled is truthy, uploads.enabled is === false
  - id: s3-rest
    resource: repo://packages/s3/src/plugin.ts#L44
    title: s3 rest.enabled is truthy
  - id: firebase-flags
    resource: repo://packages/firebase/src/plugin.ts#L13-L31
    title: firebase enabled === false; routes disabled truthy
  - id: firebase-test-route
    resource: repo://packages/firebase/src/model/notification/controller.ts#L16
    title: notification.test.enabled truthy
  - id: swagger-flag
    resource: repo://packages/swagger/src/plugin.ts#L12
    title: swagger enabled === false
  - id: phone-flag
    resource: repo://packages/phone-auth/src/plugin.ts#L11
    title: phoneAuth enabled === false
  - id: user-features
    resource: repo://packages/user/src/types/config.ts#L30-L59
    title: user feature defaults
  - id: users-controller
    resource: repo://packages/user/src/model/users/controller.ts#L74-L177
    title: Routes without handler override
  - id: roles-controller
    resource: repo://packages/user/src/model/roles/controller.ts#L13-L58
    title: Roles controller has no handler override slot
  - id: device-resolver
    resource: repo://packages/firebase/src/model/userDevice/graphql/resolver.ts#L17-L38
    title: Resolvers return ErrorWithProps
  - id: git-squash-titles
    resource: repo://.commitlintrc.json
    title: "Commits eccaaa67 'Feat/phone auth package (#1147)' and 17af537c 'Feat/update user profile (#1138)' on main"
---

# Enforced and Observed Conventions

[CLAUDE.md](../../../CLAUDE.md) states the rules for contributors.[^claude-md] This page records **what actually enforces each rule** and where the code departs from rules nothing enforces.

## Enforced

| Rule | Enforced by | Where it can be bypassed |
|------|-------------|--------------------------|
| Conventional commit messages | `commitlint --edit` in the husky `commit-msg` hook, config `@commitlint/config-conventional`[^husky-commit-msg][^commitlint] | Local only. GitHub squash merges use the PR title, and titles like `Feat/phone auth package (#1147)` exist on `main`.[^git-squash-titles] The **scope** is not validated against package names, because no `scope-enum` is configured. |
| ESLint (perfectionist sorting, unicorn, prettier as a lint rule) | `pnpm lint` in the husky `pre-commit` hook[^husky-pre-commit][^eslint][^biome-spec] | **Not run in CI.**[^ci-test] `git commit --no-verify` skips it. |
| Types | `pnpm typecheck` in `pre-commit`[^husky-pre-commit] | **Not run in CI.**[^ci-test] |
| Tests | `pnpm test` in `pre-commit` and CI[^ci-test] | error-handler has no `test` script, so it never runs ([Test suite workflow](../ci/test-suite-workflow.md)) |
| Lockfile matches package.json; peers satisfiable | CI install with `--frozen-lockfile --strict-peer-dependencies`[^ci-test] | none in CI |
| Package builds | CI `pnpm build`[^ci-test] | none in CI |

The Biome spec (draft, 2026-07-11) would replace ESLint and Prettier. It records that perfectionist's sorting of interfaces, unions and class members, and `unicorn/prevent-abbreviations`, would **stop being enforced**.[^biome-spec]

## Observed (nothing enforces these)

### Feature flags "default ON, disable with `=== false`"
The rule holds for `firebase.enabled`, `swagger.enabled`, `phoneAuth.enabled` and graphql `uploads.enabled`.[^firebase-flags][^swagger-flag][^phone-flag][^graphql-enabled] It does **not** hold for:

| Flag | Check | Effective default |
|------|-------|-------------------|
| graphql `enabled` | truthy | **off**[^graphql-enabled] |
| s3 `rest.enabled` (multipart) | truthy | **off**[^s3-rest] |
| firebase `notification.test.enabled` | truthy | off[^firebase-test-route] |
| firebase `appCheck.enabled` | truthy | off |
| user `features.profileValidation.enabled`, `features.signUp.emailVerification`, `features.profileFields.enabled` | truthy | off (JSDoc says so)[^user-features] |
| user `features.signUp.enabled` | `=== false` | on[^user-features] |
| `routes.<x>.disabled` (user, firebase) | `!routes?.x?.disabled` | routes on[^firebase-flags] |

Read the check in the code before assuming the default.

### Handler override slot on every route
The slot is present on firebase routes and on user's users and invitations routes. It is **absent** on:
- user `POST /change-email`, `PUT/DELETE /me/photo`[^users-controller]
- the whole roles, permissions and profileFields controllers[^roles-controller]

`UserConfig.handlers` only has `user` and `invitation` keys, so there is no config shape to override the others.

### Error style differs by surface
REST handlers `throw request.server.httpErrors.*`. GraphQL resolvers **return** `mercurius.ErrorWithProps(message, {}, status)` and catch-and-log service errors.[^device-resolver]

### Other consistent patterns (verified across packages)
- Timestamps are written as strings via slonik's `formatDate`.
- Package DDL is `CREATE TABLE IF NOT EXISTS` in `sql.unsafe`, with table names through `sql.identifier` from config or a constant ([Package schema migrations](../operations/package-schema-migrations.md)).
- Every package ships README.md, GUIDE.md and FEATURES.md.
- Tests mock our own modules (migrations, SuperTokens plugin, `initializeFirebase`) and run real Fastify instances.

## Tooling referenced but not present
CLAUDE.md points to skills `/add-model`, `/new-package`, `/bump-deps` and `/extract-approach`.[^claude-md] In this checkout `.claude/skills/` holds only a stub `CONVENTIONS.md` and the repokb skills, and `.gitignore` ignores `**/skills`, so skills are not committed.

[^husky-pre-commit]: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
[^husky-commit-msg]: `pnpm commitlint --edit $1`.
[^commitlint]: `{ "extends": ["@commitlint/config-conventional"] }`.
[^ci-test]: Steps: checkout, node, pnpm install (frozen, strict peers), `pnpm build`, `pnpm test`.
[^eslint]: Extends `@prefabs.tech/eslint-config/fastify.js` and turns off `unicorn/filename-case` for `__test__`.
[^biome-spec]: §2 current-state table and §3.2 gaps.
[^claude-md]: "Cross-cutting rules" and "Code style" sections; the skills are named in the quality bar.
[^graphql-enabled]: `if (options?.enabled)` vs `options.uploads?.enabled !== false`.
[^s3-rest]: `if (options.rest?.enabled)`.
[^firebase-flags]: `config.firebase.enabled === false`; `!routes?.notifications?.disabled`.
[^firebase-test-route]: `if (notificationConfig?.test?.enabled)`.
[^swagger-flag]: `if (options.enabled === false)`.
[^phone-flag]: `if (fastify.config.phoneAuth?.enabled === false)`.
[^user-features]: JSDoc defaults on the feature flags.
[^users-controller]: `handlers.changeEmail` L89, `handlers.uploadPhoto` L158, `handlers.removePhoto` L176.
[^roles-controller]: Every route passes `handlers.<name>` directly.
[^device-resolver]: `return new mercurius.ErrorWithProps("Firebase is not enabled", {}, 404)`.
[^git-squash-titles]: Seen in `git log --oneline` on 2026-09-11.
