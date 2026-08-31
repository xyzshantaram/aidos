# <Project> implementation plan

One vision sentence. Delete this file when the work ships.

## Vision

A few sentences on what this effort builds and why. Rewrite this only when the
goal itself changes.

## Critical context

Decisions, constraints, and gotchas that are not obvious from the code and would
cost real time to rediscover. One or two sentences each. Everything before the
first ticket line counts as context, so bullet lists, tables, and code fences
are fine here.

## Phase 1: <phase title> — `pending`

A `## Phase N: <title> — \`<state>\`` heading opens a phase. N becomes the
phase number of every ticket that follows it, and the heading text becomes the
phase title on the board. A ticket under any other heading imports as phase 1.

## Tickets

Every ticket sits on one physical line, with continuation lines that start with
two spaces. The body may wrap. The criteria sit after an `**Evaluate:**` marker
on its own continuation line, as a list with one `- ` item per criterion.

- [ ] **Ticket A1: First unit.** One sentence of scope prose. The prose may wrap
  across continuation lines. The body before the marker becomes the ticket
  description shown in the detail view.

  **Evaluate:**

  - the build or test command that must pass
  - a second criterion, when the ticket needs one
- [~] **Ticket A2: In-progress unit.** One sentence on scope.

  **Evaluate:**

  - the acceptance check for this ticket, stated so a human can verify it
- [x] **Ticket A3: Done unit.** One sentence on scope.

  **Evaluate:**

  - how it was verified before closing

## Import rules

- One criterion per list item. Each criterion starts with `- ` after the
  `**Evaluate:**` marker. A criterion may wrap across continuation lines. The
  import joins a wrapped criterion with one space, and evidence rows match a
  criterion by exact trimmed text.
- Keep each criterion one short checkable sentence. Aim under 100 characters.
- The mark never sets the live state. Import lands every ticket in `open` and
  records the mark as one `builtin:imported_state` evidence row. `[ ]` is open,
  `[~]` in_progress, `[?]` awaiting_verification, `[x]` done.
- Import needs an empty project. A parse error imports nothing and names the
  line.
- A `### ` heading between tickets breaks the parse. Use `## ` for any heading
  you want parsed, and keep prose either before the first ticket or under a
  `## ` heading after the last one.
- Verify before you import: `node skills/aidos-plan/verify-plan.mjs PLAN.md`.
  Exit code 0 means the document parses. Exit code 1 lists the bad lines.

## User preferences and special rules

- Bullet rules the user gave that are not in AGENTS.md or README.md.

## Human review queue

- [ ] A1 — the manual check the user must do on a live session.
