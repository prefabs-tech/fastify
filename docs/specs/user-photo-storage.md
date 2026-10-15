# Spec: Pluggable photo storage for `fastify-user` (decouple from `fastify-s3`)

Status: draft, pending decisions in §9. Companion to the plugin-options
migration (see `docs/specs/graphql-upload-transport.md` for the pattern this
follows: invert a hard-coded package dependency into an injected capability).

## 1. Problem statement

`@prefabs.tech/fastify-user` hard-requires `@prefabs.tech/fastify-s3`, in
three layers:

1. **Schema (unconditional):** the user package's own migrations create
   foreign keys into the s3 package's `files` table —
   `users.photo_id` (`migrations/queries.ts:65-70`) and
   `user_profile_field_options.image_id` (`queries.ts:134`), both resolving
   the table name via s3's `TABLE_FILES` constant. A deployment that never
   uses photos still cannot start without the s3 plugin having created the
   `files` table first — an implicit registration-order dependency with no
   off-switch.
2. **Service:** `UserService` lazily instantiates s3's `FileService`
   (`model/users/service.ts:25-34`) for the photo lifecycle: `upload`
   (S3 key `{userId}/photo`, bucket from `config.user.s3.bucket`),
   `presignedUrl` (photo URL returned with profiles), `deleteFile`/`delete`
   (photo removal/replacement).
3. **Types:** `Multipart`, `File`, `TABLE_FILES` imported across
   `types/user.ts`, handlers, resolvers, migrations.

Target: S3 becomes *one option* for storing profile photos. `fastify-user`
ends up with no `fastify-s3` edge at all; the storage backend (S3, GCS, local
disk, none) is an app choice.

## 2. Target design: a storage port owned by `fastify-user`

```typescript
// exported by @prefabs.tech/fastify-user
export interface UserPhotoInput {
  data: Buffer | Readable;
  filename: string;
  mimetype: string;
}

export interface PhotoStorage {
  /** Remove a stored photo. */
  delete(reference: string): Promise<void>;
  /** Resolve a display/download URL (presigned or public). */
  getUrl(reference: string): Promise<string>;
  /** Store a photo; returns an opaque reference persisted on the user row. */
  upload(photo: UserPhotoInput, userId: string): Promise<{ reference: string }>;
}
```

Wired through the plugin options (lands together with the user package's
step-1 `UserOptions` migration):

```typescript
await fastify.register(userPlugin, {
  ...config.user,
  photo: {
    storage: myPhotoStorage, // PhotoStorage implementation
  },
});
```

Rules:

- **No `photo.storage` configured ⇒ photo features off**: the REST
  `PUT/DELETE /me/photo` routes are not registered, the GraphQL
  `uploadPhoto`/`removePhoto` mutations return a clear "photo storage not
  configured" error, and profile responses omit the photo URL. Composes with
  the existing `routes.*.disabled` flags.
- **Policy stays user-side.** MIME whitelist, `photoMaxSizeInMB`, and the
  profile-validation/email-verification claim refreshes remain in
  `UserService` — they are user-domain policy, not storage. Only the
  store/url/delete calls go through the port.
- `UserService.fileService` is removed; its three call sites
  (`service.ts:140, 217, 286`; resolver `:402, :522`) call the port.
- `users.photo_id` becomes an **opaque reference** owned by the adapter
  (see §4). For the S3 adapter the reference is the stringified `files.id`,
  which keeps existing rows valid with zero data migration.

### 2.1 Where the S3 adapter lives

**In the consuming app**, as a documented recipe (GUIDE + README), not in
either package:

```typescript
import type { PhotoStorage } from "@prefabs.tech/fastify-user";

import { FileService } from "@prefabs.tech/fastify-s3";

const s3PhotoStorage = (config, database): PhotoStorage => ({
  delete: async (reference) => {
    await new FileService(config, database).deleteFile(Number(reference), {});
  },
  getUrl: async (reference) => {
    const { url } = await new FileService(config, database).presignedUrl(
      Number(reference),
      {},
    );
    return url;
  },
  upload: async (photo, userId) => {
    const service = new FileService(config, database);
    service.filename = `photo.${extension(photo.filename)}`;
    const file = await service.upload({
      file: { fileContent: photo, fileFields: { uploadedById: userId } },
      options: { path: userId },
    });
    return { reference: String(file.id) };
  },
});
```

