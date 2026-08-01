# Agent instructions — @prefabs.tech/fastify-error-handler

Published **with the npm package**. Use **[README.md](./README.md)** first (see **For AI agents** there), then this file when the monorepo root isn’t available (for example under `node_modules`). The steps below minimize tokens and avoid broad `dist/`/`src/` scans.

## Read order

1. [docs/llm/INDEX.md](./docs/llm/INDEX.md) — package orientation and boundaries.
2. [docs/llm/EXAMPLES.md](./docs/llm/EXAMPLES.md) — task → smallest source/test files.
3. Workspace **[REFERENCE](https://github.com/prefabs-tech/fastify/blob/main/docs/llm/REFERENCE.md#error-handler)** — deep links to GUIDE, `src/index.ts`, `plugin.ts`, and tests (**not** in this tarball).
4. Workspace **[INDEX](https://github.com/prefabs-tech/fastify/blob/main/docs/llm/INDEX.md)** — map of all packages.

Open sources and tests **only** via links on the REFERENCE page. Avoid scanning the full monorepo or large compiled trees unless these docs are missing, incomplete, or obviously stale.

## In this install

Per `package.json` → `files`, you typically have `dist/`, `docs/llm/`, and this file. For full source and tests, use **repository** in `package.json`.
