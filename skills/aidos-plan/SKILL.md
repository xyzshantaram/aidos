---
name: aidos-plan
description: Write a PLAN.md that aidos can import with the plan_import tool. Use when you create or edit a PLAN.md for an aidos project, or when you are about to run plan_import / the aidos.planImport Remote.
whenToUse: Writing or editing a PLAN.md that aidos will import, or preparing to run the plan_import tool / aidos.planImport Remote.
---

# aidos-plan skill

aidos imports a PLAN.md into a project through the `plan_import` tool. The tool
calls the `aidos.planImport` Remote, which parses the document with `parsePlan`
and creates one ticket per plan ticket. This skill tells you how to write a
PLAN.md that `parsePlan` accepts.

## The import contract

- Import needs an EMPTY project. If the project already has tickets, import
  throws `ProjectNotEmptyError`. Import never merges. It is a one-shot seed.
- Every ticket lands in the `open` state. The checkbox mark (`[x]`, `[~]`, `?`,
  ` `) does not set the live state. The mark becomes one `builtin:imported_state`
  evidence row per ticket, authored by `system`. It records the claimed state.
- `parsePlan` runs first. A parse error imports nothing.
- The ticket body becomes the aidos ticket body. The text after `**Evaluate:**`
  becomes the criteria. The title becomes the title. The document order becomes
  the ticket order.
- Frontmatter, preamble, and `## ` context sections are stored as plan meta.

## The document format

The parser is strict about tickets and lenient about everything else.

### Frontmatter (optional)

Fence the frontmatter with `---` on its own line at the very top. If the first
line is not `---`, there is no frontmatter and those lines are preamble.

    ---
    title: My plan
    ---

### Preamble

Text before the first `## ` heading or the first ticket is the preamble. It can
hold anything.

### Context sections

A line that starts with `## ` (two hashes, then a space) opens a context section.
All following lines until the next `## ` heading or the next ticket are that
section's text. Bullet lists, tables, and code fences are fine inside a section.

A `### ` (three hashes) line is NOT a heading. The parser treats it as plain
text. Use `## ` for any heading you want the parser to recognize.

### Tickets (the one hard rule)

Each ticket is one line plus optional continuation lines:

    - [ ] **Ticket ID: Title.** Body text here. **Evaluate:** Criteria text here.

Rules:

- The line starts with `- [MARK] **Ticket ID: Title.**`. MARK is one of
  ` ` (open), `~` (in_progress), `?` (awaiting_verification), `x` (done).
- The ID has no colon.
- The title ends with a period before the closing `**`.
- The body can span more lines. Each continuation line starts with two spaces.
- Every ticket MUST contain the marker `**Evaluate:**`. The text after the
  marker is the criteria. A ticket without `**Evaluate:**` throws a parse error.
- Blank lines between tickets are allowed.

Example with a continuation line and the marker:

    - [ ] **Ticket U2d: Global cross-workspace Tickets entry.** The sidebar entry
      opens a board of every live session's tickets. **Evaluate:** the entry lists
      tickets from two workspaces and badges each by workspace.

### What breaks the parser

- A `### ` heading between tickets. Use `## ` instead.
- A `---` rule or any non-indented line between tickets that is not a `## `
  heading, a two-space continuation, or a ticket line.
- A ticket with no `**Evaluate:**` marker.
- A line that starts with two spaces before any ticket exists.

## Verify before you import

Run the bundled checker. It mirrors `src/plan/plan.ts` and reports the same
errors without the aidos build.

    node skills/aidos-plan/verify-plan.mjs PLAN.md

Exit code 0 means the document parses. Exit code 1 lists the bad lines.

## Start from the template

Copy `PLAN_IMPORT_TEMPLATE.md` and fill it in. It shows the format with example
tickets that all carry the `**Evaluate:**` marker.
