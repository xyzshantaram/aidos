---
title: <Project> implementation plan
---

# <Project> implementation plan

One vision sentence. Delete this file when the work ships.

## Vision

A few sentences on what this effort builds and why. Rewrite this only when the
goal itself changes.

## Critical context

Decisions, constraints, and gotchas that are not obvious from the code and would
cost real time to rediscover. One or two sentences each. Everything before the
first ticket heading counts as context, so bullet lists, tables, and code fences
are fine here.

## Ticket A1 — First unit.

```yaml
state: open
description: |
  One sentence of scope prose. The prose may wrap across lines.
  The description becomes the ticket description shown in the detail view.
criteria:
  - the build or test command that must pass
  - a second criterion, when the ticket needs one
```

## Ticket A2 — In-progress unit.

```yaml
state: in_progress
description: One sentence on scope.
criteria:
  - the acceptance check for this ticket, stated so a human can verify it
```

## Ticket A3 — Done unit.

```yaml
state: done
description: One sentence on scope.
criteria:
  - how it was verified before closing
```

## Import rules

- Each ticket is a `## Ticket <id> — <title>` heading (em dash) followed by
  one ` ```yaml ` block with `state`, `description`, and `criteria`. Blank
  lines between the heading and the block are fine.
- `state` is one spelled-out word: `open`, `in_progress`,
  `awaiting_verification`, or `done`. The mark never sets the live state.
  Import lands every ticket in `open` and records the word as one
  `builtin:imported_state` evidence row.
- `criteria` is a non-empty list: one `- ` item per criterion. Keep each
  criterion one short checkable sentence. Aim under 100 characters.
- The block carries no other fields. An unknown field fails the import and
  names the fence line.
- The plan is flat: every ticket imports as phase 1, in document order. Use
  `## ` sections to group prose, not to number phases.
- Import needs an empty project. A parse error imports nothing and names the
  line.
- A `### ` heading between tickets breaks the parse. Use `## ` for any heading
  you want parsed, and keep prose either before the first ticket or under a
  `## ` heading after the last one.
- Never paste an old-style `- [ ] **Ticket ...` line into this file, not even
  inside a code fence: one such line anywhere flips the whole document back
  to the legacy grammar.
- Verify before you import: `node skills/aidos-plan/verify-plan.mjs PLAN.md`.
  Exit code 0 means the document parses. Exit code 1 names the bad line.

## User preferences and special rules

- Bullet rules the user gave that are not in AGENTS.md or README.md.

## Human review queue

- A1 — the manual check the user must do on a live session.
