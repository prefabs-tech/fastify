# Conversation Knowledge

Knowledge distilled from working sessions with an LLM — the reasoning, dead ends, and constraints that would otherwise be lost when the chat history is discarded.

Populated by `/repokb:ingest-conversation`.

# Sessions

-

Each entry is `type: Session Knowledge`, dated, and carries a `sources` entry describing the session scope.

# What belongs here versus elsewhere

These documents are a **landing zone, not a resting place**. A session usually produces a mix:

- Durable, repo-specific knowledge — a discovered constraint, a corrected mental model, a diagnosed bug — should be written into [architecture](/wiki/architecture/), [conventions](/wiki/conventions/), [troubleshooting](/wiki/troubleshooting/), or [domain](/wiki/domain/) directly, where people will actually look for it.
- What lands _here_ is the session record: what was explored, what was concluded, what was explicitly ruled out and why, and which questions were left open.

A session document that duplicates a concept document is a smell. Link to the concept instead.

# Why "ruled out" matters

The highest-value content in this directory is usually the negative result — the approach that looked right and failed, and the reason. That information exists nowhere in the codebase and is the first thing lost when a conversation ends.
