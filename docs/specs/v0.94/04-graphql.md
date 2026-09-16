# 04 — `@prefabs.tech/fastify-graphql`

Wraps [mercurius](https://mercurius.dev/) with a shared request context, a base
SDL every package merges into, and a multipart upload transport.

Peers: `@prefabs.tech/fastify-config`, `@prefabs.tech/fastify-slonik`,
`fastify`, `fastify-plugin`, `graphql >= 16.14.2`, `mercurius >= 16.10.0`,
`slonik`, `zod`.

## Registration

```typescript
import graphqlPlugin, {
  baseSchema, gql, mergeTypeDefs,
} from "@prefabs.tech/fastify-graphql";
import userPlugin, { userSchema, userResolver } from "@prefabs.tech/fastify-user";

await fastify.register(graphqlPlugin, {
  enabled: true,
  graphiql: true,
  path: "/graphql",
  plugins: [userPlugin],
  resolvers: { ...userResolver },
  schema: mergeTypeDefs([baseSchema, userSchema, mySchema]),
  uploads: { maxFileSize: 10_000_000 },
});
```

`GraphqlConfig` extends mercurius's `MercuriusOptions` — `schema`, `resolvers`,
`graphiql`, `path`, `subscription`, and the rest pass straight through; see the
[mercurius options](https://mercurius.dev/#/docs/api/options). Three fields are
ours:

| Field | Type | Default | Effect |
|---|---|---|---|
| `enabled` | `boolean` | — | **Must be truthy.** Falsy leaves mercurius unregistered and logs `GraphQL API not enabled` |
| `plugins` | `GraphqlEnabledPlugin[]` | — | Each contributes to the per-request context |
| `uploads` | `GraphqlUploadsConfig` | on | Upload transport; extends `UploadOptions` from `graphql-upload-minimal` with `enabled` |

> `enabled` breaks the house `=== false` convention. The check is
> `if (options?.enabled)`, so omitting the flag disables GraphQL.

Registering with no options falls back to `fastify.config.graphql` with a
deprecation warning, and throws `Missing graphql configuration. Did you forget
to pass it to the graphql plugin?` when that is absent too.

## The request context

Unless you pass your own `context`, the plugin installs `buildContext(plugins)`,
which gives every resolver:

```typescript
{
  config: request.config,      // ApiConfig
  database: request.slonik,    // Database
  dbSchema: request.dbSchema,  // string
}
```

Note the field is named `database`, not `slonik`.

A caller-supplied `options.context` **overrides** this entirely, because
`context` is set before `...options` is spread. Passing your own context means
losing `config`, `database`, and `dbSchema` unless you rebuild them.

### Context plugins

`GraphqlEnabledPlugin` is a Fastify plugin that also carries an
`updateContext(context, request, reply)` method. Plugins listed in `plugins`
have it called per request, in array order, so each can extend the shared
context. `@prefabs.tech/fastify-user` is one — it adds `user` and `roles`.

Writing your own:

```typescript
import FastifyPlugin from "fastify-plugin";
import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";

const plugin = Object.assign(FastifyPlugin(myPlugin), {
  updateContext: async (context, request) => {
    context.tenant = request.headers["x-tenant"];
  },
}) satisfies GraphqlEnabledPlugin;
```

The plugin must still be registered with Fastify separately; listing it in
`plugins` only wires the context callback.

## `baseSchema`

A `DocumentNode` every package's SDL merges with. It defines the directives and
shared inputs the sibling schemas use:

```graphql
directive @auth(profileValidation: Boolean, emailVerification: Boolean)
  on OBJECT | FIELD_DEFINITION
directive @hasPermission(permission: String!) on OBJECT | FIELD_DEFINITION

scalar DateTime
scalar JSON

input Filters {
  AND: [Filters]  OR: [Filters]
  not: Boolean    key: String
  operator: String  value: String
}

enum SortDirection { ASC DESC }
input SortInput { key: String  direction: SortDirection }
type DeleteResult { result: Boolean! }
```

`Filters` and `SortInput` mirror the slonik `FilterInput` / `SortInput` types,
so a GraphQL argument can be handed to a service unchanged.

The directives are **declared** here but **implemented** by
`@prefabs.tech/fastify-user` via `mercurius-auth`. Using `@auth` without the
user package registered leaves it inert.

## File uploads

When the plugin is enabled and `uploads.enabled !== false`, a named sub-plugin
(`prefabs-graphql-upload-transport`) registers **before** mercurius — the order
matters, because content-type parsers are snapshotted into an encapsulation
context when that context is created. It is skipped if a transport of the same
name is already present (`hasPlugin` check).

The transport does two things:

1. Adds a catch-all `"*"` content-type parser. A multipart request whose route
   URL starts with the GraphQL path is flagged with
   `request.graphqlFileUploadMultipart = true` and left for step 2. A multipart
   request to **any other route** is parsed with busboy into
   `req.body = { ...fields, ...files }`, where each file is a `MultipartFile`
   (`{ data: Buffer, filename, mimetype, encoding? }`).
2. Adds a `preValidation` hook that runs `processRequest` from
   `graphql-upload-minimal` on flagged requests, following the
   [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec).

Resolvers receive an `Upload` promise:

```typescript
const resolvers = {
  Mutation: {
    uploadDocument: async (_parent, { file }: { file: GraphQLUpload }) => {
      const { createReadStream, filename, mimetype } = await file;
      // ...
    },
  },
};
```

### Upload gotchas

- **Register the s3 plugin after this one.** `@fastify/multipart` installs a
  dedicated `multipart/form-data` parser, which beats the catch-all in whichever
  context sees both — registered first, it swallows GraphQL upload bodies and
  the route answers 415 or sees an empty body.
- A custom parser that delegates to busboy must not also call `done(null)`
  synchronously; the double call races the handler, which then intermittently
  sees `req.body === undefined`.
- `hasContentTypeParser("*")` returns `false` even when a `*` parser is
  registered. Verify behaviourally — inject an odd content type and assert the
  status is not 415.

`graphqlUploadTransport` is exported separately for applications that need to
control the ordering themselves; set `uploads: { enabled: false }` and register
it where you want, passing `{ path, ...uploadOptions }`.

## Exports

| Export | Kind |
|---|---|
| `default` | the plugin |
| `baseSchema` | shared `DocumentNode` |
| `graphqlUploadTransport` | the transport as a standalone plugin |
| `gql` | re-export from `graphql-tag` |
| `mergeTypeDefs` | re-export from `@graphql-tools/merge` |
| `DEFAULT_GRAPHQL_PATH` (`"/graphql"`), `UPLOAD_TRANSPORT_PLUGIN_NAME` | constants |
| `GraphqlConfig`, `GraphqlOptions`, `GraphqlEnabledPlugin`, `GraphqlUploadsConfig`, `MultipartFile` | types |
| `DocumentNode`, `GraphQLUpload`, `GraphQLFileUpload` | re-exported types |

`MercuriusContext` is augmented with `config`, `database`, `dbSchema`;
`FastifyRequest` with `graphqlFileUploadMultipart?: boolean`; `ApiConfig` with
`graphql: GraphqlConfig`.
