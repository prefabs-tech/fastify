## Summary

<!-- What does this PR change and why? -->

## LLM / agent docs

<!-- When changing anything agents or integrators rely on, update docs in the same PR. -->

- [ ] No change to public exports, env/config keys, routes, or default plugin behavior — **or** I updated `docs/llm` (and package README / `docs/llm/CHANGES.md` when the change is breaking or behavior-visible), and **`packages/<name>/AGENTS.md` / `llms.txt`** when agent-facing guidance for that package changed.
- [ ] Ran `pnpm verify:llm-docs` locally (passes).
- [ ] If this commit fully updates docs for the new behavior, I ran `pnpm verify:llm-docs --update-verified` to bump **Last verified** in `docs/llm/REFERENCE.md`.
