# Agent instructions — @prefabs.tech/fastify

Humans and coding agents should **default to documentation** in this repo before reading or editing package source.

**Published packages:** each `packages/<name>/` directory ships `AGENTS.md` and `docs/llm/**` on npm (see each `package.json` → `files`). When you add a package or change the public API, update the `<!-- docgen:packages:start -->` region in [docs/llm/REFERENCE.md](docs/llm/REFERENCE.md) and the `<!-- docgen:readme:start -->` API tables in package READMEs by hand. When you change agent read-order for humans, update **both** the repo-root doc flow below **and** that package’s `AGENTS.md` (keep the GitHub `REFERENCE.md#<name>` URL consistent).

## Read order

1. [docs/llm/INDEX.md](docs/llm/INDEX.md) — workspace map and boundaries.
2. **One** package: `packages/<name>/docs/llm/INDEX.md` (see table below), then `packages/<name>/docs/llm/EXAMPLES.md` (task → file).
3. [docs/llm/REFERENCE.md](docs/llm/REFERENCE.md) — open **only** the section (anchor) for that package.
4. Follow links from REFERENCE or `docs/llm/EXAMPLES.md` to GUIDE.md, tests, `src/index.ts`, and `src/plugin.ts`.

## Escalation

Open additional files **only** when they are linked from REFERENCE, from that package’s `docs/llm/EXAMPLES.md`, or from files you already opened through those links.

## Fallback

Broad search or full-tree reads under `packages/*/src/` are for when `docs/llm` is missing, incomplete, or known to be stale—never as the first step.

## Package LLM entrypoints

| Package | INDEX | Examples |
|---------|--------|----------|
| config | [INDEX](packages/config/docs/llm/INDEX.md) | [EXAMPLES](packages/config/docs/llm/EXAMPLES.md) |
| error-handler | [INDEX](packages/error-handler/docs/llm/INDEX.md) | [EXAMPLES](packages/error-handler/docs/llm/EXAMPLES.md) |
| swagger | [INDEX](packages/swagger/docs/llm/INDEX.md) | [EXAMPLES](packages/swagger/docs/llm/EXAMPLES.md) |
| slonik | [INDEX](packages/slonik/docs/llm/INDEX.md) | [EXAMPLES](packages/slonik/docs/llm/EXAMPLES.md) |
| graphql | [INDEX](packages/graphql/docs/llm/INDEX.md) | [EXAMPLES](packages/graphql/docs/llm/EXAMPLES.md) |
| s3 | [INDEX](packages/s3/docs/llm/INDEX.md) | [EXAMPLES](packages/s3/docs/llm/EXAMPLES.md) |
| mailer | [INDEX](packages/mailer/docs/llm/INDEX.md) | [EXAMPLES](packages/mailer/docs/llm/EXAMPLES.md) |
| firebase | [INDEX](packages/firebase/docs/llm/INDEX.md) | [EXAMPLES](packages/firebase/docs/llm/EXAMPLES.md) |
| user | [INDEX](packages/user/docs/llm/INDEX.md) | [EXAMPLES](packages/user/docs/llm/EXAMPLES.md) |

## Conventions

Public API: `packages/<name>/src/index.ts`. Fastify plugin implementation: `packages/<name>/src/plugin.ts`. Runnable usage examples: tests under `src/__test__` (linked from REFERENCE).

Breaking changes and migrations for agent-facing notes: [docs/llm/CHANGES.md](docs/llm/CHANGES.md).

## Keeping REFERENCE and README API tables in sync

The `<!-- docgen:readme:start -->` / `<!-- docgen:packages:start -->` marker regions are **maintained manually** (there is no repo docgen script). When you change public exports in `src/index.ts`, paths to tests, or the package list, edit [docs/llm/REFERENCE.md](docs/llm/REFERENCE.md) and the affected package README(s) in the same PR. Set **Last verified** in REFERENCE to the current `git` commit once the links match reality.
