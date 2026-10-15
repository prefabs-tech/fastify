# Spec: Replace ESLint + Prettier with Biome

Status: draft (2026-07-11); feasibility assessed, decisions open in §9. No
implementation started.

## 1. Problem statement

Every package carries an identical ESLint + Prettier toolchain: a one-line
`eslint.config.js` extending `@prefabs.tech/eslint-config/fastify.js`
(published from `prefabs-tech/tools`), plus ~8 lint-related devDependencies
per package. Biome replaces both tools with a single binary, cutting
lint+format time from seconds to tens of milliseconds per package and removing
the eslint/prettier dependency trees entirely.

The question this spec answers: **can Biome match the current lint
functionality?** Assessment: ~85% coverage with three real gaps (§3.2). The
migration is feasible if the gaps in §3.2 are explicitly accepted.

## 2. Current state

`@prefabs.tech/eslint-config@0.8.0/fastify.js` = `index.js` +
`@typescript-eslint/no-explicit-any: error`. `index.js` composes:

| Layer | Notes |
|---|---|
| `@eslint/js` recommended | |
| `typescript-eslint` recommended | non-type-checked variant |
| `eslint-plugin-n` recommended-script | `no-missing-import` off; `no-unsupported-features/es-syntax` (ignore modules); `no-unpublished-import` with allowModules |
| `eslint-plugin-import` recommended + typescript | `import/order` and `sort-imports` off |
| `eslint-plugin-perfectionist` recommended-natural | full sorting: imports, object keys, interfaces, enums, unions, class members, … |
| `eslint-plugin-unicorn` recommended | customized: `filename-case` (camelCase + snake_case), `import-style` (`node:path` named), `numeric-separators-style` (minimumDigits 6, groupLength 3), `prefer-structured-clone` off, `prevent-abbreviations` with allowList (db, docs, env, err, i, param, req, res, utils) |
| `eslint-plugin-prettier` recommended | Prettier defaults — no `.prettierrc` anywhere |
| Base rules | `curly: all`, `brace-style: 1tbs` |

Findings worth recording:

- `eslint-plugin-promise` is registered in the `plugins` map but **no promise
  rule is ever enabled** — it contributes nothing and imposes no parity
  requirement.
- Prettier runs *as an ESLint rule*, so `pnpm lint` is the only format gate;
  there is no separate `format` script to migrate.
- The husky pre-commit hook runs `pnpm lint && pnpm typecheck && pnpm test`;
  turbo task names (`lint`, `lint:fix`) are referenced in `turbo.json`,
  CLAUDE.md, and the `/new-package` + `/bump-deps` skills.

## 3. Coverage analysis (Biome 2.x)

### 3.1 Covered

| Current | Biome equivalent |
|---|---|
| `@eslint/js` + `typescript-eslint` recommended | Near-complete parity in `recommended` rule sets; `no-explicit-any` → `suspicious/noExplicitAny` |
| Prettier (defaults) | Biome formatter, ~97% Prettier-compatible; requires `indentStyle: "space"` (Biome defaults to tabs) |
| `curly` | `style/useBlockStatements` (off by default — enable) |
| `brace-style: 1tbs` | Formatter output, no rule needed |
| `unicorn/filename-case` | `style/useFilenamingConvention` (`filenameCases: ["camelCase", "snake_case"]`) |
| `unicorn/no-null` | `style/noNull`? — **verify**: Biome's port is `suspicious/noEvolvingTypes`-adjacent naming churn; confirm exact rule name during trial (§6) |
| `unicorn/numeric-separators-style` | `style/useNumericSeparators` — **partial**: no `minimumDigits`/`groupLength` options; Biome will demand separators in 5-digit numbers the current config ignores |
| `import` recommended + typescript | Mostly redundant with `tsc` (already a separate `typecheck` gate); Biome adds `noUnusedImports`, `useImportType` |
| `n/no-extraneous-import`, `n/no-unpublished-import` | `correctness/noUndeclaredDependencies` (checks imports against `package.json`) — **partial**: no `allowModules` escape hatch; may need per-line suppressions for `@faker-js/faker` etc. in tests |
| perfectionist import sorting | Assist `organizeImports` (sorts groups and named specifiers) |
| perfectionist object-key sorting | Assist `useSortedKeys` |

### 3.2 Gaps — the cost of the migration

1. **perfectionist beyond imports/object keys.** No Biome equivalent for
   sorting interfaces, type unions, enums, class members, switch cases, maps.
   The codebase is *currently conformant* (perfectionist has been autofixing
   throughout its history), so existing order survives; it just stops being
   enforced. New code will drift. CLAUDE.md's workflow guidance ("write the
   code, then `pnpm lint:fix`" — gotcha #11) loses most of its teeth.
2. **`unicorn/prevent-abbreviations`.** No Biome equivalent, and it is
   actively configured here with an allowList. This rule shapes naming across
   every package. Enforcement is simply gone.
3. **`eslint-plugin-n` engine checks.** `no-unsupported-features/es-syntax`
   and the version-compatibility rules have no counterpart. Mitigation:
   `engines: node >=20` + CI matrix on Node 20/22/24 catches actual runtime
   incompatibilities, just later.

Hybrid alternative (Biome + a minimal ESLint keeping only perfectionist and
`prevent-abbreviations`) is possible but retains the eslint dependency tree
and two-tool complexity — it forfeits most of the simplification benefit.
Rejected unless §9.1 decides the sorting guarantees are non-negotiable.

## 4. Target design

### 4.1 Shared config: `@prefabs.tech/biome-config` (in `prefabs-tech/tools`)

