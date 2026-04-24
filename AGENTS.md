# Agent instructions — @prefabs.tech/fastify

Humans and coding agents should **default to documentation** in this repo before reading or editing package source.

**Published packages:** each `packages/<name>/` directory also has `AGENTS.md` and `llms.txt` that ship on npm (see each `package.json` → `files`). When you change agent or LLM guidance for a package, update **both** the repo-root doc flow below **and** that package’s `AGENTS.md` / `llms.txt` (and keep the GitHub `REFERENCE.md#<name>` URL in sync).

## Read order

1. [docs/llm/INDEX.md](docs/llm/INDEX.md) — workspace map and boundaries.
2. **One** package: `packages/<name>/docs/llm/INDEX.md` (see table below).
3. [docs/llm/REFERENCE.md](docs/llm/REFERENCE.md) — open **only** the section (anchor) for that package.
4. Follow links from REFERENCE to GUIDE.md, tests, `src/index.ts`, and `src/plugin.ts`.

## Escalation

Open additional files **only** when they are linked from REFERENCE or from files you already opened through those links.

## Fallback

Broad search or full-tree reads under `packages/*/src/` are for when `docs/llm` is missing, incomplete, or known to be stale—never as the first step.

## Package LLM entrypoints

| Package | INDEX |
|---------|--------|
| config | [packages/config/docs/llm/INDEX.md](packages/config/docs/llm/INDEX.md) |
| error-handler | [packages/error-handler/docs/llm/INDEX.md](packages/error-handler/docs/llm/INDEX.md) |
| swagger | [packages/swagger/docs/llm/INDEX.md](packages/swagger/docs/llm/INDEX.md) |
| slonik | [packages/slonik/docs/llm/INDEX.md](packages/slonik/docs/llm/INDEX.md) |
| graphql | [packages/graphql/docs/llm/INDEX.md](packages/graphql/docs/llm/INDEX.md) |
| s3 | [packages/s3/docs/llm/INDEX.md](packages/s3/docs/llm/INDEX.md) |
| mailer | [packages/mailer/docs/llm/INDEX.md](packages/mailer/docs/llm/INDEX.md) |
| firebase | [packages/firebase/docs/llm/INDEX.md](packages/firebase/docs/llm/INDEX.md) |
| user | [packages/user/docs/llm/INDEX.md](packages/user/docs/llm/INDEX.md) |

## Conventions

Public API: `packages/<name>/src/index.ts`. Fastify plugin implementation: `packages/<name>/src/plugin.ts`. Runnable usage examples: tests under `src/__test__` (linked from REFERENCE).

Breaking changes and migrations for agent-facing notes: [docs/llm/CHANGES.md](docs/llm/CHANGES.md).
