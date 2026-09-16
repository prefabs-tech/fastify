# Package Usage Specification — v0.94

Status: draft (2026-09-16). Describes the packages as published at root version
**0.94.1**. Every statement here is traceable to source in this repository at
that version; where the code and an existing `GUIDE.md` disagree, the code
wins and the difference is called out.

This specification is written for two audiences:

- a **consumer** wiring `@prefabs.tech/fastify-*` into a Fastify 5 API, who
  needs to know what to register, in what order, with what configuration, and
  what surface they get back;
- an **implementer** adding a model, route, resolver, or whole package inside
  this monorepo, who needs the contracts the base classes impose.

## How to read this

Start with the overview. It carries the rules that apply to every package —
registration order, the options-versus-config split, the flag convention, the
case boundary. The per-package chapters assume those rules and do not repeat
them.

| # | Document | What it covers |
|---|----------|----------------|
| 00 | [Overview](00-overview.md) | Compatibility, install, dependency graph, registration order, cross-cutting conventions |
| 01 | [config](01-config.md) | `ApiConfig`, the `fastify.config` decorator, `hostname` |
| 02 | [error-handler](02-error-handler.md) | Error normalisation, `CustomError`, `ErrorResponse`, `httpErrors` |
| 03 | [slonik](03-slonik.md) | Pool, interceptors, `BaseService`, `DefaultSqlFactory`, filters, migrations |
| 04 | [graphql](04-graphql.md) | Mercurius wiring, context building, base schema, upload transport |
| 05 | [swagger](05-swagger.md) | OpenAPI document and UI |
| 06 | [mailer](06-mailer.md) | Nodemailer transport, MJML templating, recipient override |
| 07 | [s3](07-s3.md) | `S3Client`, `FileService`, multipart, filename resolution |
| 08 | [firebase](08-firebase.md) | Admin SDK init, device registry, push, App Check |
| 09 | [user](09-user.md) | SuperTokens, sessions, roles, permissions, invitations, profiles |
| 10 | [phone-auth](10-phone-auth.md) | Passwordless recipe, Twilio Verify OTP |
| 11 | [REST API reference](11-rest-api-reference.md) | Every route every package registers, with guards and schemas |
| 12 | [GraphQL API reference](12-graphql-api-reference.md) | Merged SDL surface, directives, resolvers |
| 13 | [Database schema](13-database-schema.md) | Every table, column, foreign key, and name override |
| 14 | [Extending the packages](14-extending-packages.md) | Adding a model, service, factory, or package |

## What this specification is not

It does not re-document the base libraries these packages wrap. Fastify,
slonik, mercurius, nodemailer, SuperTokens, and the AWS SDK have their own
documentation; this specification describes only the delta — what these
packages add, constrain, or change. Base-library options that pass straight
through are marked as such and linked.