Biome 2 supports `"extends"` from an npm package that exports a `biome.json`.
Mirror the eslint-config layout: a new `packages/biome-config` in the tools
repo exporting `biome.json` (base) and `fastify.json` (base +
`noExplicitAny: error`). Sketch of the base:

```jsonc
{
  "formatter": { "indentStyle": "space" },
  "linter": {
    "rules": {
      "recommended": true,
      "style": {
        "useBlockStatements": "error",
        "useFilenamingConvention": {
          "level": "error",
          "options": { "filenameCases": ["camelCase", "snake_case"] }
        },
        "useNumericSeparators": "error"
      },
      "correctness": { "noUndeclaredDependencies": "error" }
    }
  },
  "assist": {
    "actions": {
      "source": { "organizeImports": "on", "useSortedKeys": "on" }
    }
  },
  "files": { "includes": ["**", "!coverage/**", "!dist/**"] }
}
```

Exact rule names/options to be pinned during the trial (§6) against the Biome
version chosen — rule names have moved between groups across Biome releases.

### 4.2 Per-package changes (× 9 packages)

| Change | Detail |
|---|---|
| Delete | `eslint.config.js` |
| Add | `biome.json`: `{ "extends": ["@prefabs.tech/biome-config/fastify"] }` |
| `package.json` scripts | `lint` → `biome check .`; `lint:fix` → `biome check --write .` (script *names* unchanged — turbo, husky, CI, and skills keep working) |
| devDependencies | drop `eslint`, `prettier`, `@prefabs.tech/eslint-config`, `@typescript-eslint/parser` (and any other eslint-* stragglers); add `@biomejs/biome` (exact pin) + `@prefabs.tech/biome-config` |

Root: no script changes (`pnpm lint` already fans out via turbo).

### 4.3 Docs/skills updates (same commit as the behavior change)

- **CLAUDE.md**: line 5 (toolchain description), gotcha #11 (perfectionist
  workflow → "Biome check --write; note: interface/enum/union member order is
  no longer enforced — keep it alphabetical by convention"), gotcha #21
  symptom description (perfectionist-specific), the `unicorn/no-null` disable
  guidance (§ house rules) → Biome suppression syntax
  (`// biome-ignore lint/<group>/<rule>: reason`).
- **`/new-package` skill**: scaffold checklist references `eslint.config.js`
  byte-for-byte parity — update to `biome.json`.
- **`/bump-deps` skill**: eslint-config bump instructions → biome-config.

## 5. What is intentionally lost (accepted-if-approved register)

Mirrors §3.2, restated as behavioural deltas a reviewer can veto:

1. New interfaces/enums/unions/class members may be committed unsorted; no
   tool flags it.
2. Abbreviated identifiers (`btn`, `msg`, `cfg`, …) may be committed; no tool
   flags it.
3. Syntax newer than the oldest supported Node is caught by CI runtime
   failures, not lint.
4. 5-digit numeric literals will *newly* require separators (`10000` →
   `10_000`) — a one-time autofix diff, direction opposite to a loss but still
   a delta.

## 6. Migration plan

1. **Trial on one package** (`packages/config` — smallest): add Biome locally
   (no shared config yet, inline `biome.json`), run `biome check` and diff its
   findings against `pnpm lint` output on the same tree. Deliverable: the
   verified rule mapping for §4.1 and the actual false-positive/new-error
   counts. **This step gates everything else.**
2. Publish `@prefabs.tech/biome-config` from the tools repo (separate repo,
   separate PR, own release).
3. Convert all 9 packages in one commit (`build(dev-deps)!:` if lint output
   changes are treated as breaking to the contribution workflow; plain
   `chore(deps):` otherwise — see §9.3). Run `biome check --write .` once and
   commit the mechanical diff separately from the config change.
4. Update CLAUDE.md + skills (§4.3) in the same PR.
5. Full gate: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` on
   Node 20 locally; CI matrix covers 22/24.

## 7. Out of scope

- The react/vue prefab repos. They consume `react.js`/`vue.js` from the same
  eslint-config; Biome's Vue SFC support is immature, so `prefabs-tech/tools`
  must keep publishing `@prefabs.tech/eslint-config` regardless. This repo
  merely stops consuming it.
- Type-checked lint rules (not enabled today either; `typecheck` remains a
  separate tsc gate).
- Editor settings / `.vscode` recommendations (follow-up nicety: Biome
  extension replaces ESLint + Prettier extensions).

## 8. Verification

- Trial diff from §6.1 reviewed and attached to the PR description.
- `pnpm lint` green on all 9 packages post-conversion.
- `git grep -l eslint packages/ -- ':!*.md'` returns nothing.
- Husky pre-commit exercised once end-to-end (commit with a deliberate lint
  error must be rejected).
- CI green on the full Node matrix with `--frozen-lockfile
  --strict-peer-dependencies`.

## 9. Open decisions

1. **Accept the §3.2/§5 losses?** Recommendation: yes — perfectionist's
   exhaustive sorting and `prevent-abbreviations` are the only losses with
   teeth, and both degrade to convention rather than breakage. Veto here means
   either staying on ESLint or the hybrid (§3.2, not recommended).
2. **Shared config vs. inline `biome.json` per repo?** Recommendation: shared
   `@prefabs.tech/biome-config`, matching the existing eslint-config pattern —
   but it requires a tools-repo release before this repo can convert. Inline
   config in each package (or one root `biome.json` with per-package
   `"root": false` nesting) would decouple the repos at the cost of config
   drift.
3. **Commit/release framing**: is a lint-toolchain swap a breaking change for
   contributors (`!`) or routine (`chore`)? Affects shipjs changelog only;
   packages' published artifacts are unchanged.
4. **Biome version pin** (exact, per house convention) — pick latest stable
   2.x at trial time and record it here.
