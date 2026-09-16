---
type: Runbook
title: Package Schema Migrations
description: Which package creates which tables in a consuming app's database and when, why edits to an existing CREATE TABLE never reach existing databases, and how to change package schema safely.
tags: [migrations, postgres, schema, operations, ddl]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: slonik-extensions
    resource: repo://packages/slonik/src/migrations/runMigrations.ts#L6-L16
    title: Extensions on every boot
  - id: migrate
    resource: repo://packages/slonik/src/migrate.ts#L8-L37
    title: App SQL-file migrations
  - id: s3-queries
    resource: repo://packages/s3/src/migrations/queries.ts#L12-L34
    title: files table
  - id: user-queries
    resource: repo://packages/user/src/migrations/queries.ts#L17-L159
    title: users, invitations, profile field tables
  - id: user-run
    resource: repo://packages/user/src/migrations/runMigrations.ts#L11-L26
    title: user migrations in a transaction
  - id: firebase-queries
    resource: repo://packages/firebase/src/migrations/queries.ts#L9-L31
    title: user_devices table in a DO block
  - id: phone-queries
    resource: repo://packages/phone-auth/src/migrations/queries.ts#L7-L14
    title: phone_number column (ALTER ... IF NOT EXISTS)
  - id: phone-plugin
    resource: repo://packages/phone-auth/src/plugin.ts#L21-L28
    title: phone-auth migrates on onReady
  - id: users-factory
    resource: repo://packages/user/src/model/users/sqlFactory.ts#L35-L36
    title: Hard-coded public.st__user_roles
  - id: user-exports
    resource: repo://packages/user/src/index.ts#L43
    title: Migration query builders exported
  - id: commit-deleted-at
    resource: repo://packages/user/src/migrations/queries.ts#L68
    title: "Commit ddf6eb2a, 2025-05-08: feat(user): delete my user account (#944), added deleted_at inside CREATE TABLE"
  - id: commit-photo-id
    resource: repo://packages/user/src/migrations/queries.ts#L65-L71
    title: "Commit f94e89d3, 2025-07-21: feat: upload / remove user photo (#988), added photo_id and FK inside CREATE TABLE"
  - id: commit-removed-cols
    resource: repo://packages/user/src/migrations/queries.ts#L55-L74
    title: "Commit 3a717520, 2025-03-11: fix: remove unnecessary columns from the user migration (#908)"
  - id: commit-uploaded-by
    resource: repo://packages/s3/src/migrations/queries.ts#L26
    title: "Commit 0c71fe9c, 2025-09-26: fix!: make upload by id optional for files model (#1027)"
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Mistakes table entry 18, migrations are frozen
---

# Package Schema Migrations

Consumer apps get tables they never wrote. There are two separate mechanisms.

## 1. Package-owned DDL (runs automatically at boot)
| When | Package | Statement(s) |
|------|---------|--------------|
| slonik registration | slonik | `CREATE EXTENSION IF NOT EXISTS citext, unaccent` plus `extensions`, **every boot**[^slonik-extensions] |
| s3 registration | s3 | `CREATE TABLE IF NOT EXISTS files (...)`[^s3-queries] |
| user registration, **one transaction** | user | `CREATE TABLE IF NOT EXISTS users` (FK `photo_id` → files) → `invitations` (FK `invited_by_id` → users). When `features.profileFields.enabled`: `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile JSONB`, plus `user_profile_fields`, `..._i18n`, `user_profile_field_options` (FK `image_id` → files), `..._i18n`[^user-queries][^user-run] |
| firebase registration (unless disabled) | firebase | `DO $$ CREATE TABLE IF NOT EXISTS user_devices ...; CREATE INDEX IF NOT EXISTS ... $$`[^firebase-queries] |
| `onReady` | phone-auth | `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`[^phone-queries][^phone-plugin] |

Table names come from config overrides (`s3.table.name`, `user.tables.*.name`, `firebase.table.userDevices.name`), with constants as fallback. Foreign keys resolve the **referenced** table's name through the same overrides.

- Execution order follows plugin registration order, which is why slonik → s3 → user is required ([Plugin registration order](../architecture/plugin-registration-order.md)).
- There are **no down migrations** and no version table for package DDL.
- The statements run through the pool without a schema qualifier.
  > Inference: they land in the connection's `search_path` schema, while services qualify queries with `dbSchema` or `public`.
