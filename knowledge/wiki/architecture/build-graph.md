---
type: Architecture
title: Monorepo Build Graph
description: What depends on what across the ten packages, why tests and typechecks consume siblings from dist/ without building them, and what the Vite library build externalizes.
tags: [turbo, pnpm, vite, build, monorepo, dependencies]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: turbo
    resource: repo://turbo.json#L3-L27
    title: Turbo task graph
  - id: workspace
    resource: repo://pnpm-workspace.yaml#L1-L16
    title: pnpm workspace settings and overrides
  - id: root-pkg
    resource: repo://package.json#L9-L31
    title: Root scripts, packageManager, engines
  - id: pkg-exports
    resource: repo://packages/slonik/package.json
    title: Package exports point at dist/
  - id: user-pkg
    resource: repo://packages/user/package.json
    title: User package sibling pins (peer and dev)
  - id: vite-slonik
    resource: repo://packages/slonik/vite.config.ts
    title: Vite lib build (formats, externals, target)
  - id: vite-firebase
    resource: repo://packages/firebase/vite.config.ts
    title: Regex external for firebase-admin subpaths
  - id: vite-user
    resource: repo://packages/user/vite.config.ts
    title: Regex external for supertokens-node subpaths
  - id: vite-config
    resource: repo://packages/config/vite.config.ts
    title: Config package externalizes peers only
  - id: tsconfig
    resource: repo://packages/slonik/tsconfig.json
    title: Shared tsconfig shape
  - id: phone-auth-pkg
    resource: repo://packages/phone-auth/package.json#L30-L53
    title: Phone auth pins vitest 3.2.7
  - id: ci-test
    resource: repo://.github/workflows/test.yml#L24-L27
    title: CI builds before testing
  - id: husky
    resource: repo://.husky/pre-commit#L1-L3
    title: Pre-commit hook runs lint, typecheck, test
  - id: commit-overrides-move
    resource: repo://pnpm-workspace.yaml
    title: "Commit cd12d46f, 2026-07-11: overrides moved from package.json to pnpm-workspace.yaml"
---

# Monorepo Build Graph

## Package dependency graph
Edges are sibling **peerDependencies**, which are the runtime contract:

| Package | Depends on (siblings) |
|---------|----------------------|
| config | none |
| error-handler | none |
| swagger | none |
| slonik | config |
| mailer | config (optional peer) |
| graphql | config, slonik |
| s3 | config, error-handler, graphql, slonik |
| firebase | config, error-handler, graphql, slonik |
| user | config, error-handler, graphql, **mailer, s3**, slonik |
| phone-auth | config, error-handler, slonik, **user** |

user is the heaviest consumer. Its dependency on s3 exists for profile photos and a foreign key; a draft spec proposes removing it (see [user component](../components/user.md)).

## Tasks
- **`build`** depends on `^build` (siblings first) and caches `dist/**`.[^turbo]
- **`test`, `typecheck`, `lint`** have **no** `dependsOn`.[^turbo]

Every package's `main`, `module`, `types` and `exports` point into `dist/`.[^pkg-exports] A package's tests and typecheck therefore import **whatever sibling build is on disk**. That build may be missing, or older than the sibling's source.

- CI runs `pnpm build` before `pnpm test`.[^ci-test]
- The husky pre-commit hook runs `lint`, `typecheck` and `test` **without** building.[^husky]

See [Stale sibling build](../troubleshooting/stale-sibling-build.md).

## The library build
Per package: `vite build && tsc --emitDeclarationOnly && mv dist/src dist/types`.[^pkg-exports]
- Vite library mode emits `cjs` and `es` at target `es2022`, named `prefabs-tech-fastify-<name>`.[^vite-slonik]
- **Externals are `dependencies` plus `peerDependencies`**, not peers alone.[^vite-slonik] The config package has no `dependencies`, so it lists peers only.[^vite-config]
- Rolldown string externals match **exact module ids only**. Subpath imports need regex externals, otherwise they are bundled into `dist/`:
  - firebase: `/^firebase-admin\//`, with a comment explaining why.[^vite-firebase]
  - s3, user, phone-auth: `/supertokens-node+/`.[^vite-user]
  - Any new subpath import (`pkg/sub`) of an external library needs the same treatment.
- The tsconfig is byte-identical across all ten packages. It extends `@prefabs.tech/tsconfig/fastify.json` and excludes `src/**/__test__/**`.[^tsconfig]

## Workspace settings
- All packages share the root version (0.94.1). Sibling peers are pinned to that **exact** version in both `peerDependencies` and `devDependencies`, not to a `>=` range.[^user-pkg] Third-party peers use `>=`.
  > Inference: combined with strict peer checking, a consuming app must install every `@prefabs.tech/fastify-*` package at the same version.
- `linkWorkspacePackages: true` resolves the dev pins to local workspace packages.[^workspace]
- `autoInstallPeers: false` means peers are never installed implicitly. Every peer must also appear in `devDependencies` to exist locally.[^workspace]
- Security and version `overrides` live in `pnpm-workspace.yaml`. They moved there from the root `package.json` in commit `cd12d46f`.[^commit-overrides-move]
- `packageManager: pnpm@10.29.3`; engines are node >=20 and pnpm >=10.[^root-pkg]

## Inconsistencies observed
- phone-auth pins `vitest` and `@vitest/coverage-istanbul` at **3.2.7**. The other packages use 4.1.10.[^phone-auth-pkg]
- s3 externalizes `/supertokens-node+/` but declares no supertokens dependency.

[^turbo]: `build.dependsOn: ["^build"]`; `test.outputs: ["coverage/**"]`; `typecheck` has no dependsOn.
[^pkg-exports]: `"types": "./dist/types/index.d.ts"`; the build script L27.
[^vite-slonik]: `external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)]`, `formats: ["cjs", "es"]`, `target: "es2022"`.
[^vite-config]: `external: Object.keys(peerDependencies)`.
[^vite-firebase]: Comment: "String externals match exact ids only; subpath imports (firebase-admin/app-check) would otherwise be bundled."
[^vite-user]: `/supertokens-node+/` in the external list.
[^tsconfig]: Identical md5 across `packages/*/tsconfig.json`, checked 2026-09-11.
[^user-pkg]: `"@prefabs.tech/fastify-slonik": "0.94.1"` in both dev and peer blocks.
[^workspace]: L12-16.
[^root-pkg]: L27-31.
[^phone-auth-pkg]: L44 and L53.
[^ci-test]: "Build packages", then "Run tests".
[^husky]: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
[^commit-overrides-move]: Commit cd12d46f removed the `pnpm.overrides` block from the root package.json. The overrides now live in pnpm-workspace.yaml.
