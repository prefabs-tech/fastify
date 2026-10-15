# Shared Conventions

All shared conventions (testing rules, Fastify 5 gotchas, code style, docs rules, dependency
layout, escalation rules) now live in the repo-root [CLAUDE.md](../../CLAUDE.md), which is
loaded automatically every session.

Skills should reference `CLAUDE.md` directly instead of this file. This stub remains only so
older skill texts that point here don't dead-end.

## Reference packages

- `packages/firebase` — canonical FEATURES.md, tests, and model slice (`src/model/userDevice/`)
- `packages/config` — canonical GUIDE.md format and minimal package anatomy