- `UserSqlFactory` hard-codes `"public"."st__user_roles"`.[^users-factory]
  > Inference: the SuperTokens core's tables must be reachable in the same database, in `public`.

## 2. App-owned SQL files
`migrationPlugin` / `migrate` apply the app's own migration directory with `@prefabs.tech/postgres-migrations` over a separate `pg.Client`.[^migrate] This is the place for any change to package tables that the package DDL cannot deliver (next section).

## `CREATE TABLE IF NOT EXISTS` never alters an existing table
Several past changes were made by **editing an existing `CREATE TABLE` statement**:
| Commit | Change |
|--------|--------|
| `3a717520` (2025-03-11) | removed `given_name`, `middle_names`, `surname` from `users`[^commit-removed-cols] |
| `ddf6eb2a` (2025-05-08) | added `users.deleted_at`[^commit-deleted-at] |
| `f94e89d3` (2025-07-21) | added `users.photo_id` and its FK to files[^commit-photo-id] |
| `0c71fe9c` (2025-09-26) | dropped `NOT NULL` on `files.uploaded_by_id`, a breaking change[^commit-uploaded-by] |

Postgres skips the whole statement when the table exists.
> Inference from Postgres semantics: a database whose tables were created by an earlier package version does **not** receive any of these changes from an upgrade.
> - A `users` table from before 2025-05-08 lacks `deleted_at`, which the soft-delete filter on every user query needs.
> - A `files` table from before 2025-09-26 still rejects uploads without `uploaded_by_id`.
>
> Such databases need an app-owned migration. No such incident is recorded in the repository.

The additive pattern that *does* reach existing databases is already in the code: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, as used for `users.profile` and `users.phone_number`.[^user-queries][^phone-queries]

## Changing package schema (checklist)
1. **Never edit an existing CREATE statement's columns.** CLAUDE.md treats existing migration queries as frozen.[^claude-md]
2. Add a new idempotent statement, such as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` or `CREATE INDEX IF NOT EXISTS`, to the package's `runMigrations`.
3. Resolve table names through the config override with a constant fallback, and reference other packages' tables through *their* override.
4. When the statement depends on another plugin's table, check the registration order, or defer to `onReady` as phone-auth does.
5. Export the new query builder from `index.ts`, alongside the existing exports, so apps can reuse it in their own migrations.[^user-exports]
6. Document it in the package GUIDE and FEATURES.

## Open questions
- Is there an agreed upgrade path for consumer databases created before the CREATE-statement edits above?
- Is running the package DDL in the same database and `public` schema as SuperTokens a requirement, or only the common setup?

[^slonik-extensions]: A loop over the deduplicated extension list on one connection.
[^migrate]: A dedicated `pg.Client` runs `@prefabs.tech/postgres-migrations` against `migrations.path`, which defaults to `"migrations"`.
[^s3-queries]: `sql.unsafe` with `sql.identifier([tableName])`.
[^user-queries]: users L55-74; invitations L28-53; profile tables L76-159; ALTER L17-26.
[^user-run]: Profile tables only when `config.user.features?.profileFields?.enabled`.
[^firebase-queries]: A `DO $$ BEGIN ... END $$;` block.
[^phone-queries]: `ADD COLUMN IF NOT EXISTS phone_number VARCHAR ( 20 )`.
[^phone-plugin]: The comment explains why this runs in `onReady`.
[^users-factory]: `FROM "public"."st__user_roles" as ur`.
[^user-exports]: `export * from "./migrations/queries"`; s3 and firebase do the same.
[^commit-deleted-at]: The diff adds `deleted_at TIMESTAMP` to `CREATE TABLE IF NOT EXISTS users`.
[^commit-photo-id]: The diff adds `photo_id INTEGER` and the FK clause to the same CREATE.
[^commit-removed-cols]: The diff removes three columns from the CREATE.
[^commit-uploaded-by]: The diff changes `uploaded_by_id VARCHAR(255) NOT NULL` to nullable.
[^claude-md]: Row 18: "Migrations run automatically inside consumer apps — existing queries are frozen; additive changes only, idempotent".
