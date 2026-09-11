# References

Knowledge ingested from outside the repository, kept as first-class concepts (OKF §6.3).

This directory is **operational**: it sits outside the default load, so `/repokb:load` does not pull it in unless a topic calls for it or you pass `--full`. What is here is still a first-class concept — full frontmatter, indexed, and citable — it is simply not what a session starts with.

Nothing here is authored by hand — use the skills:

* `/repokb:ingest <source>` — websites, PDFs, documents, images, videos → `external/`
* `/repokb:ingest-conversation` — distilled knowledge from an LLM session → `conversations/`

# Sections

* [External](external/) - material ingested from websites, documents, and media
* [Conversations](conversations/) - knowledge distilled from working sessions

# Reading these critically

Everything in this section is second-hand by definition. Two habits keep it honest:

* **Check `stale_after` before trusting external material.** Vendor documentation moves; an ingested page is a snapshot with a date on it, not a live mirror.
* **Check the trust tier.** No `verified` key means nobody has confirmed it against reality. Agent-ingested content starts Unverified and stays there until a human says otherwise.

When ingested knowledge proves durable and repo-specific, promote it: move the substance into the relevant section — [architecture](/wiki/architecture/), [conventions](/wiki/conventions/), [domain](/wiki/domain/) — and leave the reference in place as a `_sources/` entry. References are the intake, not the destination.