Rationale: shipping the adapter inside `fastify-s3` would invert the peer
edge (s3 referencing user's interface); a dedicated adapter package is
overkill at this scale. The app imports the `PhotoStorage` type from
`fastify-user` (which it depends on anyway) to type-check its adapter — and
this is why the s3 package needs no such import: only the party *writing* an
adapter needs the contract. If demand materializes, promoting the recipe
into `fastify-s3` later is additive.

### 2.2 Frontend contract

No prefabs frontend package currently renders the profile photo (verified:
`react/packages/user` has no `photo` field in its `User` type and no photo
UI; `vue/packages/vue-user` has zero photo references) — today only bespoke
consumer apps touch it. This section fixes the API contract those apps, and
any future avatar component in the react/vue user packages, must code
against:

- **Endpoints and shapes are stable**: `PUT/DELETE /me/photo` (multipart),
  the GraphQL `uploadPhoto`/`removePhoto` mutations, and the
  `user.photo = { id, url }` response object are unchanged by this spec.
- **`photo.url` is short-lived.** Today it is a presigned URL with a 7-day
  expiry; under the port its lifetime is adapter-defined (§9.4). Consumers
  must render the URL from the current profile fetch and never persist or
  cache it beyond the session.
- **`photo.id` is an opaque string reference**, no longer guaranteed to be a
  numeric `files`-table id. Treat it as an identifier only; the change of
  meaning goes in the release notes.
- **Photos are optional per deployment.** With no storage adapter
  configured, `user.photo` is absent and the upload mutation returns a
  "photo storage not configured" error. Photo UI must ship a no-photo
  fallback state (e.g. initials placeholder) and surface that error case.

### 2.3 `user_profile_field_options.image_id`

Unlike photos, the user package has **no upload path** for field-option
images — apps store a file id they obtained elsewhere (`imageId` is only
read back, `profileFields/sqlFactory.ts:80`). The port is therefore not
involved; the only change is dropping the FK (§4) so the column becomes an
opaque app-managed reference, consistent with `photo_id`.

## 3. Package-by-package changes

### 3.1 `packages/user`

| Change | Detail |
|---|---|
| `types/` | new `PhotoStorage`, `UserPhotoInput`; replace `Multipart`/`File` imports with `UserPhotoInput` and a local `photoReference` shape |
| `model/users/service.ts` | drop `fileService` getter and `FileService` import; photo methods call `this.photoStorage` (injected via constructor/options); policy checks unchanged |
| handlers + resolvers | thread the configured storage; return the "not configured" error when absent |
| `migrations/queries.ts` | remove `TABLE_FILES` import; FK changes per §4 |
| `plugin.ts` | part of the step-1 `UserOptions` work: accept `photo.storage`; deprecation fallback per §5 |
| `package.json` | drop `@prefabs.tech/fastify-s3` from `peerDependencies`/`devDependencies` at the end of the window (§5) |
| Config | `config.user.s3.bucket` moves into the app's adapter construction; deprecate the `user.s3` sub-namespace |

### 3.2 `packages/s3`

No changes required. (Optional, later: export a ready-made adapter factory —
additive, out of scope here.)

## 4. Schema strategy — the hard part

The FK constraints live inside **frozen** `CREATE TABLE` migration queries
(house rule: existing queries are immutable because they auto-run in consumer
apps). Proposed path:

1. **New additive migration**: idempotent
   `ALTER TABLE users DROP CONSTRAINT IF EXISTS <fk_name>` and likewise for
   `user_profile_field_options.image_id`. Safe on existing deployments
   (constraint exists → dropped) and on fresh ones (IF EXISTS no-ops).
   Constraint names must be resolved dynamically (they were created unnamed,
   so Postgres auto-named them — the migration queries the catalog for the
   FK on that column and drops by discovered name).
2. **Edit the frozen `CREATE TABLE` queries** to omit the FKs (and change
   `photo_id INTEGER` → `photo_id VARCHAR(255)` for new installs; existing
   installs keep INTEGER — the S3 adapter's stringified ids are valid in
   both). ⚠️ This violates the migration-freeze rule by the letter. It is
   defensible because step 1 + step 2 converge on the same schema for every
   deployment age, but it is called out as **open decision §9.1** and must
   not ship without explicit approval.
3. Column type divergence (INTEGER on old installs, VARCHAR on new) is
   tolerable because all access goes through slonik with the reference
   treated as a string in TS; if it is judged not tolerable, the alternative
   is an additive `ALTER TABLE ... ALTER COLUMN photo_id TYPE VARCHAR(255)`
   migration that unifies both — heavier but uniform (open decision §9.2).

## 5. Compatibility window

Same two-step scheme as the rest of the migration:

- **Step 1 (non-breaking):** `photo.storage` option added. When it is absent
  but the s3 plugin's prerequisites are present (`fastify.config.s3` +
  `files` table), the user plugin auto-constructs the S3-backed adapter
  internally (the current behavior, now behind the port) and logs a
  deprecation warning. Existing deployments change nothing and lose nothing.
