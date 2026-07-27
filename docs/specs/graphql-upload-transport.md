# Spec: Move GraphQL upload transport from `fastify-s3` to `fastify-graphql`

Status: implemented on branch `refact/config` (2026-07-11); decisions resolved
in §8. Companion to the plugin-options migration (step 1, same branch).

## 1. Problem statement

GraphQL file upload currently requires three coordinated pieces across two
packages plus the consuming app: `multipartParserPlugin` (s3 export,
app-registered, must precede the graphql plugin), the `graphqlUpload`
preValidation hook (s3-internal, registered when s3's graphql mode is on), and
mercurius (graphql package). This creates:

- a **hidden dependency**: `user`'s GraphQL `uploadPhoto` silently requires an
  app-level parser registration that no package declares or documents;
- an **ordering footgun**: parser-after-mercurius fails at request time with an
  unexplained 415/422 (verified experimentally — content-type parsers are
  snapshotted at encapsulation-context creation; hooks are bound at ready time);
- **misplaced ownership**: multipart-transport concerns live in a storage
  package.

## 2. Target design

### 2.1 New public API (graphql package)

```typescript
// packages/graphql/src/types.ts
import type { UploadOptions } from "graphql-upload-minimal";

export interface GraphqlUploadsConfig extends UploadOptions {
  enabled?: boolean; // default: true — house convention, disable check is === false (see 2.4)
}

export interface GraphqlConfig extends MercuriusOptions {
  enabled?: boolean;
  plugins?: GraphqlEnabledPlugin[];
  uploads?: GraphqlUploadsConfig; // NEW
}
```

`UploadOptions` passthrough gives `maxFileSize`, `maxFiles`, `maxFieldSize`
(classified PARTIAL passthrough in GUIDE.md). Consumer usage:

```typescript
await fastify.register(graphqlPlugin, {
  ...config.graphql,
  uploads: { enabled: true, maxFileSize: 10_485_760 },
});
```

### 2.2 New internal module: `packages/graphql/src/uploads/`

- `transport.ts` — one fastify-plugin-wrapped sub-plugin, **named**
  (`name: "prefabs-graphql-upload-transport"`), containing both halves of
  today's split:
  1. the catch-all `*` content-type parser: multipart request to the graphql
     path → set `req.graphqlFileUploadMultipart = true`, leave the stream
     untouched; multipart elsewhere → busboy parse into `req.body` (today's
     `processMultipartFormData`, which moves here — it has exactly one caller);
     non-multipart → fall through.
  2. the `preValidation` hook: if flagged,
     `request.body = await processRequest(request.raw, reply.raw, uploadOptions)`.
- The graphql path is resolved **inside the plugin** as
  `options.path ?? DEFAULT_GRAPHQL_PATH` ("/graphql"; constant moves from s3 to
  graphql constants) — no config lookup, no cross-package agreement needed; the
  package that owns the endpoint owns the path.

### 2.3 Registration flow (`packages/graphql/src/plugin.ts`)

```typescript
if (options?.enabled) {
  if (
    options.uploads?.enabled !== false &&
    !fastify.hasPlugin("prefabs-graphql-upload-transport")
  ) {
    await fastify.register(uploadTransport, {
      path: options.path,
      ...options.uploads,
    });
  }
  await fastify.register(mercurius, {
    context: buildContext(options.plugins),
    ...options,
  });
}
```

**Ordering is now correct by construction**: the parser is added in the same
(fastify-plugin, root) context *before* mercurius's context is created. The
`hasPlugin` guard makes the transitional case safe: an app still registering
the legacy s3 `multipartParserPlugin` (same underlying named plugin, see 3.2)
*and* enabling `uploads` won't hit `FST_ERR_CTP_ALREADY_PRESENT` from a double
`*` parser.

### 2.4 Defaults and constraints

- `uploads.enabled` defaults **on** (decided §8.3): the disable check is
  `uploads?.enabled === false`, per house convention. Consequences, accepted
  and documented rather than mitigated: every graphql-enabled app gets the
  catch-all `*` parser on upgrade — (a) an app that registered its **own** `*`
  parser will now throw `FST_ERR_CTP_ALREADY_PRESENT` at startup and must set
  `uploads: { enabled: false }`; (b) unknown-content-type requests that
  previously got 415 now reach routes with an undefined body, and stray
  multipart requests to non-graphql routes are busboy-parsed. Both called out
  in the graphql GUIDE and the release notes.
- If the app already has its own (non-prefabs) `*` parser, registration throws
  Fastify's `FST_ERR_CTP_ALREADY_PRESENT`. Not pre-checkable
  (`hasContentTypeParser("*")` false-negative gotcha, CLAUDE.md gotcha #1) —
  documented, not swallowed.
- The `scalar Upload` SDL declaration stays consumer-side (as `user`'s
  `schema.ts:4` does today); mercurius passes upload promises through without a
  scalar resolver — unchanged.
- Module augmentation `FastifyRequest.graphqlFileUploadMultipart` moves to
  **graphql's `index.ts`** (also fixes the existing house-rule violation of
  declaring it in two s3 plugin files).
- **Mixed mode (REST + GraphQL uploads) retains one ordering rule that this
  move does not fix**: the s3 plugin must still be registered *after* the
  graphql plugin. `@fastify/multipart` (s3 `rest.enabled`) registers a
  dedicated `multipart/form-data` parser, and a dedicated parser beats the
  catch-all. If s3 ran first, mercurius's context would snapshot that dedicated
  parser and `@fastify/multipart` would consume GraphQL upload bodies before
  `processRequest` saw them. Registered after (as all current examples already
  do), mercurius's context predates it and only sees the catch-all. Same as the
  status quo — but now documented (graphql GUIDE + s3 GUIDE).

## 3. Package-by-package changes

### 3.1 `packages/graphql`

| Change | Detail |
|---|---|
| New files | `src/uploads/transport.ts`, `src/uploads/processMultipartFormData.ts` (moved from s3 utils) |
| `types.ts` | add `GraphqlUploadsConfig`, extend `GraphqlConfig` |
| `plugin.ts` | register transport before mercurius (2.3) |
| `constants.ts` | new file: `DEFAULT_GRAPHQL_PATH` |
| `index.ts` | export the transport (name per §8.2), `GraphqlUploadsConfig`; re-export `FileUpload as GraphQLFileUpload`, `Upload as GraphQLUpload` types; add the request augmentation |
| `package.json` | **new runtime deps**: `busboy` + `graphql-upload-minimal` (+ `@types/busboy` dev). Requires explicit approval per repo rules (§8.1). |

### 3.2 `packages/s3` (all backward-compatible until removal)

| Change | Detail |
|---|---|
| Delete | `src/plugins/graphqlUpload.ts`, `src/plugins/multipartParser.ts`, `processMultipartFormData` from utils (`convertStreamToBuffer` stays — s3Client uses it) |
| `plugin.ts` | drop the `options.graphql?.enabled` branch entirely; drop `graphql` from the config-fallback composition |
| `types/index.ts` | `S3Options` loses `graphql`; `S3GraphqlConfig` and `MultipartParserOptions` deleted; `fileSizeLimitInBytes` now REST-only (the GraphQL upload limit lives in `uploads.maxFileSize`) |
| `constants.ts` | remove `DEFAULT_GRAPHQL_PATH` |
| `index.ts` | deprecated compat re-exports, removed at a future release: `multipartParserPlugin` (a thin named wrapper that registers graphql's transport only if `hasPlugin` doesn't already see it — making BOTH registration orders safe, since with uploads defaulting on the graphql plugin usually registers the transport first; the wrapper logs a deprecation warning), `GraphQLUpload`/`GraphQLFileUpload` types (re-exported from the graphql pkg) |
| `package.json` | drop `busboy`, `@types/busboy`, `graphql-upload-minimal` from `dependencies` (no longer referenced; type re-exports come via the existing `@prefabs.tech/fastify-graphql` peer) |

Because the aliased legacy `multipartParserPlugin` is the *full* transport
(parser + hook), legacy apps that register it keep working uploads during the
window even without `uploads.enabled` — step 1 stays truly non-breaking.

### 3.3 `packages/user`

| Change | Detail |
|---|---|
| `model/users/graphql/resolver.ts:4` | import `GraphQLUpload` from `@prefabs.tech/fastify-graphql` (already a peer); `Multipart` stays from s3 |
| Docs | README example: drop `multipartParserPlugin` registration, show `uploads: { enabled: true }` on the graphql plugin; GUIDE.md + FEATURES.md: **conditional** prerequisite note on the photo features |

The user plugin itself does **not** require graphql: REST-only deployments are
fully supported (`user/src/plugin.ts:30` guards all graphql wiring behind
`if (graphql?.enabled)`, and a REST `uploadPhoto` handler exists). The
prerequisite wording is therefore conditional: *"the GraphQL `uploadPhoto`
mutation requires `uploads.enabled` on the graphql plugin; the REST photo route
requires multipart parsing (s3 `rest.enabled`)."* The former hidden dependency
becomes one documented flag on a plugin the deployment already uses.

## 4. Compatibility window

Same two-step scheme as the plugin-options migration:

- **Step 1 (this change, non-breaking):** new `uploads` option on the graphql
  plugin; legacy path (app registers s3's `multipartParserPlugin` alias) keeps
  working, including upload processing. Deprecation is signaled in s3's docs
  and by the s3 plugin's config-fallback warning when it finds
  `fastify.config.graphql?.enabled`.
- **Step 2 (a future release; pre-1.0 this can be a minor):** remove s3's compat re-exports and any `S3Options`
  leftovers; `uploads` becomes the only path.

## 5. Docs changes

- **graphql package** (README, GUIDE, FEATURES): new "GraphQL file uploads"
  section — the `uploads` option, `UploadOptions` PARTIAL passthrough
  classification, default-off rationale, the `*`-parser global-slot caveat
  (`FST_ERR_CTP_ALREADY_PRESENT` if the app has its own catch-all), the
  mixed-mode ordering rule (s3 after graphql, §2.4), and the consumer-side
  `scalar Upload` SDL requirement.
- **s3 package** (README, GUIDE, FEATURES): remove the GraphQL upload sections;
  point to the graphql package's uploads docs; extend the existing
  "Deprecated: configuration via `fastify.config`" README section to also cover
  the deprecated `multipartParserPlugin` / `GraphQLUpload` re-exports.
- **s3 flags clarification** (README Configuration section + GUIDE feature 1):
  state explicitly what the flags gate and that **both may be off**:
  `rest.enabled` and GraphQL uploads only control *incoming HTTP upload
  parsing*. With both off the plugin still runs migrations and provides a fully
  functional `FileService`/`S3Client` — legitimate configurations include
  presigned-URL flows (client uploads directly to S3), server-generated files
  (reports, exports, thumbnails), and download-only services. "Both flags off"
  means "this API doesn't accept file bytes over HTTP", not "the plugin is
  inert". No validation or warning is added for this configuration.
- **user package** (README, GUIDE, FEATURES): registration example updated
  (drop `multipartParserPlugin`, show `uploads: { enabled: true }`); the
  conditional photo-feature prerequisite note from §3.3.

## 6. Tests

Each new branch, real Fastify instances, no base-library mocks.

- **graphql:** uploads disabled → no `*` parser (unknown content type still
  415s); enabled → multipart to the graphql path is flagged and `processRequest`
  populates the body (real `graphql-upload-minimal`, modeled on s3's existing
  `graphqlUpload.test.ts`); custom `path` honored; default path when unset;
  non-graphql multipart busboy-parsed; `hasPlugin` dedupe (legacy alias
  registered first → no throw); `maxFileSize` passthrough.
- **s3:** delete moved-code tests; one wiring test that the deprecated
  re-exports exist and register cleanly; `S3Options` tests drop graphql cases.
- **user:** none beyond the import-source change (resolver tests unaffected).

## 7. Sequencing

1. **Commit the current uncommitted s3 step-1 work first** (it was lost to a
   hard reset once already): `feat(s3): accept plugin options directly,
   deprecate fastify.config fallback`.
2. Implement this spec on the same branch as follow-up commits, **before the
   release train ships**, so `S3Options.graphql` never reaches npm only to be
   deprecated a release later:
   - `feat(graphql): own the GraphQL upload transport`
   - `refactor(s3): delegate upload transport to fastify-graphql`
   - `docs(user): document graphql-uploads prerequisite`
3. Full root gate (`pnpm lint && pnpm typecheck && pnpm build && pnpm test`)
   between commits; GUIDE/FEATURES updated in the same commit as the behavior
   they describe.

## 8. Decisions (resolved 2026-07-11)

1. New runtime deps on the graphql package (`busboy`, `graphql-upload-minimal`)
   — **approved**.
2. New export name — **`graphqlUploadTransport`**; `multipartParserPlugin`
   survives only as s3's deprecated alias.
3. `uploads.enabled` — **default ON** (house convention; disable check is
   `=== false`; consequences documented in §2.4).
4. Sequencing — **fold into the current release train** per §7; s3 step-1 work
   committed first as a checkpoint.
