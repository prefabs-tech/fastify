---
type: Instructions
title: Wiki Authoring Contract
description: How to read, write, and extend the knowledge base as an OKF v0.2 bundle.
tags: [meta, okf, authoring]
status: stable
---

# Wiki Authoring Contract

This directory is an **[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (OKF) v0.2 bundle**. It is the durable memory for this repository: what the code cannot tell you on its own — why things are the way they are, what broke before, what was decided, what was learned from outside sources.

Read this file before citing anything out of `knowledge/` or writing anything into it. **Reading the bundle** below is the part that applies to every session, including one that only ever reads.

## The one rule that matters

**The code is the source of truth for _what_ the system does. The wiki is the source of truth for _why_, _how we learned it_, and _what to watch out for_.**

Do not write documents that restate what a reader could get by opening the file. `api.ts` registers plugins in a given order — that is discoverable. _That the order matters because `migrationPlugin` must run after slonik and last of all_ is knowledge. Write the second kind.

## Reading the bundle

`/repokb:load` is the entry point; the bundle root `index.md` is the fallback when the skill is unavailable. Either way, **load the index hierarchy first and pull concept documents only as a topic calls for them** — this bundle is built for progressive disclosure, not wholesale loading.

**Respect the trust metadata on everything you read.** Every concept carries OKF provenance and lifecycle fields: a missing `verified` key means unverified agent output, `status: draft` means inferred rather than confirmed, and a past `stale_after` means possibly out of date. Qualify what you say accordingly instead of presenting all of it as equally established fact. The tiers are defined under [Trust](#trust--generated-and-verified).

## Layout

```
knowledge/
  index.md              # bundle root — table of contents, carries okf_version
  _log/                 # bundle-level change history, one file per day
    20260817.md         #   YYYYMMDD.md
  _sources/             # ingested external material (OKF §6.3) — real concepts, not loaded by default
    external/           #   websites, PDFs, docs, videos
    conversations/      #   knowledge distilled from LLM sessions
  CLAUDE.md             # this file
  raw/                  # originals behind ingested material: files, pages as fetched, conversations — human-only, see rule 6
    images/ pdfs/ documents/ adrs/ conversations/ others/
  wiki/                 # what this repository knows about itself
    architecture/       #   cross-cutting structure and dataflow
    components/         #   one concept per app / lib / service / tool
    domain/             #   product and business knowledge
    conventions/        #   how we write code and run the process here
    ui/                 #   screens, widgets, navigation, design system
    security/           #   threat model, secrets, auth, transport, permissions
    local/              #   getting it running on a fresh machine
    ci/                 #   pipelines, builds, checks
    operations/         #   runbooks: deploy, env, migrations, incident response
    troubleshooting/    #   symptom → cause → fix
    reference/          #   standing explanations of concepts and external systems
```

Every directory under `wiki/` and `_sources/` has an `index.md`. `_log/` and `raw/` hold bookkeeping and raw files rather than concepts, and are not indexed.

**Three directories are operational: they sit outside the default load.** `_log/` and `_sources/` carry the `_` prefix, `raw/` does not — but all three are excluded, and they are not governed by the same rule. What they hold differs, so what you may do with them differs:

| Directory   | Holds                                   | Indexed | How you treat it                                                    |
| ----------- | --------------------------------------- | ------- | ------------------------------------------------------------------- |
| `_log/`     | The bundle's own change history         | no      | Read for history and recency; never cite as a fact about the system |
| `raw/`      | Originals behind ingested material      | no      | Never read at all — see rule 6                                      |
| `_sources/` | Ingested external material, as concepts | **yes** | Read and cite like any concept, but only when a topic calls for it  |

`_log/` and `raw/` carry no `index.md` and their files need no frontmatter. `_sources/` is different in kind: its files are ordinary concept documents with full frontmatter, its directories are indexed, and its contents are citable — it is operational only in the sense that it is not part of the default load. It is the intake, not the destination: what proves durable and repo-specific gets promoted into `wiki/`.

## File rules

| File                  | Frontmatter                                       | Purpose                             |
| --------------------- | ------------------------------------------------- | ----------------------------------- |
| `index.md`            | **none** (bundle root only: `okf_version: "0.2"`) | Table of contents for its directory |
| `_log/<YYYYMMDD>.md`  | **none**                                          | One day of change history           |
| `raw/<bucket>/<file>` | **none**                                          | An ingested original — human-only   |
| everything else       | **required**, must contain `type`                 | A concept document                  |

`index.md` is an OKF _reserved filename_. It, and anything inside `_log/` or `raw/`, are the only `.md` files allowed to have no frontmatter. Any other `.md` file without a `type` makes the bundle non-conformant.

## Concept frontmatter

Required — this is the only mandatory field in all of OKF:

```yaml
type: <one of the vocabulary below>
```

Always include these too, because retrieval depends on them:

```yaml
title: <human-readable name>
description: <one sentence; this is what shows up in index.md and in search>
tags: [<tag>, <tag>]
```

Then the families below, as they apply.

### Provenance — `sources`

Where the knowledge came from. Required for anything ingested from outside the repo.

```yaml
sources:
  - id: api-composition-root # stable key, used for per-claim footnotes
    resource: apps/api/src/api.ts
    title: API composition root
    author: human:username # optional credibility signal
    last_modified: 2026-08-17 # when the *source* changed
```

Attribute individual claims with markdown footnotes keyed to `sources[].id`:

```markdown
Migrations run automatically at boot.[^api-composition-root]

[^api-composition-root]: `migrationPlugin` is registered last in `API()`.
```

### Trust — `generated` and `verified`

```yaml
generated:
  by: claude-code/claude-opus-5 # who wrote it
  at: 2026-08-17T10:30:00Z # last meaningful content change
verified:
  - { by: human:jhon, at: 2026-08-17T11:00:00Z }
```

**Never write a `verified` entry on your own behalf, and never add a `human:` actor to `verified` unless a human in the conversation actually confirmed that document's content.** The trust tier is derived from this field and it is the only defense against a wiki that confidently repeats its own guesses:

| State                             | Tier              |
| --------------------------------- | ----------------- |
| no `verified` key                 | Unverified        |
| `verified` by non-`human:` actors | Machine-confirmed |
| `verified` by a `human:` actor    | Human-reviewed    |

Agent-authored documents start Unverified. That is correct and expected — say so rather than inflating it.

### Lifecycle — `status` and `stale_after`

```yaml
status: draft | stable | deprecated # absent means stable
stale_after: 2027-02-17 # absolute date, never a relative TTL
```

Set `stale_after` on anything pinned to a moving target — dependency versions, external docs, infra endpoints. Six months is a reasonable default for external material; omit it for durable repository knowledge.

### Actor convention (OKF §7)

- Agents: `<producer>/<version>` → `claude-code/claude-opus-5`
- People: `human:<id>` → `human:john`
- Automated processes: `process:<id>` → `process:gitlab-ci`

The `human:` prefix is load-bearing. Use it only for people.

## Type vocabulary

OKF has no central type registry; these are this bundle's conventions. Consumers must tolerate types outside this list, so add one if nothing fits — but check first.

| `type`                 | Use for                                                        | Lives in                             |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------ |
| `Component`            | An app, lib, service, or tool in the repo                      | `wiki/components/`                   |
| `Architecture`         | Cross-cutting structure, dataflow, boundaries                  | `wiki/architecture/`                 |
| `Domain Concept`       | Product/business meaning: matching, profile review, moderation | `wiki/domain/`                       |
| `Convention`           | A rule we follow: code style, model layout, commit format      | `wiki/conventions/`                  |
| `UI`                   | A screen, widget, navigation structure, or design-system rule  | `wiki/ui/`                           |
| `Security`             | A threat and the control that addresses it                     | `wiki/security/`                     |
| `Setup`                | Getting the project running on a fresh machine                 | `wiki/local/`                        |
| `CI`                   | Pipeline configuration, build and test workflows               | `wiki/ci/`                           |
| `Runbook`              | A procedure a person executes                                  | `wiki/operations/`                   |
| `Troubleshooting`      | A symptom, its cause, and its fix                              | `wiki/troubleshooting/`              |
| `Explainer`            | A standing explanation of a concept, term, or external system  | `wiki/reference/`                    |
| `Reference`            | Material ingested from outside the repo                        | `_sources/external/`                 |
| `Session Knowledge`    | Knowledge distilled from an LLM conversation                   | `_sources/conversations/`            |
| `Attested Computation` | A sanctioned command or query others must run verbatim         | anywhere; usually `wiki/operations/` |

## Linking

A link asserts _a relationship_; the prose says what kind. Link generously — broken links are explicitly tolerated by OKF and a link to a document that does not exist yet is a useful marker of a gap, not an error.

## Body structure

Favour structure over prose — headings, tables, lists, fenced code. Both humans and retrieval do better with it.

Conventional headings, used when they apply:

- `# Schema` — structured description of fields or columns
- `# Examples` — concrete usage
- `# Computation` — the sanctioned computation, for `Attested Computation` documents

For `Attested Computation`, `runtime` is required (`bash`, `postgres`, `psql`, `python`), and an agent **may only fill in declared `parameters` — it must never edit the computation itself**. That constraint is the whole point of the type: it turns "did you run the right thing?" into a mechanical comparison.

## `index.md` format

No frontmatter. Sections group entries under headings. Each entry links a concept and repeats its `description`:

```markdown
# Section Heading

- [Title](path.md) - description copied from the concept's frontmatter
- [Subdirectory](subdir/) - what the group covers
```

The bundle root `index.md` is the only one that carries frontmatter, and only `okf_version: "0.2"`.

**Whenever you add, move, or delete a concept, update the `index.md` of its directory in the same change.** An index that has drifted from its directory is worse than no index.

## `_log/` format

One file per day, named for that day with no separators — `20260817.md` for 2026-08-17. The filename is the date, so a plain directory listing sorts the history chronologically and the newest entries are the last file.

No frontmatter. The ISO date is the heading; entries are newest first, each with a bold convention word:

```markdown
# 2026-08-17

- **Creation**: Established [API component](/wiki/components/api.md).
- **Update**: Corrected plugin ordering in [architecture](/wiki/architecture/api-request-lifecycle.md).
```

Use `**Creation**`, `**Update**`, `**Deprecation**`, `**Verification**`, `**Initialization**`.

Append to today's file, creating it if this is the day's first change. Never rewrite a past day's file — the log is a record, not a summary.

Log at the bundle root for anything structural. A directory may keep its own `_log/` once its history gets busy enough to be worth separating.

## Working rules

1. **Update before you create.** Search the wiki first. A new document that overlaps an existing one splits the knowledge in two and both halves rot. Extend the existing concept instead.
2. **One concept per file.** If a document needs "and" in its title, it is two documents.
3. **Never delete knowledge to make room.** Mark it `status: deprecated` and say what accepted it. Links and history depend on it.
4. **Dates are absolute.** `2026-08-17`, never "last week". The reader is in an unknown future.
5. **Do not paste secrets, tokens, credentials, or `.env` values.** Reference the variable name and where it is configured.
6. **`raw/` is human-only. Never open, read, or cite a file in it.** It holds the original images, PDFs, documents, and ADRs, markdown snapshots of ingested web pages, and verbatim transcripts of ingested conversations, that a human reader may want to see for themselves — raw material the bundle keeps, not knowledge the bundle asserts. Agents work from the concept documents instead: if something in a raw file matters, it was distilled into a concept at ingest time, and that concept - not the file - is what you read and cite. A link into `raw/` is for the human; treat the file itself as out of bounds.
7. **Every concept change lands with its bookkeeping.** Adding, moving, or deprecating a document updates its directory's `index.md` and appends to today's `_log/` file in the same edit — never as a follow-up.
