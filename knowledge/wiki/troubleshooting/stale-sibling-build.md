---
type: Troubleshooting
title: Stale Sibling Build
description: Tests or typecheck in one package fail, or pass against old behaviour, after changing a sibling package, because siblings are consumed from dist/ and neither test nor typecheck rebuilds them.
tags: [troubleshooting, turbo, build, dist, monorepo, tests]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: turbo
    resource: repo://turbo.json#L4-L26
    title: Only build depends on ^build
  - id: pkg-exports
    resource: repo://packages/slonik/package.json
    title: exports/main/types point into dist/
  - id: husky
    resource: repo://.husky/pre-commit#L1-L3
    title: Pre-commit runs typecheck and test without build
  - id: ci
    resource: repo://.github/workflows/test.yml#L24-L27
    title: CI builds before testing
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Mistakes table entries 13 and 21
---

# Stale Sibling Build

## Symptoms
- After editing package A, tests or typecheck in package B (which depends on A) report a missing export or type, or keep showing A's **old** behaviour.
- On a fresh clone, the first `git commit` fails in the pre-commit hook with unresolved `@prefabs.tech/fastify-*` imports.
- CI passes while the local run fails, or the reverse.

## Cause
- Every package resolves siblings through their `package.json` `exports`, `main` and `types`, which all point into `dist/`.[^pkg-exports]
- In turbo, only `build` depends on `^build`. `test` and `typecheck` run against whatever sibling `dist/` exists.[^turbo]
- CI always builds first.[^ci] The husky pre-commit hook does **not**.[^husky]

## Fix
```bash
pnpm build                                        # everything, dependency-ordered, cached
# or just the sibling you changed:
pnpm --filter @prefabs.tech/fastify-slonik build
```
Then rerun the failing package's tests.

## Not this problem
If vitest reports `Failed to load url <pkg>` for a **declared devDependency**, or `lint:fix` reorders `import type` groups after value imports, the cause is stale `node_modules`, not a stale build. Run `pnpm -r install` first.[^claude-md]

## Related
[Build graph](../architecture/build-graph.md) · [Monorepo development setup](../local/monorepo-development-setup.md)

[^pkg-exports]: `"types": "./dist/types/index.d.ts"`, `"import": "./dist/prefabs-tech-fastify-slonik.js"`.
[^turbo]: `build.dependsOn: ["^build"]`; `test` and `typecheck` have none.
[^ci]: "Build packages", then "Run tests".
[^husky]: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
[^claude-md]: Row 13 (rebuild before testing a dependent) and row 21 (stale node_modules symptoms).
