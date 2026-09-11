---
type: CI
title: Ship.js Release Workflows
description: How the two Ship.js GitHub workflows prepare and publish a lockstep release of every package, the secrets they need, and a script mismatch in the manual-prepare workflow.
tags: [ci, release, shipjs, npm, github-actions]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: manual-prepare
    resource: repo://.github/workflows/shipjs-manual-prepare.yml#L1-L61
    title: Ship js Manual Prepare workflow
  - id: trigger
    resource: repo://.github/workflows/shipjs-trigger.yml#L1-L34
    title: Ship js trigger workflow
  - id: ship-config
    resource: repo://ship.config.js#L1-L70
    title: Ship.js config
  - id: root-pkg
    resource: repo://package.json#L9-L17
    title: Root scripts (no release script)
  - id: makefile
    resource: repo://makefile
    title: make release / make publish
  - id: env-example
    resource: repo://.env.example
    title: GITHUB_TOKEN placeholder
  - id: commit-release-script
    resource: repo://package.json
    title: "Commit b901b203, 2022-11-24: ci: add publish makefile job (removed the root release script)"
  - id: commit-split-pnpm
    resource: repo://.github/workflows/shipjs-trigger.yml#L17-L26
    title: "Commit 7c700356, 2026-05-07: ci: split pnpm setup and install in shipjs-trigger workflow (#1106)"
  - id: commit-npm-token
    resource: repo://.env.example
    title: "Commit a65a6461, 2026-07-12: chore(shipjs): removed NPM_TOKEN env var (#1135)"
  - id: shipjs-docs
    resource: https://github.com/algolia/shipjs
    title: Ship.js (external)
---

# Ship.js Release Workflows

Releases use [Ship.js](https://github.com/algolia/shipjs) in two phases: **prepare**, which bumps versions, updates the changelog and opens a release PR, and **trigger**, which builds and publishes once that PR is merged. The phase semantics come from Ship.js itself.[^shipjs-docs] This page covers how this repo wires them. The human procedure is [Release procedure](../operations/release-procedure.md).

## Configuration (`ship.config.js`)
- `monorepo.mainVersionFile: "package.json"`: the root version is the single version.[^ship-config]
- `packagesToBump` and `packagesToPublish` are both `packages/*`, so **every package is bumped and published every release** (lockstep).
- `installCommand: pnpm -r install`, `buildCommand: pnpm build`, `publishCommand: pnpm publish --access public`.
- `expandPackageList` is adapted from shipjs-lib to support `!package` exclusions. Ship.js cannot ignore packages natively, per the file's comment. No exclusions are configured today.[^ship-config]

## Phase 1: prepare
There are two entry points.
- **Locally:** `make release` runs `npx shipjs prepare`.[^makefile] `.env.example` lists `GITHUB_TOKEN`.[^env-example]
- **From GitHub:** a comment beginning `@shipjs prepare` by a repo **member or owner** on an issue or PR starts `shipjs-manual-prepare.yml`:[^manual-prepare]
  1. Checks out `main` with full history, sets up Node 24, configures the bot git identity.
  2. Runs `npm run release -- --yes --no-browse` with `GITHUB_TOKEN` and `SLACK_INCOMING_HOOK`.
  3. Comments "`shipjs prepare` done" or "fail" back on the thread.

**Mismatch.** The root `package.json` has **no `release` script**.[^root-pkg] It was removed in commit `b901b203` on 2022-11-24, the day before this workflow was added. The job also installs neither pnpm nor dependencies.[^manual-prepare][^commit-release-script]
> Inference, not verified against workflow run history: as written, the job should fail at the `npm run release` step. The local `make release` path is the one consistent with the current manifests.

## Phase 2: trigger (publish)
`shipjs-trigger.yml` runs when a PR is **closed and merged** and its head branch starts with `releases/v`:[^trigger]
1. Checks out `main` (full history).
2. `pnpm/action-setup`, then Node 24 with the npm registry URL and the pnpm cache. These are separate steps since commit `7c700356`.[^commit-split-pnpm]
3. `pnpm install --frozen-lockfile --strict-peer-dependencies`.
4. Configures the git identity.
5. `npx shipjs trigger` with `GITHUB_TOKEN`, `NPM_AUTH_TOKEN` and `SLACK_INCOMING_HOOK`. Ship.js then runs the configured build and publish commands.

## Secrets (names only)
| Secret | Used by |
|--------|---------|
| `GITHUB_TOKEN` | both workflows |
| `NPM_AUTH_TOKEN` | trigger (publish) |
| `SLACK_INCOMING_HOOK` | both (Ship.js notifications) |

`NPM_TOKEN` was removed from `.env.example` in commit `a65a6461`.[^commit-npm-token]

## Open questions
- How is prepare actually run today: locally with `make release`, or through the comment workflow? Does the comment workflow work at all?
- The trigger workflow does not rerun tests before publishing; it relies on `pnpm build` inside Ship.js. Is that intended?

[^ship-config]: Comment L1-3 on package ignoring; `module.exports` L60-70.
[^makefile]: `release: npx shipjs prepare`; `publish: npx shipjs trigger`.
[^env-example]: A single line with a placeholder value.
[^manual-prepare]: Condition L7-10; run step L26-29.
[^root-pkg]: Scripts: build, lint, lint:fix, prepare, sort-package, test, typecheck.
[^commit-release-script]: The diff removes `"release": "shipjs prepare"`; the workflow's first commit is 80b9214f on 2022-11-25.
[^trigger]: Condition L10; the publish step L30-34.
[^commit-split-pnpm]: Commit 7c700356.
[^commit-npm-token]: Commit a65a6461.
[^shipjs-docs]: External project documentation.
