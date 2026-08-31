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
- The ticket body becomes the ticket description, shown in the detail view.
  The body before the marker becomes the ticket description, shown in the
  detail view. The criterion list after the marker becomes the criteria. The
  title becomes the title.
- A `## Phase N: <title>` heading sets the phase number and the phase title of
  every ticket after it. A ticket under any other heading imports as phase 1.
  Document order decides the ticket order across the whole project.
- The criteria sit after an `**Evaluate:**` marker on its own continuation
  line. Each criterion starts with `- `. A criterion may wrap across lines.
  The parser joins a wrapped criterion with one space.
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

    - [ ] **Ticket ID: Title.** One sentence of scope prose. The prose may wrap

Rules:

- The line starts with `- [MARK] **Ticket ID: Title.**`. MARK is one of
  ` ` (open), `~` (in_progress), `?` (awaiting_verification), `x` (done).
- The ID has no colon.
- The title ends with a period before the closing `**`.
- The body can span more lines. Each continuation line starts with two spaces.
- Every ticket MUST contain the marker `**Evaluate:**`. A ticket without
  `**Evaluate:**` throws a parse error.
- The marker sits alone on its own continuation line. Criterion text on the
  marker line is a parse error. The old format put text after the marker on
  the ticket line. That format is refused.
- After the marker, the first non-empty line must start with `- `. Each `- `
  line starts one criterion. A following non-empty line that does not start
  with `- ` wraps the criterion before it. The parser joins the wrap with one
  space.
- A ticket with no criteria after the marker throws a parse error.
- Blank lines between tickets are allowed.

Example with a continuation line and the marker:

    - [ ] **Ticket U2d: Global cross-workspace tickets entry.** The sidebar entry
      opens a board of every live session's tickets.

      **Evaluate:**

      - the entry lists tickets from two workspaces
      - the entry badges each ticket by workspace, and the badge survives a
        page reload
## Verify before you import

Run the bundled checker. It mirrors `src/plan/plan.ts` and reports the same
errors without the aidos build.

    node skills/aidos-plan/verify-plan.mjs PLAN.md

Exit code 0 means the document parses. Exit code 1 lists the bad lines.

## Start from the template

Copy `PLAN_IMPORT_TEMPLATE.md` and fill it in. It shows the format with example
tickets that all carry the `**Evaluate:**` marker.
