# aidos board — visual spec

The board lives inside the dsh web GUI, so it keeps the dsh dark surface and the
token set already declared at the top of `src/client/board.css`. This spec fixes
the parts that are currently improvised: chip shape, card anatomy, detail panel
order, and the rules for long text. Every rule below is written so a reviewer can
check it against a screenshot.

## 1. Tokens

Reuse the declared tokens. No new colors except the two below.

- Surfaces: `--bg` page, `--surface` card and panel, `--surface-hover` hover,
  `--surface-active` pressed.
- Borders: `--border` panel edge, `--border-subtle` inner rules.
- Text: `--text-primary` titles and values, `--text-secondary` body prose,
  `--text-muted` labels and meta.
- Radius: chips `3px`, cards and panels `var(--radius-sm)`, modals
  `var(--radius-md)`.
- Space scale for the board, in `px`, so a reviewer can measure it: `4`, `8`,
  `12`, `16`, `24`. The `--space-*` tokens stay for outer layout only.

New tokens:

- `--state-open`, `--state-in-progress`, `--state-awaiting`, `--state-done`:
  one background per ticket state, tuned for white text.
- `--metric-bg: #3a3c41`: the neutral chip background for gate and confidence.

## 2. Type scale

| Role | Size | Weight | Color |
| --- | --- | --- | --- |
| Card title | 13px / 18px | 600 | `--text-primary` |
| Card preview | 12px / 16px | 400 | `--text-secondary` |
| Chip text | 11px / 16px | 600 | `#f9fafb` |
| Panel heading | 11px / 16px, uppercase, letter-spacing 0.04em | 700 | `--text-muted` |
| Detail body | 13px / 20px | 400 | `--text-secondary` |
| Table label | 11px / 16px | 500 | `--text-muted` |
| Table value | 13px / 16px | 500 | `--text-primary` |

## 3. Chip language

One shape for every chip: height `18px`, radius `3px`, padding inline `6px`,
font 11px/600, white text, no border, never wraps.

| Chip | Content | Background |
| --- | --- | --- |
| Ticket id | `aidos#12` | hash of `workspaceKey:slug` over `--badge-hue-1..8` |
| State | `Open`, `In progress`, `Awaiting`, `Done` | the matching `--state-*` |
| Gate | `Gate 0/1` | `--metric-bg` |
| Confidence | `Conf 0%` | `--metric-bg` |
| Evidence kind | `Imported state 1` | hash of the kind id, current behavior |
| Dependency | `aidos#4` | hash of the target id |

Rules:

- The gate chip reads `N/A` when the ticket has no criteria and `—` when no gate
  applies to the current state.
- The confidence chip carries `title="Advisory score. It never unlocks
  anything."` and no asterisk. The asterisk only survives in the detail table.
- The id chip carries `title="<workspaceKey>:<slug>"`, the real global id.
- No element outside a chip uses white-on-grey small text.

## 4. Card anatomy

The board uses this layout. A state stripe variant was considered and dropped,
because the state must survive a grey screenshot and a colorblind reader.

### Variant A — meta rail on top

```
┌──────────────────────────────────────┐
│ [aidos#12]                  [Open]   │  row 1: id left, state right
│ Ticket actions and field editing     │  row 2: title, up to 2 lines
│ Create replacing U2a stub modal,     │  row 3: preview, up to 2 lines
│ field editing, state moves...        │
│ [Gate 0/1] [Conf 0%] [Imported 1]    │  row 4: metric chips, one line
└──────────────────────────────────────┘
```

- Fixed height, so the grid stays even: `168px`. The chip row sits on the
  bottom edge, so the space above it grows on a short card.
- Title clamps at two lines, preview clamps at two lines, both with ellipsis.
- Row 4 scrolls nothing and clips extra chips with a `+N` chip.

## 5. Grid

- Default: 4 columns, gap `10px`.
- Detail open: 2 columns. The detail panel takes the other half.
- Under 1400px: 3 columns, 2 with the detail open.
- Under 900px: 2 columns, 1 with the detail open.
- The tile is a button. It carries no `title` attribute, so the id chip hover
  works.
- While the workspace merge loads, the spinner and its label center in the
  grid area, both horizontally and vertically.

## 6. Detail panel anatomy

Order, top to bottom. Every block is a sibling of the panel column and never
shrinks.

