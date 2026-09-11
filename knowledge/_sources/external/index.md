# External References

Material ingested from outside the repository — vendor documentation, specifications, articles, PDFs, slide decks, images, and video transcripts.

Populated by `/repokb:ingest`.

# Concepts

-

Each entry is `type: Reference`, carries a `sources` block naming the original, and carries `stale_after` — external material has a shelf life.

# Conventions for this directory

- One document per source. A vendor doc site ingested across several pages is still one concept unless the pages cover genuinely separate topics.
- Filenames are kebab-case and describe the subject, not the format: `supertokens-passwordless-recipe.md`, not `supertokens-pdf-2.md`.
- Summarise and structure. A verbatim dump defeats the purpose — the point is to make the material usable without re-reading the original, while keeping `sources[].resource` so the original is one click away.
