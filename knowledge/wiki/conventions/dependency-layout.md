---
type: Convention
title: Dependency Layout
description: Where a dependency goes (peerDependencies with a dev pin, or dependencies), why sibling packages are pinned to the lockstep version, and how security overrides and the strict CI install enforce it.
tags: [dependencies, pnpm, peer-dependencies, lockstep, security-pins]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Dependency layout rule
  - id: user-pkg
    resource: repo://packages/user/package.json
    title: Sibling peers pinned exactly, third-party peers with >=
  - id: s3-pkg
    resource: repo://packages/s3/package.json
    title: Implementation-only libraries in dependencies
  - id: mailer-pkg
    resource: repo://packages/mailer/package.json
    title: Optional peer (config)
  - id: slonik-pkg
    resource: repo://packages/slonik/package.json
    title: Optional peer (pg-mem)
  - id: workspace
    resource: repo://pnpm-workspace.yaml#L1-L16
    title: overrides, autoInstallPeers false
  - id: vite
    resource: repo://packages/slonik/vite.config.ts
    title: Externals are dependencies + peerDependencies
  - id: ci-test
    resource: repo://.github/workflows/test.yml#L18-L23
    title: Strict install in CI
  - id: renovate
    resource: repo://renovate.json
    title: Renovate config:base
  - id: commit-fxp
    resource: repo://pnpm-workspace.yaml#L6
    title: "Commit be57fd52, 2026-04-23: pin fast-xml-parser to 5.7.1 via pnpm override (#1092)"
  - id: commit-cve
    resource: repo://packages/firebase/package.json
    title: "Commit 021c2071: fix(firebase): upgrade firebase-admin to 13.7.0 to address CVE-2026-25896"
---

# Dependency Layout

## The rule
| Kind of dependency | `peerDependencies` | `devDependencies` | `dependencies` |
|--------------------|--------------------|-------------------|----------------|
| Something the consumer also touches: fastify, fastify-plugin, slonik, mercurius, supertokens-node, zod, graphql, sibling `@prefabs.tech/fastify-*` | yes | yes, exact pin | no |
| Implementation-only library: `@aws-sdk/*`, `firebase-admin`, `humps`, `uuid`, `nodemailer`, `twilio`, `busboy` | no | no | yes |

This is the rule in CLAUDE.md.[^claude-md] The manifests follow it: s3 keeps the AWS SDK, `@fastify/multipart`, `ajv` and `uuid` in `dependencies` and everything shared in peers.[^s3-pkg]

The reason for peers is that consumer and package must share **one instance**. Fastify decorators, type augmentation of `ApiConfig`/`FastifyInstance`, and SuperTokens' single global `init()` all break when two copies of the same library are loaded.
> The single-instance reasoning is inference from how these libraries work. The repository states the rule, not its motivation.

## Version ranges
- **Third-party peers:** `>=` the tested version, e.g. `"fastify": ">=5.10.0"`, `"supertokens-node": ">=14.1.4"`.[^user-pkg]
- **Sibling peers:** the **exact lockstep version**, e.g. `"@prefabs.tech/fastify-slonik": "0.94.1"`, in both peer and dev blocks.[^user-pkg] Every release moves them together.
- **Optional peers** via `peerDependenciesMeta`: mailer → config, slonik → `pg-mem`.[^mailer-pkg][^slonik-pkg]

## How the build treats it
Vite externalizes **both** `dependencies` and `peerDependencies`, so neither kind is bundled into `dist/`.[^vite]
- CLAUDE.md says Vite externalizes exactly the peers. That no longer matches the Vite configs.
- Misplacing a sibling in `dependencies` therefore does not bundle it. It does make npm install a nested copy for consumers, which is the duplicate-instance problem above.
- Subpath imports need regex externals; see [Build graph](../architecture/build-graph.md#the-library-build).

## How it is enforced
- `autoInstallPeers: false`: a peer that is not also a devDependency is simply absent locally, so tests fail fast.[^workspace]
- CI installs with `--frozen-lockfile --strict-peer-dependencies`. A manifest edit without a lockfile update, or an unsatisfiable peer, fails the job.[^ci-test]
- Nothing enforces the peer vs dependency choice itself; review has to catch it.

## Security pins
Transitive versions are forced through `overrides` in `pnpm-workspace.yaml`: `fast-xml-parser`, `handlebars`, `protobufjs` and the `typescript-eslint` family.[^workspace] History shows both mechanisms in use:
- an override for `fast-xml-parser`[^commit-fxp]
- a direct bump with the CVE in the commit subject[^commit-cve]

Renovate runs with `config:base`.[^renovate] Major bumps of fastify, slonik, supertokens-node and mercurius need maintainer approval under CLAUDE.md's escalation rules.[^claude-md]

[^claude-md]: The "Dependency layout" cross-cutting rule and escalation item 6.
[^user-pkg]: Dev pins L36-61 and peers L62-81 (approximate block positions).
[^s3-pkg]: `dependencies`: `@aws-sdk/client-s3`, `lib-storage`, `s3-request-presigner`, `@fastify/multipart`, `ajv`, `uuid`.
[^mailer-pkg]: `peerDependenciesMeta["@prefabs.tech/fastify-config"].optional`.
[^slonik-pkg]: `peerDependenciesMeta["pg-mem"].optional`.
[^workspace]: `overrides` L1-10; `autoInstallPeers: false` L15.
[^vite]: `external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)]`.
[^ci-test]: `args: [--frozen-lockfile, --strict-peer-dependencies]`.
[^renovate]: `"extends": ["config:base"]`.
[^commit-fxp]: Commit be57fd52.
[^commit-cve]: Commit 021c2071.
