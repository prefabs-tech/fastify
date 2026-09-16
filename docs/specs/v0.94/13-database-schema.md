# 13 — Database schema

Every table these packages create, how the names are overridden, and the order
the migrations have to run in.

## How package migrations work

Each package runs its own DDL during `register()` — except phone-auth, which
defers to `onReady`. The queries are idempotent
(`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) and build the table
name from config with a constant as fallback:

```typescript
const tableName = config.firebase.table?.userDevices?.name || TABLE_USER_DEVICES;
```

> These run automatically inside consumer applications. An existing migration
> query is **frozen** — changes must be additive and idempotent, never a
> modification of what already shipped. Application-level schema changes belong
> in SQL files run by `migrationPlugin`, not here.

The slonik plugin itself creates extensions rather than tables:
`citext` and `unaccent` always, plus anything in `options.extensions`.
`unaccent` is required — the filter and sort builders emit
`unaccent(lower(...))` whenever `insensitive` is set.

## Ordering

```
slonik     extensions
  └─ s3        files
       └─ user     users → invitations → [profile field tables]
            ├─ firebase   user_devices
            └─ phone-auth users.phone_number   (onReady)
```

`users.photo_id` and `user_profile_field_options.image_id` are foreign keys
into the s3 `files` table, so s3 must register first even in a deployment that
never uploads anything.

The user migration runs `users` and `invitations` inside **one transaction**,
adding the profile-field tables to it when
`config.user.features.profileFields.enabled` is set.

## Tables

### `files` — s3

Override: `config.s3.table.name` (or `options.table.name`). Constant:
`TABLE_FILES` = `files`.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` identity | PK |
| `original_file_name` | `VARCHAR(255)` | not null |
| `bucket` | `VARCHAR(255)` | |
| `description` | `TEXT` | |
| `key` | `VARCHAR(255)` | not null — the S3 object key |
| `uploaded_by_id` | `VARCHAR(255)` | |
| `uploaded_at` | `TIMESTAMP` | not null |
| `download_count` | `INT` | default `0` |
| `last_downloaded_at` | `TIMESTAMP` | |
| `created_at`, `updated_at` | `TIMESTAMP` | default `CURRENT_TIMESTAMP` |

### `users` — user

Override: `config.user.tables.users.name`. Constant: `TABLE_USERS` = `users`.

| Column | Type | Notes |
|---|---|---|
| `id` | `VARCHAR(36)` | PK — the SuperTokens user id |
| `disabled` | `BOOLEAN` | not null, default `false` |
| `email` | `VARCHAR(256)` | not null |
| `photo_id` | `INTEGER` | FK → `files(id)` |
| `last_login_at` | `TIMESTAMP` | not null, default `NOW()` |
| `signed_up_at` | `TIMESTAMP` | not null, default `NOW()` |
| `deleted_at` | `TIMESTAMP` | soft-delete marker |
| `profile` | `JSONB` | added only when `features.profileFields.enabled` |
| `phone_number` | `VARCHAR(20)` | added by phone-auth at `onReady` |

`UserSqlFactory` sets `_softDeleteEnabled = true`, so `DELETE` becomes
`UPDATE ... SET deleted_at = NOW()` and every read appends
`deleted_at IS NULL`.

Roles are **not** stored here — they live in SuperTokens' own
`st__user_roles`, which `UserSqlFactory` joins laterally to produce the `roles`
array on each row.

### `invitations` — user

Override: `config.user.tables.invitations.name`. Constant:
`TABLE_INVITATIONS` = `invitations`.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` identity | PK |
| `accepted_at` | `TIMESTAMP` | |
| `app_id` | `INTEGER` | |
| `email` | `VARCHAR(256)` | not null |
| `expires_at` | `TIMESTAMP` | |
| `invited_by_id` | `VARCHAR(36)` | not null, FK → `users(id)` |
| `payload` | `JSONB` | arbitrary application data |
| `revoked_at` | `TIMESTAMP` | |
| `role` | `VARCHAR(255)` | not null |
| `token` | `UUID` | unique, default `gen_random_uuid()` |
| `created_at`, `updated_at` | `TIMESTAMP` | not null, default `NOW()` |

State is derived, not stored as a status column: pending means
`accepted_at`, `revoked_at` all null and `expires_at` in the future.
`isInvitationValid` encodes that.

### Profile field tables — user

Created only when `config.user.features.profileFields.enabled`. Overrides:
`config.user.tables.userProfileFields`, `.userProfileFieldsI18n`,
`.userProfileFieldOptions`, `.userProfileFieldOptionsI18n`.

**`user_profile_fields`** — `id` (identity PK), `"default"` `TEXT`, `disabled`
`BOOLEAN` default false, `name` `VARCHAR(256)` not null, `required` `BOOLEAN`
not null default false, `sort_order` `INTEGER` not null default 1, `type`
`INTEGER` not null, timestamps `WITH TIME ZONE`.

**`user_profile_fields_i18n`** — `id` (FK → `user_profile_fields(id)` ON DELETE
CASCADE), `description`, `label` `VARCHAR(256)` not null, `locale`
`VARCHAR(3)` not null, `placeholder`, timestamps. Unique on `(id, locale)`.

**`user_profile_field_options`** — `id` (identity PK), `field_id` not null
(FK → `user_profile_fields(id)` ON DELETE CASCADE), `image_id`
(FK → `files(id)` ON DELETE SET NULL), `rank` `INTEGER` not null default 1,
`value` `INTEGER` not null, timestamps.

**`user_profile_field_options_i18n`** — `id` (FK →
`user_profile_field_options(id)` ON DELETE CASCADE), `description`, `label`,
`locale`, timestamps. Unique on `(id, locale)`.

`type` is one of `USER_PROFILE_FIELD_TYPES`: `DATE` 1, `EMAIL` 2, `LOCATION` 3,
`MULTI_SELECT` 4, `MULTI_SELECT_BADGE` 5, `NAME` 6, `SINGLE_SELECT` 7, `TEXT` 8,
`MULTI_IMAGE_UPLOAD` 9, `TEXT_AREA` 10, `URL` 11, `MIN_MAX_INPUT` 12.

### `user_devices` — firebase

Override: `config.firebase.table.userDevices.name`. Constant:
`TABLE_USER_DEVICES` = `user_devices`.

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` identity | PK |
| `user_id` | `VARCHAR(255)` | not null — no FK |
| `device_token` | `VARCHAR(255)` | not null |
| `created_at`, `updated_at` | `TIMESTAMP` | not null, default `CURRENT_TIMESTAMP` |

Plus `idx_user_id_device_token` on `(user_id, device_token)`. There is **no**
unique constraint on `device_token`; uniqueness is enforced in application code
by `UserDeviceService.preCreate`, which deletes any existing row for the token
before inserting.

`user_id` has no foreign key to `users`, which is what lets this package stay
independent of the user package.

## Name overrides, collected

| Config key | Default |
|---|---|
| `config.s3.table.name` | `files` |
| `config.user.tables.users.name` | `users` |
| `config.user.tables.invitations.name` | `invitations` |
| `config.user.tables.userProfileFields.name` | `user_profile_fields` |
| `config.user.tables.userProfileFieldsI18n.name` | `user_profile_fields_i18n` |
| `config.user.tables.userProfileFieldOptions.name` | `user_profile_field_options` |
| `config.user.tables.userProfileFieldOptionsI18n.name` | `user_profile_field_options_i18n` |
| `config.firebase.table.userDevices.name` | `user_devices` |

An override must be set **before first boot** and never changed afterwards: the
migrations are `IF NOT EXISTS`, so renaming the config key on an existing
database creates a second empty table rather than renaming the first.

## Multi-schema deployments

`BaseService` and `DefaultSqlFactory` both take a `schema` constructor argument,
defaulting to `"public"`, and `request.dbSchema` carries it per request. Handlers
pass it through:

```typescript
const service = new UserService(config, slonik, dbSchema);
```

The migrations, however, do not qualify their table names with a schema — they
run against the connection's default `search_path`. Multi-tenant schema routing
therefore works for queries but needs your own provisioning for DDL.
