---
type: Troubleshooting
title: CommonJS and ESM Import Breakage
description: A dependency works in one of the package's two builds (dist .cjs or .js) but breaks in the other, or a dependency's subpath module ends up bundled into dist, with the fixes recorded in history for firebase-admin, stack-trace, and subpath externals.
tags: [troubleshooting, build, commonjs, esm, vite, externals]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: vite-firebase
    resource: repo://packages/firebase/vite.config.ts
    title: Subpath external comment
  - id: vite-user
    resource: repo://packages/user/vite.config.ts
    title: supertokens-node regex external
  - id: firebase-init
    resource: repo://packages/firebase/src/lib/initializeFirebase.ts#L4-L26
    title: Default import of firebase-admin (current)
  - id: commit-firebase-import
    resource: repo://packages/firebase/src/lib/initializeFirebase.ts
    title: "Commit b024deec, 2025-10-30: fix(firebase): fix firebase-admin import style to support commonjs and ESM (#1033)"
  - id: commit-stacktracey
    resource: repo://packages/error-handler/src/errorHandler.ts#L4
    title: "Commit 05cdb033, 2025-08-13: fix(error-handler): replace stack-trace package with stacktracey to support commonjs (#1009)"
  - id: pkg-exports
    resource: repo://packages/firebase/package.json
    title: Dual exports (import → .js, require → .cjs)
---

# CommonJS and ESM Import Breakage

Every package ships **two builds**: `require` resolves `dist/prefabs-tech-fastify-<name>.cjs` and `import` resolves `.js`.[^pkg-exports] Dependencies stay external, so the consumer's module system decides how each dependency is loaded. An import that works in one build can fail in the other. History records two fixes for this, and the Vite configs record a third related trap.

> The exact error messages consumers saw are not recorded in the repository. The commit subjects name only the module format.

## Case 1: named imports from a CommonJS library
**Symptom.** The fix commit's subject is "fix firebase-admin import style to support commonjs and ESM".[^commit-firebase-import]
**Cause.** The code had used named imports (`import { initializeApp, credential, apps } from "firebase-admin"` and `import { messaging } from "firebase-admin"`).
**Fix applied.** Switch to the default import and access members through it: `import admin from "firebase-admin"`, then `admin.apps`, `admin.initializeApp`, `admin.credential.cert` and `admin.messaging()`.[^commit-firebase-import][^firebase-init]

## Case 2: a dependency that supports only one format
**Symptom.** The fix commit's subject is "replace stack-trace package with stacktracey to support commonjs".[^commit-stacktracey]
**Fix applied.** `stack-trace` was replaced with `stacktracey`. The `ErrorResponse.stack` type changed from `StackFrame[]` to `StackTracey.Entry[]`, and `StackTracey` is now re-exported.
**Rule of thumb.** Prefer dependencies that ship both CommonJS and ESM, or that can be imported the same way from both.

## Case 3: a subpath import is bundled into `dist/`
**Symptom.** A dependency's code shows up inside `dist/`, possibly a second copy of a library the consumer also loads.
**Cause.** Rolldown string externals match **exact module ids only**, so `firebase-admin/app-check` is not covered by `"firebase-admin"`.[^vite-firebase]
**Fix.** Add a regex external: firebase uses `/^firebase-admin\//`,[^vite-firebase] and s3, user and phone-auth use `/supertokens-node+/`.[^vite-user] Do this for every new `pkg/subpath` import.

## Checking both builds
> Suggested check, not a script in the repository: after `pnpm build`, load both entry points from Node, for example `node -e "require('./packages/<name>/dist/prefabs-tech-fastify-<name>.cjs')"` and a dynamic `import()` of the `.js` file. Also grep `dist/` for code from a dependency that should be external.

## Related
[Build graph](../architecture/build-graph.md#the-library-build)

[^pkg-exports]: `exports["."].import` points to `.js` and `require` to `.cjs`.
[^commit-firebase-import]: The diff in commit b024deec touches `initializeFirebase.ts` and `sendPushNotification.ts`.
[^firebase-init]: `import admin from "firebase-admin"`.
[^commit-stacktracey]: The diff in commit 05cdb033 touches `errorHandler.ts`, `index.ts`, `types.ts` and `vite.config.ts`.
[^vite-firebase]: Comment: "String externals match exact ids only; subpath imports (firebase-admin/app-check) would otherwise be bundled."
[^vite-user]: The external list includes `/supertokens-node+/`.
