---
type: Troubleshooting
title: GraphQL Uploads Return 415 or an Empty Body
description: Symptoms around multipart GraphQL uploads and catch-all body parsing (a silent 415, an intermittently undefined request body, a boot error about an existing parser, uploads consumed by the wrong parser) with the cause and fix for each.
tags: [troubleshooting, graphql, uploads, multipart, content-type-parser, fastify]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: spec
    resource: repo://docs/specs/graphql-upload-transport.md
    title: Upload transport spec, section 1 (verified experimentally)
  - id: graphql-plugin
    resource: repo://packages/graphql/src/plugin.ts#L29-L46
    title: Transport registered before mercurius (comment)
  - id: transport
    resource: repo://packages/graphql/src/uploads/transport.ts#L25-L41
    title: Catch-all parser, busboy done comment
  - id: guide
    resource: repo://packages/graphql/GUIDE.md#L436-L447
    title: GUIDE gotchas
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Known Fastify 5 gotchas 1, 5, 6
  - id: test
    resource: repo://packages/graphql/src/__test__/uploadTransport.test.ts
    title: "Upload transport tests (does not return 415 for unknown content types, ...)"
---

# GraphQL Uploads Return 415 or an Empty Body

Background: [GraphQL request lifecycle](../architecture/graphql-request-lifecycle.md#1-transport-parsing-multipart-uploads).

## Symptom: multipart request to `/graphql` gets 415 (or 422), with no useful log
**Cause.** Fastify snapshots content-type parsers into an encapsulation context when that context is created, but binds hooks at `ready()`. A catch-all parser added at the root **after** mercurius registered never reaches `/graphql`. The upload hook, by contrast, still runs.[^spec][^claude-md] Before the transport moved into the graphql package, apps had to register s3's `multipartParserPlugin` before graphql themselves.
**Fix.** Use the graphql plugin's built-in transport, which is on by default and registered before mercurius.[^graphql-plugin] If you register a transport yourself, do it before the graphql plugin.

## Symptom: `request.body` is intermittently `undefined` on a non-GraphQL multipart route
**Cause.** A custom content-type parser delegated to an async body parser (busboy) and **also** called `done(null)` synchronously. The second `done` races the route handler.[^claude-md][^transport]
**Fix.** Return right after handing off to busboy, which calls `done` itself on `finish`. The current transport does exactly that; see its comment.[^transport]

## Symptom: boot fails with `FST_ERR_CTP_ALREADY_PRESENT`
**Cause.** The app already registers its own `*` parser, and the transport tries to add another. There is only one catch-all slot.[^guide] `hasContentTypeParser("*")` returns `false` even when one is registered, so this cannot be detected in advance.[^claude-md]
**Fix.** Set `uploads: { enabled: false }` in the graphql options and parse multipart yourself.

## Symptom: GraphQL upload bodies arrive already parsed or empty when s3 REST uploads are enabled
**Cause.** `@fastify/multipart`, registered by s3 when `rest.enabled`, adds a dedicated `multipart/form-data` parser. If it is registered **before** graphql, the parser is snapshotted into the GraphQL route's context and beats the catch-all.[^guide][^claude-md]
**Fix.** Register the s3 plugin **after** the graphql plugin.

## Symptom: a route that used to return 415 for an unknown content type now runs with `body === undefined`
**Cause.** Expected. With the transport active, non-multipart unknown types fall through the catch-all with `done(null)`.[^transport][^test]
**Fix.** Validate the body in the route schema, or disable uploads if you need 415 behaviour.

[^spec]: Spec §1 "an ordering footgun: parser-after-mercurius fails at request time with an unexplained 415/422 (verified experimentally …)".
[^claude-md]: Gotcha 1 (`hasContentTypeParser("*")`), 5 (snapshot vs hook binding), 6 (double `done`).
[^graphql-plugin]: Comment L30-31.
[^transport]: Comment L32: "busboy calls done itself once the body is fully parsed".
[^guide]: Bullets on the single `*` slot, 415 behaviour, and s3 ordering.
[^test]: The test named "does not return 415 for unknown content types".
