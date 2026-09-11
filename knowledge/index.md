---
okf_version: "0.2"
---

# Project knowledge Base

Durable knowledge for the project, kept as an [OKF v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle. The code says what the system does; this says why, how we found out, and what to watch for.

Start here, then open only what you need. See [the authoring contract](CLAUDE.md) before writing.

# Start here

A pnpm + turbo monorepo of ten published Fastify 5 plugins (`@prefabs.tech/fastify-*`) released in lockstep. Read these first:

- [Monorepo Build Graph](wiki/architecture/build-graph.md) - What depends on what across the ten packages, why tests and typechecks consume siblings from dist/ without building them, and what the Vite library build externalizes.
- [Plugin Registration Order](wiki/architecture/plugin-registration-order.md) - The order a consuming app must register the prefabs plugins in, and the concrete coupling that makes each ordering constraint hold.
- [REST Request Lifecycle](wiki/architecture/rest-request-lifecycle.md) - How an authenticated REST request moves through request decorators, body parsing, SuperTokens session verification, permission checks, a thin handler, the service layer, and the error handler.
- [Data Access Layer](wiki/architecture/data-access-layer.md) - How BaseService, DefaultSqlFactory, the filter builder, and the slonik interceptors turn a service call into typed SQL, including hook dispatch, soft delete, pagination, and the camelCase/snake_case boundary.
- [Monorepo Development Setup](wiki/local/monorepo-development-setup.md) - Clone to green checks on a fresh machine (toolchain versions, install, build-before-test ordering, what the git hooks run) plus the snags, including why no database is needed and how to try a change inside a consuming app.

## If you are doing X, start at Y

| Task | Start at |
|------|----------|
| Running the build and tests locally | [Monorepo development setup](wiki/local/monorepo-development-setup.md) |
| Adding a model, route, or resolver to a package | [Data access layer](wiki/architecture/data-access-layer.md), [REST request lifecycle](wiki/architecture/rest-request-lifecycle.md), [Enforced and observed conventions](wiki/conventions/enforced-and-observed-conventions.md) |
| Changing a package-owned table | [Package schema migrations](wiki/operations/package-schema-migrations.md) |
| Touching auth, sessions, roles, or permissions | [Authentication and authorization](wiki/security/authentication-and-authorization.md), [SuperTokens integration model](wiki/reference/supertokens-integration-model.md) |
| Moving a plugin from `fastify.config` to options | [Plugin options migration](wiki/architecture/plugin-options-migration.md) |
| Adding or bumping a dependency | [Dependency layout](wiki/conventions/dependency-layout.md) |
| Shipping a release | [Release procedure](wiki/operations/release-procedure.md) |
| Diagnosing a failing CI run | [Test suite workflow](wiki/ci/test-suite-workflow.md), [Stale sibling build](wiki/troubleshooting/stale-sibling-build.md) |
| GraphQL uploads or multipart bodies misbehaving | [GraphQL uploads return 415 or an empty body](wiki/troubleshooting/graphql-uploads-415-or-empty-body.md) |

# Knowledge

- [Architecture](wiki/architecture/) - cross-cutting structure, the couplings and orderings no single file makes obvious
- [CI](wiki/ci/) - pipeline configuration, build and test workflows, and when they run
- [Components](wiki/components/) - one concept per app, library, service, or tool
- [Conventions](wiki/conventions/) - the patterns this repo expects you to follow
- [Domain](wiki/domain/) - product and business knowledge: what the code's concepts mean to the business
- [Local](wiki/local/) - getting the project running on a fresh machine, and the known snags
- [Operations](wiki/operations/) - runbooks for setup, services, migrations, and release
- [Reference](wiki/reference/) - standing explanations of concepts, terms, and external systems
- [Security](wiki/security/) - threat model and the controls that address it: secrets, auth, transport, permissions
- [Troubleshooting](wiki/troubleshooting/) - symptoms, causes, fixes
- [UI](wiki/ui/) - screens, widgets, navigation, and the design system that keeps them consistent

# Operational

These three directories sit outside the default load. They are not alike: `_sources/` holds real concepts to read on demand, `_log/` is history, and `raw/` is not to be read at all.

- [Sources](_sources/) - knowledge ingested from outside the repository, populated by `/repokb:ingest` and `/repokb:ingest-conversation`. Real concepts, cited like any other — read them when a topic calls for them, not by default: [Conversations](_sources/conversations/), [External](_sources/external/)
- [Update log](_log/) - bundle change history, one file per day (`YYYYMMDD.md`)
- [Raw](raw/) - the originals the concepts were distilled from - files, fetched pages, and conversations alike: [Images](raw/images/), [PDFs](raw/pdfs/), [Documents](raw/documents/), [ADRs](raw/adrs/), [Conversations](raw/conversations/), [Others](raw/others/)

**Agents: `raw/` is strictly for humans. Never open, read, or load in context a file under `raw/`.** Link to it for a human reader and stop there.
