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

The format is literate markdown with fenced YAML blocks: each ticket is a
`## Ticket <id> — <title>` heading (em dash) followed by one ` ```yaml ` block
carrying the ticket's structured fields. The prose around the blocks is
frontmatter, preamble, and context sections. A pre-literacy document in the old
`- [ ] **Ticket ID: Title.**` line format still parses through the legacy
path, so yesterday's plans import; the renderer only ever emits the literate
shape, so importing a legacy plan and exporting it converts it.

## Which grammar reads your document

`parsePlan` sniffs the whole document first: if any line is a legacy ticket
line, the whole document parses as legacy. Otherwise, if a `## Ticket`
heading is present, it parses as literate. A document with neither shape falls
to the legacy parser, whose refusals name the first bad line.

Two consequences:

- Never paste a `- [ ] **Ticket ...` line into a literate plan, not even
  inside a fenced code block or a YAML description. One such line anywhere
  flips the entire document to the legacy grammar.
- A `## Ticket <id> — <title>` line inside a fenced code block still opens a
  ticket. Fences do not hide headings from the parser.

## The import contract

- Import needs an EMPTY project. If the project already has tickets, import
  throws `ProjectNotEmptyError`. Import never merges. It is a one-shot seed.
- The import owns the file's lifecycle. A successful import DELETES the plan
  file. If the file sits inside a git repo, the import first refuses while
  the working tree is dirty or the file itself is uncommitted (untracked or
  modified) — the refusals are `plan_import_dirty_tree` (paths named) and
  `plan_import_file_uncommitted`. So: commit the PLAN.md, and keep the tree
  clean, before importing. Outside a git repo the import deletes without the
  git checks. A refusal imports nothing and deletes nothing. If the file
  cannot be deleted after a successful import, the result says so
  (`deleted: false`, `deletionError`) and the tickets still stand.
- The plan is flat. Every ticket imports as phase 1, in document order. A
  `## Phase N: <title>` heading sets no phase; it is kept as context-section
  prose, like any other `## ` heading.
- Every ticket lands in the `open` state. The claimed `state` word does not
  set the live state. It becomes one `builtin:imported_state` evidence row per
  ticket, authored by `system`. It records the claimed state.
- `parsePlan` runs first. A parse error imports nothing.
- The `description` becomes the ticket description, shown in the detail view.
  The `criteria` list becomes the criteria. The heading's title becomes the
  title.
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

Text before the first `## ` heading is the preamble. It can hold anything.

### Context sections

A line that starts with `## ` (two hashes, then a space) opens a context
section, unless it is a ticket heading (see below). All following lines until
the next `## ` heading or the next ticket heading are that section's text.
Bullet lists, tables, and code fences are fine inside a section.

A `### ` (three hashes) line is NOT a heading. Inside a section it is plain
text; anywhere else it is a parse error. Use `## ` for any heading you want
the parser to recognize.

### Tickets (the one hard rule)

Each ticket is a heading plus one fenced block:

    ## Ticket U2d — Global cross-workspace tickets entry.

    ```yaml
    state: open
    description: |
      The sidebar entry opens a board of every live session's tickets.
    criteria:
      - the entry lists tickets from two workspaces
      - the entry badges each ticket by workspace, and the badge survives
        a page reload
    ```

Rules:

- The heading matches `## Ticket <id> — <title>`, with an em dash (—)
  between the id and the title. The id is the text up to the first ` — `;
  the rest is the title.
- After the heading, blank lines may follow. Then exactly one ` ```yaml `
  block must follow. A ticket heading with no ` ```yaml ` block after it is
  a parse error naming the heading line.
- The opening fence is ` ```yaml ` (trailing spaces allowed). The block ends
  at the next ` ``` ` line. A block that never closes names the opening
  fence line.
- The block holds a mapping with these fields, and no others:
  - `state` (required): one of `open`, `in_progress`,
    `awaiting_verification`, `done`, spelled out. Anything else names the
    fence line.
  - `description` (optional): prose. A literal block (`|`) keeps multi-line
    prose readable. It becomes the ticket description.
  - `criteria` (required): a non-empty list of non-empty criterion lines.
    A missing or empty list names the fence line.
- An unknown field names the fence line and lists the offending field.
- A block that is not valid YAML, or not a mapping, names the fence line.
- Any other line — prose sitting outside a section, between tickets — is a
  parse error naming the line. Keep prose in the preamble or under a `## `
  heading.
- Document order decides the ticket order across the whole project.

### Legacy plans

A pre-literacy plan — `- [ ] **Ticket ID: Title.**` lines with an
`**Evaluate:**` marker — still imports through the legacy path, exactly as it
did before. The renderer never emits that shape again. To convert: import the
legacy plan, export it, and re-import the export.

## Verify before you import

Run the bundled checker. It runs `src/plan/plan.ts` itself when the aidos
checkout is above it, and otherwise mirrors both grammars. It reports the
same errors without the aidos build.

    node skills/aidos-plan/verify-plan.mjs PLAN.md

Exit code 0 means the document parses. Exit code 1 names the bad line.

## Start from the template

Copy `PLAN_IMPORT_TEMPLATE.md` and fill it in. It is a literate plan with
example tickets in each claimed state.