- **Step 2 (a future release; pre-1.0 this can be a minor):** the auto-S3
  fallback, the `user.s3` config sub-namespace, and the `fastify-s3`
  peer/dev dependency are removed together. Photo features then require an
  explicit adapter.

## 6. Docs

- **user README:** photo section rewritten around `photo.storage`; the S3
  adapter recipe (§2.1) as the worked example; "no storage ⇒ photos off";
  the existing "GraphQL uploads prerequisite" note is unaffected (transport
  is orthogonal to storage).
- **user GUIDE/FEATURES:** `PhotoStorage` contract documented (call order,
  reference opacity, error expectations); deprecation of the auto-S3
  fallback and `user.s3`; migration note for the FK drop.
- **s3 docs:** one line in its README pointing photo-storage users at the
  user package's adapter recipe.

## 7. Tests

- Port-level: `UserService` photo methods against an in-memory fake
  `PhotoStorage` (upload stores reference on user; replacement deletes the
  old reference; URL resolution on profile fetch; policy errors thrown
  *before* storage is called).
- Wiring: photo routes absent when no storage configured; GraphQL mutations
  return the "not configured" error; deprecation warning + auto-S3 adapter
  when falling back (step-1 branch).
- Migration: FK-drop query idempotence (runs twice cleanly), and a
  fresh-install path with no `files` table present.

## 8. Sequencing

Implement **inside the user package's step-1 plugin-options phase**, not as a
separate pass: that phase already rewrites how the user plugin receives all
configuration (options threading through supertokens recipes, handlers,
resolvers), and `photo.storage` is one more field in the same `UserOptions`
shape. One pass through the resolver/handler layer, one deprecation window,
one removal release.

## 9. Open decisions

1. **Approve editing the frozen `CREATE TABLE` queries** to omit the FKs for
   fresh installs (§4.2) — required for s3-less deployments to start; the
   letter-of-the-law alternative (keep FK in CREATE, drop it one migration
   later) still breaks s3-less fresh installs at CREATE time, so there is no
   freeze-respecting path to the goal.
2. **Column type**: tolerate INTEGER/VARCHAR divergence between old and new
   installs, or ship the unifying `ALTER COLUMN` migration (§4.3).
3. **Adapter home**: consuming-app recipe (recommended, §2.1) vs shipping a
   factory in `fastify-s3` now.
4. **`getUrl` semantics**: always presigned-on-read (current behavior) vs
   allowing adapters to return stable public URLs — affects whether the URL
   can be cached in responses. Recommendation: leave it adapter-defined;
   document that consumers must treat it as short-lived.