1. **Header.** Id chip, title with its Edit control, state chip, close button.
   The header stays on one line, the title truncates.
2. **Quick facts.** A two column table: `State`, `Gate`, `Confidence`, `Phase`,
   `Order`, `Slug`. Labels left and muted, values right. Confidence keeps the
   advisory asterisk with its hover text. This block replaces every stray field
   editor for phase and order.
3. **Description.** Rendered markdown, not raw text. An empty description shows
   the muted note `No description.` The Edit control opens the raw textarea.
4. **Criteria.** One bullet per criterion. A criterion with matching evidence
   reads normal, one without reads in `--text-muted` with the uncovered tint.
   The panel heading carries the count, for example `CRITERIA 1/3`. The Edit
   control opens the raw textarea for the whole block.
5. **Dependencies.** Chips plus the search field.
6. **Evidence.** One bullet per row: kind label in 600 weight, author muted,
   the addressed criterion muted when present, delete control at the right.
   No criterion grouping and no `Ungrouped` bucket.
7. **Comments.**
8. **Action bar.** Right aligned.

Panels 4 to 7 are collapsible. Each carries a heading row with the label left
and the Collapse or Expand control right.

## 7. Long text

- The description renders markdown through `marked`. Headings inside it render
  one step smaller than the panel heading. Code spans and blocks use
  `--surface-active` at radius `3px`.
- A rendered description taller than `320px` clips with a fade and a
  `Show more` control.
- Every panel child sets `flex: none`, because the panel is a capped-height
  column. Without it a long description squeezes the table to nothing, which is
  the defect seen on aidos#2.

## 8. Forms

- Every textarea and input sets `box-sizing: border-box` and `width: 100%`, so
  nothing overflows its container. This holds for the detail panel, the create
  modal, the comment box, and the plan meta modal.
- Buttons keep the current `.aidos-btn` shape. The primary action of a modal
  stays right aligned.

## 9. Out of scope

The spec applies to every board surface: tile, detail panel, filter bar, create
modal, plan meta modal, and toasts.

- No new icon set.
- No animation beyond the existing hover transitions.
- No change to the filter bar layout, beyond keeping the state legend readable.

## 10. Class contract

The CSS pass owns `board.css`. The markup passes use these names and add no
others. Every name is kebab-case.

Chips, one family that replaces `.pill`, `.aidos-state-badge`,
`.aidos-evidence-tag`, `.aidos-dep-badge`, `.aidos-id-badge`, and
`.aidos-ticket-id-badge`:

- `.aidos-chip` — the shared shape.
- `.aidos-chip-id` — ticket id, background from the hash, set inline.
- `.aidos-chip-state` plus one of `.aidos-chip-state-open`,
  `.aidos-chip-state-in-progress`, `.aidos-chip-state-awaiting-verification`,
  `.aidos-chip-state-done`.
- `.aidos-chip-metric` — gate and confidence.
- `.aidos-chip-kind` — evidence kind, background from the hash, set inline.
- `.aidos-chip-dep` — dependency reference, background from the hash.
- `.aidos-chip-more` — the `+N` overflow chip.

Card:

- `.aidos-tile`, `.aidos-tile-meta`, `.aidos-tile-title`, `.aidos-tile-preview`,
  `.aidos-tile-chips`.

Detail:

- `.aidos-detail`, `.aidos-detail-head`.
- `.aidos-facts`, `.aidos-facts-row`, `.aidos-facts-label`,
  `.aidos-facts-value`, `.aidos-facts-asterisk`.
- `.aidos-panel`, `.aidos-panel-head`, `.aidos-panel-title`,
  `.aidos-panel-toggle`, `.aidos-panel-body`.
- `.aidos-md`, `.aidos-md-clipped`, `.aidos-md-more`.
- `.aidos-criteria`, `.aidos-criterion`, `.aidos-criterion-uncovered`.
- `.aidos-evidence-list`, `.aidos-evidence-item`, `.aidos-evidence-kind`,
  `.aidos-evidence-author`, `.aidos-evidence-meta`, `.aidos-evidence-delete`.
- `.aidos-action-bar`.

Forms and controls keep `.aidos-input`, `.aidos-textarea`, `.aidos-btn`,
`.aidos-btn-primary`, `.aidos-close-btn`, and the modal classes.
