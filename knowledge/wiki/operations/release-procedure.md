---
type: Runbook
title: Release Procedure
description: The steps to ship a lockstep release of all @prefabs.tech/fastify-* packages to npm, who may run them, and what the history of the v0.94.0 release suggests can go wrong.
tags: [release, runbook, shipjs, npm]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: claude-md
    resource: repo://CLAUDE.md
    title: "Git, commits, releases and Never do sections"
  - id: makefile
    resource: repo://makefile
    title: make release / make publish
  - id: ship-config
    resource: repo://ship.config.js#L60-L70
    title: Ship.js config
  - id: trigger
    resource: repo://.github/workflows/shipjs-trigger.yml#L10-L34
    title: Publish workflow
  - id: env-example
    resource: repo://.env.example
    title: GITHUB_TOKEN for local prepare
  - id: history-0940
    resource: repo://.github/workflows/shipjs-trigger.yml
    title: "Commits a9d26f50 (#1104 changelog notes), 7c0460d2 (#1105 release v0.94.0), 7c700356 (#1106 ci split pnpm setup/install), 22a06ef9 (#1107 release v0.94.0), 0668cbfe, 7ba210b5 (#1108 release v0.94.0)"
  - id: history-0941
    resource: repo://package.json#L3
    title: "Commit 92e74dec: chore: release v0.94.1 (#1115)"
---

# Release Procedure

## Who
Releasing is restricted to a designated maintainer. CLAUDE.md tells agents never to run `make release`, `make publish` or any `shipjs` command, never to edit `version` fields or `CHANGELOG.md`, and never to publish to npm.[^claude-md]

## What a release is
Every package in `packages/*` is bumped to the new root version and published together.[^ship-config] Consumers pin sibling peers to that exact version ([Dependency layout](../conventions/dependency-layout.md)), so a partial release is not an option.

## Steps
1. **Confirm `main` is green.** CI runs only build and test; run `pnpm lint && pnpm typecheck` locally as well, since CI does not ([Test suite workflow](../ci/test-suite-workflow.md)).
2. **Prepare** from an up-to-date `main` with `GITHUB_TOKEN` available:[^env-example][^makefile]
   ```bash
   make release        # runs: npx shipjs prepare
   ```
   Ship.js bumps the versions, updates `CHANGELOG.md`, and opens a PR from a `releases/vX.Y.Z` branch. The comment-driven workflow is an alternative, but see the [mismatch note](../ci/shipjs-release-workflows.md#phase-1-prepare).
3. **Review the release PR**: version bump across the root and all packages, changelog content.
4. **Merge the PR.** The merge of a `releases/v*` branch starts `shipjs-trigger.yml`, which installs, builds and publishes every package with `pnpm publish --access public`.[^trigger]
5. **Verify** the new version on npm for each package, and check the workflow run.

`make publish` (`npx shipjs trigger`) exists for publishing from a local machine.[^makefile] Nothing in the repository says when that is appropriate.

## What history suggests can go wrong
The v0.94.0 release took several commits:[^history-0940]
1. A hand-written changelog commit ("add 0.94.0 release notes").
2. A release commit (#1105).
3. A CI fix splitting pnpm setup and install in the trigger workflow (#1106).
4. Two more release commits (#1107, #1108).

> Inference from commit order only: the first publish attempt appears to have failed in the trigger workflow and been retried after the CI fix. The changelog for that release was also edited by hand, although CLAUDE.md assigns changelog ownership to Ship.js.

v0.94.1 was a single release commit (#1115).[^history-0941]

## Open questions
- Is `make release` the path actually used, or the `@shipjs prepare` comment?
- What should happen when publishing partially fails, for example some packages published and others not? No rollback or unpublish procedure is recorded.

[^claude-md]: "Versioning and changelog belong to shipjs" and the "Never do" list.
[^ship-config]: `packagesToBump` and `packagesToPublish` are `expandPackageList(["packages/*"])`.
[^env-example]: `.env.example` contains a `GITHUB_TOKEN` placeholder.
[^makefile]: `release:` and `publish:` targets.
[^trigger]: Runs on a merged PR whose `head_ref` starts with `releases/v`.
[^history-0940]: Taken from `git log --oneline` on 2026-09-11.
[^history-0941]: Root `"version": "0.94.1"`.
