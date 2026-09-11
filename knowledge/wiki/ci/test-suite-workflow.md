---
type: CI
title: Test Suite Workflow
description: What the single CI check runs (install, build, test on Node 20/22/24 for every push), what it deliberately or accidentally does not run, and how to read its failures.
tags: [ci, github-actions, tests, pnpm, turbo]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: workflow
    resource: repo://.github/workflows/test.yml#L1-L27
    title: Test suite workflow
  - id: turbo
    resource: repo://turbo.json#L21-L26
    title: test and typecheck tasks
  - id: error-handler-scripts
    resource: repo://packages/error-handler/package.json#L25-L31
    title: error-handler has no test script
  - id: husky
    resource: repo://.husky/pre-commit#L1-L3
    title: Lint and typecheck only run locally
  - id: renovate
    resource: repo://renovate.json
    title: Renovate
  - id: makefile
    resource: repo://makefile
    title: Makefile test targets
  - id: root-pkg
    resource: repo://package.json#L9-L17
    title: Root scripts
---

# Test Suite Workflow

## What runs
The workflow is `.github/workflows/test.yml`, named "Test suite".[^workflow]

| Aspect | Value |
|--------|-------|
| Trigger | `on: push`, for every branch and tag. There is no `pull_request` trigger. |
| Matrix | Node 20, 22, 24 |
| Install | `pnpm/action-setup@v6` with a recursive install using `--frozen-lockfile --strict-peer-dependencies` |
| Steps | `pnpm build` → `pnpm test` |

`pnpm test` runs `turbo run test`, which runs each package's `vitest run --coverage`.[^root-pkg][^turbo]

## What does not run
- **Lint and typecheck.** They run only in the local husky pre-commit hook,[^husky] so a commit made with `--no-verify`, or one edited on GitHub, reaches CI unchecked.
- **error-handler's tests.** The package has no `test` script,[^error-handler-scripts] so turbo has nothing to run for it, although it has ten test files.
- **Coverage gates.** Coverage is produced but no threshold or upload step exists.
- **Integration tests.** The Makefile's `test.ci`, `test.unit` and `test.integration` targets call `pnpm test:ci`, `test:unit` and `test:integration`, none of which exist in the root `package.json`.[^makefile][^root-pkg]
- **Anything needing services.** Tests use pg-mem and mocks. No Postgres, SuperTokens core, S3 or SMTP is provisioned.

## Reading failures
| Failing step | Usual cause |
|--------------|-------------|
| Install | A `package.json` changed without regenerating `pnpm-lock.yaml` (frozen lockfile), or a peer range no longer satisfiable (strict peers) |
| Build | A type error in `tsc --emitDeclarationOnly`, or a sibling's `dist` missing an export. `build` depends on `^build`, so the first failing package in topological order is the real one. |
| Test on one Node version only | A runtime API difference across 20, 22 and 24 |
| Test in package B after changing package A | Behaviour change in A's `dist` consumed by B; see [Stale sibling build](../troubleshooting/stale-sibling-build.md) |

## Dependency updates
Renovate (`config:base`) opens update PRs, which run this same workflow on push.[^renovate] Many `fix(deps): update dependency ...` commits in history come from it.

## Open questions
- Is leaving lint and typecheck out of CI deliberate, for speed perhaps, or a gap?
- Is branch protection requiring this check configured on `main`? It is not visible from the repository.

[^workflow]: The whole file is 27 lines.
[^root-pkg]: `"test": "turbo run test"`.
[^turbo]: `test` has only `outputs: ["coverage/**"]`.
[^husky]: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
[^error-handler-scripts]: build, lint, lint:fix, sort-package, typecheck.
[^makefile]: `test.ci: pnpm test:ci`, `test.integration: pnpm test:integration`, `test.unit: pnpm test:unit`.
[^renovate]: `"extends": ["config:base"]`.
