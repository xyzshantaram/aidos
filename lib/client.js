window.__ModuleLoader__.load({
	id: "aidos",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// css-text:/home/sid/repos/aidos/src/client/board.css
var board_default = `/* Dark Settings Form Control Design System \u2014 applied to aidos board */

/* \u2500\u2500 1. Tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
:root,
.aidos-root {
  --bg: #2c2c2e;
  --surface: #232324;
  --surface-hover: #303032;
  --surface-active: #43454a;
  --border: #3e3e3f;
  --border-subtle: #303031;
  --border-focus: #66676b;
  --accent-blue: #3b82f6;
  --text-primary: #f9fafb;
  --text-secondary: #adb2b8;
  --text-muted: #88898a;
  --text-disabled: #757575;
  --control-text: #f9fafb;
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-pill: 999rem;
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2rem;
  --space-5: 2.5rem;
  --space-6: 3rem;

  /* Id badge hues (U6): mid-saturation backgrounds that keep white text readable. */
  --badge-hue-1: #4e6fa8;
  --badge-hue-2: #7a5ea0;
  --badge-hue-3: #2f8a7f;
  --badge-hue-4: #a86a4e;
  --badge-hue-5: #5f8a3c;
  --badge-hue-6: #a85578;
  --badge-hue-7: #3c7fa8;
  --badge-hue-8: #8a8a3c;

  /* State chips (U14): mid-saturation backgrounds that keep white text readable. */
  --state-open: #4e5a66;
  --state-in-progress: #3c6ea5;
  --state-awaiting: #a07a2a;
  --state-done: #3f8a52;
  --metric-bg: #3a3c41;

  /* #96: a failed review is a VERDICT, not a state. It gets its own token
     rather than borrowing --state-awaiting, so recolouring the state chips
     never silently recolours a verdict, and vice versa. Same mid-saturation
     family so white text stays readable on it. */
  --verdict-fail: #a5453c;
}

/* \u2500\u2500 2. Typography + base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0.75rem 1rem 1.5rem;
  /* #64: the mobile plugin's fixed top bar covers our top edge, and its real
     height depends on the device safe area. The view measures the actual
     overlap and publishes it as --aidos-top-clearance (0 when nothing covers
     the board), so no breakpoint or magic number is involved. */
  padding-top: calc(0.75rem + var(--aidos-top-clearance, 0px));
  width: 100%;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background: var(--bg);
  color: var(--text-primary);
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
}

.aidos-root *,
.aidos-detail,
.aidos-detail *,
.aidos-modal,
.aidos-modal * {
  box-sizing: border-box;
}

/* page title helper (spec \xA73) \u2014 used by board chrome if needed */
.aidos-page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 650;
  line-height: 1.2;
  color: var(--text-primary);
}

/* \u2500\u2500 3. Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-layout {
  /* The view asks the conversation shell for composer-overlay mode, so the
     shell hands this element a definite-height box and floats the composer
     over it. The board fills that box, and each pane scrolls on its own. The
     shell publishes --dsh-composer-height, so the panes pad clear of the
     floating composer. */
  --aidos-bottom-clearance: calc(var(--dsh-composer-height, 152px) + 16px);
  container: aidos-shell / inline-size;
  display: flex;
  gap: var(--space-2);
  align-items: stretch;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex: 1 1 0%;
}

/* The grid pane fills the layout box so its inner scroller is bounded. The
   real tree is .aidos-layout > .aidos-root > .aidos-grid-wrap: any rule
   written as \`.aidos-layout > .aidos-grid-wrap\` matches NOTHING. */
.aidos-layout > .aidos-root {
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
}

/* Two-pane above the narrow break (#64). */
.aidos-layout:has(> .aidos-detail) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
}

/* Mobile single pane (#64): the detail panel becomes the only thing on
   screen \u2014 a full overlay over the grid \u2014 and the grid behind it collapses
   to one column. The break follows the board container width, not the
   device, per the ticket. */
/* Mobile (#64). Two hard-won constraints live here:
   1. The single-pane switch MUST be a media query, never a container query:
      .aidos-layout declares \`container: aidos-shell\`, and an element can
      never match a query against its OWN container, so the container-query
      version of this rule was dead CSS.
   2. The breakpoint matches dsh-plugin-better-mobile-ui's own 768px mobile
      mode, because its fixed 48px top bar \u2014 and the composer it pins over
      the board bottom \u2014 exist exactly when that mode is on. */
@media (max-width: 768px) {
  .aidos-grid-wrap {
    padding-bottom: calc(var(--aidos-bottom-clearance) + 8px);
  }

  .aidos-board-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .aidos-layout:has(> .aidos-detail) {
    display: block;
    position: relative;
  }

  .aidos-layout > .aidos-detail {
    /* Fixed takeover, not absolute-in-layout: the layout sits inside the
       root's padding, so anchoring there left the header (and its close
       button) under the plugin's top bar. */
    position: fixed;
    inset: 0;
    z-index: 60;
    background: var(--bg);
    /* Viewport-pinned, so it clears the chrome's viewport-space bottom. */
    padding-top: calc(var(--aidos-top-chrome, 0px) + 0.5rem);
    padding-bottom: calc(var(--aidos-bottom-clearance) + 8px);
  }
}

@container aidos-shell (max-width: 560px) {
  .aidos-board-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.aidos-layout > .aidos-detail {
  height: 100%;
  max-height: 100%;
  min-height: 0;
  padding-bottom: var(--aidos-bottom-clearance);
  overflow-y: auto;
  width: auto;
}

/* The detail panel is a column flex box with a capped height, so its
   children must never shrink. Without this the summary table (overflow
   hidden) collapses on a ticket with a long description. */
.aidos-layout > .aidos-detail > * {
  flex: none;
}


.aidos-grid-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
  overflow-x: clip;
  /* The composer floats over the board at every width, so the scroll pane
     must end above it or the last tile row hides underneath. Only the detail
     pane carried this clearance before, which is why the grid clipped its
     bottom row on desktop and mobile alike. */
  padding-bottom: var(--aidos-bottom-clearance);
  /* The tile grid steps its column count from the width of this pane, not the
     width of the window. The pane is always narrower than the window, and it
     halves again when the detail panel opens. */
  container: aidos-board / inline-size;
}

/* The toolbar row sits above the filter bar: the ticket count on the left and
   the board actions on the right. It stays outside the scrolling grid, so it
   never moves. */
.aidos-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  flex: none;
  padding-block: 2px;
}

.aidos-toolbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.aidos-board-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
}

@container aidos-board (max-width: 999px) {
  .aidos-board-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container aidos-board (max-width: 699px) {
  .aidos-board-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container aidos-board (max-width: 459px) {
  .aidos-board-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* \u2500\u2500 4. Section headers (spec \xA75) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.aidos-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.aidos-panel-title,
.section-title {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.2;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: none;
  letter-spacing: 0;
}

.aidos-panel-title {
  font-size: 11px;
  line-height: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.section-description {
  margin: 0.625rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

/* \u2500\u2500 5. Setting card (spec \xA76) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.setting-card,
.aidos-detail,
.aidos-sidebar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}

.aidos-filterbar {
  flex: none;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
}

.aidos-filterbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.aidos-filter-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.aidos-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 18px;
  padding: 2px 8px;
  cursor: pointer;
}

.aidos-filter-chip-on {
  background: var(--surface-active);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.aidos-filter-chip .aidos-check-count {
  margin-left: 0;
}

.aidos-filterbar .aidos-sort-row select,
.aidos-filter-project {
  height: 1.75rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
  padding: 0 6px;
}

.aidos-filterbar-search {
  width: 180px;
}

.aidos-detail {
  flex: none;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: flex-start;
}

/* checkbox that lives inside a setting-card grid (spec \xA76) */
.setting-card {
  display: grid;
  grid-template-columns: 1.25rem 1fr;
  gap: 1rem;
  align-items: start;
}

.setting-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 1.25rem;
  border-radius: 0.1875rem;
  accent-color: var(--text-primary);
}

/* \u2500\u2500 6. Segmented control (spec \xA77) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.segmented-control {
  display: flex;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.segment {
  min-width: 8.75rem;
  height: 2.375rem;
  border: 0;
  border-radius: 0.4375rem;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
}

.segment[data-active="true"] {
  background: var(--surface-active);
  color: var(--text-primary);
  font-weight: 600;
}

/* \u2500\u2500 7. Control list (spec \xA78) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.control-list {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.control-list-row {
  min-height: 3rem;
  padding: 0 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.control-list-row + .control-list-row {
  border-top: 1px solid var(--border-subtle);
}

/* criteria \u2014 one bullet per criterion (spec \xA76) */
.aidos-criteria {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* A criterion reads as a STRIP, matching the evidence strips it now carries:
   same border, radius, surface, and padding, so the criteria panel and the
   evidence panel speak one language. */
.aidos-criterion {
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  padding: 6px var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
}

/* The uncovered treatment lives in ONE place, near the criterion-block rules
   at the end of this file, so the strip and the block agree. */

/* One criterion row holds the label plus its icon controls. The controls sit
   at the end and are ALWAYS visible: the old hover-reveal (opacity 0 until
   hover) made them unreadable and undiscoverable. */
.aidos-criterion-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.aidos-criterion-actions {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 2px;
  margin-left: auto;
  align-self: center;
}

/* Last row of the criteria block: an input plus a small add button. */
.aidos-criteria-add {
  display: flex;
  align-items: center;
  gap: 8px;
}

.aidos-criteria-add input,
.aidos-criterion-row input {
  flex: 1;
  min-width: 0;
  height: 1.75rem;
  font-size: 12px;
  padding-inline: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
}

/* An uncovered criterion is the one you most need to READ, so it keeps full
   text contrast and the ordinary strip surface. The signal is a warning
   TRIANGLE at the head of the row, not a dimmed or recolored strip. */
.aidos-criterion-uncovered {
  color: var(--text-primary);
}

.aidos-criterion-warn {
  display: inline-flex;
  align-items: center;
  flex: none;
  color: var(--state-awaiting);
}

/* The label takes the free space so the controls land at the row's end. */
.aidos-criterion-text {
  min-width: 0;
  flex: 1;
}

.aidos-evidence-delete {
  flex: none;
  margin-left: auto;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.aidos-evidence-delete:hover {
  background: var(--surface-active);
  color: #f9fafb;
}

/* The \u2715 and \u2297 controls live on a strip too: resting fill, legible glyph. */
.aidos-evidence-strip-actions .aidos-evidence-delete,
.aidos-evidence-strip-actions .aidos-evidence-unlink {
  background: var(--surface-hover);
  color: var(--text-primary);
}


.aidos-evidence-delete:disabled {
  opacity: 0.4;
  cursor: default;
}

/* \u2500\u2500 8. Chips (spec \xA73, \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-chip {
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding-inline: 7px;
  border: 0;
  border-radius: 3px;
  background: var(--metric-bg);
  color: #f9fafb;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  white-space: nowrap;
  flex: none;
}

/* The markup sets the hashed background inline. This fallback keeps the chip readable without it. */
.aidos-chip-id,
.aidos-chip-kind,
.aidos-chip-dep {
  background: var(--badge-hue-1);
}

/* A kind chip splits when it carries a count: the keyword keeps the kind
   color, and the count segment inverts it. The chip drops its own inline
   padding so the count segment reaches the chip edge. */
.aidos-chip-kind {
  padding-inline: 0;
  overflow: hidden;
  letter-spacing: 0.04em;
}

/* #21 "they shouldn't be clutter, they should contribute info".

   Every chip used to be a saturated FILL. On a tile carrying five evidence
   kinds that is five competing colour blocks, and the eye cannot tell which
   one matters -- loudness applied uniformly is the same as no emphasis at
   all. So the colour moves from the fill to the TEXT and a hairline border,
   over a near-transparent tint of the same hue. The kind stays instantly
   identifiable by colour, but the tile reads as text with accents instead of
   a row of buttons.

   \`color-mix\` is used against \`currentColor\` so a single rule covers every
   hue: the inline style still sets one colour per kind, and the tint and
   border derive from it. The chips that must stay loud -- the id badge and
   the state chip -- deliberately keep their fill. */
.aidos-chip-kind,
.aidos-chip-dep {
  /* #21 review F1: the first attempt used text at 72% hue over a 14% tint,
     which MEASURED at 2.44:1 on a hovered tile -- literally the grey-on-grey
     this ticket's oldest criterion forbids. Two causes: the kind palette held
     no hues at all (see KIND_COLORS in board-logic.ts), and the chip
     background is TRANSLUCENT, so contrast depends on the backdrop and
     .aidos-tile:hover lightens it. Both backdrops are now checked.

     Measured worst case across every hue, --verdict-fail, and BOTH the
     resting and hovered tile: 5.81:1. The previous pair was 2.44:1. */
  background: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 45%, transparent);
  color: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 38%, #ffffff);
}

/* The dependency chip's icon: dimmer than the id it introduces, because the
   id is the information and the arrow is only grammar (#21). */
.aidos-chip-dep-icon {
  /* #21 review F1: \`opacity: 0.65\` on already-tinted text measured 2.83:1.
     Dimming a foreground that is already low-contrast is how an icon becomes
     a smudge. The icon inherits the chip's (now AA-passing) colour instead,
     and the SVG's stroke weight -- not transparency -- does the de-emphasis. */
  display: inline-flex;
  align-items: center;
  margin-inline-end: 4px;
}

/* The metric chips' key is now an ICON (#21), so it needs no letter spacing
   and should sit quieter than the value it introduces. */
.aidos-chip-metric .aidos-chip-key {
  /* The key is an ICON now, so it needs to align rather than be dimmed.
     The old \`opacity: 0.7\` was the same mistake as the dep icon above. */
  display: inline-flex;
  align-items: center;
}

.aidos-chip-key {
  padding-inline: 7px;
}

.aidos-chip-count {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  padding-inline: 5px;
  /* #21: the count segment used to invert to a near-white block, which made
     the count the LOUDEST thing on the tile -- louder than the kind it
     counts. It is now a deeper tint of the same hue: still clearly a second
     segment, no longer a flare. */
  /* #21 review F1: the count segment mixed its TEXT at 82% and its BACKGROUND
     at 30% of the same hue -- moving both ends toward each other, which is
     arithmetically guaranteed to be lower contrast than the chip itself. It
     measured worse than the chip everywhere. The text now INHERITS the chip's
     colour and only the background deepens, so the segment reads as a segment
     without trading away legibility. */
  background: color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 30%, transparent);
  border-inline-start: 1px solid color-mix(in srgb, var(--chip-hue, var(--badge-hue-1)) 45%, transparent);
  color: inherit;
  font-weight: 700;
}


.aidos-chip-state-open {
  background: var(--state-open);
}

.aidos-chip-state-in-progress {
  background: var(--state-in-progress);
}

.aidos-chip-state-awaiting-verification {
  background: var(--state-awaiting);
}

.aidos-chip-state-done {
  background: var(--state-done);
}

.aidos-dep-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* \u2500\u2500 9. Icon button (spec \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.icon-button,
.aidos-close-btn {
  width: 2rem;
  height: 2rem;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
}

.icon-button:hover,
.aidos-close-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.aidos-close-btn {
  border: none;
  font-size: 16px;
  line-height: 16px;
  padding: 0;
}

/* \u2500\u2500 10. Mode switch (spec \xA711) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mode-switch {
  display: inline-flex;
  padding: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.mode-switch > button {
  height: 2.125rem;
  padding-inline: 1.25rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
}

.mode-switch > button[data-active="true"] {
  background: var(--surface-active);
  color: var(--text-primary);
  font-weight: 600;
}

/* \u2500\u2500 11. Text input (spec \xA712) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.text-input,
.aidos-search-input,
.aidos-dep-search-input,
.aidos-field-editor-input,
.aidos-evidence-attach-kind-select,
.aidos-evidence-attach-note,
.aidos-comment-textarea,
.aidos-modal-row input,
.aidos-modal-row textarea,
.aidos-modal-row select {
  height: 2.5rem;
  width: 100%;
  padding-inline: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  font-family: inherit;
}

.aidos-search-input,
.aidos-dep-search-input,
.aidos-field-editor-input,
.aidos-evidence-attach-kind-select {
  height: 2.5rem;
}

.aidos-modal-row textarea,
.aidos-evidence-attach-note,
.aidos-comment-textarea,
.aidos-field-editor-input[type="textarea"] {
  height: auto;
  min-height: 2.5rem;
  padding-block: 0.5rem;
  resize: none;
}

/* The evidence note is a one-or-two-line remark, not an essay field: the
   default two-row textarea took far more vertical space than it earns in a
   modal that also carries criteria, strips, and actions. */
.aidos-evidence-attach-note {
  height: 2.25rem;
  min-height: 2.25rem;
}

/* An agent report or a check's output IS an essay field: same control, more
   room. Compose it with the note class where a taller box is wanted. */
.aidos-evidence-attach-note.aidos-evidence-attach-tall {
  height: 6rem;
  min-height: 6rem;
  resize: vertical;
}

/* A command line is a single-line, monospaced input: same control chrome as
   the other modal fields, with code-shaped text. */
.aidos-command-input {
  height: 2.25rem;
  width: 100%;
  padding-inline: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--control-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}


.text-input::placeholder,
.aidos-search-input::placeholder,
.aidos-dep-search-input::placeholder,
.aidos-field-editor-input::placeholder,
.aidos-modal-row input::placeholder,
.aidos-modal-row textarea::placeholder {
  color: var(--text-muted);
}

.text-input:focus,
.aidos-search-input:focus,
.aidos-dep-search-input:focus,
.aidos-field-editor-input:focus,
.aidos-evidence-attach-kind-select:focus,
.aidos-evidence-attach-note:focus,
.aidos-comment-textarea:focus,
.aidos-modal-row input:focus,
.aidos-modal-row textarea:focus,
.aidos-modal-row select:focus {
  border-color: var(--border-focus);
}

/* forms never overflow their container (spec \xA78) */
.aidos-root input,
.aidos-root textarea,
.aidos-root select,
.aidos-detail input,
.aidos-detail textarea,
.aidos-detail select,
.aidos-modal input,
.aidos-modal textarea,
.aidos-modal select {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
}

/* search box wrapper */
.aidos-search-box {
  position: relative;
}

.aidos-autocomplete {
  position: absolute;
  z-index: 20;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.aidos-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: none;
  border: none;
  padding: 6px 8px;
  cursor: pointer;
}

.aidos-suggestion:hover {
  background: var(--surface-hover);
}

.aidos-suggestion-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \u2500\u2500 12. Buttons (spec \xA713) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* secondary button \u2014 muted bordered pill, not high-contrast */
.aidos-btn,
.aidos-btn-dot {
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  padding: 5px 12px;
}

.aidos-btn:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text-primary);
  border-color: var(--border);
}

.aidos-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* primary button \u2014 the one filled control of the board: a light fill with
   dark text. A confirm button carries \`.aidos-btn\` as well, so this block
   must follow the secondary block: the two selectors weigh the same and the
   later one wins. The transparent border keeps the box the size of a
   secondary button, so a mixed row lines up. */
.primary-button,
.aidos-btn-primary,
.aidos-comment-send {
  width: auto;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--text-secondary);
  color: var(--surface);
  font-weight: 600;
}

.primary-button:hover:not(:disabled),
.aidos-btn-primary:hover:not(:disabled),
.aidos-comment-send:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--surface);
  border-color: transparent;
}

/* The send button sets its own height, so it lines up with the comment box. */
.aidos-comment-send {
  height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}

.primary-button:disabled,
.aidos-btn-primary:disabled,
.aidos-comment-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.aidos-btn-dot {
  position: relative;
}

.aidos-btn-dot::after {
  content: "";
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #adb2b8;
  border: 1px solid var(--surface);
}

.aidos-toggle-btn {
  min-width: 0;
  border-radius: var(--radius-sm);
  height: 1.75rem;
}

.aidos-sidebar-toggle {
  margin-left: auto;
}

/* \u2500\u2500 13. Checkbox field (spec \xA714) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.checkbox-field,
.aidos-check-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text-secondary);
  font-size: 0.84375rem;
  cursor: pointer;
  line-height: 18px;
}

.aidos-check-row input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  flex: 0 0 1.125rem;
  accent-color: var(--text-primary);
  cursor: pointer;
  border-radius: 0.1875rem;
}

.aidos-check-count {
  color: var(--text-muted);
  margin-left: auto;
}

.aidos-check-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* \u2500\u2500 14. Tile \u2014 reinterpreted as setting-card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-tile {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* #59: no fixed height \u2014 badges own their vertical space, the card grows
     with wrapped rows, and grid rows stretch to the tallest card so the
     field stays aligned. The preview still clamps at two lines. */
  min-height: 168px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  color: var(--text-primary);
}
.aidos-tile-preview {
  flex: none;
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.aidos-tile:hover {
  background: var(--surface-hover);
  border-color: var(--border);
}

/* Focused tile: the one open in the detail panel (ticket #61). */
.aidos-tile-selected {
  outline: 2px solid #f9fafb;
  outline-offset: -3px;
}

/* Active-work tile: the in_progress ticket with the latest update. The
   ring renders INSIDE the tile (inset shadow) so edge tiles never clip
   against the scroll pane and the grid extent never changes (#61). */
.aidos-tile-active {
  border-color: var(--accent-blue);
  box-shadow: inset 0 0 0 3px var(--accent-blue);
}

.aidos-tile-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-primary);
}

.aidos-tile-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.aidos-tile-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  min-width: 0;
}

/* The confidence ring and the tile gate text are gone: the tile shows a gate
   chip and a confidence chip instead (U15). */

/* detail header / body. The head keeps the title on the left and the
   close button on the right. */
.aidos-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-detail-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

/* Chip row between the header and the facts table. */
.aidos-detail-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* Small square control for a 12px icon. It carries no border and no
   background until hover. */
.aidos-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  padding: 4px;
  box-sizing: content-box;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  vertical-align: middle;
  cursor: pointer;
}

.aidos-icon-btn:hover,
.aidos-icon-btn:focus-visible {
  background: var(--surface-active);
  color: var(--text-primary);
}

/* Icon controls that sit ON a strip (criteria rows, evidence rows) are always
   visible and must read against the strip's own surface, so they carry a
   resting fill and full-strength glyphs instead of a faint transparent hint. */
.aidos-criterion-actions .aidos-icon-btn,
.aidos-evidence-strip-actions .aidos-icon-btn {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.aidos-criterion-actions .aidos-icon-btn:hover,
.aidos-criterion-actions .aidos-icon-btn:focus-visible,
.aidos-evidence-strip-actions .aidos-icon-btn:hover,
.aidos-evidence-strip-actions .aidos-icon-btn:focus-visible {
  background: var(--surface-active);
}


.aidos-detail-body {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.aidos-detail-note {
  font-size: 0.8125rem;
  line-height: 16px;
  color: var(--text-secondary);
  margin: 0;
}

/* quick facts (spec \xA76) */
.aidos-facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.aidos-facts-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
}

.aidos-facts-row + .aidos-facts-row {
  border-top: 1px solid var(--border-subtle);
}

.aidos-facts-label {
  font-size: 11px;
  line-height: 16px;
  color: var(--text-muted);
}

.aidos-facts-value {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 16px;
  color: var(--text-primary);
}

.aidos-facts-asterisk {
  margin-left: 2px;
  color: var(--text-secondary);
  cursor: help;
}

/* description section (U7, U8) */
.aidos-description {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* collapsible sections (U9) */
.aidos-collapsible {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px;
}
/* detail panels (spec \xA76) */
.aidos-panel {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  min-width: 0;
}

/* #69: a panel nested inside another panel (the evidence panel's linker
   section). One step quieter than its parent: the subtle border becomes the
   surface fill so the nesting reads without a second hard box. */
.aidos-panel-nested {
  border-color: transparent;
  background: var(--surface);
  padding: 8px 10px;
}

/* Panels sit in the detail column flex box, so the 10px gap separates them.
   The margin keeps stacked panels apart when markup skips the flex gap. */
.aidos-panel + .aidos-panel {
  margin-top: 10px;
}

/* The panel head is the disclosure summary. It keeps the title on the left
   and draws its own chevron on the right. */
.aidos-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  padding-block: 2px;
  list-style: none;
  cursor: pointer;
}

.aidos-panel-head::-webkit-details-marker {
  display: none;
}

.aidos-panel-head::after {
  content: "";
  flex: none;
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
  /* Closed points right. Open points down. */
  transform: rotate(-45deg);
  transition: transform 0.15s ease;
}

.aidos-panel[open] > .aidos-panel-head::after {
  transform: rotate(45deg);
}

.aidos-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  min-width: 0;
}


/* rendered markdown (spec \xA77) */
.aidos-md {
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--text-secondary);
}

.aidos-md p {
  margin: 0 0 6px;
}

.aidos-md p:last-child {
  margin-bottom: 0;
}

.aidos-md ul,
.aidos-md ol {
  margin: 0 0 6px;
  padding-left: 18px;
}

.aidos-md li {
  margin: 0;
}

.aidos-md code {
  padding: 0 3px;
  border-radius: 3px;
  background: var(--surface-active);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.aidos-md pre {
  margin: 0 0 6px;
  padding: 6px 8px;
  border-radius: 3px;
  background: var(--surface-active);
  overflow-x: auto;
}

.aidos-md pre code {
  padding: 0;
  background: none;
}

.aidos-md a {
  color: var(--text-primary);
}

.aidos-md strong {
  color: var(--text-primary);
}

.aidos-md em {
  color: var(--text-secondary);
}

.aidos-md h1,
.aidos-md h2,
.aidos-md h3,
.aidos-md h4 {
  margin: 8px 0 6px;
  color: var(--text-primary);
  font-weight: 600;
}

.aidos-md h1 {
  font-size: 14px;
  line-height: 20px;
}

.aidos-md h2 {
  font-size: 13px;
  line-height: 20px;
}

.aidos-md h3 {
  font-size: 13px;
  line-height: 20px;
}

.aidos-md h4 {
  font-size: 12px;
  line-height: 18px;
}

.aidos-md blockquote {
  margin: 0 0 6px;
  padding-left: 8px;
  border-left: 2px solid var(--border);
  color: var(--text-muted);
}

.aidos-md-clipped {
  max-height: 320px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);
}

.aidos-md-more {
  align-self: flex-start;
  border: 0;
  background: none;
  padding: 0;
  font-size: 11px;
  line-height: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.aidos-md-more:hover {
  color: var(--text-primary);
}

/* sort row \u2014 style select as text-input */
.aidos-sort-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.aidos-sort-row select {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px 8px;
  height: 2.5rem;
}

.aidos-sort-row select:focus {
  border-color: var(--border-focus);
  outline: none;
}

.aidos-actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* dependency search */
.aidos-dep-search {
  display: flex;
  gap: 6px;
}

.aidos-dep-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  overflow: hidden;
}

.aidos-dep-result {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: none;
  border: none;
  padding: 6px 8px;
  cursor: pointer;
}

.aidos-dep-result:hover {
  background: var(--surface-hover);
}

.aidos-dep-result:disabled {
  cursor: default;
  opacity: 0.6;
}

/* empty / error */
.aidos-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.aidos-empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.aidos-empty-note {
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
  color: var(--text-secondary);
}

.aidos-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  font-size: 12px;
  line-height: 18px;
}

/* skeleton */
.aidos-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.aidos-skeleton-tile {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: 1px solid var(--border-subtle);
}

/* modal */
.aidos-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  /* #93: the mask defines the SAFE BOX every modal centers inside. Before
     this, nothing bounded a modal's height, so a long one (the 71-row work
     queue) ran off the top AND bottom of the screen with no way to reach
     either end. Padding here rather than a height on the modal keeps the
     centering honest, and clears the mobile top bar the measurement hook
     publishes. */
  box-sizing: border-box;
  padding: calc(var(--aidos-top-chrome, 0px) + 16px) 16px 16px;
}

.aidos-modal {
  box-sizing: border-box;
  width: 420px;
  max-width: 100%;
  /* Never taller than the mask's safe box; the body scrolls instead. */
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  color: var(--text-primary);
}

.aidos-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
  color: var(--text-primary);
}

.aidos-modal-body {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* toast */
.aidos-toast-stack {
  position: fixed;
  z-index: 200;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.aidos-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(560px, calc(100vw - 32px));
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.aidos-toast-text {
  flex: 1;
  min-width: 0;
}

.aidos-toast-refusal {
  border-left: 3px solid #e07a5f;
}

.aidos-toast-info {
  border-left: 3px solid var(--text-secondary);
}

.aidos-toast-success {
  border-left: 3px solid #adb2b8;
}

.aidos-toast-dismiss {
  cursor: pointer;
  flex: none;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 16px;
  padding: 0;
}

.aidos-toast-dismiss:hover {
  color: var(--text-primary);
}

/* modal form */
.aidos-modal-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* The scroll container: the head stays put, the body scrolls. min-height:0
     is what actually lets a flex child shrink below its content. */
  min-height: 0;
  overflow-y: auto;
}

.aidos-modal-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.aidos-modal-row label {
  font-size: 0.8125rem;
  line-height: 18px;
  color: var(--text-secondary);
}

/* field editor */
.aidos-field-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* action bar */
/* The action row sits under the quick facts, near the top of the detail
   pane. It is an ordinary block of the panel column, so it scrolls with the
   rest of the pane, and it holds its buttons at the left edge. */
.aidos-action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

/* The action bar's buttons are the primary verbs of the panel (Sign off,
   Verify, Submit for review, Mark done), so they carry a raised resting fill
   and full-strength text rather than the quiet secondary treatment. */
.aidos-action-bar .aidos-btn {
  background: var(--surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.aidos-action-bar .aidos-btn:hover:not(:disabled) {
  background: var(--surface-active);
  color: var(--text-primary);
}

/* A gated action still has to be READABLE while it is unavailable \u2014 its
   tooltip names the missing evidence. Mute it, do not dissolve it. */
.aidos-action-bar .aidos-btn:disabled,
.aidos-action-bar .aidos-btn-disabled {
  opacity: 1;
  background: var(--surface);
  color: var(--text-secondary);
  border-color: var(--border-subtle);
}


/* spoiler (submit-for-review) */
.aidos-spoiler {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-spoiler-summary {
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-secondary);
}

.aidos-spoiler-summary:hover {
  color: var(--text-primary);
}

/* comments */
/* A row of controls that sits at the right edge of its block: the comment
   send button, the evidence attach button, and the save and cancel pair of an
   inline editor. */
.aidos-form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  /* Pinned to the bottom of the scrolling body, so Confirm and Cancel are
     always reachable however long the content is. */
  position: sticky;
  bottom: 0;
  background: var(--surface);
  padding-top: 8px;
}

/* The inline editor of a panel: the raw text behind a rendered block. */
.aidos-panel-body textarea {
  width: 100%;
  min-height: 9rem;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-primary);
  font: inherit;
  resize: vertical;
}

.aidos-comment {
  font-size: 12px;
  line-height: 20px;
  color: var(--text-primary);
  background: var(--bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 10px;
}

/* helper text (spec \xA713) */
.helper-text {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* \u2500\u2500 15. Responsive (spec \xA720) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media (max-width: 700px) {
  .aidos-root {
    /* NEVER use the \`padding\` shorthand here: this block sits after the
       measured top clearance (\xA72) at equal specificity, so a shorthand
       silently resets padding-top and the toolbar slides back under the
       mobile plugin's fixed top bar. Longhands only. (#64) */
    padding-inline: 1rem;
    padding-bottom: 2.5rem;
  }

  .aidos-sidebar,
  .aidos-detail {
    width: 100%;
  }

  .segmented-control,
  .mode-switch {
    width: 100%;
  }

  .segment,
  .mode-switch > button {
    flex: 1;
  }

  .control-list-row {
    flex-wrap: wrap;
  }
}

/* \u2500\u2500 workspace merge loading \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.aidos-merge-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 240px;
  gap: 10px;
  padding: 24px 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.aidos-merge-spinner {
  width: 14px;
  height: 14px;
  flex: none;
  border: 2px solid var(--border);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: aidos-merge-spin 0.8s linear infinite;
}

@keyframes aidos-merge-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aidos-merge-spinner {
    animation-duration: 2s;
  }
}

/* U2e: allowlist editor */
.aidos-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.aidos-allowlist-input {
  width: 100%;
  min-height: 120px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
}

.aidos-allowlist-preview ul {
  margin: 4px 0 0;
  padding-left: 16px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-clickable {
  cursor: pointer;
}

/* #50: evidence viewer modal */
.aidos-evidence-payload-json {
  max-height: 320px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px;
}

.aidos-evidence-payload-list {
  margin: 4px 0 0;
  padding-left: 16px;
  font-family: monospace;
  font-size: 12px;
}

/* #62: disabled action buttons stay legible on the dark theme */
.aidos-btn-disabled,
.aidos-btn-disabled:hover,
.aidos-btn-disabled:active {
  opacity: 0.45;
  cursor: not-allowed;
  color: var(--text-primary);
  background: var(--surface-active);
  border-color: var(--border);
}

/* #55: split badges for the metric chips. The keyword half carries the
   neutral chrome; the value half inverts so the number reads first. */
.aidos-chip-metric {
  padding-inline: 0;
  overflow: hidden;
}

.aidos-chip-metric .aidos-chip-key {
  padding-inline: 7px;
}

.aidos-chip-metric .aidos-chip-value {
  align-self: stretch;
  display: inline-flex;
  align-items: center;
  padding-inline: 5px;
  font-weight: 700;
}

/*
 * #21, the attention hierarchy the user set: "only gate is allowed to draw
 * attention, as is ticket id and status".
 *
 * The GATE keeps the near-white value pill. It is the only metric that
 * controls anything -- it is literally what stands between a ticket and its
 * next state -- so it earns the loudest treatment on the card.
 */
.aidos-chip-gate .aidos-chip-value {
  background: #f9fafb;
  color: #232324;
}

/*
 * CONFIDENCE is advisory: it never unlocks anything, so it must never look
 * like it does. It used to share the gate's stark white pill, which gave an
 * advisory number the same visual authority as the gate. It now uses the
 * same quiet tint as the evidence chips, over a NEUTRAL hue so it recedes
 * from the coloured kind chips too.
 *
 * Measured (both backdrops): 8.76 / 7.39 on the chip and 6.42 / 5.56 on the
 * value. Quiet is not the same as unreadable -- the earlier grey-on-grey
 * failure came from a 72% text mix, not from using a grey hue.
 */
.aidos-chip-conf {
  --chip-hue: var(--text-secondary);
  background: color-mix(in srgb, var(--chip-hue) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue) 45%, transparent);
  color: color-mix(in srgb, var(--chip-hue) 38%, #ffffff);
}

/*
 * #21: the pending-approval flag beside the ticket id.
 *
 * Warning-yellow, and deliberately the only OTHER thing on the card allowed
 * to draw attention alongside the gate, the id and the state chip. It marks
 * the one condition that is blocked on the human, so a card that needs them
 * should be findable at a glance across the grid.
 */
.aidos-chip-approval-flag {
  --chip-hue: var(--state-awaiting);
  padding-inline: 4px;
  background: color-mix(in srgb, var(--chip-hue) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip-hue) 60%, transparent);
  color: color-mix(in srgb, var(--chip-hue) 30%, #ffffff);
}

.aidos-chip-conf .aidos-chip-value {
  background: color-mix(in srgb, var(--chip-hue) 30%, transparent);
  border-inline-start: 1px solid color-mix(in srgb, var(--chip-hue) 45%, transparent);
  color: inherit;
}

/* #68: structured evidence payload fields (the no-raw-JSON rule). */
.aidos-evidence-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aidos-evidence-note-text {
  white-space: pre-wrap;
}

.aidos-evidence-image {
  max-width: 100%;
  max-height: 320px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: block;
  margin-bottom: 4px;
}

.aidos-evidence-image-path {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.aidos-evidence-raw-json {
  margin-top: 4px;
}

.aidos-evidence-raw-json > summary {
  cursor: pointer;
  font-size: 11px;
  line-height: 16px;
  color: var(--text-muted);
  user-select: none;
}

.aidos-evidence-raw-json > summary:hover {
  color: var(--text-secondary);
}

.aidos-evidence-raw-json > .aidos-evidence-payload-json {
  margin-top: 4px;
}

/* #53: the kind-tailored attach surface. */
.aidos-evidence-attach {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-evidence-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.aidos-evidence-paste-zone {
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 14px 10px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  outline: none;
}

.aidos-evidence-paste-zone:focus-visible,
.aidos-evidence-paste-zone:hover {
  border-color: var(--border-focus);
  color: var(--text-primary);
}

.aidos-evidence-paste-error {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #e07a5f;
}

.aidos-evidence-tailored {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Dependency mini-cards (#board-feedback): a dependency renders as a card
   with title + state + an Open button, not a bare chip. */




/* The one dep-card survivor: the unknown-ref fallback inside a shared
   TicketStrip (#93). Every other dep-card rule died with the private card. */
.aidos-dep-card-unknown {
  color: var(--text-muted);
  font-style: italic;
}


/* #51: the pending-approval card. Kind-generic: one card style for every
   agent-to-user ask (allowlist first). */
.aidos-approval-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--accent-blue);
  border-radius: var(--radius-md);
  padding: 10px;
  background: var(--surface);
}

.aidos-approval-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.aidos-approval-prompt {
  font-size: 12px;
  line-height: 18px;
  color: var(--text-primary);
  min-width: 0;
}

.aidos-chip-approval-kind {
  background: var(--accent-blue);
}

/* #70: the shared UI vocabulary's tokens. */
.aidos-field-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aidos-field-row-label,
.aidos-collapse > summary {
  font-size: 11px;
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.aidos-field-row-value {
  font-size: 13px;
  line-height: 20px;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.aidos-chip-emphasis {
  background: var(--accent-blue);
}

.aidos-collapse > summary {
  cursor: pointer;
  user-select: none;
}

.aidos-collapse > summary:hover {
  color: var(--text-secondary);
}

.aidos-collapse-body {
  margin-top: 4px;
}

/* ==== Evidence strips (#77) and criterion linking (#69) ==== */

.aidos-evidence-list,
.aidos-criterion-evidence,
.aidos-criterion-linked {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aidos-evidence-strip {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 6px var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  min-width: 0;
}

.aidos-evidence-strip-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.aidos-evidence-strip-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.aidos-evidence-strip-excerpt {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-evidence-strip-kind-name {
  font-size: 12px;
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.aidos-evidence-strip-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.aidos-evidence-strip-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
  /* Always at the end of the strip, whatever the excerpt's width. */
  margin-left: auto;
  align-self: center;
}

.aidos-evidence-unlink {
  flex: none;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.aidos-evidence-unlink:hover {
  background: var(--surface-active);
  color: var(--text-primary);
}

.aidos-evidence-unlink:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Criterion blocks: label row + its linked strips + the link picker. */
.aidos-criterion-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aidos-criterion-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

/* The linker's criterion block has no warning triangle of its own (its
   "No evidence linked." line carries that), so it keeps the warning edge.
   The criterion STRIP does not: its triangle is the signal. */
.aidos-criterion-block.aidos-criterion-uncovered {
  border-color: var(--state-awaiting);
}

.aidos-criterion-label {
  font-size: 12px;
  color: var(--text-primary);
}

.aidos-criterion-linker {
  display: flex;
  gap: 6px;
  align-items: center;
}

.aidos-criterion-linker select {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 12px;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--control-text);
}

.aidos-criterion-linker select:focus-visible {
  outline: none;
  border-color: var(--border-focus);
}

/* Evidence nested under a criterion line in the criteria panel. */
.aidos-criterion-linked {
  margin: 4px 0 0;
  padding-left: 10px;
}

/* ---------------------------------------------------------------------------
   #93 TICKET STRIP + the human work queue, and #85's approval runner.
   Deliberately mirrors the evidence-strip rules above: the two strips are one
   family, so a referenced ticket and a referenced evidence row read alike.
   --------------------------------------------------------------------------- */

.aidos-ticket-strips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aidos-ticket-strip {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 6px var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  min-width: 0;
}

.aidos-ticket-strip-highlighted {
  border-color: var(--accent-blue);
}

.aidos-ticket-strip-working {
  opacity: 0.6;
}

.aidos-ticket-strip-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.aidos-ticket-strip-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.aidos-ticket-strip-title {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aidos-ticket-strip-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.aidos-ticket-strip-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.aidos-ticket-strip-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  /* Same rule the evidence strip follows: actions always at the end. */
  margin-left: auto;
  align-self: center;
}

/*
 * #93 (user, 2026-09-03): "make the buttons in the waiting on you modal all
 * the same size and follow a grid system".
 *
 * The queue's rows carried buttons of whatever width their label happened to
 * be -- "Verify", "Mark done", "Review request" -- and only SOME rows have a
 * Dismiss, so nothing lined up down the column and the eye had to re-find
 * the primary action on every row.
 *
 * A fixed two-column grid, right-aligned, fixes both: column one is always
 * the primary action and column two is always Dismiss, so a row without a
 * Dismiss leaves a hole rather than sliding its primary button sideways.
 * The columns are sized to the WIDEST label, not to each row's own.
 */
.aidos-queue .aidos-ticket-strip-actions {
  display: grid;
  /*
   * THREE columns, not two: the strip's own pop-out button renders inside
   * this container (ticket-strip.tsx), so a two-column grid would wrap it
   * onto its own row and make every entry taller. It gets a column of its
   * own, sized to its content.
   */
  grid-template-columns: auto var(--queue-action-w) var(--queue-dismiss-w);
  gap: 6px;
  align-items: center;
  /*
   * Right alignment, stated EXPLICITLY rather than inherited.
   *
   * The base .aidos-ticket-strip-actions rule sets \`margin-left: auto\`, and
   * relying on that survived the flex layout but not the grid one: with
   * fixed columns the block's width stops tracking its contents, so whether
   * it still hugs the right edge depends on rules declared elsewhere. The
   * user reported exactly that -- "on a grid but they have lost the right
   * alignment". A layout's own alignment belongs in its own rule.
   */
  margin-left: auto;
  justify-content: end;
  justify-items: end;
}

.aidos-queue {
  /* Sized to the longest action label ("Review request") so every row's
     primary button is identical, and the grid never reflows per row. */
  --queue-action-w: 8.5rem;
  --queue-dismiss-w: 5rem;
}

.aidos-queue .aidos-ticket-strip-actions .aidos-btn {
  /* Full-width WITHIN its column, so every row's button is the same size --
     the column, not the label, decides the width. */
  width: 100%;
  justify-content: center;
  /* One height for every button, so the column reads as a column. */
  min-height: 28px;
}

/* The pop-out affordance keeps its intrinsic size in column one. */
.aidos-queue .aidos-ticket-strip-actions .aidos-icon-btn {
  width: auto;
  justify-self: start;
}

@media (max-width: 640px) {
  /* One column on a narrow screen: two fixed columns would squeeze the
     labels rather than aligning them, which defeats the point. */
  .aidos-queue .aidos-ticket-strip-actions {
    grid-template-columns: auto 1fr 1fr;
  }
}

/* The queue itself. */
.aidos-queue {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-queue-empty {
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-queue-reason {
  color: var(--accent-blue);
}

/* The count the human sees without opening the queue. */
.aidos-queue-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

/* #85 runner steps. */
.aidos-runner-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aidos-runner-step-title {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
}

.aidos-runner-step-prompt {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-runner-checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.aidos-runner-checklist label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
}

/* #93: a wider modal for list surfaces (the work queue, pickers). The default
   420px is sized for a form; a ticket strip carries an id chip, a title, two
   chips, and its actions, and cramps badly at that width. */
.aidos-modal-wide {
  width: 720px;
}

/* #93: the queue's header \u2014 count on the left, sort on the right. */
.aidos-queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.aidos-queue-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.aidos-queue-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* #93: a ticket carrying an unanswered approval request. Amber, because it is
   a block on the AGENT and the human is the only one who can clear it. */
.aidos-chip-awaiting-approval {
  background: var(--state-awaiting);
  color: #1a1206;
  font-weight: 600;
}

/* #93: nominations that matched no queue entry. Visible, not silent. */
.aidos-queue-unmatched {
  list-style: none;
  margin: 0;
  padding: 6px var(--space-1);
  border: 1px solid var(--state-awaiting);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
}

/*
 * #100: the detail panel's "this ticket is not on the board right now"
 * notice. The panel no longer closes when a row goes momentarily missing --
 * it says so and keeps the reader's place, along with any modal they had
 * open inside it. Warning-toned because it means the view may be stale, not
 * because anything is broken.
 */
.aidos-detail-absent {
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--state-awaiting) 55%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--state-awaiting) 16%, transparent);
  color: color-mix(in srgb, var(--state-awaiting) 34%, #ffffff);
  font-size: 12px;
  line-height: 1.4;
}
`;

// css-text:/home/sid/repos/aidos/src/client/plan-meta.css
var plan_meta_default = "/* Plan-meta modal styles (Ticket U12). Board.css owns the shared modal\n   tokens; this file styles only the aidos-plan-meta-* classes. */\n\n.aidos-plan-meta-modal {\n  box-sizing: border-box;\n  width: 640px;\n  max-width: calc(100vw - 32px);\n  max-height: calc(100vh - 96px);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 1.25rem;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);\n  color: var(--text-primary);\n}\n\n.aidos-plan-meta-blocks {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  overflow-y: auto;\n}\n\n.aidos-plan-meta-block {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 8px;\n  background: var(--bg);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n}\n\n.aidos-plan-meta-block-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-plan-meta-block-title {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.aidos-plan-meta-toggle {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 0;\n  border: none;\n  background: none;\n  font: inherit;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary);\n  cursor: pointer;\n  text-align: left;\n}\n\n.aidos-plan-meta-toggle:hover {\n  color: var(--text-secondary);\n}\n\n.aidos-plan-meta-text {\n  margin: 0;\n  padding: 6px 8px;\n  font-family: inherit;\n  font-size: 0.8125rem;\n  line-height: 1.5;\n  white-space: pre-wrap;\n  word-break: break-word;\n  color: var(--text-secondary);\n  background: var(--surface);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  max-height: 240px;\n  overflow-y: auto;\n}\n\n.aidos-plan-meta-input {\n  box-sizing: border-box;\n  width: 100%;\n  min-height: 96px;\n  padding: 6px 8px;\n  font: inherit;\n  font-size: 0.8125rem;\n  line-height: 1.5;\n  color: var(--control-text);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  resize: vertical;\n}\n\n.aidos-plan-meta-input:focus {\n  outline: none;\n  border-color: var(--border-focus);\n}\n\n.aidos-plan-meta-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.aidos-plan-meta-note {\n  margin: 0;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n";

// src/kernel/types.ts
var STATE_ORDER = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done"
];

// src/kernel/constants.ts
var BUILTIN_KINDS = [
  {
    id: "builtin:user_signoff",
    label: "User signoff",
    description: "The human confirms the work.",
    weight: 1,
    allowedAuthors: ["user"]
  },
  {
    id: "builtin:user_verified",
    label: "User verified",
    description: "The human checked the finished work.",
    weight: 1,
    allowedAuthors: ["user"]
  },
  {
    id: "builtin:eval_criteria",
    label: "Evaluation criteria",
    description: "The criteria to judge the work.",
    weight: 1,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:file_allowlist",
    label: "File allowlist",
    description: "The files the change may touch.",
    weight: 1,
    allowedAuthors: ["user"]
  },
  {
    id: "builtin:agent_report",
    label: "Agent report",
    description: "The agent describes the work.",
    weight: 1,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:automated_check",
    label: "Automated check",
    description: "A machine check ran and reported a result.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:test_run",
    label: "Test run",
    description: "A test run and its result.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_pass",
    label: "Review \u2014 accepted",
    description: "An independent review of the change accepted it: a reviewer subagent or the human read it, reported findings, and PASSED it. The orchestrator's own read does not qualify. A failing review is recorded with builtin:review_fail instead \u2014 never here.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_fail",
    label: "Review \u2014 failed",
    description: "An independent review of the change FAILED it: a reviewer subagent or the human found a defect and did not pass it. Contributes to nothing \u2014 it never satisfies a gate. Kept alongside any later builtin:review_pass so the review history (how many rounds, what each found) stays visible.",
    weight: 0,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_note",
    label: "Remark",
    description: "A remark: a note from a review round, or a general comment on the ticket. The one surviving free-form remark kind after builtin:comment folded into it \u2014 same weight, same authors, one kind instead of two doing the same job.",
    weight: 0.5,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:after_shot",
    label: "After shot",
    description: "The state after the work.",
    weight: 1,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:comment",
    label: "Comment (deprecated)",
    description: "DEPRECATED \u2014 folded into builtin:review_note, which is identical in weight and authorship. Kept here only so a pre-existing evidence row of this kind still validates and renders; no longer offered for new rows. Do not confuse with the ticket's COMMENT THREAD (CommentRecord/userAddComment), a separate durable mechanism this kind never wrote to.",
    weight: 0.5,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:imported_state",
    label: "Imported state",
    description: "The state that a plan document claimed at import time.",
    weight: 0,
    allowedAuthors: ["system"]
  },
  {
    id: "builtin:user_commit",
    label: "Git commit",
    description: "One git commit from the ticket's workspace, resolved through git show at attach time.",
    weight: 1,
    allowedAuthors: ["user"]
  }
];
var DEFAULT_GATES = [
  {
    fromState: "open",
    toState: "in_progress",
    requiredKinds: ["builtin:user_signoff"],
    allowedActors: ["user", "agent"]
  },
  {
    fromState: "in_progress",
    toState: "awaiting_verification",
    requiredKinds: ["builtin:automated_check", "builtin:review_pass"],
    allowedActors: ["user", "agent"],
    /*
     * #107: an accepted review excuses the machine check.
     *
     * automated_check is the CHEAP evidence -- the agent attaches it from
     * its own claim that it ran something, and nothing verifies the claim.
     * review_pass is the EXPENSIVE one: an independent reviewer, or the
     * human. Requiring the cheap artefact alongside the expensive one adds
     * ceremony, not safety, and worse, teaches the agent to attach a check
     * as a formality -- which is precisely how automated_check becomes a
     * rubber stamp.
     *
     * The motivating case was a human writing "this flow works fine, we've
     * been using it extensively" on a ticket that then sat blocked waiting
     * for a machine check. That review IS empirical evidence the thing
     * runs, arguably stronger than a test run, and a design that cannot
     * record it without also demanding a check is failing the human.
     *
     * DIRECTIONAL, and that is the safety property: review_pass excuses
     * automated_check and never the reverse. The expensive evidence stays
     * mandatory, so the gate still stops the agent marking its own homework.
     */
    excusedBy: { "builtin:automated_check": "builtin:review_pass" }
  },
  {
    fromState: "awaiting_verification",
    toState: "done",
    requiredKinds: ["builtin:user_verified"],
    allowedActors: ["user"]
  },
  {
    fromState: "awaiting_verification",
    toState: "in_progress",
    requiredKinds: [],
    allowedActors: ["user"]
  }
];
var DEFAULT_CONFIG = {
  kinds: [...BUILTIN_KINDS],
  gates: [...DEFAULT_GATES],
  injectEnabled: true,
  injectDebounceMs: 3e4
};

// src/client/board-logic.ts
function asBoardKey(value) {
  return value;
}
function boardKeyOf(ticket) {
  return ticket.foreign === true && ticket.sourceSessionId !== void 0 ? ticket.sourceSessionId + ":" + ticket.id : String(ticket.id);
}
var STATE_CHECKLIST_ORDER = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done"
];
function stateLabel(state) {
  switch (state) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "awaiting_verification":
      return "Awaiting verification";
    case "done":
      return "Done";
    default:
      return state;
  }
}
function stateClass(state) {
  switch (state) {
    case "open":
      return "open";
    case "in_progress":
      return "in-progress";
    case "awaiting_verification":
      return "awaiting-verification";
    case "done":
      return "done";
    default:
      return state;
  }
}
function badgeClass(state) {
  return "aidos-chip aidos-chip-state-" + stateClass(state);
}
function hasCriteria(ticket) {
  return ticket.criteria.trim().length > 0;
}
function compareTitles(a, b2) {
  const al = a.toLowerCase();
  const bl = b2.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  return 0;
}
function compareTickets(a, b2, key, descending) {
  const aHas = hasCriteria(a);
  const bHas = hasCriteria(b2);
  if (aHas !== bHas) return aHas ? -1 : 1;
  let primary = 0;
  let tiebreak = 0;
  switch (key) {
    case "confidence":
      primary = a.confidenceScore - b2.confidenceScore;
      tiebreak = (a.gateFraction ?? 0) - (b2.gateFraction ?? 0);
      break;
    case "gates":
      primary = (a.gateFraction ?? 0) - (b2.gateFraction ?? 0);
      tiebreak = a.confidenceScore - b2.confidenceScore;
      break;
    case "time":
      primary = a.updatedAt - b2.updatedAt;
      tiebreak = compareTitles(a.title, b2.title);
      break;
    case "alpha":
      primary = compareTitles(a.title, b2.title);
      tiebreak = a.updatedAt - b2.updatedAt;
      break;
  }
  let cmp = primary;
  if (descending) cmp = -cmp;
  if (cmp === 0) {
    cmp = tiebreak;
    if (descending) cmp = -cmp;
  }
  if (cmp === 0) cmp = a.id - b2.id;
  return cmp;
}
function matchesSearch(ticket, query) {
  if (query === "") return true;
  if (ticket.title.toLowerCase().includes(query.toLowerCase())) return true;
  return String(ticket.id).includes(query);
}
function filterTickets(tickets, filter) {
  const stateSet = new Set(filter.stateIds);
  const projectSet = filter.projectIds === null ? null : new Set(filter.projectIds);
  const out = [];
  for (const ticket of tickets) {
    if (!stateSet.has(ticket.state)) continue;
    if (projectSet !== null && !projectSet.has(ticket.projectId)) continue;
    if (!matchesSearch(ticket, filter.search)) continue;
    out.push(ticket);
  }
  out.sort((a, b2) => compareTickets(a, b2, filter.sortKey, filter.descending));
  return out;
}
function autocompleteTickets(tickets, query, limit = 8) {
  const out = [];
  for (const ticket of tickets) {
    if (!matchesSearch(ticket, query)) continue;
    out.push(ticket);
  }
  out.sort((a, b2) => a.id - b2.id);
  return out.slice(0, limit);
}
function openCount(tickets) {
  let count = 0;
  for (const ticket of tickets) {
    if (ticket.state !== "done") count += 1;
  }
  return count;
}
function formatGateFraction(present, total, hasCriteriaValue) {
  if (!hasCriteriaValue) return "N/A";
  if (present === null || total === null) return "\u2014";
  return present + "/" + total;
}
function ringPercent(score) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score * 20));
}
function parseCriteria(criteria) {
  return criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}
var KINDS_ANNOTATION = /\s*<!--\s*kinds:\s*([a-z0-9_:,\- ]+?)\s*-->\s*$/i;
function kindsForCriterion(line) {
  const match = KINDS_ANNOTATION.exec(line);
  if (match === null) return [];
  return match[1].split(",").map((kind) => kind.trim()).filter((kind) => kind !== "");
}
function criteriaLines(criteria) {
  return parseCriteria(criteria);
}
function groupEvidenceByCriterion(criteria, evidence) {
  const lines = parseCriteria(criteria);
  const groups = lines.map((line) => ({
    criterion: line,
    matched: false,
    rows: []
  }));
  const byLabel = /* @__PURE__ */ new Map();
  for (const group of groups) {
    byLabel.set(group.criterion, group);
  }
  const ungrouped = [];
  for (const row of evidence) {
    const raw = row.payload.criteria;
    if (typeof raw !== "string" || raw.trim() === "") {
      ungrouped.push(row);
    } else {
      const label = raw.trim();
      const group = byLabel.get(label);
      if (group) {
        group.rows.push(row);
        group.matched = true;
      } else {
        ungrouped.push(row);
      }
    }
  }
  if (ungrouped.length > 0) {
    groups.push({ criterion: "", matched: true, rows: ungrouped });
  }
  return groups;
}
function uncoveredCriteria(criteria, evidence) {
  const groups = groupEvidenceByCriterion(criteria, evidence);
  const out = [];
  for (const group of groups) {
    if (group.criterion === "" || group.matched) continue;
    const linked = kindsForCriterion(group.criterion);
    const matches = (kind) => linked.includes(kind) || linked.includes(kind.replace(/^builtin:/, ""));
    if (linked.length > 0 && evidence.some((row) => matches(row.kind))) continue;
    out.push(group.criterion);
  }
  return out;
}
function evidenceIsMany(evidence, threshold = 6) {
  return evidence.length > threshold;
}
var KIND_COLORS = [
  "var(--badge-hue-1)",
  "var(--badge-hue-2)",
  "var(--badge-hue-3)",
  "var(--badge-hue-4)",
  "var(--badge-hue-5)",
  "var(--badge-hue-6)",
  "var(--badge-hue-7)",
  "var(--badge-hue-8)"
];
function kindColor(kind) {
  if (kind === "builtin:review_fail") return "var(--verdict-fail)";
  let hash = 0;
  for (let i = 0; i < kind.length; i++) {
    hash = hash * 31 + kind.charCodeAt(i) | 0;
  }
  const index = Math.abs(hash) % KIND_COLORS.length;
  return KIND_COLORS[index];
}
function kindLabel(kind) {
  for (const def of BUILTIN_KINDS) {
    if (def.id === kind) return def.label;
  }
  return kind;
}
function kindDescription(kind) {
  for (const def of BUILTIN_KINDS) {
    if (def.id === kind) return def.description;
  }
  return "";
}
var KIND_KEYWORDS = {
  "builtin:imported_state": "IMPORTED",
  "builtin:user_signoff": "SIGNED OFF",
  "builtin:user_verified": "VERIFIED",
  "builtin:eval_criteria": "CRITERIA",
  "builtin:file_allowlist": "ALLOWLIST",
  "builtin:agent_report": "REPORT",
  "builtin:automated_check": "CHECK",
  "builtin:test_run": "TESTS",
  "builtin:review_pass": "ACCEPTED",
  "builtin:review_fail": "FAILED",
  "builtin:review_note": "NOTE"
};
function kindKeyword(kind) {
  const known = KIND_KEYWORDS[kind];
  if (known !== void 0) return known;
  const label = kindLabel(kind);
  if (label !== kind) return label.toUpperCase();
  const tail = kind.includes(":") ? kind.slice(kind.indexOf(":") + 1) : kind;
  return tail.replace(/[_-]+/g, " ").toUpperCase();
}
function stateImpliedKinds(state, gates = DEFAULT_GATES) {
  const reached = STATE_ORDER.indexOf(state);
  const implied = /* @__PURE__ */ new Set();
  for (const gate of gates) {
    const target = STATE_ORDER.indexOf(gate.toState);
    if (target <= STATE_ORDER.indexOf(gate.fromState)) continue;
    if (target >= 0 && reached >= target) {
      for (const kind of gate.requiredKinds) implied.add(kind);
    }
  }
  return implied;
}
function tileKindCounts(state, counts2, gates = DEFAULT_GATES) {
  const implied = stateImpliedKinds(state, gates);
  return counts2.filter((count) => count.count > 1 || !implied.has(count.kind));
}
function evidenceKindCounts(evidence) {
  const counts2 = /* @__PURE__ */ new Map();
  const firstAt = /* @__PURE__ */ new Map();
  let sequence = 0;
  const arrival = /* @__PURE__ */ new Map();
  for (const row of evidence) {
    counts2.set(row.kind, (counts2.get(row.kind) ?? 0) + 1);
    if (!arrival.has(row.kind)) arrival.set(row.kind, sequence++);
    if (typeof row.at === "number") {
      const seen = firstAt.get(row.kind);
      if (seen === void 0 || row.at < seen) firstAt.set(row.kind, row.at);
    }
  }
  const out = [];
  for (const [kind, count] of counts2) {
    out.push({ kind, count, color: kindColor(kind) });
  }
  out.sort((a, b2) => {
    const aFirst = a.kind === "builtin:imported_state";
    const bFirst = b2.kind === "builtin:imported_state";
    if (aFirst !== bFirst) return aFirst ? -1 : 1;
    const at2 = firstAt.get(a.kind);
    const bt = firstAt.get(b2.kind);
    if (at2 !== void 0 && bt !== void 0 && at2 !== bt) return at2 - bt;
    const aa = arrival.get(a.kind) ?? 0;
    const ba = arrival.get(b2.kind) ?? 0;
    if (aa !== ba) return aa - ba;
    if (a.kind < b2.kind) return -1;
    if (a.kind > b2.kind) return 1;
    return 0;
  });
  return out;
}
function workspaceLabel(workspaceKey) {
  const parts = workspaceKey.split("-").filter((part) => part !== "");
  return parts.length === 0 ? workspaceKey : parts[parts.length - 1];
}
function displayDep(ref, ownWorkspaceKey) {
  const match = /^(--.*--):(.*)$/.exec(ref);
  if (match === null) return ref;
  const [, workspaceKey, tail] = match;
  if (ownWorkspaceKey !== void 0 && workspaceKey === ownWorkspaceKey) {
    return tail;
  }
  return workspaceLabel(workspaceKey) + "#" + tail;
}
function fullTicketId(ticket) {
  return ticket.workspaceKey + ":" + ticket.slug;
}
function ticketChipLabel(ticket, ownWorkspaceKey) {
  return displayDep(ticket.workspaceKey + ":" + ticket.id, ownWorkspaceKey);
}
var BADGE_HUES = [
  "var(--badge-hue-1)",
  "var(--badge-hue-2)",
  "var(--badge-hue-3)",
  "var(--badge-hue-4)",
  "var(--badge-hue-5)",
  "var(--badge-hue-6)",
  "var(--badge-hue-7)",
  "var(--badge-hue-8)"
];
function idColor(fullId) {
  let hash = 0;
  for (let i = 0; i < fullId.length; i++) {
    hash = hash * 31 + fullId.charCodeAt(i) | 0;
  }
  const index = Math.abs(hash) % BADGE_HUES.length;
  return BADGE_HUES[index];
}
function resolveSelection(tickets, selectedKey, previous) {
  if (selectedKey === null) {
    return { ticket: null, reanchorKey: null, reason: "none", absent: false };
  }
  const resolved = tickets.find((ticket) => boardKeyOf(ticket) === selectedKey) ?? null;
  if (resolved !== null) {
    return { ticket: resolved, reanchorKey: null, reason: "resolved", absent: false };
  }
  if (previous !== null) {
    const reanchored = tickets.find((ticket) => fullTicketId(ticket) === fullTicketId(previous)) ?? null;
    if (reanchored !== null) {
      return {
        ticket: reanchored,
        reanchorKey: boardKeyOf(reanchored),
        reason: "reanchored",
        absent: false
      };
    }
    return { ticket: previous, reanchorKey: null, reason: "held", absent: true };
  }
  return { ticket: null, reanchorKey: null, reason: "gone", absent: false };
}

// src/client/view-state.ts
var DEFAULT_APPLIED = {
  projectIds: null,
  stateIds: [...STATE_CHECKLIST_ORDER],
  sortKey: "time",
  descending: true,
  search: ""
};
function cloneAppliedState(state) {
  return {
    projectIds: state.projectIds === null ? null : [...state.projectIds],
    stateIds: [...state.stateIds],
    sortKey: state.sortKey,
    descending: state.descending,
    search: state.search
  };
}
var sessionStates = /* @__PURE__ */ new Map();
function freshState() {
  return {
    applied: cloneAppliedState(DEFAULT_APPLIED),
    staged: cloneAppliedState(DEFAULT_APPLIED)
  };
}
function getStagedState(sessionId) {
  const entry = sessionStates.get(sessionId);
  if (entry) return entry.staged;
  return cloneAppliedState(DEFAULT_APPLIED);
}
function setAppliedState(sessionId, state) {
  let entry = sessionStates.get(sessionId);
  if (!entry) {
    entry = freshState();
    sessionStates.set(sessionId, entry);
  }
  entry.applied = cloneAppliedState(state);
}
function setStagedState(sessionId, state) {
  let entry = sessionStates.get(sessionId);
  if (!entry) {
    entry = freshState();
    sessionStates.set(sessionId, entry);
  }
  entry.staged = cloneAppliedState(state);
}
var counts = /* @__PURE__ */ new Map();
var currentSessionId = null;
var bumpCallback = null;
function setCountCallback(callback) {
  bumpCallback = callback;
}
function reportCount(sessionId, count) {
  const changed = counts.get(sessionId) !== count;
  counts.set(sessionId, count);
  currentSessionId = sessionId;
  if (changed && bumpCallback !== null) bumpCallback();
}
function badgeLabel() {
  const count = currentSessionId === null ? 0 : counts.get(currentSessionId) ?? 0;
  return count > 0 ? "Tickets (" + count + ")" : "Tickets";
}
var selections = /* @__PURE__ */ new Map();
function getSelection(sessionId) {
  return selections.get(sessionId) ?? null;
}
function setSelection(sessionId, key) {
  if (key === null) selections.delete(sessionId);
  else selections.set(sessionId, key);
}
var mergeCache = /* @__PURE__ */ new Map();
var mergePulledVersion = /* @__PURE__ */ new Map();
function getMerge(sessionId) {
  return mergeCache.get(sessionId) ?? null;
}
function setMerge(sessionId, merge) {
  mergeCache.set(sessionId, merge);
}
function getPulledVersion(sessionId) {
  return mergePulledVersion.get(sessionId) ?? null;
}
function setPulledVersion(sessionId, version) {
  mergePulledVersion.set(sessionId, version);
}
var pullsInFlight = /* @__PURE__ */ new Set();
function isMergePulling(sessionId) {
  return pullsInFlight.has(sessionId);
}
function setMergePulling(sessionId, pulling) {
  if (pulling) {
    pullsInFlight.add(sessionId);
  } else {
    pullsInFlight.delete(sessionId);
  }
}

// src/client/local-ticket-view.tsx
var import_react27 = __toESM(require("react"), 1);

// src/client/ticket-view.tsx
var import_react5 = __toESM(require("react"), 1);

// src/client/filter-panel.tsx
var import_react = __toESM(require("react"), 1);

// src/client/log.ts
function logDebug(message) {
  console.debug("aidos: " + message);
}
function logInfo(message) {
  console.info("aidos: " + message);
}
function logWarn(message) {
  console.warn("aidos: " + message);
}
function logError(message) {
  console.error("aidos: " + message);
}

// src/client/filter-panel.tsx
function statesEqual(a, b2) {
  if (a.sortKey !== b2.sortKey) return false;
  if (a.descending !== b2.descending) return false;
  if (a.search !== b2.search) return false;
  if (a.stateIds.length !== b2.stateIds.length) return false;
  for (let i = 0; i < a.stateIds.length; i += 1) {
    if (a.stateIds[i] !== b2.stateIds[i]) return false;
  }
  if (a.projectIds === null || b2.projectIds === null) {
    if (a.projectIds !== b2.projectIds) return false;
  } else {
    if (a.projectIds.length !== b2.projectIds.length) return false;
    for (let i = 0; i < a.projectIds.length; i += 1) {
      if (a.projectIds[i] !== b2.projectIds[i]) return false;
    }
  }
  return true;
}
var SORT_OPTIONS = [
  { key: "confidence", label: "Confidence" },
  { key: "gates", label: "Gates" },
  { key: "time", label: "Time updated" },
  { key: "alpha", label: "Alphabetical" }
];
function FilterPanel(props) {
  const sessionId = props.sessionId;
  const stagedRef = import_react.default.useRef(getStagedState(sessionId));
  const [staged, setStaged] = import_react.default.useState(stagedRef.current);
  const [searchInput, setSearchInput] = import_react.default.useState(stagedRef.current.search);
  const [focused, setFocused] = import_react.default.useState(false);
  const debounceRef = import_react.default.useRef(null);
  function updateStaged(next) {
    stagedRef.current = next;
    setStaged(next);
    setStagedState(sessionId, next);
  }
  function updateSearch(value) {
    setSearchInput(value);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(function() {
      updateStaged({ ...stagedRef.current, search: value });
    }, 150);
  }
  function clearSearch() {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    setSearchInput("");
    updateStaged({ ...stagedRef.current, search: "" });
  }
  import_react.default.useEffect(function() {
    logDebug("filter panel mounted");
  }, []);
  import_react.default.useEffect(function() {
    return function() {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, []);
  const dirty = !statesEqual(staged, props.applied);
  const suggestions = autocompleteTickets(props.tickets, searchInput);
  function toggleState(state) {
    const has = staged.stateIds.includes(state);
    const next = has ? staged.stateIds.filter((s) => s !== state) : [...staged.stateIds, state];
    updateStaged({ ...staged, stateIds: next });
  }
  function toggleProject(projectId) {
    const all = (props.projects ?? []).map((p) => p.id);
    const current = staged.projectIds === null ? all : staged.projectIds;
    const has = current.includes(projectId);
    const next = has ? current.filter((id) => id !== projectId) : [...current, projectId];
    const projectIds = next.length === all.length ? null : next;
    updateStaged({ ...staged, projectIds });
  }
  function apply2() {
    props.onApply(staged);
  }
  function reset() {
    setSearchInput("");
    updateStaged(cloneAppliedState(DEFAULT_APPLIED));
  }
  const projectRows = props.projects === void 0 ? null : /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Projects")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-check-list" }, props.projects.map((project) => {
    const checked = staged.projectIds === null || staged.projectIds.includes(project.id);
    return /* @__PURE__ */ import_react.default.createElement("label", { className: "aidos-check-row", key: project.id }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "checkbox",
        checked,
        onChange: () => {
          toggleProject(project.id);
        }
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", null, project.name));
  })));
  const stateRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "State")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-check-list" }, STATE_CHECKLIST_ORDER.map((state) => {
    const checked = staged.stateIds.includes(state);
    const count = props.tickets.filter((t) => t.state === state).length;
    return /* @__PURE__ */ import_react.default.createElement("label", { className: "aidos-check-row", key: state }, /* @__PURE__ */ import_react.default.createElement(
      "input",
      {
        type: "checkbox",
        checked,
        onChange: () => {
          toggleState(state);
        }
      }
    ), /* @__PURE__ */ import_react.default.createElement("span", null, stateLabel(state)), /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-check-count" }, String(count)));
  })));
  const sortRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Sort")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-sort-row" }, /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: staged.sortKey,
      onChange: (event) => {
        updateStaged({
          ...staged,
          sortKey: event.target.value
        });
      }
    },
    SORT_OPTIONS.map((option) => /* @__PURE__ */ import_react.default.createElement("option", { key: option.key, value: option.key }, option.label))
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      title: staged.descending ? "Sort ascending" : "Sort descending",
      "aria-label": staged.descending ? "Sort ascending" : "Sort descending",
      onClick: () => {
        updateStaged({ ...staged, descending: !staged.descending });
      }
    },
    staged.descending ? "\u2193" : "\u2191"
  )));
  const searchSection = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Search")), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-search-box" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      className: "aidos-search-input",
      type: "text",
      placeholder: "Title or id",
      value: searchInput,
      onChange: (event) => {
        updateSearch(event.target.value);
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        window.setTimeout(function() {
          setFocused(false);
        }, 120);
      }
    }
  ), focused && suggestions.length > 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-autocomplete" }, suggestions.map((ticket) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-suggestion",
      key: ticket.id,
      onMouseDown: (event) => {
        event.preventDefault();
        clearSearch();
        props.onJump(boardKeyOf(ticket));
      }
    },
    /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
    /* @__PURE__ */ import_react.default.createElement(
      "span",
      {
        className: "aidos-chip aidos-chip-id",
        style: { background: idColor(fullTicketId(ticket)) },
        title: fullTicketId(ticket)
      },
      ticketChipLabel(ticket)
    )
  ))) : null));
  const actionRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-actions-row" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
      onClick: apply2
    },
    "Apply"
  ), /* @__PURE__ */ import_react.default.createElement("button", { className: "aidos-btn", onClick: reset }, "Reset"));
  const stateChips = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-filter-chips" }, STATE_CHECKLIST_ORDER.map((state) => {
    const checked = staged.stateIds.includes(state);
    const count = props.tickets.filter((t) => t.state === state).length;
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        key: state,
        className: "aidos-filter-chip" + (checked ? " aidos-filter-chip-on" : ""),
        onClick: () => {
          toggleState(state);
        }
      },
      stateLabel(state),
      /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-check-count" }, String(count))
    );
  }));
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-filterbar" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-filterbar-left" }, stateChips, props.projects === void 0 ? null : props.projects.length === 0 ? null : /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      className: "aidos-filter-project",
      value: staged.projectIds === null ? "all" : staged.projectIds.join(","),
      onChange: (event) => {
        const value = event.target.value;
        if (value === "all") {
          updateStaged({ ...staged, projectIds: null });
          return;
        }
        updateStaged({
          ...staged,
          projectIds: value === "" ? [] : value.split(",").map(Number)
        });
      }
    },
    /* @__PURE__ */ import_react.default.createElement("option", { value: "all" }, "All projects"),
    props.projects.map((project) => /* @__PURE__ */ import_react.default.createElement("option", { key: project.id, value: String(project.id) }, project.name))
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-sort-row" }, /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: staged.sortKey,
      onChange: (event) => {
        updateStaged({
          ...staged,
          sortKey: event.target.value
        });
      }
    },
    SORT_OPTIONS.map((option) => /* @__PURE__ */ import_react.default.createElement("option", { key: option.key, value: option.key }, option.label))
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      title: staged.descending ? "Sort ascending" : "Sort descending",
      "aria-label": staged.descending ? "Sort ascending" : "Sort descending",
      onClick: () => {
        updateStaged({ ...staged, descending: !staged.descending });
      }
    },
    staged.descending ? "\u2193" : "\u2191"
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-search-box aidos-filterbar-search" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      className: "aidos-search-input",
      type: "text",
      placeholder: "Title or id",
      value: searchInput,
      onChange: (event) => {
        updateSearch(event.target.value);
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        window.setTimeout(function() {
          setFocused(false);
        }, 120);
      }
    }
  ), focused && suggestions.length > 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-autocomplete" }, suggestions.map((ticket) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-suggestion",
      key: ticket.id,
      onMouseDown: (event) => {
        event.preventDefault();
        clearSearch();
        props.onJump(boardKeyOf(ticket));
      }
    },
    /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
    /* @__PURE__ */ import_react.default.createElement(
      "span",
      {
        className: "aidos-chip aidos-chip-id",
        style: { background: idColor(fullTicketId(ticket)) },
        title: fullTicketId(ticket)
      },
      ticketChipLabel(ticket)
    )
  ))) : null), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
      onClick: apply2
    },
    "Apply"
  ), /* @__PURE__ */ import_react.default.createElement("button", { className: "aidos-btn", onClick: reset }, "Reset")));
}

// src/client/ticket-tile.tsx
var import_react4 = __toESM(require("react"), 1);

// src/client/evidence-tags.tsx
var import_react2 = __toESM(require("react"), 1);
function EvidenceTags({ evidence, state }) {
  const counts2 = tileKindCounts(state, evidenceKindCounts(evidence));
  if (counts2.length === 0) return null;
  const claimedStates = /* @__PURE__ */ new Map();
  for (const row of evidence) {
    if (row.kind === "builtin:imported_state" && typeof row.payload.claimed_state === "string") {
      claimedStates.set(row.kind, row.payload.claimed_state);
    }
  }
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, counts2.map((count) => {
    const claimed = claimedStates.get(count.kind);
    const value = claimed !== void 0 ? claimed : count.count > 1 ? String(count.count) : null;
    return /* @__PURE__ */ import_react2.default.createElement(
      "span",
      {
        key: count.kind,
        className: "aidos-chip aidos-chip-kind",
        style: { ["--chip-hue"]: count.color },
        title: kindDescription(count.kind)
      },
      /* @__PURE__ */ import_react2.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(count.kind)),
      value !== null ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "aidos-chip-count" }, value) : null
    );
  }));
}

// src/client/icons.tsx
var import_react3 = __toESM(require("react"), 1);
var ICON_STROKE = 1.6;
function iconProps() {
  return {
    width: 12,
    height: 12,
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: ICON_STROKE,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false
  };
}
function PencilIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8.5 1.5l2 2L4 10l-2.5.5L2 8z" }));
}
function TrashIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3" }));
}
function PopOutIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6.5 2H2v8h8V5.5" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M7 2h3v3" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M5 7l5-5" }));
}
function WarningIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 1.5l4.5 8h-9z" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 4.75v2.5" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 8.6v.4" }));
}
function KeyIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "4.2", cy: "4.2", r: "2.5" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 6l4.5 4.5" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8.6 8.6l-1 1" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M9.7 9.7l-1 1" }));
}
function ForkIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "3.4", cy: "2.6", r: "1.4" }), /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "3.4", cy: "9.4", r: "1.4" }), /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "8.6", cy: "2.6", r: "1.4" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M3.4 4v4" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8.6 4v1.4c0 1.2-.7 1.6-1.8 1.6H3.4" }));
}
function CompassIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "6", cy: "6", r: "4.6" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M8 4L5.2 5.2 4 8l2.8-1.2z" }));
}
function AlertCircleIcon() {
  return /* @__PURE__ */ import_react3.default.createElement("svg", { ...iconProps() }, /* @__PURE__ */ import_react3.default.createElement("circle", { cx: "6", cy: "6", r: "4.6" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 3.5v3" }), /* @__PURE__ */ import_react3.default.createElement("path", { d: "M6 8.3v.35" }));
}

// src/client/ticket-tile.tsx
function TicketTile(props) {
  const ticket = props.ticket;
  const className = "aidos-tile" + (props.selected ? " aidos-tile-selected" : "") + (props.active === true ? " aidos-tile-active" : "");
  const badge = badgeClass(ticket.state);
  return /* @__PURE__ */ import_react4.default.createElement("button", { className, onClick: props.onSelect }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-tile-meta" }, /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(fullTicketId(ticket)) },
      title: fullTicketId(ticket)
    },
    ticketChipLabel(ticket, props.ownWorkspaceKey)
  ), props.awaitingApproval === true ? /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-approval-flag",
      "aria-label": "This ticket has a request waiting for your approval",
      title: "This ticket has a request waiting for your approval"
    },
    /* @__PURE__ */ import_react4.default.createElement(AlertCircleIcon, null)
  ) : null, /* @__PURE__ */ import_react4.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react4.default.createElement("h3", { className: "aidos-tile-title" }, ticket.title), /* @__PURE__ */ import_react4.default.createElement("p", { className: "aidos-tile-preview" }, ticket.description), /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-tile-chips" }, /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-metric aidos-chip-gate",
      "aria-label": "Gate: " + formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) + " of the required evidence is attached",
      title: "Gate: " + formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) + " of the required evidence is attached"
    },
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-key" }, /* @__PURE__ */ import_react4.default.createElement(KeyIcon, null)),
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-value" }, formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)))
  ), /* @__PURE__ */ import_react4.default.createElement(EvidenceTags, { evidence: props.evidence, state: ticket.state }), ticket.dependsOn?.map((ref) => /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      key: ref,
      className: "aidos-chip aidos-chip-dep",
      "aria-label": "Depends on " + ref,
      title: "Depends on " + ref
    },
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-dep-icon" }, /* @__PURE__ */ import_react4.default.createElement(ForkIcon, null)),
    displayDep(ref, props.ownWorkspaceKey)
  )), /* @__PURE__ */ import_react4.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-metric aidos-chip-conf",
      "aria-label": "Confidence " + ringPercent(ticket.confidenceScore) + "%. Advisory only \u2014 it never unlocks anything.",
      title: "Confidence " + ringPercent(ticket.confidenceScore) + "%. Advisory only \u2014 it never unlocks anything."
    },
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-key" }, /* @__PURE__ */ import_react4.default.createElement(CompassIcon, null)),
    /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-chip-value" }, ringPercent(ticket.confidenceScore) + "%")
  )));
}

// src/client/ticket-view.tsx
function TicketView(props) {
  const [collapsed, setCollapsed] = import_react5.default.useState(false);
  const tiles = props.tickets.map((ticket) => /* @__PURE__ */ import_react5.default.createElement(
    TicketTile,
    {
      key: boardKeyOf(ticket),
      ticket,
      evidence: props.evidenceByTicket?.[boardKeyOf(ticket)] ?? [],
      ownWorkspaceKey: props.ownWorkspaceKey,
      awaitingApproval: props.awaitingApprovalKeys?.has(boardKeyOf(ticket)) === true,
      selected: boardKeyOf(ticket) === props.selectedId,
      active: boardKeyOf(ticket) === props.activeTicketId,
      onSelect: () => {
        props.onSelect(boardKeyOf(ticket));
      }
    }
  ));
  let content;
  if (props.allTicketsCount === 0) {
    content = /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-empty" }, /* @__PURE__ */ import_react5.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets yet"), /* @__PURE__ */ import_react5.default.createElement("p", { className: "aidos-empty-note" }, "This session holds no tickets. Create the first one to start the board."), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create a ticket"));
  } else if (props.tickets.length === 0) {
    content = /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-empty" }, /* @__PURE__ */ import_react5.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets match"), /* @__PURE__ */ import_react5.default.createElement("p", { className: "aidos-empty-note" }, "The active filters hide every ticket. Clear them to see the board."), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn", onClick: props.onClearFilters }, "Clear filters"));
  } else {
    content = /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-board-grid" }, tiles);
  }
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-root" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-toolbar" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-empty-note" }, props.tickets.length + " of " + props.allTicketsCount + " tickets"), /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-toolbar-actions" }, props.onQueue !== void 0 ? /* @__PURE__ */ import_react5.default.createElement(
    "button",
    {
      className: "aidos-btn",
      onClick: props.onQueue,
      title: "What is waiting on you"
    },
    "Waiting on you",
    props.queueCount !== void 0 && props.queueCount > 0 ? /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-queue-badge" }, props.queueCount) : null
  ) : null, /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn", onClick: props.onPlan }, "Plan"), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create"))), /* @__PURE__ */ import_react5.default.createElement(
    FilterPanel,
    {
      sessionId: props.sessionId,
      projects: props.projects,
      applied: props.applied,
      tickets: props.tickets,
      onApply: props.onApply,
      onJump: props.onJump,
      collapsed,
      onToggleCollapsed: () => {
        setCollapsed(!collapsed);
      }
    }
  ), /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-grid-wrap" }, content));
}

// src/client/detail-panel.tsx
var import_react21 = __toESM(require("react"), 1);

// src/client/allowlist-editor.tsx
var import_react6 = __toESM(require("react"), 1);

// src/client/remote.ts
var AidosRemoteError = class extends Error {
  code;
  /** The refusal text, ready for the toast. */
  message;
  /** Extra refusal fields, for example missingKinds or allowedActors. */
  extra;
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "AidosRemoteError";
    this.code = code;
    this.message = message;
    this.extra = extra;
  }
};
function makeRpcId() {
  return crypto.randomUUID();
}
function errorText(body) {
  if (body === void 0) return "";
  if (typeof body.message === "string") return body.message;
  return "";
}
function errorExtra(body) {
  if (body === void 0) return {};
  if (typeof body.details !== "object" || body.details === null) return {};
  return body.details;
}
function summarizeValue(value) {
  if (value === null) return "null";
  if (typeof value === "string") {
    return value.length > 60 ? value.slice(0, 57) + "..." : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return "[" + value.length + " items]";
  if (typeof value === "object") {
    const keys = Object.keys(value);
    const shown = keys.slice(0, 4);
    return "{" + shown.join(",") + (keys.length > 4 ? ",..." : "") + "}";
  }
  return String(value);
}
function summarizeArgs(args) {
  const parts = Object.keys(args).map(function(key) {
    return key + "=" + summarizeValue(args[key]);
  });
  return parts.length === 0 ? "{}" : parts.join(" ");
}
function transportFailure(message) {
  logError("remote failed: " + message);
  return new AidosRemoteError("transport_error", message);
}
async function callAidosRemote(method, args, agentId) {
  logDebug("remote " + method + " args: " + summarizeArgs(args));
  const envelope = {
    type: "client-request",
    rpcId: makeRpcId(),
    method: `aidos/${method}`,
    payload: {
      args: {
        agentId,
        args
      }
    }
  };
  const timeoutMs = 15e3;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : void 0;
  const timeout = controller ? setTimeout(() => controller.abort(new Error("Remote call timed out after " + timeoutMs + "ms")), timeoutMs) : void 0;
  let response;
  try {
    response = await fetch(`/api/${envelope.method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope),
      signal: controller?.signal
    });
    if (timeout !== void 0) clearTimeout(timeout);
  } catch (error) {
    if (timeout !== void 0) clearTimeout(timeout);
    throw transportFailure(
      `The request to the aidos Remote failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok) {
    throw transportFailure(`The aidos Remote answered with HTTP ${response.status}.`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw transportFailure("The aidos Remote answered with a body that is not JSON.");
  }
  if (body.type !== "server-response") {
    throw transportFailure("The aidos Remote answered with an unexpected response shape.");
  }
  const result = body.result;
  if (result === void 0) {
    throw transportFailure("The aidos Remote answered without a result.");
  }
  if (result.ok === true) {
    const value = result.value;
    logInfo("remote " + method + " ok");
    if (value === void 0) return null;
    logDebug("remote " + method + " result: " + summarizeValue(value));
    return value;
  }
  if (result.ok === false) {
    const errorBody = result.error;
    const code = typeof errorBody?.code === "string" ? errorBody.code : "refused";
    const message = errorText(errorBody) || `The aidos Remote refused the request (${code}).`;
    logWarn("remote " + method + " refused " + code + ": " + message);
    throw new AidosRemoteError(code, message, errorExtra(errorBody));
  }
  throw transportFailure("The aidos Remote answered with an unrecognized result.");
}

// src/client/toast-store.ts
var TOAST_DURATION_MS = 6e3;
function makeToastId() {
  return crypto.randomUUID();
}
var toasts = [];
var listeners = /* @__PURE__ */ new Set();
var timers = /* @__PURE__ */ new Map();
function emit() {
  const snapshot = toasts.slice();
  for (const listener of listeners) {
    listener(snapshot);
  }
}
function removeToast(id) {
  const timer = timers.get(id);
  if (timer !== void 0) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}
function showToast(text, kind = "info") {
  if (kind === "refusal") logWarn("toast refusal: " + text);
  else logDebug("toast: " + text);
  const id = makeToastId();
  const toast = {
    id,
    text,
    kind,
    expiresAt: Date.now() + TOAST_DURATION_MS
  };
  toasts = toasts.concat(toast);
  emit();
  const timer = window.setTimeout(function() {
    removeToast(id);
  }, TOAST_DURATION_MS);
  timers.set(id, timer);
  return id;
}
function dismissToast(id) {
  removeToast(id);
}
function subscribeToasts(listener) {
  listeners.add(listener);
  return function() {
    listeners.delete(listener);
  };
}

// src/client/allowlist-editor.tsx
function parseAllowlistText(text) {
  const seen = /* @__PURE__ */ new Set();
  for (const line of text.split("\n")) {
    const path = line.trim();
    if (path !== "" && !seen.has(path)) {
      seen.add(path);
    }
  }
  return [...seen];
}
function otherAllowlistUnion(rows, selfKey) {
  const union = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    if (boardKeyOf(row) === selfKey || row.state !== "in_progress") continue;
    for (const path of row.allowlist ?? []) {
      if (!seen.has(path)) {
        seen.add(path);
        union.push(path);
      }
    }
  }
  return union;
}
function AllowlistEditor(props) {
  const [text, setText] = import_react6.default.useState(
    props.currentAllowlist.join("\n")
  );
  const [others, setOthers] = import_react6.default.useState([]);
  const [saving, setSaving] = import_react6.default.useState(false);
  import_react6.default.useEffect(function() {
    if (!props.open) return;
    let cancelled = false;
    void (async function() {
      try {
        const rows = await callAidosRemote("workspaceTickets", {}, props.agentId);
        const list = Array.isArray(rows) ? rows : rows?.tickets ?? [];
        const union = otherAllowlistUnion(list, props.ticketIdKey);
        if (!cancelled) setOthers(union);
      } catch {
      }
    })();
    return function() {
      cancelled = true;
    };
  }, [props.open, props.agentId, props.ticketId]);
  if (!props.open) return null;
  async function save() {
    if (saving) return;
    const paths = parseAllowlistText(text);
    setSaving(true);
    try {
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketIdKey, kind: "builtin:file_allowlist", payload: { paths } },
        props.agentId
      );
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, allowlist: paths },
        props.agentId
      );
      showToast("Allowlist saved", "success");
      props.onClose();
      props.onSaved();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ import_react6.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react6.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react6.default.createElement("h3", { className: "aidos-modal-title" }, "File allowlist"), /* @__PURE__ */ import_react6.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!saving) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react6.default.createElement("label", null, "One path per line. A write outside this list refuses while the ticket is in progress."), /* @__PURE__ */ import_react6.default.createElement(
        "textarea",
        {
          className: "aidos-allowlist-input",
          value: text,
          disabled: saving,
          rows: 8,
          onChange: (event) => {
            setText(event.target.value);
          }
        }
      )), others.length > 0 ? /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-modal-row aidos-allowlist-preview" }, /* @__PURE__ */ import_react6.default.createElement("label", null, "Also allowed by other in-progress tickets"), /* @__PURE__ */ import_react6.default.createElement("ul", null, others.map((path) => /* @__PURE__ */ import_react6.default.createElement("li", { key: path }, path)))) : null, /* @__PURE__ */ import_react6.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: saving,
          onClick: () => {
            void save();
          }
        },
        saving ? "Saving\u2026" : "Save"
      ))
    )
  );
}

// src/client/evidence-viewer.tsx
var import_react9 = __toESM(require("react"), 1);

// src/client/ui.tsx
var import_react7 = __toESM(require("react"), 1);
function FieldRow(props) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-field-row" }, /* @__PURE__ */ import_react7.default.createElement("span", { className: "aidos-field-row-label" }, props.label), /* @__PURE__ */ import_react7.default.createElement("span", { className: "aidos-field-row-value" }, props.children));
}
function Collapse(props) {
  const [open, setOpen] = import_react7.default.useState(props.defaultOpen === true);
  return /* @__PURE__ */ import_react7.default.createElement(
    "details",
    {
      className: "aidos-collapse",
      open,
      onToggle: (event) => {
        setOpen(event.currentTarget.open);
      }
    },
    /* @__PURE__ */ import_react7.default.createElement("summary", null, props.summary),
    /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-collapse-body" }, props.children)
  );
}
function ModalShell(props) {
  const working = props.working === true;
  import_react7.default.useEffect(function() {
    const onKey = (event) => {
      if (event.key === "Escape" && !working) {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return function() {
      window.removeEventListener("keydown", onKey);
    };
  }, [props, working]);
  return /* @__PURE__ */ import_react7.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!working) props.onClose();
      }
    },
    /* @__PURE__ */ import_react7.default.createElement(
      "div",
      {
        className: "aidos-modal" + (props.wide === true ? " aidos-modal-wide" : ""),
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react7.default.createElement("h3", { className: "aidos-modal-title" }, props.title), /* @__PURE__ */ import_react7.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: props.onClose,
          disabled: working,
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-form" }, props.children, props.onConfirm !== void 0 ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react7.default.createElement("button", { className: "aidos-btn", onClick: props.onClose, disabled: working }, "Cancel"), /* @__PURE__ */ import_react7.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          onClick: props.onConfirm,
          disabled: working
        },
        working ? "Working\u2026" : props.confirmLabel ?? "Confirm"
      )) : null)
    )
  );
}
function NoteField(props) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react7.default.createElement("label", null, props.label), /* @__PURE__ */ import_react7.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note",
      value: props.value,
      disabled: props.working,
      placeholder: props.placeholder,
      onChange: (event) => {
        props.onChange(event.target.value);
      }
    }
  ));
}
function LinesField(props) {
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react7.default.createElement("label", null, props.label), /* @__PURE__ */ import_react7.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note aidos-allowlist-input",
      value: props.value,
      disabled: props.working,
      placeholder: props.placeholder,
      onChange: (event) => {
        props.onChange(event.target.value);
      }
    }
  ));
}
function linesOf(text) {
  return text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
}

// src/client/evidence-payload-view.tsx
var import_react8 = __toESM(require("react"), 1);
function NoteText(props) {
  return /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-note-text" }, props.text);
}
function RawJsonDisclosure(props) {
  const [open, setOpen] = import_react8.default.useState(false);
  return /* @__PURE__ */ import_react8.default.createElement(
    "details",
    {
      className: "aidos-evidence-raw-json",
      open,
      onToggle: (event) => {
        setOpen(event.currentTarget.open);
      }
    },
    /* @__PURE__ */ import_react8.default.createElement("summary", null, "raw payload"),
    /* @__PURE__ */ import_react8.default.createElement("pre", { className: "aidos-evidence-payload-json" }, JSON.stringify(props.payload, null, 2))
  );
}
function isImage(path) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
}
function EvidencePayloadView(props) {
  const { kind } = props.row;
  const payload = props.row.payload ?? {};
  const note = typeof payload.note === "string" ? payload.note : null;
  const rest = { ...payload };
  delete rest.note;
  if (kind === "builtin:file_allowlist" && Array.isArray(payload.paths)) {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Paths" }, /* @__PURE__ */ import_react8.default.createElement("ul", { className: "aidos-evidence-payload-list" }, payload.paths.map((path) => /* @__PURE__ */ import_react8.default.createElement("li", { key: path }, path)))), note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  if (kind === "builtin:imported_state" && typeof payload.claimed_state === "string") {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Claimed state" }, /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-note-text" }, payload.claimed_state)), typeof payload.source === "string" ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Source" }, payload.source) : null, note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  if (typeof payload.imagePath === "string") {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Screenshot" }, /* @__PURE__ */ import_react8.default.createElement("img", { className: "aidos-evidence-image", src: payload.imagePath, alt: note ?? "evidence screenshot" }), /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-image-path" }, payload.imagePath)), note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  if (typeof payload.commit === "string") {
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Commit" }, /* @__PURE__ */ import_react8.default.createElement("code", null, String(payload.commit).slice(0, 12)), typeof payload.subject === "string" ? /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: " " + payload.subject }) : null), typeof payload.author === "string" ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Committed by" }, payload.author) : null, typeof payload.branch === "string" ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Branch" }, payload.branch) : null, note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
  }
  const textFields = Object.entries(rest).filter(
    (entry) => typeof entry[1] === "string" && entry[1].trim() !== ""
  );
  const otherFields = Object.entries(rest).filter((entry) => typeof entry[1] !== "string");
  return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-evidence-fields" }, textFields.map(([key, value]) => /* @__PURE__ */ import_react8.default.createElement(FieldRow, { key, label: key }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: value }))), otherFields.map(([key, value]) => /* @__PURE__ */ import_react8.default.createElement(FieldRow, { key, label: key }, /* @__PURE__ */ import_react8.default.createElement("code", null, isImage(String(value)) ? String(value) : JSON.stringify(value)))), note !== null ? /* @__PURE__ */ import_react8.default.createElement(FieldRow, { label: "Note" }, /* @__PURE__ */ import_react8.default.createElement(NoteText, { text: note })) : null, /* @__PURE__ */ import_react8.default.createElement(RawJsonDisclosure, { payload }));
}

// src/client/evidence-viewer.tsx
function EvidenceViewer(props) {
  const row = props.row;
  import_react9.default.useEffect(function() {
    if (row === null) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return function() {
      window.removeEventListener("keydown", onKey);
    };
  }, [row, props]);
  if (row === null) return null;
  return /* @__PURE__ */ import_react9.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: props.onClose
    },
    /* @__PURE__ */ import_react9.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react9.default.createElement("h3", { className: "aidos-modal-title" }, /* @__PURE__ */ import_react9.default.createElement(
        "span",
        {
          className: "aidos-chip aidos-chip-kind",
          style: { background: kindColor(row.kind) }
        },
        /* @__PURE__ */ import_react9.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(row.kind))
      ), " " + row.kind), /* @__PURE__ */ import_react9.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: props.onClose,
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-evidence-fields" }, /* @__PURE__ */ import_react9.default.createElement(FieldRow, { label: "Author" }, row.author), /* @__PURE__ */ import_react9.default.createElement(FieldRow, { label: "At" }, typeof row.at === "number" ? new Date(row.at * 1e3).toISOString() : "unknown")), /* @__PURE__ */ import_react9.default.createElement(EvidencePayloadView, { row }))
    )
  );
}

// src/client/criterion-linker.tsx
var import_react11 = __toESM(require("react"), 1);

// src/client/evidence-strip.tsx
var import_react10 = __toESM(require("react"), 1);
function evidenceExcerpt(row) {
  const payload = row.payload ?? {};
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    return payload.note.trim();
  }
  if (Array.isArray(payload.paths)) {
    const paths = payload.paths.filter((p) => typeof p === "string");
    if (paths.length > 0) return paths.length + " path(s)";
  }
  if (typeof payload.claimed_state === "string") return "claimed " + payload.claimed_state;
  if (typeof payload.commit === "string") return "commit " + payload.commit.slice(0, 12);
  if (typeof payload.imagePath === "string") return "screenshot";
  if (typeof payload.report === "string") return payload.report.slice(0, 60);
  return null;
}
function timeAgo(at2) {
  if (typeof at2 !== "number") return null;
  const seconds = Math.max(0, Math.floor(Date.now() / 1e3 - at2));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}
function EvidenceStrip(props) {
  const row = props.row;
  const excerpt = evidenceExcerpt(row);
  const when = timeAgo(row.at);
  return /* @__PURE__ */ import_react10.default.createElement("li", { className: "aidos-evidence-strip" }, /* @__PURE__ */ import_react10.default.createElement("div", { className: "aidos-evidence-strip-main" }, /* @__PURE__ */ import_react10.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-kind",
      style: { background: kindColor(row.kind) },
      title: kindDescription(row.kind)
    },
    /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(row.kind))
  ), /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-body" }, excerpt !== null ? /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-excerpt" }, excerpt) : /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-kind-name" }, row.kind), /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-meta" }, row.author, when !== null ? " \xB7 " + when : "", props.criterionLabel !== void 0 ? " \xB7 criterion: " + props.criterionLabel : null)), /* @__PURE__ */ import_react10.default.createElement("span", { className: "aidos-evidence-strip-actions" }, props.onView !== void 0 ? /* @__PURE__ */ import_react10.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "View evidence",
      "aria-label": "View evidence",
      onClick: (event) => {
        event.stopPropagation();
        props.onView?.(row);
      }
    },
    /* @__PURE__ */ import_react10.default.createElement(PopOutIcon, null)
  ) : null, props.onUnlink !== void 0 ? /* @__PURE__ */ import_react10.default.createElement(
    "button",
    {
      className: "aidos-evidence-unlink",
      title: "Unlink from criterion",
      "aria-label": "Unlink from criterion",
      disabled: props.deleting === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onUnlink?.();
      }
    },
    "\u2A02"
  ) : null, props.onDelete !== void 0 ? /* @__PURE__ */ import_react10.default.createElement(
    "button",
    {
      className: "aidos-evidence-delete",
      title: "Delete this evidence row",
      "aria-label": "Delete this evidence row",
      disabled: props.deleting === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onDelete?.(row);
      }
    },
    "\u2715"
  ) : null)));
}

// src/client/criterion-linker.tsx
function criterionOf(row) {
  const raw = (row.payload ?? {}).criteria;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}
function rowsForCriterion(evidence, label) {
  return evidence.filter((row) => criterionOf(row) === label);
}
function unlinkedRows(evidence) {
  return evidence.filter((row) => criterionOf(row) === null);
}
function showError(error) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}
function CriterionLinker(props) {
  const [busyAt, setBusyAt] = import_react11.default.useState(null);
  const [draft, setDraft] = import_react11.default.useState({});
  const candidates = unlinkedRows(props.evidence);
  async function resolve(row, criterion) {
    if (busyAt !== null) return;
    setBusyAt(row.at ?? 0);
    try {
      await callAidosRemote(
        "userLinkEvidence",
        { ticketId: props.ticketIdKey, at: row.at, rowKind: row.kind, criterion },
        props.agentId
      );
      showToast(
        criterion === null ? "Evidence unlinked" : "Evidence linked to criterion",
        "success"
      );
      props.onChanged();
    } catch (error) {
      showError(error);
    } finally {
      setBusyAt(null);
    }
  }
  return /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-blocks" }, props.criteria.map((label) => {
    const linked = rowsForCriterion(props.evidence, label);
    const options = candidates.filter((row) => !linked.includes(row));
    const value = draft[label] ?? "";
    return /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-block", key: label }, /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-label" }, label), linked.length > 0 ? /* @__PURE__ */ import_react11.default.createElement("ul", { className: "aidos-criterion-evidence" }, linked.map((row) => /* @__PURE__ */ import_react11.default.createElement(
      EvidenceStrip,
      {
        key: String(row.at) + ":" + row.kind,
        row,
        deleting: busyAt === row.at,
        onUnlink: props.readOnly ? void 0 : () => void resolve(row, null)
      }
    ))) : /* @__PURE__ */ import_react11.default.createElement("p", { className: "aidos-detail-note" }, "No evidence linked."), !props.readOnly && options.length > 0 ? /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-criterion-linker" }, /* @__PURE__ */ import_react11.default.createElement(
      "select",
      {
        value,
        onChange: (event) => {
          setDraft({ ...draft, [label]: event.target.value });
        },
        "aria-label": "Evidence to link to criterion " + label
      },
      /* @__PURE__ */ import_react11.default.createElement("option", { value: "" }, "Link an evidence row\u2026"),
      options.map((row) => /* @__PURE__ */ import_react11.default.createElement("option", { key: String(row.at) + ":" + row.kind, value: String(row.at) + ":" + row.kind }, evidenceOptionLabel(row)))
    ), /* @__PURE__ */ import_react11.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: value === "" || busyAt !== null,
        onClick: () => {
          const row = options.find(
            (candidate) => String(candidate.at) + ":" + candidate.kind === value
          );
          if (row) void resolve(row, label);
        }
      },
      "Add"
    )) : null);
  }));
}
function evidenceOptionLabel(row) {
  const excerpt = evidenceExcerptForOption(row);
  const kind = row.kind.replace(/^builtin:/, "");
  return excerpt !== null ? kind + " \u2014 " + excerpt : kind;
}
function evidenceExcerptForOption(row) {
  const payload = row.payload ?? {};
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    const note = payload.note.trim();
    return note.length > 48 ? note.slice(0, 48) + "\u2026" : note;
  }
  if (Array.isArray(payload.paths) && payload.paths.length > 0) {
    return payload.paths.length + " path(s)";
  }
  if (typeof payload.claimed_state === "string") return payload.claimed_state;
  if (typeof payload.commit === "string") return payload.commit.slice(0, 12);
  if (typeof payload.imagePath === "string") return "screenshot";
  return null;
}

// node_modules/.pnpm/marked@18.0.11/node_modules/marked/lib/marked.esm.js
function A() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var R = A();
function j(l3) {
  R = l3;
}
var z = { exec: () => null };
function I(l3) {
  let e = [];
  return (t) => {
    let n = Math.max(0, Math.min(3, t - 1)), s = e[n];
    return s || (s = l3(n), e[n] = s), s;
  };
}
function k(l3, e = "") {
  let t = typeof l3 == "string" ? l3 : l3.source, n = { replace: (s, r) => {
    let i = typeof r == "string" ? r : r.source;
    return i = i.replace(m.caret, "$1"), t = t.replace(s, i), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var Oe = ((l3 = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + l3);
  } catch {
    return false;
  }
})();
var m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l3) => new RegExp(`^( {0,3}${l3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: I((l3) => new RegExp(`^ {0,${l3}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: I((l3) => new RegExp(`^ {0,${l3}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)), fencesBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}(?:\`\`\`|~~~)`)), headingBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}#`)), htmlBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}<(?:[a-z].*>|!--)`, "i")), blockquoteBeginRegex: I((l3) => new RegExp(`^ {0,${l3}}>`)) };
var Te = /^(?:[ \t]*(?:\n|$))+/;
var we = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var ye = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var q = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Pe = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var U = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
var oe = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var ae = k(oe).replace(/bull/g, U).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Se = k(oe).replace(/bull/g, U).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var K = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
var _e = /^[^\n]+/;
var W = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var $e = k(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", W).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Le = k(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, U).getRegex();
var Q = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var X = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var Ee = k("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", X).replace("tag", Q).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var le = (l3) => k(K).replace("hr", q).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", l3).replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q).getRegex();
var ze = le(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
var Me = le(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
var Ae = k(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", Me).getRegex();
var J = { blockquote: Ae, code: we, def: $e, fences: ye, heading: Pe, hr: q, html: Ee, lheading: ae, list: Le, newline: Te, paragraph: ze, table: z, text: _e };
var se = k("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", q).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q).getRegex();
var Ie = { ...J, lheading: Se, table: se, paragraph: k(K).replace("hr", q).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", se).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Q).getRegex() };
var Ce = { ...J, html: k(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", X).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: z, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k(K).replace("hr", q).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", ae).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Be = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var De = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var ue = /^( {2,}|\\)\n(?!\s*$)/;
var qe = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var _ = /[\p{P}\p{S}]/u;
var C = /[\s\p{P}\p{S}]/u;
var v = /[^\s\p{P}\p{S}]/u;
var ve = k(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, C).getRegex();
var He = /[\p{Pi}\p{Ps}"']/u;
var pe = /(?!~)[\p{P}\p{S}]/u;
var Ze = /(?!~)[\s\p{P}\p{S}]/u;
var Ge = /(?:[^\s\p{P}\p{S}]|~)/u;
var Qe = k(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Oe ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var ce = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
var Ne = k(ce, "u").replace(/punct/g, _).getRegex();
var je = k(ce, "u").replace(/punct/g, pe).getRegex();
var Fe = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
var Ue = k(Fe, "u").replace(/openQuote/g, He).replace(/punct/g, _).getRegex();
var he = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var Ke = k(he, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var We = k(he, "gu").replace(/notPunctSpace/g, Ge).replace(/punctSpace/g, Ze).replace(/punct/g, pe).getRegex();
var Xe = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
var Je = k(Xe, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var Ve = k("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var Ye = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
var et = k(Ye, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var tt = k(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, _).getRegex();
var nt = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
var rt = k(nt, "gu").replace(/notPunctSpace/g, v).replace(/punctSpace/g, C).replace(/punct/g, _).getRegex();
var st = k(/\\(punct)/, "gu").replace(/punct/g, _).getRegex();
var it = k(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var ot = k(X).replace("(?:-->|$)", "-->").getRegex();
var at = k("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ot).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var G = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/;
var lt = k(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", G).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var ke = k(/^!?\[(label)\]\[(ref)\]/).replace("label", G).replace("ref", W).getRegex();
var de = k(/^!?\[(ref)\](?:\[\])?/).replace("ref", W).getRegex();
var ut = k("reflink|nolink(?!\\()", "g").replace("reflink", ke).replace("nolink", de).getRegex();
var ie = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var V = { _backpedal: z, anyPunctuation: st, autolink: it, blockSkip: Qe, br: ue, code: De, del: z, delLDelim: z, delRDelim: z, emStrongLDelim: Ne, emStrongRDelimAst: Ke, emStrongRDelimUnd: Ve, escape: Be, link: lt, nolink: de, punctuation: ve, reflink: ke, reflinkSearch: ut, tag: at, text: qe, url: z };
var pt = { ...V, emStrongLDelim: Ue, emStrongRDelimAst: Je, emStrongRDelimUnd: et, link: k(/^!?\[(label)\]\((.*?)\)/).replace("label", G).getRegex(), reflink: k(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", G).getRegex() };
var F = { ...V, emStrongRDelimAst: We, emStrongLDelim: je, delLDelim: tt, delRDelim: rt, url: k(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ie).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k(/^(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ie).getRegex() };
var ct = { ...F, br: k(ue).replace("{2,}", "*").getRegex(), text: k(F.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var H = { normal: J, gfm: Ie, pedantic: Ce };
var B = { normal: V, gfm: F, breaks: ct, pedantic: pt };
var ht = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var ge = (l3) => ht[l3];
function T(l3, e) {
  if (e) {
    if (m.escapeTest.test(l3)) return l3.replace(m.escapeReplace, ge);
  } else if (m.escapeTestNoEncode.test(l3)) return l3.replace(m.escapeReplaceNoEncode, ge);
  return l3;
}
function Y(l3) {
  try {
    l3 = encodeURI(l3).replace(m.percentDecode, "%");
  } catch {
    return null;
  }
  return l3;
}
function ee(l3, e) {
  let t = l3.replace(m.findPipe, (r, i, o) => {
    let u = false, a = i;
    for (; --a >= 0 && o[a] === "\\"; ) u = !u;
    return u ? "|" : " |";
  }), n = t.split(m.splitPipe), s = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
  else for (; n.length < e; ) n.push("");
  for (; s < n.length; s++) n[s] = n[s].trim().replace(m.slashPipe, "|");
  return n;
}
function $(l3, e, t) {
  let n = l3.length;
  if (n === 0) return "";
  let s = 0;
  for (; s < n; ) {
    let r = l3.charAt(n - s - 1);
    if (r === e && !t) s++;
    else if (r !== e && t) s++;
    else break;
  }
  return l3.slice(0, n - s);
}
function te(l3) {
  let e = l3.split(`
`), t = e.length - 1;
  for (; t >= 0 && m.blankLine.test(e[t]); ) t--;
  return e.length - t <= 2 ? l3 : e.slice(0, t + 1).join(`
`);
}
function fe(l3, e) {
  if (l3.indexOf(e[1]) === -1) return -1;
  let t = 0;
  for (let n = 0; n < l3.length; n++) if (l3[n] === "\\") n++;
  else if (l3[n] === e[0]) t++;
  else if (l3[n] === e[1] && (t--, t < 0)) return n;
  return t > 0 ? -2 : -1;
}
function me(l3, e = 0) {
  let t = e, n = "";
  for (let s of l3) if (s === "	") {
    let r = 4 - t % 4;
    n += " ".repeat(r), t += r;
  } else n += s, t++;
  return n;
}
function xe(l3, e, t, n, s) {
  let r = e.href, i = e.title || null, o = l3[1].replace(s.other.outputLinkReplace, "$1"), u = l3[0].charAt(0) === "!";
  n.state.inLink = true;
  let a = n.state.linkEmitted, p = n.state.inRawBlock;
  n.state.linkEmitted = false;
  let c = n.inlineTokens(o), h = n.state.linkEmitted;
  if (n.state.linkEmitted = a, n.state.inLink = false, !u) {
    if (h) {
      n.state.inRawBlock = p;
      return;
    }
    n.state.linkEmitted = true;
  }
  return { type: u ? "image" : "link", raw: t, href: r, title: i, text: o, tokens: c };
}
function kt(l3, e, t) {
  let n = l3.match(t.other.indentCodeCompensation);
  if (n === null) return e;
  let s = n[1];
  return e.split(`
`).map((r) => {
    let i = r.match(t.other.beginningSpace);
    if (i === null) return r;
    let [o] = i;
    return o.length >= s.length ? r.slice(s.length) : r;
  }).join(`
`);
}
var y = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || R;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = this.options.pedantic ? t[0] : te(t[0]), s = n.replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: n, codeBlockStyle: "indented", text: s };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], s = kt(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: s };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let s = $(n, "#");
        (this.options.pedantic || !s || this.rules.other.endingSpaceChar.test(s)) && (n = s.trim());
      }
      return { type: "heading", raw: $(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t) return { type: "hr", raw: $(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = $(t[0], `
`).split(`
`), s = "", r = "", i = [];
      for (; n.length > 0; ) {
        let o = false, u = [], a;
        for (a = 0; a < n.length; a++) if (this.rules.other.blockquoteStart.test(n[a])) u.push(n[a]), o = true;
        else if (!o) u.push(n[a]);
        else break;
        n = n.slice(a);
        let p = u.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${p}` : p, r = r ? `${r}
${c}` : c;
        let h = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, i, true), this.lexer.state.top = h, n.length === 0) break;
        let d = i.at(-1);
        if (d?.type === "code") break;
        if (d?.type === "blockquote") {
          let O = d, g = n.join(`
`), w = O.raw + `
` + g.replace(this.rules.other.blockquoteSetextReplace2, ""), E = this.blockquote(w);
          i[i.length - 1] = E, s = `${s}
${g}`, r = r.substring(0, r.length - O.text.length) + E.text;
          break;
        } else if (d?.type === "list") {
          let O = d, g = O.raw + `
` + n.join(`
`), w = this.list(g);
          i[i.length - 1] = w, s = s.substring(0, s.length - d.raw.length) + w.raw, r = r.substring(0, r.length - O.raw.length) + w.raw, n = g.substring(i.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: i, text: r };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), s = n.length > 1, r = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
      let i = this.rules.other.listItemRegex(n), o = false;
      for (; e; ) {
        let a = false, p = "", c = "";
        if (!(t = i.exec(e)) || this.rules.block.hr.test(e)) break;
        p = t[0], e = e.substring(p.length);
        let h = me(t[2].split(`
`, 1)[0], t[1].length), d = e.split(`
`, 1)[0], O = !h.trim(), g = 0;
        if (this.options.pedantic ? (g = 2, c = h.trimStart()) : O ? g = t[1].length + 1 : (g = h.search(this.rules.other.nonSpaceChar), g = g > 4 ? 1 : g, c = h.slice(g), g += t[1].length), O && this.rules.other.blankLine.test(d) && (p += d + `
`, e = e.substring(d.length + 1), a = true), !a) {
          let w = this.rules.other.nextBulletRegex(g), E = this.rules.other.hrRegex(g), ne = this.rules.other.fencesBeginRegex(g), re = this.rules.other.headingBeginRegex(g), be = this.rules.other.htmlBeginRegex(g), Re = this.rules.other.blockquoteBeginRegex(g);
          for (; e; ) {
            let N = e.split(`
`, 1)[0], D;
            if (d = N, this.options.pedantic ? (d = d.replace(this.rules.other.listReplaceNesting, "  "), D = d) : D = d.replace(this.rules.other.tabCharGlobal, "    "), ne.test(d) || re.test(d) || be.test(d) || Re.test(d) || w.test(d) || E.test(d)) break;
            if (D.search(this.rules.other.nonSpaceChar) >= g || !d.trim()) c += `
` + D.slice(g);
            else {
              if (O || h.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || ne.test(h) || re.test(h) || E.test(h)) break;
              c += `
` + d;
            }
            O = !d.trim(), p += N + `
`, e = e.substring(N.length + 1), h = D.slice(g);
          }
        }
        r.loose || (o ? r.loose = true : this.rules.other.doubleBlankLine.test(p) && (o = true)), r.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), r.raw += p;
      }
      let u = r.items.at(-1);
      if (u) u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
      else return;
      r.raw = r.raw.trimEnd();
      for (let a of r.items) if (this.lexer.state.top = false, a.tokens = this.lexer.blockTokens(a.text, []), !r.loose) {
        let p = a.tokens.filter((h) => h.type === "space"), c = p.length > 0 && p.some((h) => this.rules.other.anyLine.test(h.raw));
        r.loose = c;
      }
      for (let a of r.items) {
        let p = a.tokens[0];
        if (a.task && (p?.type === "text" || p?.type === "paragraph")) {
          a.text = a.text.replace(this.rules.other.listReplaceTask, ""), p.raw = p.raw.replace(this.rules.other.listReplaceTask, ""), p.text = p.text.replace(this.rules.other.listReplaceTask, "");
          for (let h = this.lexer.inlineQueue.length - 1; h >= 0; h--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[h].src)) {
            this.lexer.inlineQueue[h].src = this.lexer.inlineQueue[h].src.replace(this.rules.other.listReplaceTask, "");
            break;
          }
          let c = this.rules.other.listTaskCheckbox.exec(a.raw);
          if (c) {
            let h = { type: "checkbox", raw: c[0] + " ", checked: c[0] !== "[ ]" };
            a.checked = h.checked, r.loose ? a.tokens[0] && ["paragraph", "text"].includes(a.tokens[0].type) && "tokens" in a.tokens[0] && a.tokens[0].tokens ? (a.tokens[0].raw = h.raw + a.tokens[0].raw, a.tokens[0].text = h.raw + a.tokens[0].text, a.tokens[0].tokens.unshift(h)) : a.tokens.unshift({ type: "paragraph", raw: h.raw, text: h.raw, tokens: [h] }) : a.tokens.unshift(h);
          }
        } else a.task && (a.task = false);
      }
      if (r.loose) for (let a of r.items) {
        a.loose = true;
        for (let p of a.tokens) p.type === "text" && (p.type = "paragraph");
      }
      return r;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) {
      let n = te(t[0]);
      return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
    }
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), s = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: $(t[0], `
`), href: s, title: r };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
    let n = ee(t[1]), s = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i = { type: "table", raw: $(t[0], `
`), header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let o of s) this.rules.other.tableAlignRight.test(o) ? i.align.push("right") : this.rules.other.tableAlignCenter.test(o) ? i.align.push("center") : this.rules.other.tableAlignLeft.test(o) ? i.align.push("left") : i.align.push(null);
      for (let o = 0; o < n.length; o++) i.header.push({ text: n[o], tokens: this.lexer.inline(n[o]), header: true, align: i.align[o] });
      for (let o of r) i.rows.push(ee(o, i.header.length).map((u, a) => ({ text: u, tokens: this.lexer.inline(u), header: false, align: i.align[a] })));
      return i;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: $(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
        if (!this.rules.other.endAngleBracket.test(n)) return;
        let i = $(n.slice(0, -1), "\\");
        if ((n.length - i.length) % 2 === 0) return;
      } else {
        let i = fe(t[2], "()");
        if (i === -2) return;
        if (i > -1) {
          let u = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + i;
          t[2] = t[2].substring(0, i), t[0] = t[0].substring(0, u).trim(), t[3] = "";
        }
      }
      let s = t[2], r = "";
      if (this.options.pedantic) {
        let i = this.rules.other.pedanticHrefTitle.exec(s);
        i && (s = i[1], r = i[3]);
      } else r = t[3] ? t[3].slice(1, -1) : "";
      return s = s.trim(), this.rules.other.startAngleBracket.test(s) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? s = s.slice(1) : s = s.slice(1, -1)), xe(t, { href: s && s.replace(this.rules.inline.anyPunctuation, "$1"), title: r && r.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let s = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), r = t[s.toLowerCase()];
      if (!r) {
        let i = n[0].charAt(0);
        return { type: "text", raw: i, text: i };
      }
      return xe(n, r, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(e);
    if (!s || !s[1] && !s[2] && !s[3] && !s[4] || s[4] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(s[1] || s[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let i = [...s[0]].length - 1, o, u, a = i, p = 0, c = s[0][0], h = n === c, d = c === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (d.lastIndex = 0, t = t.slice(-1 * e.length + i); (s = d.exec(t)) !== null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o) continue;
        if (u = [...o].length, s[3] || s[4]) {
          a += u;
          continue;
        } else if (s[5] || s[6]) {
          if (i % 3 && !((i + u) % 3)) {
            p += u;
            continue;
          }
          if (h) break;
        }
        if (a -= u, a > 0) continue;
        u = Math.min(u, u + a + p);
        let O = [...s[0]][0].length, g = e.slice(0, i + s.index + O + u);
        if (Math.min(i, u) % 2) {
          let E = g.slice(1, -1);
          return { type: "em", raw: g, text: E, tokens: this.lexer.inlineTokens(E) };
        }
        let w = g.slice(2, -2);
        return { type: "strong", raw: g, text: w, tokens: this.lexer.inlineTokens(w) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return s && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t) return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let s = this.rules.inline.delLDelim.exec(e);
    if (!s) return;
    if (!(s[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let i = [...s[0]].length - 1, o, u, a = i, p = this.rules.inline.delRDelim;
      for (p.lastIndex = 0, t = t.slice(-1 * e.length + i); (s = p.exec(t)) !== null; ) {
        if (o = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !o || (u = [...o].length, u !== i)) continue;
        if (s[3] || s[4]) {
          a += u;
          continue;
        }
        if (a -= u, a > 0) continue;
        u = Math.min(u, u + a);
        let c = [...s[0]][0].length, h = e.slice(0, i + s.index + c + u), d = h.slice(i, -i);
        return { type: "del", raw: h, text: d, tokens: this.lexer.inlineTokens(d) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, s;
      return t[2] === "@" ? (n = t[1], s = "mailto:" + n) : (n = t[1], s = n), { type: "link", raw: t[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, s;
      if (t[2] === "@") n = t[0], s = "mailto:" + n;
      else {
        let r;
        do
          r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (r !== t[0]);
        n = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: s, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: t[0], escaped: n };
    }
  }
};
var x = class l {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || R, this.options.tokenizer = this.options.tokenizer || new y(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, top: true };
    let t = { other: m, block: H.normal, inline: B.normal };
    this.options.pedantic ? (t.block = H.pedantic, t.inline = B.pedantic) : this.options.gfm && (t.block = H.gfm, this.options.breaks ? t.inline = B.breaks : t.inline = B.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: H, inline: B };
  }
  static lex(e, t) {
    return new l(t).lex(e);
  }
  static lexInline(e, t) {
    return new l(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, ""));
    let s = 1 / 0;
    for (; e; ) {
      if (e.length < s) s = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      let r;
      if (this.options.extensions?.block?.some((o) => (r = o.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        r.raw.length === 1 && o !== void 0 ? o.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        o?.type === "paragraph" || o?.type === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.text, this.inlineQueue.at(-1).src = o.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        o?.type === "paragraph" || o?.type === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.raw, this.inlineQueue.at(-1).src = o.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let o = 1 / 0, u = e.slice(1), a;
        this.options.extensions.startBlock.forEach((p) => {
          a = p.call({ lexer: this }, u), typeof a == "number" && a >= 0 && (o = Math.min(o, a));
        }), o < 1 / 0 && o >= 0 && (i = e.substring(0, o + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(i))) {
        let o = t.at(-1);
        n && o?.type === "paragraph" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let o = t.at(-1);
        o?.type === "text" ? (o.raw += (o.raw.endsWith(`
`) ? "" : `
`) + r.raw, o.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = o.text) : t.push(r);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  linkInText(e) {
    if (!e.includes("[")) return false;
    let t = this.tokenizer.rules.inline.link;
    for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip)) if (t.test(n[0]) && e.charAt(n.index - 1) !== "!") return true;
    for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
      let s = n[0], r = s.lastIndexOf("[");
      if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, s.slice(r + 1, -1))) && !(r > 1 && this.linkInText(s.slice(1, r - 1)))) return true;
    }
    return false;
  }
  inlineTokens(e, t = []) {
    this.tokenizer.lexer = this;
    let n = e;
    if (this.tokens.links && e.includes("[")) {
      let o = this.tokenizer.rules.inline.reflinkSearch, u = (a) => {
        let p = a.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, a.slice(p + 1, -1))) return a;
        if (p > 1 && a.charAt(0) !== "!") {
          let c = a.slice(1, p - 1);
          if (this.linkInText(c)) return "[" + c.replace(o, u) + "][" + "a".repeat(a.length - p - 2) + "]";
        }
        return "[" + "a".repeat(a.length - 2) + "]";
      };
      n = n.replace(o, u);
    }
    n = n.replace(this.tokenizer.rules.inline.anyPunctuation, (o) => "+".repeat(o.length)), n = n.replace(this.tokenizer.rules.inline.blockSkip, (o, u, a) => {
      let p = a ? a.length : 0;
      return o.slice(0, p) + "[" + "a".repeat(o.length - p - 2) + "]";
    }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, r = "", i = 1 / 0;
    for (; e; ) {
      if (e.length < i) i = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      s || (r = ""), s = false;
      let o;
      if (this.options.extensions?.inline?.some((a) => (o = a.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false)) continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        let a = t.at(-1);
        o.type === "text" && a?.type === "text" ? (a.raw += o.raw, a.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, r)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e, n, r)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let u = e;
      if (this.options.extensions?.startInline) {
        let a = 1 / 0, p = e.slice(1), c;
        this.options.extensions.startInline.forEach((h) => {
          c = h.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
        }), a < 1 / 0 && a >= 0 && (u = e.substring(0, a + 1));
      }
      if (o = this.tokenizer.inlineText(u)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (r = o.raw.slice(-1)), s = true;
        let a = t.at(-1);
        a?.type === "text" ? (a.raw += o.raw, a.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return t;
  }
  infiniteLoopError(e) {
    let t = "Infinite loop on byte: " + e;
    if (this.options.silent) console.error(t);
    else throw new Error(t);
  }
};
var P = class {
  options;
  parser;
  constructor(e) {
    this.options = e || R;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let s = (t || "").match(m.notSpaceStart)?.[0], r = e.replace(m.endingNewline, "") + `
`;
    return s ? '<pre><code class="language-' + T(s) + '">' + (n ? r : T(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : T(r, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let t = e.ordered, n = e.start, s = "";
    for (let o = 0; o < e.items.length; o++) {
      let u = e.items[o];
      s += this.listitem(u);
    }
    let r = t ? "ol" : "ul", i = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + i + `>
` + s + "</" + r + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let r = 0; r < e.header.length; r++) n += this.tablecell(e.header[r]);
    t += this.tablerow({ text: n });
    let s = "";
    for (let r = 0; r < e.rows.length; r++) {
      let i = e.rows[r];
      n = "";
      for (let o = 0; o < i.length; o++) n += this.tablecell(i[o]);
      s += this.tablerow({ text: n });
    }
    return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + s + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${T(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, tokens: n }) {
    let s = this.parser.parseInline(n), r = Y(e);
    if (r === null) return s;
    e = r;
    let i = '<a href="' + e + '"';
    return t && (i += ' title="' + T(t) + '"'), i += ">" + s + "</a>", i;
  }
  image({ href: e, title: t, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let r = Y(e);
    if (r === null) return T(n);
    e = r;
    let i = `<img src="${e}" alt="${T(n)}"`;
    return t && (i += ` title="${T(t)}"`), i += ">", i;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : T(e.text);
  }
};
var L = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var b = class l2 {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || R, this.options.renderer = this.options.renderer || new P(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new L();
  }
  static parse(e, t) {
    return new l2(t).parse(e);
  }
  static parseInline(e, t) {
    return new l2(t).parseInline(e);
  }
  parse(e) {
    this.renderer.parser = this;
    let t = "";
    for (let n = 0; n < e.length; n++) {
      let s = e[n];
      if (this.options.extensions?.renderers?.[s.type]) {
        let i = s, o = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (o !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(i.type)) {
          t += o || "";
          continue;
        }
      }
      let r = s;
      switch (r.type) {
        case "space": {
          t += this.renderer.space(r);
          break;
        }
        case "hr": {
          t += this.renderer.hr(r);
          break;
        }
        case "heading": {
          t += this.renderer.heading(r);
          break;
        }
        case "code": {
          t += this.renderer.code(r);
          break;
        }
        case "table": {
          t += this.renderer.table(r);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(r);
          break;
        }
        case "list": {
          t += this.renderer.list(r);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(r);
          break;
        }
        case "html": {
          t += this.renderer.html(r);
          break;
        }
        case "def": {
          t += this.renderer.def(r);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(r);
          break;
        }
        case "text": {
          t += this.renderer.text(r);
          break;
        }
        default: {
          let i = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent) return console.error(i), "";
          throw new Error(i);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    this.renderer.parser = this;
    let n = "";
    for (let s = 0; s < e.length; s++) {
      let r = e[s];
      if (this.options.extensions?.renderers?.[r.type]) {
        let o = this.options.extensions.renderers[r.type].call({ parser: this }, r);
        if (o !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
          n += o || "";
          continue;
        }
      }
      let i = r;
      switch (i.type) {
        case "escape": {
          n += t.text(i);
          break;
        }
        case "html": {
          n += t.html(i);
          break;
        }
        case "link": {
          n += t.link(i);
          break;
        }
        case "image": {
          n += t.image(i);
          break;
        }
        case "checkbox": {
          n += t.checkbox(i);
          break;
        }
        case "strong": {
          n += t.strong(i);
          break;
        }
        case "em": {
          n += t.em(i);
          break;
        }
        case "codespan": {
          n += t.codespan(i);
          break;
        }
        case "br": {
          n += t.br(i);
          break;
        }
        case "del": {
          n += t.del(i);
          break;
        }
        case "text": {
          n += t.text(i);
          break;
        }
        default: {
          let o = 'Token with "' + i.type + '" type was not found.';
          if (this.options.silent) return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return n;
  }
};
var S = class {
  options;
  block;
  constructor(e) {
    this.options = e || R;
  }
  static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? x.lex : x.lexInline;
  }
  provideParser(e = this.block) {
    return e ? b.parse : b.parseInline;
  }
};
var Z = class {
  defaults = A();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = b;
  Renderer = P;
  TextRenderer = L;
  Lexer = x;
  Tokenizer = y;
  Hooks = S;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let s of e) switch (n = n.concat(t.call(this, s)), s.type) {
      case "table": {
        let r = s;
        for (let i of r.header) n = n.concat(this.walkTokens(i.tokens, t));
        for (let i of r.rows) for (let o of i) n = n.concat(this.walkTokens(o.tokens, t));
        break;
      }
      case "list": {
        let r = s;
        n = n.concat(this.walkTokens(r.items, t));
        break;
      }
      default: {
        let r = s;
        this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((i) => {
          let o = r[i].flat(1 / 0);
          n = n.concat(this.walkTokens(o, t));
        }) : r.tokens && (n = n.concat(this.walkTokens(r.tokens, t)));
      }
    }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let s = { ...n };
      if (s.async = this.defaults.async || s.async || false, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name) throw new Error("extension name required");
        if ("renderer" in r) {
          let i = t.renderers[r.name];
          i ? t.renderers[r.name] = function(...o) {
            let u = r.renderer.apply(this, o);
            return u === false && (u = i.apply(this, o)), u;
          } : t.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
          let i = t[r.level];
          i ? i.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
      }), s.extensions = t), n.renderer) {
        let r = this.defaults.renderer || new P(this.defaults);
        for (let i in n.renderer) {
          if (!(i in r)) throw new Error(`renderer '${i}' does not exist`);
          if (["options", "parser"].includes(i)) continue;
          let o = i, u = n.renderer[o], a = r[o];
          r[o] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c || "";
          };
        }
        s.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new y(this.defaults);
        for (let i in n.tokenizer) {
          if (!(i in r)) throw new Error(`tokenizer '${i}' does not exist`);
          if (["options", "rules", "lexer"].includes(i)) continue;
          let o = i, u = n.tokenizer[o], a = r[o];
          r[o] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new S();
        for (let i in n.hooks) {
          if (!(i in r)) throw new Error(`hook '${i}' does not exist`);
          if (["options", "block"].includes(i)) continue;
          let o = i, u = n.hooks[o], a = r[o];
          S.passThroughHooks.has(i) ? r[o] = (p) => {
            if (this.defaults.async && S.passThroughHooksRespectAsync.has(i)) return (async () => {
              let h = await u.call(r, p);
              return a.call(r, h);
            })();
            let c = u.call(r, p);
            return a.call(r, c);
          } : r[o] = (...p) => {
            if (this.defaults.async) return (async () => {
              let h = await u.apply(r, p);
              return h === false && (h = await a.apply(r, p)), h;
            })();
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, i = n.walkTokens;
        s.walkTokens = function(o) {
          let u = [];
          return u.push(i.call(this, o)), r && (u = u.concat(r.call(this, o))), u;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return x.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return b.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, s) => {
      let r = { ...s }, i = { ...this.defaults, ...r }, o = this.onError(!!i.silent, !!i.async);
      if (this.defaults.async === true && r.async === false) return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null) return o(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string") return o(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (i.hooks && (i.hooks.options = i, i.hooks.block = e), i.async) return (async () => {
        let u = i.hooks ? await i.hooks.preprocess(n) : n, p = await (i.hooks ? await i.hooks.provideLexer(e) : e ? x.lex : x.lexInline)(u, i), c = i.hooks ? await i.hooks.processAllTokens(p) : p;
        i.walkTokens && await Promise.all(this.walkTokens(c, i.walkTokens));
        let d = await (i.hooks ? await i.hooks.provideParser(e) : e ? b.parse : b.parseInline)(c, i);
        return i.hooks ? await i.hooks.postprocess(d) : d;
      })().catch(o);
      try {
        i.hooks && (n = i.hooks.preprocess(n));
        let a = (i.hooks ? i.hooks.provideLexer(e) : e ? x.lex : x.lexInline)(n, i);
        i.hooks && (a = i.hooks.processAllTokens(a)), i.walkTokens && this.walkTokens(a, i.walkTokens);
        let c = (i.hooks ? i.hooks.provideParser(e) : e ? b.parse : b.parseInline)(a, i);
        return i.hooks && (c = i.hooks.postprocess(c)), c;
      } catch (u) {
        return o(u);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let s = "<p>An error occurred:</p><pre>" + T(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(s) : s;
      }
      if (t) return Promise.reject(n);
      throw n;
    };
  }
};
var M = new Z();
function f(l3, e) {
  return M.parse(l3, e);
}
f.options = f.setOptions = function(l3) {
  return M.setOptions(l3), f.defaults = M.defaults, j(f.defaults), f;
};
f.getDefaults = A;
f.defaults = R;
function dt(...l3) {
  return M.use(...l3), f.defaults = M.defaults, j(f.defaults), f;
}
f.use = dt;
f.walkTokens = function(l3, e) {
  return M.walkTokens(l3, e);
};
f.parseInline = M.parseInline;
f.Parser = b;
f.parser = b.parse;
f.Renderer = P;
f.TextRenderer = L;
f.Lexer = x;
f.lexer = x.lex;
f.Tokenizer = y;
f.Hooks = S;
f.parse = f;
var nn = f.options;
var rn = f.setOptions;
var sn = f.walkTokens;
var on = f.parseInline;
var ln = b.parse;
var un = x.lex;

// src/client/field-editor.tsx
var import_react12 = __toESM(require("react"), 1);
var TEXTAREA_FIELDS = ["description", "criteria"];
function FieldEditor(props) {
  const [editing, setEditing] = import_react12.default.useState(false);
  const [draft, setDraft] = import_react12.default.useState(String(props.value));
  const [saving, setSaving] = import_react12.default.useState(false);
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const field = props.field;
      const raw = draft;
      if ((field === "phase" || field === "order") && !/^\d+$/.test(raw.trim())) {
        showToast("phase and order must be integers \u2265 0", "refusal");
        setSaving(false);
        return;
      }
      const value = field === "phase" || field === "order" ? Number(raw) : raw;
      await callAidosRemote("userSetTicket", { ticketId: props.ticketId, [field]: value }, props.agentId);
      showToast("Field saved", "success");
      setEditing(false);
      props.onSaved();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
      setDraft(String(props.value));
    } finally {
      setSaving(false);
    }
  }
  function beginEdit() {
    setDraft(String(props.value));
    setEditing(true);
  }
  function cancel() {
    setDraft(String(props.value));
    setEditing(false);
  }
  if (editing) {
    const isTextarea = TEXTAREA_FIELDS.includes(props.field);
    return /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-field-editor" }, isTextarea ? /* @__PURE__ */ import_react12.default.createElement(
      "textarea",
      {
        className: "aidos-field-editor-input",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ) : /* @__PURE__ */ import_react12.default.createElement(
      "input",
      {
        className: "aidos-field-editor-input",
        type: "text",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react12.default.createElement("span", null, /* @__PURE__ */ import_react12.default.createElement("button", { className: "aidos-btn", disabled: saving, onClick: save }, "Save"), " ", /* @__PURE__ */ import_react12.default.createElement("button", { className: "aidos-btn", disabled: saving, onClick: cancel }, "Cancel")));
  }
  return /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-field-editor" }, /* @__PURE__ */ import_react12.default.createElement("span", null, props.children !== void 0 ? props.children : String(props.value), " ", /* @__PURE__ */ import_react12.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Edit",
      "aria-label": "Edit " + props.field,
      onClick: beginEdit
    },
    /* @__PURE__ */ import_react12.default.createElement(PencilIcon, null)
  )));
}

// src/client/action-bar.tsx
var import_react13 = __toESM(require("react"), 1);

// src/client/action-visibility.ts
function signoffReason(ticket) {
  if (ticket.state !== "open") {
    return "the ticket is already signed off";
  }
  return void 0;
}
function submitReason(ticket, kinds) {
  if (ticket.state !== "in_progress") {
    return "the ticket must be in progress";
  }
  const present = new Set(kinds);
  if (!present.has("builtin:review_pass")) {
    const missing = ["review_pass (a reviewer subagent or the human reviews first)"];
    if (!present.has("builtin:automated_check")) missing.unshift("automated_check");
    return "requires " + missing.join(", ");
  }
  return void 0;
}
function sendBackReason(ticket) {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  return void 0;
}
function verifyReason(ticket) {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  return void 0;
}
function markDoneReason(ticket, kinds) {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  if (!kinds.includes("builtin:user_verified")) {
    return "requires user_verified (attach your verification row first)";
  }
  return void 0;
}
function allowlistReason(ticket) {
  if (ticket.state !== "in_progress") {
    return "the ticket must be in progress";
  }
  return void 0;
}
function actionsFor(ticket, evidenceKinds = []) {
  return [
    { id: "signoff", label: "Sign off", primary: true, unavailableReason: signoffReason(ticket) },
    { id: "verify", label: "Verify", unavailableReason: verifyReason(ticket) },
    { id: "submit-for-review", label: "Submit for review", unavailableReason: submitReason(ticket, evidenceKinds) },
    { id: "send-back", label: "Send back", unavailableReason: sendBackReason(ticket) },
    { id: "mark-done", label: "Mark done", primary: true, unavailableReason: markDoneReason(ticket, evidenceKinds) },
    { id: "allowlist", label: "Allowlist", unavailableReason: allowlistReason(ticket) }
  ];
}

// src/client/action-bar.tsx
var OPENERS = {
  signoff: "onOpenSignoff",
  verify: "onOpenVerify",
  "submit-for-review": "onOpenSubmitForReview",
  "send-back": "onOpenSendBack",
  "mark-done": "onOpenMarkDone",
  allowlist: "onOpenAllowlist"
};
function ActionBar(props) {
  const kinds = props.evidence.map((row) => row.kind);
  const actions = actionsFor(props.ticket, kinds);
  import_react13.default.useEffect(function() {
    logDebug("action bar mounted");
  }, []);
  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]];
    const disabled = action.unavailableReason !== void 0;
    const className = (action.primary ? "aidos-btn aidos-btn-primary" : "aidos-btn") + (disabled ? " aidos-btn-disabled" : "");
    return /* @__PURE__ */ import_react13.default.createElement(
      "button",
      {
        className,
        key: action.id,
        disabled,
        title: action.unavailableReason ?? action.label,
        onClick: () => {
          if (!disabled) opener();
        }
      },
      action.label
    );
  });
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-action-bar" }, buttons);
}

// src/client/comments-section.tsx
var import_react14 = __toESM(require("react"), 1);
var EMPTY_COMMENTS = [];
function CommentsSection(props) {
  const comments = props.comments ?? EMPTY_COMMENTS;
  const [draft, setDraft] = import_react14.default.useState("");
  const [sending, setSending] = import_react14.default.useState(false);
  import_react14.default.useEffect(function() {
    logDebug("comments section mounted");
  }, []);
  const newestFirst = [...comments].sort((a, b2) => b2.at - a.at);
  async function send() {
    if (sending) return;
    if (draft.trim() === "") return;
    setSending(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: draft },
        props.agentId
      );
      setDraft("");
      showToast("Comment added", "success");
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSending(false);
    }
  }
  const rows = newestFirst.map((comment, index) => {
    const time = new Date(comment.at * 1e3).toLocaleString();
    return /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-comment", key: index }, /* @__PURE__ */ import_react14.default.createElement("div", null, /* @__PURE__ */ import_react14.default.createElement("span", { className: "aidos-evidence-author" }, comment.author)), /* @__PURE__ */ import_react14.default.createElement("p", { className: "aidos-detail-body" }, comment.text), /* @__PURE__ */ import_react14.default.createElement("p", { className: "aidos-detail-note" }, time));
  });
  return /* @__PURE__ */ import_react14.default.createElement("details", { className: "aidos-panel", open: comments.length !== 1 }, /* @__PURE__ */ import_react14.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react14.default.createElement("h4", { className: "aidos-panel-title" }, "Comments")), /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-panel-body" }, rows.length === 0 ? /* @__PURE__ */ import_react14.default.createElement("p", { className: "aidos-detail-note" }, "No comments yet.") : rows, /* @__PURE__ */ import_react14.default.createElement(
    "textarea",
    {
      className: "aidos-comment-textarea",
      value: draft,
      placeholder: "Add a comment. Ctrl+Enter sends.",
      onChange: (event) => {
        setDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.ctrlKey && event.key === "Enter") {
          event.preventDefault();
          void send();
        }
      }
    }
  ), /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react14.default.createElement(
    "button",
    {
      className: "aidos-comment-send",
      disabled: sending || draft.trim() === "",
      onClick: send
    },
    "Send"
  ))));
}

// src/client/evidence-attach.tsx
var import_react15 = __toESM(require("react"), 1);

// src/client/user-evidence-kinds.ts
var HUMAN_ONLY_IDS = ["builtin:user_signoff", "builtin:user_verified", "builtin:file_allowlist"];
var SYSTEM_ONLY_ID = "builtin:imported_state";
var RETIRED_IDS = /* @__PURE__ */ new Set(["builtin:comment"]);
function userEvidenceKinds() {
  const humanOnly = [];
  const rest = [];
  for (const kind of BUILTIN_KINDS) {
    if (!kind.allowedAuthors.includes("user")) continue;
    if (kind.id === SYSTEM_ONLY_ID || RETIRED_IDS.has(kind.id)) continue;
    const descriptor = {
      id: kind.id,
      label: kind.label,
      description: kind.description
    };
    if (HUMAN_ONLY_IDS.includes(kind.id)) {
      humanOnly.push(descriptor);
    } else {
      rest.push(descriptor);
    }
  }
  rest.sort((a, b2) => {
    if (a.id < b2.id) return -1;
    if (a.id > b2.id) return 1;
    return 0;
  });
  return humanOnly.concat(rest);
}

// src/client/parse-payload-text.ts
function parsePayloadText(text) {
  if (text.trim() === "") {
    return { ok: true, payload: {} };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: "Payload is not valid JSON: " + (error instanceof Error ? error.message : String(error))
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Payload must be a JSON object" };
  }
  return { ok: true, payload: parsed };
}

// src/client/evidence-attach.tsx
function AttachModal(props) {
  return /* @__PURE__ */ import_react15.default.createElement(
    ModalShell,
    {
      title: props.title,
      working: props.working,
      onClose: props.onClose,
      onConfirm: props.onAttach,
      confirmLabel: "Attach"
    },
    props.children
  );
}
function NoteField2(props) {
  return /* @__PURE__ */ import_react15.default.createElement(
    NoteField,
    {
      label: props.label ?? "Note (optional)",
      value: props.note,
      working: props.working,
      onChange: props.onChange
    }
  );
}
function parseLinesText(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
  if (lines.length === 0) {
    return { ok: false, error: "Add at least one line." };
  }
  return { ok: true, lines };
}
function ImagePasteZone(props) {
  return /* @__PURE__ */ import_react15.default.createElement(import_react15.default.Fragment, null, /* @__PURE__ */ import_react15.default.createElement(
    "div",
    {
      className: "aidos-evidence-paste-zone",
      onPaste: (event) => {
        const file = Array.from(event.clipboardData.files)[0];
        if (file) props.onFile(file);
      },
      onDragOver: (event) => {
        event.preventDefault();
      },
      onDrop: (event) => {
        event.preventDefault();
        const file = Array.from(event.dataTransfer.files)[0];
        if (file) props.onFile(file);
      },
      tabIndex: 0
    },
    props.uploading ? "Uploading\u2026" : props.imagePath !== null ? "Screenshot stored \u2014 paste again to replace." : "Paste or drop a screenshot here (optional)"
  ), props.pasteError !== null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-evidence-paste-error" }, props.pasteError) : null);
}
async function uploadImagePaste(agentId, file, name2) {
  const headers = {
    "content-type": file.type || "application/octet-stream",
    "x-file-name": name2,
    // The route requires the session: the agentId IS the session id.
    "x-session-id": agentId
  };
  const root = await callAidosRemote("workspaceRoot", {}, agentId).catch(() => void 0);
  const workspaceDir = root !== void 0 && typeof root === "object" && !Array.isArray(root) && typeof root.workspace === "string" ? root.workspace : null;
  if (workspaceDir !== null) {
    headers["x-workspace"] = workspaceDir;
  }
  const res = await fetch("/paste-to-path", { method: "POST", headers, body: file });
  if (!res.ok) {
    const body = await res.json().catch(() => void 0);
    throw new Error(body?.error ?? `paste upload failed (${res.status})`);
  }
  const attachment = await res.json();
  return attachment.path;
}
function VerifyModal(props) {
  const [note, setNote] = import_react15.default.useState("");
  const [imagePath, setImagePath] = import_react15.default.useState(null);
  const [uploading, setUploading] = import_react15.default.useState(false);
  const [working, setWorking] = import_react15.default.useState(false);
  const [pasteError, setPasteError] = import_react15.default.useState(null);
  async function handleFile(file) {
    setPasteError(null);
    setUploading(true);
    try {
      const path = await uploadImagePaste(props.agentId, file, file.name || "pasted-image.png");
      setImagePath(path);
      showToast("Screenshot stored", "success");
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }
  async function attach() {
    if (working) return;
    setWorking(true);
    try {
      const payload = {};
      if (note.trim() !== "") payload.note = note.trim();
      if (imagePath !== null) payload.imagePath = imagePath;
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:user_verified", payload },
        props.agentId
      );
      showToast("Verified", "success");
      props.onClose();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement(AttachModal, { title: "Verify", working: working || uploading, onAttach: () => void attach(), onClose: props.onClose }, /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-modal-body" }, "You verified this ticket hands-on. Paste (Ctrl+V) or drop a screenshot to attach it."), /* @__PURE__ */ import_react15.default.createElement(ImagePasteZone, { imagePath, uploading, pasteError, onFile: handleFile }), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }));
}
function CommitPickerForm(props) {
  const [commits, setCommits] = import_react15.default.useState([]);
  const [loadError, setLoadError] = import_react15.default.useState(null);
  const [picked, setPicked] = import_react15.default.useState("");
  const [attaching, setAttaching] = import_react15.default.useState(false);
  import_react15.default.useEffect(function() {
    let alive = true;
    callAidosRemote("userRecentCommits", { ticketId: props.ticketId }, props.agentId).then((out) => {
      if (!alive) return;
      const rows = out?.commits;
      setCommits(Array.isArray(rows) ? rows : []);
    }).catch((error) => {
      if (!alive) return;
      setLoadError(error instanceof AidosRemoteError ? error.message : String(error));
    });
    return () => {
      alive = false;
    };
  }, [props.ticketId, props.agentId]);
  async function attach() {
    if (attaching || picked === "") return;
    setAttaching(true);
    try {
      await callAidosRemote(
        "userAttachCommitEvidence",
        { ticketId: props.ticketId, hash: picked, ...props.note.trim() === "" ? {} : { note: props.note.trim() } },
        props.agentId
      );
      showToast("Commit evidence attached", "success");
      setPicked("");
      props.setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setAttaching(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Recent commits"), loadError !== null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-evidence-paste-error" }, loadError) : /* @__PURE__ */ import_react15.default.createElement(
    "select",
    {
      className: "aidos-evidence-attach-kind-select",
      value: picked,
      disabled: attaching,
      onChange: (event) => {
        setPicked(event.target.value);
      }
    },
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "" }, commits.length === 0 ? "Loading commits\u2026" : "Pick a commit\u2026"),
    commits.map((commit) => /* @__PURE__ */ import_react15.default.createElement("option", { value: commit.hash, key: commit.hash }, commit.hash + " " + commit.subject + " \u2014 " + commit.author))
  )), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note: props.note, working: props.working || attaching, onChange: props.setNote, label: "Note (optional)" }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: props.working || attaching || picked === "",
      onClick: () => void attach()
    },
    attaching ? "Working\u2026" : "Attach commit"
  )));
}
function EvalCriteriaForm(props) {
  const [criteriaText, setCriteriaText] = import_react15.default.useState("");
  const [note, setNote] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  const parsed = parseLinesText(criteriaText);
  async function attach() {
    if (working || !parsed.ok) return;
    setWorking(true);
    try {
      const payload = { lines: parsed.lines };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:eval_criteria", payload },
        props.agentId
      );
      showToast("Evaluation criteria attached", "success");
      setCriteriaText("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(
    LinesField,
    {
      label: "Evaluation criteria (one per line)",
      value: criteriaText,
      working,
      placeholder: "Criterion 1\nCriterion 2",
      onChange: setCriteriaText
    }
  ), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || !parsed.ok,
      title: parsed.ok ? void 0 : parsed.error,
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function AgentReportForm(props) {
  const [reportText, setReportText] = import_react15.default.useState("");
  const [note, setNote] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  async function attach() {
    if (working || reportText.trim() === "") return;
    setWorking(true);
    try {
      const payload = { report: reportText.trim() };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:agent_report", payload },
        props.agentId
      );
      showToast("Agent report attached", "success");
      setReportText("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Report"), /* @__PURE__ */ import_react15.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note aidos-evidence-attach-tall",
      value: reportText,
      disabled: working,
      placeholder: "Describe the work performed\u2026",
      onChange: (event) => {
        setReportText(event.target.value);
      }
    }
  )), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || reportText.trim() === "",
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function CheckResultForm(props) {
  const [command, setCommand] = import_react15.default.useState("");
  const [result, setResult] = import_react15.default.useState("");
  const [note, setNote] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  async function attach() {
    if (working || command.trim() === "" || result === "") return;
    setWorking(true);
    try {
      const payload = {
        command: command.trim(),
        result
      };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: props.kind, payload },
        props.agentId
      );
      showToast(`${props.kind === "builtin:automated_check" ? "Automated check" : "Test run"} attached`, "success");
      setCommand("");
      setResult("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Command"), /* @__PURE__ */ import_react15.default.createElement(
    "input",
    {
      type: "text",
      className: "aidos-command-input",
      value: command,
      disabled: working,
      placeholder: "npm run test",
      onChange: (event) => {
        setCommand(event.target.value);
      }
    }
  )), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Result"), /* @__PURE__ */ import_react15.default.createElement(
    "select",
    {
      className: "aidos-evidence-attach-kind-select",
      value: result,
      disabled: working,
      onChange: (event) => {
        setResult(event.target.value);
      }
    },
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "" }, "Choose a result\u2026"),
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "pass" }, "Pass"),
    /* @__PURE__ */ import_react15.default.createElement("option", { value: "fail" }, "Fail")
  )), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || command.trim() === "" || result === "",
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function AfterShotForm(props) {
  const [imagePath, setImagePath] = import_react15.default.useState(null);
  const [note, setNote] = import_react15.default.useState("");
  const [uploading, setUploading] = import_react15.default.useState(false);
  const [working, setWorking] = import_react15.default.useState(false);
  const [pasteError, setPasteError] = import_react15.default.useState(null);
  async function handleFile(file) {
    setPasteError(null);
    setUploading(true);
    try {
      const path = await uploadImagePaste(props.agentId, file, file.name || "pasted-image.png");
      setImagePath(path);
      showToast("Screenshot stored", "success");
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }
  async function attach() {
    if (working || imagePath === null) return;
    setWorking(true);
    try {
      const payload = { imagePath };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:after_shot", payload },
        props.agentId
      );
      showToast("After shot attached", "success");
      setImagePath(null);
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(ImagePasteZone, { imagePath, uploading, pasteError, onFile: handleFile }), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || uploading || imagePath === null,
      onClick: () => void attach()
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function TailoredForm(props) {
  const [note, setNote] = import_react15.default.useState("");
  const [pathsText, setPathsText] = import_react15.default.useState("");
  const [payloadText, setPayloadText] = import_react15.default.useState("");
  const [working, setWorking] = import_react15.default.useState(false);
  async function attachWith(kind, payload) {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote("userAttachEvidence", { ticketId: props.ticketId, kind, payload }, props.agentId);
      showToast("Evidence attached", "success");
      setNote("");
      setPathsText("");
      setPayloadText("");
      props.onAttached();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  if (props.kind === "builtin:file_allowlist") {
    const parsed = parseLinesText(pathsText);
    return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(
      LinesField,
      {
        label: "Allowed paths (one per line)",
        value: pathsText,
        working,
        placeholder: "src/client/\nsrc/host/aidos-core.ts",
        onChange: setPathsText
      }
    ), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: working || !parsed.ok,
        title: parsed.ok ? void 0 : parsed.error,
        onClick: () => {
          if (parsed.ok) void attachWith(props.kind, { paths: parsed.lines });
        }
      },
      working ? "Working\u2026" : "Attach"
    )));
  }
  if (props.kind === "builtin:eval_criteria") {
    return /* @__PURE__ */ import_react15.default.createElement(EvalCriteriaForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached });
  }
  if (props.kind === "builtin:agent_report") {
    return /* @__PURE__ */ import_react15.default.createElement(AgentReportForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached });
  }
  if (props.kind === "builtin:automated_check" || props.kind === "builtin:test_run") {
    return /* @__PURE__ */ import_react15.default.createElement(
      CheckResultForm,
      {
        ticketId: props.ticketId,
        agentId: props.agentId,
        kind: props.kind,
        onAttached: props.onAttached
      }
    );
  }
  if (props.kind === "builtin:after_shot") {
    return /* @__PURE__ */ import_react15.default.createElement(AfterShotForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached });
  }
  if (props.kind === "builtin:user_commit") {
    return /* @__PURE__ */ import_react15.default.createElement(CommitPickerForm, { ticketId: props.ticketId, agentId: props.agentId, onAttached: props.onAttached, note, setNote, working });
  }
  const REVIEW_VERDICT_LABEL = {
    "builtin:review_pass": "What was reviewed, and why it is accepted",
    "builtin:review_fail": "The verdict and the findings",
    "builtin:review_note": "Note"
  };
  const verdictLabel = REVIEW_VERDICT_LABEL[props.kind];
  if (verdictLabel !== void 0) {
    return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote, label: verdictLabel }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: working || note.trim() === "",
        onClick: () => void attachWith(props.kind, { note: note.trim() })
      },
      working ? "Working\u2026" : "Attach"
    )));
  }
  const parsedPayload = parsePayloadText(payloadText);
  const structured = parsedPayload.ok ? parsedPayload.payload : {};
  const parseError = parsedPayload.ok ? null : parsedPayload.error;
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-tailored" }, /* @__PURE__ */ import_react15.default.createElement(Collapse, { summary: "Raw JSON (optional object)", defaultOpen: false }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement(
    "textarea",
    {
      className: "aidos-evidence-attach-note",
      value: payloadText,
      disabled: working,
      placeholder: '{\n  "custom": "value"\n}',
      onChange: (event) => {
        setPayloadText(event.target.value);
      }
    }
  )), parseError !== null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-evidence-paste-error" }, parseError) : null), /* @__PURE__ */ import_react15.default.createElement(NoteField2, { note, working, onChange: setNote }), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react15.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working || parseError !== null,
      onClick: () => {
        const payload = note.trim() === "" ? structured : { ...structured, note: note.trim() };
        void attachWith(props.kind, payload);
      }
    },
    working ? "Working\u2026" : "Attach"
  )));
}
function EvidenceAttach(props) {
  const kinds = userEvidenceKinds();
  const [kind, setKind] = import_react15.default.useState(kinds.length > 0 ? kinds[0].id : "");
  const [lastRow, setLastRow] = import_react15.default.useState(null);
  const remainingKinds = kinds.filter(
    (k2) => k2.id !== "builtin:user_signoff" && k2.id !== "builtin:user_verified"
  );
  void lastRow;
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-evidence-attach" }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react15.default.createElement("label", null, "Other evidence kinds"), /* @__PURE__ */ import_react15.default.createElement(
    "select",
    {
      className: "aidos-evidence-attach-kind-select",
      value: kind,
      onChange: (event) => {
        setKind(event.target.value);
      }
    },
    remainingKinds.map((descriptor) => /* @__PURE__ */ import_react15.default.createElement("option", { value: descriptor.id, key: descriptor.id }, descriptor.label))
  )), /* @__PURE__ */ import_react15.default.createElement(TailoredForm, { ticketId: props.ticketId, agentId: props.agentId, kind, onAttached: () => props.onAttached?.() }));
}

// src/client/allowlist-request-card.tsx
var import_react16 = __toESM(require("react"), 1);
function createdFromPayload(payload) {
  if (payload === null || typeof payload !== "object") return [];
  const created = payload.created;
  if (!Array.isArray(created)) return [];
  return created.filter((p) => typeof p === "string");
}
function stillCreated(proposedCreated, currentPaths) {
  const current = new Set(currentPaths.map((p) => p.trim()).filter((p) => p !== ""));
  return proposedCreated.filter((p) => current.has(p));
}
function AllowlistRequestCard(props) {
  const [request, setRequest] = import_react16.default.useState(null);
  const [paths, setPaths] = import_react16.default.useState([]);
  const [working, setWorking] = import_react16.default.useState(false);
  const dirtyRef = import_react16.default.useRef(false);
  import_react16.default.useEffect(function() {
    let cancelled = false;
    async function poll() {
      try {
        const result = await callAidosRemote("pendingApproval", { ticketId: props.ticketId }, props.agentId);
        if (cancelled) return;
        const row = result !== null && typeof result === "object" && !Array.isArray(result) ? result : null;
        setRequest(row);
        if (row !== null && !dirtyRef.current && Array.isArray(row.payload?.paths)) {
          setPaths(row.payload.paths);
        }
      } catch {
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 2e3);
    return function() {
      cancelled = true;
      clearInterval(timer);
    };
  }, [props.ticketId, props.agentId]);
  async function resolve(approved) {
    if (request === null || working) return;
    setWorking(true);
    try {
      const clean = paths.map((p) => p.trim()).filter((p) => p !== "");
      await callAidosRemote(
        "resolveApproval",
        { requestId: request.id, approved, ...approved ? { paths: clean } : {} },
        props.agentId
      );
      showToast(approved ? "Allowlist approved" : "Allowlist rejected", approved ? "success" : "info");
      dirtyRef.current = false;
      setRequest(null);
      props.onResolved?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }
  if (request === null) return null;
  const proposedCreated = createdFromPayload(request.payload);
  const createdPaths = stillCreated(proposedCreated, paths);
  return /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-approval-card" }, /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-approval-head" }, /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-chip aidos-chip-kind aidos-chip-approval-kind" }, /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-chip-key" }, request.kind.toUpperCase())), /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-approval-prompt" }, request.prompt)), /* @__PURE__ */ import_react16.default.createElement(
    "textarea",
    {
      className: "aidos-allowlist-input",
      value: paths.join("\n"),
      disabled: working,
      onChange: (event) => {
        dirtyRef.current = true;
        setPaths(event.target.value.split("\n"));
      }
    }
  ), createdPaths.length > 0 ? /* @__PURE__ */ import_react16.default.createElement("p", { className: "aidos-approval-created" }, createdPaths.length === 1 ? "1 path does not exist yet and will be created: " : createdPaths.length + " paths do not exist yet and will be created: ", createdPaths.join(", ")) : null, /* @__PURE__ */ import_react16.default.createElement("p", { className: "aidos-detail-note" }, "Edit the list before approving if the proposal needs amending. The agent is told the outcome either way."), /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react16.default.createElement("button", { className: "aidos-btn", disabled: working, onClick: () => void resolve(false) }, "Reject"), /* @__PURE__ */ import_react16.default.createElement("button", { className: "aidos-btn aidos-btn-primary", disabled: working, onClick: () => void resolve(true) }, working ? "Working\u2026" : "Approve")));
}

// src/client/ticket-strip.tsx
var import_react17 = __toESM(require("react"), 1);
function TicketStrip(props) {
  const ticket = props.ticket;
  const full = fullTicketId(ticket);
  const className = "aidos-ticket-strip" + (props.highlighted === true ? " aidos-ticket-strip-highlighted" : "") + (props.working === true ? " aidos-ticket-strip-working" : "");
  const showGate = ticket.gatePresent !== void 0 || ticket.gateTotal !== void 0;
  return /* @__PURE__ */ import_react17.default.createElement("li", { className }, /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-ticket-strip-main" }, /* @__PURE__ */ import_react17.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(full) },
      title: full
    },
    ticketChipLabel(ticket)
  ), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-body" }, /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-title", title: ticket.title }, ticket.title), props.meta !== void 0 ? /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-meta" }, props.meta) : null), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-chips" }, props.awaitingApproval === true ? /* @__PURE__ */ import_react17.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-awaiting-approval",
      title: "This ticket has a request waiting for your approval"
    },
    "Needs approval"
  ) : null, /* @__PURE__ */ import_react17.default.createElement("span", { className: badgeClass(ticket.state) }, stateLabel(ticket.state)), showGate ? /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-chip aidos-chip-metric", title: "Gate progress" }, /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-chip-key" }, "Gate"), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-chip-value" }, formatGateFraction(
    ticket.gatePresent ?? null,
    ticket.gateTotal ?? null,
    hasCriteria(ticket)
  ))) : null), /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-ticket-strip-actions" }, props.onOpen !== void 0 ? /* @__PURE__ */ import_react17.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Open " + full,
      "aria-label": "Open " + full,
      disabled: props.working === true,
      onClick: (event) => {
        event.stopPropagation();
        props.onOpen?.();
      }
    },
    /* @__PURE__ */ import_react17.default.createElement(PopOutIcon, null)
  ) : null, props.actions)));
}

// src/client/signoff-dialog.tsx
var import_react18 = __toESM(require("react"), 1);
function SignoffDialog(props) {
  const [working, setWorking] = import_react18.default.useState(false);
  const [note, setNote] = import_react18.default.useState("");
  import_react18.default.useEffect(function() {
    if (props.open) logDebug("signoff dialog opened");
  }, [props.open]);
  if (!props.open) return null;
  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAttachEvidence",
        {
          ticketId: props.ticketId,
          kind: "builtin:user_signoff",
          payload: note.trim() === "" ? {} : { note: note.trim() }
        },
        props.agentId
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId
      );
      showToast("Signed off", "success");
      props.onClose();
      props.onSignedOff();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react18.default.createElement(
    ModalShell,
    {
      title: "Sign off ticket",
      working,
      onClose: props.onClose,
      onConfirm: confirm,
      confirmLabel: "Confirm"
    },
    /* @__PURE__ */ import_react18.default.createElement("p", { className: "aidos-modal-body" }, "Signoff grants the agent write access on this ticket. Confirm to proceed."),
    /* @__PURE__ */ import_react18.default.createElement(
      NoteField,
      {
        label: "Note (optional \u2014 rides the signoff row)",
        value: note,
        working,
        onChange: setNote
      }
    )
  );
}

// src/client/send-back-modal.tsx
var import_react19 = __toESM(require("react"), 1);
function SendBackModal(props) {
  const [reason, setReason] = import_react19.default.useState("");
  const [working, setWorking] = import_react19.default.useState(false);
  import_react19.default.useEffect(function() {
    if (props.open) logDebug("send back modal opened");
  }, [props.open]);
  if (!props.open) return null;
  async function sendBack() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: reason.trim() },
        props.agentId
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId
      );
      showToast("Sent back", "success");
      props.onClose();
      props.onSentBack();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react19.default.createElement(
    ModalShell,
    {
      title: "Send back",
      working,
      onClose: props.onClose,
      onConfirm: sendBack,
      confirmLabel: "Send back"
    },
    /* @__PURE__ */ import_react19.default.createElement("p", { className: "aidos-modal-body" }, "Send the ticket back to in progress. The reason attaches as a comment."),
    /* @__PURE__ */ import_react19.default.createElement(NoteField, { label: "Reason", value: reason, working, onChange: setReason })
  );
}

// src/client/mark-done-modal.tsx
var import_react20 = __toESM(require("react"), 1);
function MarkDoneModal(props) {
  const [step, setStep] = import_react20.default.useState(1);
  const [finalComment, setFinalComment] = import_react20.default.useState("");
  const [working, setWorking] = import_react20.default.useState(false);
  import_react20.default.useEffect(function() {
    if (props.open) logDebug("mark done modal opened");
  }, [props.open]);
  if (!props.open) return null;
  const criteriaLines2 = props.ticket.criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      if (finalComment.trim() !== "") {
        await callAidosRemote(
          "userAddComment",
          { ticketId: props.ticketId, text: finalComment },
          props.agentId
        );
      }
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:user_verified", payload: {} },
        props.agentId
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "done" },
        props.agentId
      );
      showToast("Marked done", "success");
      props.onClose();
      props.onMarkedDone();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }
  return /* @__PURE__ */ import_react20.default.createElement(ModalShell, { title: "Mark done", working, onClose: props.onClose }, step === 1 ? /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-modal-body" }, "The ticket criteria, with their evidence:"), criteriaLines2.length === 0 ? /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-detail-note" }, "No criteria on this ticket.") : /* @__PURE__ */ import_react20.default.createElement(
    CriterionLinker,
    {
      criteria: criteriaLines2,
      evidence: props.evidence,
      ticketIdKey: String(props.ticketId),
      agentId: props.agentId,
      onChanged: () => {
      }
    }
  ), /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react20.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      onClick: () => {
        setStep(2);
      }
    },
    "Continue"
  ))) : /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-modal-body" }, "The evidence on this ticket:"), props.evidence.length === 0 ? /* @__PURE__ */ import_react20.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : /* @__PURE__ */ import_react20.default.createElement("ul", { className: "aidos-evidence-list" }, props.evidence.map((row, index) => /* @__PURE__ */ import_react20.default.createElement(
    EvidenceStrip,
    {
      key: String(row.at ?? index) + ":" + row.kind,
      row,
      criterionLabel: typeof row.payload.criteria === "string" && row.payload.criteria.trim() !== "" ? row.payload.criteria : void 0
    }
  ))), /* @__PURE__ */ import_react20.default.createElement(
    NoteField,
    {
      label: "Final comment (optional)",
      value: finalComment,
      working,
      onChange: setFinalComment
    }
  ), /* @__PURE__ */ import_react20.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react20.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-btn-primary",
      disabled: working,
      onClick: confirm
    },
    working ? "Working\u2026" : "Confirm"
  ))));
}

// src/client/detail-panel.tsx
var DESCRIPTION_CLIP_CHARS = 800;
function showError2(error) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}
function DescriptionPanel(props) {
  const [editing, setEditing] = import_react21.default.useState(false);
  const [draft, setDraft] = import_react21.default.useState("");
  const [saving, setSaving] = import_react21.default.useState(false);
  const [expanded, setExpanded] = import_react21.default.useState(false);
  const text = props.ticket.description;
  const empty = text.trim() === "";
  const long = text.length > DESCRIPTION_CLIP_CHARS;
  const clipped = long && !expanded;
  const html = empty ? "" : String(f.parse(text, { async: false }));
  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, description: draft },
        props.agentId
      );
      showToast("Description saved", "success");
      setEditing(false);
      props.onSaved();
    } catch (error) {
      showError2(error);
    } finally {
      setSaving(false);
    }
  }
  function cancel() {
    setDraft(text);
    setEditing(false);
  }
  let body;
  if (editing) {
    body = /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement(
      "textarea",
      {
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: saving,
        onClick: () => {
          void save();
        }
      },
      "Save"
    ), /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: cancel
      },
      "Cancel"
    )));
  } else if (empty) {
    body = /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No description.");
  } else {
    body = /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement(
      "div",
      {
        className: "aidos-md" + (clipped ? " aidos-md-clipped" : ""),
        dangerouslySetInnerHTML: { __html: html }
      }
    ), long ? /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-md-more",
        onClick: () => {
          setExpanded(!expanded);
        }
      },
      expanded ? "Show less" : "Show more"
    ) : null);
  }
  return /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel", open: true }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Description"), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Edit",
      "aria-label": "Edit description",
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDraft(text);
        setEditing(true);
      }
    },
    /* @__PURE__ */ import_react21.default.createElement(PencilIcon, null)
  )), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, body));
}
function CriterionEditor(props) {
  const [draft, setDraft] = import_react21.default.useState(props.line);
  return /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-row" }, /* @__PURE__ */ import_react21.default.createElement(
    "input",
    {
      type: "text",
      value: draft,
      disabled: props.saving,
      onChange: (event) => {
        setDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          props.onSave(draft);
        }
      }
    }
  ), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-actions" }, /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: props.saving,
      onClick: () => {
        props.onSave(draft);
      }
    },
    "Save"
  ), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: props.saving,
      onClick: props.onCancel
    },
    "Cancel"
  )));
}
function CriteriaPanel(props) {
  const [editingIndex, setEditingIndex] = import_react21.default.useState(null);
  const [saving, setSaving] = import_react21.default.useState(false);
  const [addDraft, setAddDraft] = import_react21.default.useState("");
  const lines = criteriaLines(props.ticket.criteria);
  const uncovered = uncoveredCriteria(props.ticket.criteria, props.evidence);
  const uncoveredSet = new Set(uncovered);
  const covered = lines.length - uncovered.length;
  async function saveLines(survivors) {
    if (saving) return false;
    setSaving(true);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, criteria: survivors.join("\n") },
        props.agentId
      );
      showToast("Criteria saved", "success");
      setEditingIndex(null);
      props.onSaved();
      return true;
    } catch (error) {
      showError2(error);
      return false;
    } finally {
      setSaving(false);
    }
  }
  function replaceLine(index, replacement) {
    const survivors = lines.slice();
    survivors[index] = replacement;
    void saveLines(survivors);
  }
  function removeLine(index) {
    const survivors = lines.slice();
    survivors.splice(index, 1);
    void saveLines(survivors);
  }
  async function addLine() {
    const text = addDraft.trim();
    if (text === "") return;
    const saved = await saveLines(lines.concat([text]));
    if (saved) setAddDraft("");
  }
  return /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel" }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Criteria " + covered + "/" + lines.length)), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, lines.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No criteria yet \u2014 add the first one below.") : null, /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-criteria" }, lines.map((line, index) => /* @__PURE__ */ import_react21.default.createElement(
    "li",
    {
      key: index + ":" + line,
      className: uncoveredSet.has(line) ? "aidos-criterion aidos-criterion-uncovered" : "aidos-criterion"
    },
    editingIndex === index ? /* @__PURE__ */ import_react21.default.createElement(
      CriterionEditor,
      {
        line,
        saving,
        onSave: (draft) => {
          replaceLine(index, draft.trim());
        },
        onCancel: () => {
          setEditingIndex(null);
        }
      }
    ) : /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-row" }, uncoveredSet.has(line) ? /* @__PURE__ */ import_react21.default.createElement(
      "span",
      {
        className: "aidos-criterion-warn",
        title: "No evidence covers this criterion yet",
        "aria-label": "Uncovered criterion"
      },
      /* @__PURE__ */ import_react21.default.createElement(WarningIcon, null)
    ) : null, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-text" }, line), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-criterion-actions" }, /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-icon-btn",
        title: "Edit",
        "aria-label": "Edit criterion " + (index + 1),
        onClick: () => {
          setEditingIndex(index);
        }
      },
      /* @__PURE__ */ import_react21.default.createElement(PencilIcon, null)
    ), /* @__PURE__ */ import_react21.default.createElement(
      "button",
      {
        className: "aidos-icon-btn",
        title: "Delete",
        "aria-label": "Delete criterion " + (index + 1),
        disabled: saving,
        onClick: () => {
          removeLine(index);
        }
      },
      /* @__PURE__ */ import_react21.default.createElement(TrashIcon, null)
    ))),
    editingIndex !== index ? /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-criterion-linked" }, props.evidence.filter((row) => criterionOf(row) === line).map((row) => /* @__PURE__ */ import_react21.default.createElement("li", { className: "aidos-criterion-linked-row", key: String(row.at) + ":" + row.kind }, /* @__PURE__ */ import_react21.default.createElement(
      EvidenceStrip,
      {
        row,
        onView: props.onViewEvidence,
        deleting: props.deletingAt === row.at
      }
    )))) : null
  )), /* @__PURE__ */ import_react21.default.createElement("li", { className: "aidos-criteria-add" }, /* @__PURE__ */ import_react21.default.createElement(
    "input",
    {
      type: "text",
      value: addDraft,
      disabled: saving,
      placeholder: "Add a criterion",
      onChange: (event) => {
        setAddDraft(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void addLine();
        }
      }
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: saving || addDraft.trim() === "",
      onClick: () => {
        void addLine();
      }
    },
    "Add"
  )))));
}
function refOf(hit) {
  return hit.workspaceKey + ":" + hit.ticketId;
}
function DependencyCard(props) {
  const ref = props.depRef;
  const key = ref.includes(":") ? ref : (props.workspaceKey ?? "") + ":" + ref;
  const known = props.ticketsByKey?.get(key) ?? props.ticketsByKey?.get(ref);
  const open = known === void 0 || props.onJump === void 0 ? void 0 : () => {
    props.onJump?.(boardKeyOf(known));
  };
  if (known === void 0) {
    return /* @__PURE__ */ import_react21.default.createElement("li", { className: "aidos-ticket-strip" }, /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-ticket-strip-main" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-chip aidos-chip-dep", title: ref }, displayDep(ref)), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-ticket-strip-body" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-ticket-strip-title aidos-dep-card-unknown" }, "not on this board"), /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-ticket-strip-meta" }, ref))));
  }
  return /* @__PURE__ */ import_react21.default.createElement(
    TicketStrip,
    {
      ticket: known,
      meta: "depends on " + displayDep(ref),
      onOpen: open
    }
  );
}
function DependencySection(props) {
  const [query, setQuery] = import_react21.default.useState("");
  const [hits, setHits] = import_react21.default.useState(null);
  const [searching, setSearching] = import_react21.default.useState(false);
  const [adding, setAdding] = import_react21.default.useState(null);
  const current = props.dependsOn ?? [];
  async function search() {
    if (searching) return;
    if (query.trim() === "") {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      const result = await callAidosRemote(
        "searchTickets",
        { query },
        props.agentId
      );
      const rows = Array.isArray(result) ? result : [];
      setHits(rows);
    } catch (error) {
      showError2(error);
      setHits(null);
    } finally {
      setSearching(false);
    }
  }
  async function add(ref) {
    if (adding !== null) return;
    if (current.includes(ref)) {
      showToast("Already a dependency", "info");
      return;
    }
    setAdding(ref);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketId, dependsOn: [.../* @__PURE__ */ new Set([...current, ref])] },
        props.agentId
      );
      showToast("Dependency added", "success");
      props.onSaved();
    } catch (error) {
      showError2(error);
    } finally {
      setAdding(null);
    }
  }
  return /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel" }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Dependencies")), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, current.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No dependencies.") : /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-ticket-strips" }, current.map((ref) => /* @__PURE__ */ import_react21.default.createElement(
    DependencyCard,
    {
      key: ref,
      depRef: ref,
      agentId: props.agentId,
      ticketsByKey: props.ticketsByKey,
      onJump: props.onJump,
      workspaceKey: props.workspaceKey
    }
  ))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-dep-search" }, /* @__PURE__ */ import_react21.default.createElement(
    "input",
    {
      className: "aidos-dep-search-input",
      value: query,
      placeholder: "Search tickets",
      onChange: (event) => {
        setQuery(event.target.value);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void search();
        }
      }
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: searching,
      onClick: () => {
        void search();
      }
    },
    "Search"
  )), hits !== null ? /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-dep-results" }, hits.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No matches.") : hits.map((hit) => /* @__PURE__ */ import_react21.default.createElement(
    "button",
    {
      key: refOf(hit),
      className: "aidos-dep-result",
      disabled: adding !== null,
      onClick: () => {
        void add(refOf(hit));
      },
      title: refOf(hit)
    },
    /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-suggestion-title" }, hit.title),
    /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-chip aidos-chip-id" }, displayDep(refOf(hit)))
  ))) : null));
}
function EvidencePanel(props) {
  return /* @__PURE__ */ import_react21.default.createElement(
    "details",
    {
      className: "aidos-panel",
      open: !props.evidenceCollapsed,
      onToggle: (event) => {
        const open = event.target.open;
        if (open === props.evidenceCollapsed) {
          props.onToggleEvidence();
        }
      }
    },
    /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Evidence")),
    /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, props.evidence.length === 0 ? /* @__PURE__ */ import_react21.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : /* @__PURE__ */ import_react21.default.createElement("ul", { className: "aidos-evidence-list" }, props.evidence.map((row, index) => /* @__PURE__ */ import_react21.default.createElement(
      EvidenceStrip,
      {
        key: row.at ?? index,
        row,
        onView: props.onViewEvidence,
        onDelete: props.onDelete,
        deleting: props.deletingAt !== null,
        criterionLabel: typeof row.payload.criteria === "string" ? row.payload.criteria : void 0
      }
    ))), props.criteria.length > 0 ? /* @__PURE__ */ import_react21.default.createElement("details", { className: "aidos-panel aidos-panel-nested" }, /* @__PURE__ */ import_react21.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react21.default.createElement("span", { className: "aidos-panel-title" }, "Link evidence to criteria")), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-panel-body" }, /* @__PURE__ */ import_react21.default.createElement(
      CriterionLinker,
      {
        criteria: props.criteria,
        evidence: props.evidence,
        ticketIdKey: props.ticketIdKey,
        agentId: props.agentId,
        onChanged: props.onLinked
      }
    ))) : null, /* @__PURE__ */ import_react21.default.createElement(EvidenceAttach, { ticketId: props.ticketIdKey, agentId: props.agentId }))
  );
}
function DetailPanel(props) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const [deletingAt, setDeletingAt] = import_react21.default.useState(null);
  async function deleteEvidence(row) {
    if (deletingAt !== null) return;
    const at2 = row.at ?? 0;
    setDeletingAt(at2);
    try {
      await callAidosRemote(
        "userDetachEvidence",
        { ticketId: props.ticketIdKey, at: at2, rowKind: row.kind },
        props.agentId
      );
      showToast("Evidence deleted", "success");
    } catch (error) {
      showError2(error);
    } finally {
      setDeletingAt(null);
    }
  }
  return /* @__PURE__ */ import_react21.default.createElement(import_react21.default.Fragment, null, /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-detail-head" }, /* @__PURE__ */ import_react21.default.createElement(
    FieldEditor,
    {
      field: "title",
      ticketId: props.ticketIdKey,
      value: ticket.title,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react21.default.createElement("button", { className: "aidos-close-btn", onClick: props.onClose }, "\xD7")), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-detail-chips" }, /* @__PURE__ */ import_react21.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(fullTicketId(ticket)) },
      title: fullTicketId(ticket)
    },
    ticketChipLabel(ticket)
  ), /* @__PURE__ */ import_react21.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react21.default.createElement("dl", { className: "aidos-facts" }, /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "State"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, stateLabel(ticket.state))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Gate"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Confidence"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, String(ringPercent(ticket.confidenceScore)) + "%", /* @__PURE__ */ import_react21.default.createElement(
    "span",
    {
      className: "aidos-facts-asterisk",
      title: "Advisory score. It never unlocks anything."
    },
    "*"
  ))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Phase"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, String(ticket.phase))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Order"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, String(ticket.order))), /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react21.default.createElement("dt", { className: "aidos-facts-label" }, "Slug"), /* @__PURE__ */ import_react21.default.createElement("dd", { className: "aidos-facts-value" }, ticket.slug))), /* @__PURE__ */ import_react21.default.createElement(
    AllowlistRequestCard,
    {
      ticketId: props.ticketIdKey,
      agentId: props.agentId,
      onResolved: props.onFieldSaved
    }
  ), props.actions, /* @__PURE__ */ import_react21.default.createElement(
    DescriptionPanel,
    {
      ticket,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    CriteriaPanel,
    {
      ticket,
      evidence: props.evidence,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onSaved: props.onFieldSaved,
      onViewEvidence: props.onViewEvidence,
      deletingAt
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    DependencySection,
    {
      ticketId: props.ticketIdKey,
      dependsOn: ticket.dependsOn,
      agentId: props.agentId,
      onSaved: props.onFieldSaved,
      ticketsByKey: props.ticketsByKey,
      onJump: props.onJump,
      workspaceKey: ticket.workspaceKey
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    EvidencePanel,
    {
      evidence: props.evidence,
      evidenceCollapsed: props.evidenceCollapsed,
      onToggleEvidence: props.onToggleEvidence,
      onDelete: (row) => {
        void deleteEvidence(row);
      },
      deletingAt,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onViewEvidence: props.onViewEvidence,
      criteria: criteriaLines(ticket.criteria),
      onLinked: props.onFieldSaved
    }
  ));
}
function DetailView(props) {
  const [signoffOpen, setSignoffOpen] = import_react21.default.useState(false);
  const [verifyOpen, setVerifyOpen] = import_react21.default.useState(false);
  const [sendBackOpen, setSendBackOpen] = import_react21.default.useState(false);
  const [markDoneOpen, setMarkDoneOpen] = import_react21.default.useState(false);
  const [allowlistOpen, setAllowlistOpen] = import_react21.default.useState(false);
  const [viewingEvidence, setViewingEvidence] = import_react21.default.useState(null);
  const [submitting, setSubmitting] = import_react21.default.useState(false);
  const ticket = props.ticket;
  const agentId = props.agentId;
  import_react21.default.useEffect(function() {
    logDebug("detail view: ticket " + ticket.id);
  }, []);
  async function submitForReview() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await callAidosRemote(
        "userMoveTicket",
        // #93 third review, finding 1: this sent the bare `ticket.id` while
        // every sibling write in this component uses props.ticketIdKey. For a
        // FOREIGN row _routedAgent returns the caller unchanged for a number,
        // so Submit for review moved the caller's OWN ticket with that id.
        { ticketId: props.ticketIdKey, to: "awaiting_verification" },
        agentId
      );
      showToast("Submitted for review", "success");
      props.onClose();
    } catch (error) {
      showError2(error);
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ import_react21.default.createElement("div", { className: "aidos-detail" }, /* @__PURE__ */ import_react21.default.createElement(
    DetailPanel,
    {
      ticket,
      ticketIdKey: props.ticketIdKey,
      evidence: props.evidence,
      evidenceCollapsed: props.evidenceCollapsed,
      onToggleEvidence: props.onToggleEvidence,
      onClose: props.onClose,
      agentId,
      onFieldSaved: props.onFieldSaved,
      onOpenAllowlist: () => {
        setAllowlistOpen(true);
      },
      onViewEvidence: (row) => {
        setViewingEvidence(row);
      },
      actions: /* @__PURE__ */ import_react21.default.createElement(
        ActionBar,
        {
          ticket,
          evidence: props.evidence,
          onOpenSignoff: () => {
            setSignoffOpen(true);
          },
          onOpenVerify: () => {
            setVerifyOpen(true);
          },
          onOpenSendBack: () => {
            setSendBackOpen(true);
          },
          onOpenMarkDone: () => {
            setMarkDoneOpen(true);
          },
          onOpenSubmitForReview: () => {
            void submitForReview();
          },
          onOpenAllowlist: () => {
            setAllowlistOpen(true);
          }
        }
      )
    }
  ), /* @__PURE__ */ import_react21.default.createElement(
    EvidenceViewer,
    {
      row: viewingEvidence,
      onClose: () => {
        setViewingEvidence(null);
      }
    }
  ), allowlistOpen ? /* @__PURE__ */ import_react21.default.createElement(
    AllowlistEditor,
    {
      open: true,
      ticketId: ticket.id,
      ticketIdKey: props.ticketIdKey,
      currentAllowlist: ticket.allowlist ?? [],
      agentId,
      onClose: () => {
        setAllowlistOpen(false);
      },
      onSaved: props.onFieldSaved
    }
  ) : null, /* @__PURE__ */ import_react21.default.createElement(
    CommentsSection,
    {
      ticketId: props.ticketIdKey,
      comments: props.comments,
      agentId
    }
  ), signoffOpen ? /* @__PURE__ */ import_react21.default.createElement(
    SignoffDialog,
    {
      open: true,
      ticketId: props.ticketIdKey,
      ticketTitle: ticket.title,
      onClose: () => {
        setSignoffOpen(false);
      },
      onSignedOff: function() {
        setSignoffOpen(false);
      },
      agentId
    }
  ) : null, verifyOpen ? /* @__PURE__ */ import_react21.default.createElement(
    VerifyModal,
    {
      ticketId: props.ticketIdKey,
      agentId,
      onClose: () => {
        setVerifyOpen(false);
      }
    }
  ) : null, sendBackOpen ? /* @__PURE__ */ import_react21.default.createElement(
    SendBackModal,
    {
      open: true,
      ticketId: props.ticketIdKey,
      onClose: () => {
        setSendBackOpen(false);
      },
      onSentBack: function() {
        setSendBackOpen(false);
      },
      agentId
    }
  ) : null, markDoneOpen ? /* @__PURE__ */ import_react21.default.createElement(
    MarkDoneModal,
    {
      open: true,
      ticketId: props.ticketIdKey,
      ticket,
      evidence: props.evidence,
      onClose: () => {
        setMarkDoneOpen(false);
      },
      onMarkedDone: props.onClose,
      agentId
    }
  ) : null);
}

// src/client/create-ticket-modal.tsx
var import_react22 = __toESM(require("react"), 1);
function CreateTicketModal(props) {
  const [title, setTitle] = import_react22.default.useState("");
  const [description, setDescription] = import_react22.default.useState("");
  const [criteria, setCriteria] = import_react22.default.useState("");
  const [saving, setSaving] = import_react22.default.useState(false);
  import_react22.default.useEffect(function() {
    if (props.open) logDebug("create ticket modal opened");
  }, [props.open]);
  if (!props.open) return null;
  async function save() {
    if (saving) return;
    if (title.trim() === "") return;
    setSaving(true);
    try {
      const result = await callAidosRemote(
        "userSetTicket",
        { title, description, criteria },
        props.agentId
      );
      const id = typeof result === "object" && result !== null && !Array.isArray(result) && "id" in result && typeof result.id === "number" ? result.id : NaN;
      showToast("Ticket created", "success");
      props.onClose();
      if (props.onCreated !== void 0 && Number.isFinite(id)) {
        props.onCreated(id);
      }
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ import_react22.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react22.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react22.default.createElement("h3", { className: "aidos-modal-title" }, "Create a ticket"), /* @__PURE__ */ import_react22.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!saving) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react22.default.createElement("label", null, "Title"), /* @__PURE__ */ import_react22.default.createElement(
        "input",
        {
          type: "text",
          value: title,
          disabled: saving,
          onChange: (event) => {
            setTitle(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react22.default.createElement("label", null, "Description"), /* @__PURE__ */ import_react22.default.createElement(
        "textarea",
        {
          value: description,
          disabled: saving,
          onChange: (event) => {
            setDescription(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react22.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react22.default.createElement("label", null, "Criteria"), /* @__PURE__ */ import_react22.default.createElement(
        "textarea",
        {
          value: criteria,
          disabled: saving,
          onChange: (event) => {
            setCriteria(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react22.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: saving || title.trim() === "",
          onClick: save
        },
        saving ? "Saving\u2026" : "Save"
      ))
    )
  );
}

// src/client/plan-meta-modal.tsx
var import_react23 = __toESM(require("react"), 1);
function PlanMetaModal(props) {
  const [editing, setEditing] = import_react23.default.useState(null);
  const [draft, setDraft] = import_react23.default.useState("");
  const [saving, setSaving] = import_react23.default.useState(false);
  const [expanded, setExpanded] = import_react23.default.useState([]);
  import_react23.default.useEffect(function() {
    if (props.open) {
      setEditing(null);
      setDraft("");
      setExpanded([0]);
      logDebug("plan meta modal opened");
    }
  }, [props.open]);
  if (!props.open) return null;
  function beginEdit(key, text) {
    setEditing(key);
    setDraft(text);
  }
  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }
  function toggleSection(position) {
    setExpanded(
      (current) => current.includes(position) ? current.filter((item) => item !== position) : [...current, position]
    );
  }
  async function save(key) {
    if (saving) return;
    const args = {};
    if (key === "frontmatter") {
      args.frontmatter = draft;
    } else if (key === "preamble") {
      args.preamble = draft;
    } else {
      args.contextSections = (props.planMeta?.contextSections ?? []).map(
        (section, position) => position === key ? { ...section, text: draft } : { ...section }
      );
    }
    setSaving(true);
    try {
      await callAidosRemote("userSetPlanMeta", args, props.agentId);
      showToast("Plan block saved", "success");
      cancelEdit();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }
  function renderEditControls(key) {
    return /* @__PURE__ */ import_react23.default.createElement(import_react23.default.Fragment, null, /* @__PURE__ */ import_react23.default.createElement(
      "textarea",
      {
        className: "aidos-plan-meta-input",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-actions" }, /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: saving,
        onClick: () => {
          void save(key);
        }
      },
      saving ? "Saving\u2026" : "Save"
    ), /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: cancelEdit
      },
      "Cancel"
    )));
  }
  function renderNamedBlock(key, label, text) {
    return /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block", key }, /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block-head" }, /* @__PURE__ */ import_react23.default.createElement("span", { className: "aidos-plan-meta-block-title" }, label), /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: () => {
          beginEdit(key, text);
        }
      },
      "Edit"
    )), editing === key ? renderEditControls(key) : /* @__PURE__ */ import_react23.default.createElement("pre", { className: "aidos-plan-meta-text" }, text === "" ? "(empty)" : text));
  }
  function renderSectionBlock(position, heading, text) {
    const open = expanded.includes(position);
    return /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block", key: position }, /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-block-head" }, /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-plan-meta-toggle",
        onClick: () => {
          toggleSection(position);
        }
      },
      /* @__PURE__ */ import_react23.default.createElement("span", { "aria-hidden": "true" }, open ? "\u25BE" : "\u25B8"),
      heading
    ), /* @__PURE__ */ import_react23.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: () => {
          beginEdit(position, text);
        }
      },
      "Edit"
    )), editing === position || open ? editing === position ? renderEditControls(position) : /* @__PURE__ */ import_react23.default.createElement("pre", { className: "aidos-plan-meta-text" }, text === "" ? "(empty)" : text) : null);
  }
  const meta = props.planMeta;
  return /* @__PURE__ */ import_react23.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react23.default.createElement(
      "div",
      {
        className: "aidos-plan-meta-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react23.default.createElement("h3", { className: "aidos-modal-title" }, "Plan"), /* @__PURE__ */ import_react23.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!saving) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      meta === null ? /* @__PURE__ */ import_react23.default.createElement("p", { className: "aidos-plan-meta-note" }, "This project holds no plan yet.") : /* @__PURE__ */ import_react23.default.createElement("div", { className: "aidos-plan-meta-blocks" }, renderNamedBlock("frontmatter", "Frontmatter", meta.frontmatter), renderNamedBlock("preamble", "Preamble", meta.preamble), meta.contextSections.map(
        (section, position) => renderSectionBlock(position, section.heading, section.text)
      ))
    )
  );
}

// src/client/queue-panel.tsx
var import_react25 = __toESM(require("react"), 1);

// src/client/human-queue.ts
var HUMAN_ACTIONS = /* @__PURE__ */ new Set([
  "signoff",
  "verify",
  "mark-done"
]);
var QUEUE_PROMPTS = {
  signoff: "Sign off to let the agent start work",
  verify: "Verify the work and attach your row",
  "mark-done": "Verified \u2014 mark it done"
};
function derivedQueue(tickets, evidenceKindsOf) {
  const entries = [];
  for (const ticket of tickets) {
    if (ticket.state === "done") continue;
    const kinds = evidenceKindsOf(ticket);
    const available = actionsFor(ticket, kinds).filter(
      (action) => HUMAN_ACTIONS.has(action.id) && action.unavailableReason === void 0
    );
    const ids = new Set(available.map((a) => a.id));
    for (const action of available) {
      if (action.id === "verify" && ids.has("mark-done")) continue;
      entries.push({
        ticket,
        boardKey: boardKeyOf(ticket),
        actionId: action.id,
        label: action.label,
        prompt: QUEUE_PROMPTS[action.id] ?? action.label
      });
    }
  }
  return entries;
}
function humanQueue(tickets, evidenceKindsOf, nominations = [], sortKey = "suggested", approvals = []) {
  const entries = derivedQueue(tickets, evidenceKindsOf);
  for (const approval of approvals) {
    const key = String(approval.ticketId);
    const ticket = tickets.find((t) => boardKeyOf(t) === key);
    if (ticket === void 0) continue;
    const paths = Array.isArray(approval.payload?.paths) ? approval.payload.paths.filter(
      (p) => typeof p === "string"
    ) : [];
    entries.push({
      ticket,
      boardKey: boardKeyOf(ticket),
      actionId: "allowlist",
      label: "Review request",
      prompt: approval.prompt + (paths.length > 0 ? ` \u2014 ${paths.length} path(s)` : ""),
      approvalId: approval.id,
      approvalPaths: paths
    });
  }
  for (const nomination of nominations) {
    const key = String(nomination.ticketId);
    const match = entries.find(
      (entry) => entry.boardKey === key && entry.actionId === nomination.actionId
    );
    if (match === void 0) continue;
    match.nominationReason = nomination.reason;
    match.nominationId = nomination.id;
  }
  return sortQueue(entries, sortKey);
}
var QUEUE_SORT_LABELS = {
  suggested: "Suggested first",
  recent: "Recently updated",
  id: "Ticket id",
  alpha: "Title A\u2013Z"
};
function sortQueue(entries, sortKey = "suggested") {
  const rows = [...entries];
  switch (sortKey) {
    case "recent":
      return rows.sort(
        (a, b2) => b2.ticket.updatedAt - a.ticket.updatedAt || a.ticket.id - b2.ticket.id
      );
    case "id":
      return rows.sort((a, b2) => a.ticket.id - b2.ticket.id);
    case "alpha":
      return rows.sort(
        (a, b2) => a.ticket.title.localeCompare(b2.ticket.title) || a.ticket.id - b2.ticket.id
      );
    case "suggested":
    default:
      return rows.sort((a, b2) => {
        const aApproval = a.approvalId !== void 0 ? 0 : 1;
        const bApproval = b2.approvalId !== void 0 ? 0 : 1;
        if (aApproval !== bApproval) return aApproval - bApproval;
        const aNominated = a.nominationReason !== void 0 ? 0 : 1;
        const bNominated = b2.nominationReason !== void 0 ? 0 : 1;
        if (aNominated !== bNominated) return aNominated - bNominated;
        return a.ticket.phase - b2.ticket.phase || a.ticket.order - b2.ticket.order;
      });
  }
}
var ACTION_STATE = {
  signoff: "open",
  verify: "awaiting_verification",
  "mark-done": "awaiting_verification"
};
var STATE_SEQUENCE = ["open", "in_progress", "awaiting_verification", "done"];
function unmatchedNominations(tickets, evidenceKindsOf, nominations) {
  const entries = derivedQueue(tickets, evidenceKindsOf);
  const out = [];
  for (const nomination of nominations) {
    const key = String(nomination.ticketId);
    if (entries.some((e) => e.boardKey === key && e.actionId === nomination.actionId)) {
      continue;
    }
    const ticket = tickets.find((t) => boardKeyOf(t) === key);
    if (ticket === void 0) {
      out.push({
        nomination,
        kind: "not-on-board",
        reason: "#" + key + " is not on this board (it may belong to another session)"
      });
      continue;
    }
    const wanted = ACTION_STATE[nomination.actionId];
    const wantedAt = wanted === void 0 ? -1 : STATE_SEQUENCE.indexOf(wanted);
    const isAt = STATE_SEQUENCE.indexOf(ticket.state);
    if (wantedAt >= 0 && isAt > wantedAt) {
      out.push({
        nomination,
        kind: "fulfilled",
        reason: "#" + key + " is already " + ticket.state + "; the ask was answered"
      });
      continue;
    }
    out.push({
      nomination,
      kind: "unavailable",
      reason: "#" + key + " has no available " + nomination.actionId + " action right now"
    });
  }
  return out;
}

// src/client/approval-runner.tsx
var import_react24 = __toESM(require("react"), 1);
function initialValue(step) {
  switch (step.kind) {
    case "confirm":
      return { kind: "confirm", note: "" };
    case "path-list":
      return { kind: "path-list", paths: [...step.paths] };
    case "criteria-checklist": {
      const selected = step.selected ?? step.criteria.map((_criterion, index) => index);
      return {
        kind: "criteria-checklist",
        criteria: [...selected].sort((a, b2) => a - b2).map((index) => step.criteria[index]).filter((c) => typeof c === "string")
      };
    }
    case "dependency-picker":
      return { kind: "dependency-picker", ticketIds: [...step.selected ?? []] };
  }
}
function isAmended(steps, values) {
  return steps.some((step, index) => {
    const before = initialValue(step);
    const after = values[index];
    if (after === void 0) return false;
    if (before.kind === "confirm" || after.kind === "confirm") return false;
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}
function ApprovalRunner(props) {
  const steps = props.steps;
  const [index, setIndex] = import_react24.default.useState(0);
  const [values, setValues] = import_react24.default.useState(
    () => steps.map(initialValue)
  );
  const step = steps[index];
  const value = values[index];
  const last = index === steps.length - 1;
  const working = props.working === true;
  const update = (next) => {
    setValues((previous) => {
      const copy = [...previous];
      copy[index] = next;
      return copy;
    });
  };
  const advance = () => {
    if (!last) {
      setIndex(index + 1);
      return;
    }
    props.onResolve({
      status: isAmended(steps, values) ? "amended" : "approved",
      values
    });
  };
  if (step === void 0 || value === void 0) return null;
  return /* @__PURE__ */ import_react24.default.createElement(
    ModalShell,
    {
      title: steps.length > 1 ? props.title + " (" + (index + 1) + "/" + steps.length + ")" : props.title,
      working,
      onClose: props.onClose
    },
    /* @__PURE__ */ import_react24.default.createElement("div", { className: "aidos-runner-step" }, /* @__PURE__ */ import_react24.default.createElement("h4", { className: "aidos-runner-step-title" }, step.title), step.prompt !== void 0 ? /* @__PURE__ */ import_react24.default.createElement("p", { className: "aidos-runner-step-prompt" }, step.prompt) : null, /* @__PURE__ */ import_react24.default.createElement(StepBody, { step, value, working, onChange: update })),
    /* @__PURE__ */ import_react24.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react24.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: working,
        onClick: props.onClose
      },
      "Cancel"
    ), /* @__PURE__ */ import_react24.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-danger",
        disabled: working,
        title: "Answer no. The agent is told and the request is resolved.",
        onClick: () => {
          props.onResolve({ status: "rejected" });
        }
      },
      "Reject"
    ), index > 0 ? /* @__PURE__ */ import_react24.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: working,
        onClick: () => {
          setIndex(index - 1);
        }
      },
      "Back"
    ) : null, /* @__PURE__ */ import_react24.default.createElement("button", { className: "aidos-btn aidos-btn-primary", disabled: working, onClick: advance }, working ? "Working\u2026" : last ? "Confirm" : "Next"))
  );
}
function StepBody(props) {
  const { step, value, working, onChange } = props;
  if (step.kind === "confirm" && value.kind === "confirm") {
    return /* @__PURE__ */ import_react24.default.createElement(import_react24.default.Fragment, null, /* @__PURE__ */ import_react24.default.createElement(
      NoteField,
      {
        label: step.noteLabel ?? "Note (optional)",
        value: value.note,
        working,
        onChange: (note) => {
          onChange({ ...value, note });
        }
      }
    ), step.criteria !== void 0 && step.criteria.length > 0 ? /* @__PURE__ */ import_react24.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react24.default.createElement("label", null, "Link to a criterion (optional)"), /* @__PURE__ */ import_react24.default.createElement(
      "select",
      {
        className: "aidos-select",
        value: value.criterion ?? "",
        disabled: working,
        onChange: (event) => {
          const criterion = event.target.value;
          onChange({
            ...value,
            criterion: criterion === "" ? void 0 : criterion
          });
        }
      },
      /* @__PURE__ */ import_react24.default.createElement("option", { value: "" }, "\u2014 none \u2014"),
      step.criteria.map((criterion) => /* @__PURE__ */ import_react24.default.createElement("option", { key: criterion, value: criterion }, criterion))
    )) : null);
  }
  if (step.kind === "path-list" && value.kind === "path-list") {
    return /* @__PURE__ */ import_react24.default.createElement(
      LinesField,
      {
        label: step.label ?? "Paths (one per line)",
        value: value.paths.join("\n"),
        working,
        onChange: (text) => {
          onChange({ kind: "path-list", paths: linesOf(text) });
        }
      }
    );
  }
  if (step.kind === "criteria-checklist" && value.kind === "criteria-checklist") {
    const chosen = new Set(value.criteria);
    return /* @__PURE__ */ import_react24.default.createElement("ul", { className: "aidos-runner-checklist" }, step.criteria.map((criterion) => /* @__PURE__ */ import_react24.default.createElement("li", { key: criterion }, /* @__PURE__ */ import_react24.default.createElement("label", null, /* @__PURE__ */ import_react24.default.createElement(
      "input",
      {
        type: "checkbox",
        checked: chosen.has(criterion),
        disabled: working,
        onChange: () => {
          const next = new Set(chosen);
          if (next.has(criterion)) next.delete(criterion);
          else next.add(criterion);
          onChange({
            kind: "criteria-checklist",
            criteria: step.criteria.filter((c) => next.has(c))
          });
        }
      }
    ), /* @__PURE__ */ import_react24.default.createElement("span", null, criterion)))));
  }
  if (step.kind === "dependency-picker" && value.kind === "dependency-picker") {
    const chosen = new Set(value.ticketIds);
    return /* @__PURE__ */ import_react24.default.createElement("ul", { className: "aidos-ticket-strips" }, step.candidates.map((candidate) => {
      const id = String(candidate.id);
      return /* @__PURE__ */ import_react24.default.createElement(
        TicketStrip,
        {
          key: id,
          ticket: candidate,
          meta: chosen.has(id) ? "will be proposed as a dependency" : void 0,
          highlighted: chosen.has(id),
          actions: /* @__PURE__ */ import_react24.default.createElement(
            "button",
            {
              className: "aidos-btn",
              disabled: working,
              onClick: () => {
                const next = new Set(chosen);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                onChange({
                  kind: "dependency-picker",
                  ticketIds: step.candidates.map((c) => String(c.id)).filter((c) => next.has(c))
                });
              }
            },
            chosen.has(id) ? "Remove" : "Add"
          )
        }
      );
    }));
  }
  return null;
}

// src/client/queue-panel.tsx
function stepsFor(entry) {
  const criteria = entry.actionId === "verify" ? parseCriteria(entry.ticket.criteria ?? "") : [];
  const titles = {
    signoff: "Sign off on " + entry.ticket.title,
    verify: "Verify " + entry.ticket.title,
    "mark-done": "Mark " + entry.ticket.title + " done"
  };
  const prompts = {
    signoff: "Signing off moves this to in progress and grants the agent write access inside its allowlist.",
    verify: "Attaches your user_verified row. It does not move the ticket.",
    "mark-done": "This is the final state. Only you can set it."
  };
  if (entry.approvalId !== void 0) {
    return [
      {
        kind: "path-list",
        title: "Approve file access for " + entry.ticket.title,
        prompt: "The agent proposed these paths. Edit or remove any of them; approving grants write access to exactly this list.",
        label: "Paths (one per line)",
        paths: entry.approvalPaths ?? []
      }
    ];
  }
  return [
    {
      kind: "confirm",
      title: titles[entry.actionId] ?? entry.label,
      prompt: prompts[entry.actionId],
      noteLabel: "Note (optional)",
      criteria: criteria.length > 0 ? criteria : void 0
    }
  ];
}
function QueuePanel(props) {
  const [running, setRunning] = import_react25.default.useState(null);
  const [working, setWorking] = import_react25.default.useState(false);
  const [sortKey, setSortKey] = import_react25.default.useState("suggested");
  const entries = humanQueue(
    props.tickets,
    // The BOARD key, not the bare id: a foreign ticket's evidence is filed
    // under `sourceSessionId:id`, so String(ticket.id) read the wrong rows.
    (ticket) => (props.evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    props.nominations ?? [],
    sortKey,
    props.approvals ?? []
  );
  const suggested = entries.filter((e) => e.nominationReason !== void 0).length;
  const unmatched = unmatchedNominations(
    props.tickets,
    (ticket) => (props.evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    props.nominations ?? []
  );
  if (props.error != null && props.error !== "") {
    return /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue" }, /* @__PURE__ */ import_react25.default.createElement("p", { className: "aidos-queue-empty" }, "Could not load the queue: " + props.error), props.onRefresh !== void 0 ? /* @__PURE__ */ import_react25.default.createElement("button", { className: "aidos-btn", onClick: props.onRefresh }, "Retry") : null);
  }
  if (entries.length === 0) {
    return /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue" }, /* @__PURE__ */ import_react25.default.createElement("p", { className: "aidos-queue-empty" }, "Nothing is waiting on you. Every ticket is either with the agent or done."));
  }
  return /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue" }, /* @__PURE__ */ import_react25.default.createElement("div", { className: "aidos-queue-head" }, /* @__PURE__ */ import_react25.default.createElement("span", { className: "aidos-queue-count" }, entries.length + (entries.length === 1 ? " ask" : " asks"), suggested > 0 ? " \xB7 " + suggested + " suggested by the agent" : ""), /* @__PURE__ */ import_react25.default.createElement("label", { className: "aidos-queue-sort" }, /* @__PURE__ */ import_react25.default.createElement("span", null, "Sort"), /* @__PURE__ */ import_react25.default.createElement(
    "select",
    {
      className: "aidos-select",
      value: sortKey,
      onChange: (event) => {
        setSortKey(event.target.value);
      }
    },
    Object.keys(QUEUE_SORT_LABELS).map((key) => /* @__PURE__ */ import_react25.default.createElement("option", { key, value: key }, QUEUE_SORT_LABELS[key]))
  ))), unmatched.length > 0 ? /* @__PURE__ */ import_react25.default.createElement("ul", { className: "aidos-queue-unmatched" }, unmatched.map((row) => /* @__PURE__ */ import_react25.default.createElement("li", { key: row.nomination.id }, "The agent suggested " + row.nomination.actionId + " but it is not shown: " + row.reason))) : null, /* @__PURE__ */ import_react25.default.createElement("ul", { className: "aidos-ticket-strips" }, entries.map((entry) => /* @__PURE__ */ import_react25.default.createElement(
    TicketStrip,
    {
      key: entry.boardKey + ":" + entry.actionId,
      ticket: entry.ticket,
      highlighted: entry.nominationReason !== void 0 || entry.approvalId !== void 0,
      awaitingApproval: entry.approvalId !== void 0,
      meta: entry.nominationReason !== void 0 ? /* @__PURE__ */ import_react25.default.createElement("span", { className: "aidos-queue-reason" }, "the agent asks: " + entry.nominationReason) : entry.prompt,
      onOpen: () => {
        props.onOpen(entry);
      },
      actions: /* @__PURE__ */ import_react25.default.createElement(import_react25.default.Fragment, null, /* @__PURE__ */ import_react25.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          onClick: () => {
            setRunning(entry);
          }
        },
        entry.label
      ), entry.nominationId !== void 0 && props.onDismiss !== void 0 ? /* @__PURE__ */ import_react25.default.createElement(
        "button",
        {
          className: "aidos-btn",
          title: "Drop this suggestion without acting on it",
          onClick: () => {
            props.onDismiss?.(entry.nominationId);
          }
        },
        "Dismiss"
      ) : null)
    }
  ))), running !== null ? /* @__PURE__ */ import_react25.default.createElement(
    ApprovalRunner,
    {
      title: running.label,
      steps: stepsFor(running),
      working,
      onClose: () => {
        if (!working) setRunning(null);
      },
      onResolve: (outcome) => {
        if (outcome.status === "rejected") {
          if (running.approvalId === void 0) {
            setRunning(null);
            return;
          }
        }
        setWorking(true);
        void props.onAct(running, outcome).then(() => {
          setWorking(false);
          setRunning(null);
        }).catch(() => {
          setWorking(false);
        });
      }
    }
  ) : null);
}
function queueEntriesFor(tickets, evidenceByTicket, nominations = []) {
  return humanQueue(
    tickets,
    (ticket) => (evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    nominations
  );
}

// src/client/active-ticket.ts
function activeTicketRow(tickets) {
  let active = null;
  for (const ticket of tickets) {
    if (ticket.state !== "in_progress") continue;
    if (active === null || ticket.updatedAt > active.updatedAt) {
      active = ticket;
    }
  }
  return active;
}

// src/client/toast.tsx
var import_react26 = __toESM(require("react"), 1);
function ToastRow(props) {
  const toast = props.toast;
  return /* @__PURE__ */ import_react26.default.createElement("div", { className: "aidos-toast aidos-toast-" + toast.kind }, /* @__PURE__ */ import_react26.default.createElement("span", { className: "aidos-toast-text" }, toast.text), /* @__PURE__ */ import_react26.default.createElement(
    "button",
    {
      className: "aidos-toast-dismiss",
      onClick: () => {
        dismissToast(toast.id);
      },
      "aria-label": "Dismiss notification"
    },
    "\xD7"
  ));
}
function ToastContainer() {
  const [toasts2, setToasts] = import_react26.default.useState([]);
  import_react26.default.useEffect(
    function() {
      return subscribeToasts(setToasts);
    },
    []
  );
  return /* @__PURE__ */ import_react26.default.createElement("div", { className: "aidos-toast-stack" }, toasts2.map(function(toast) {
    return /* @__PURE__ */ import_react26.default.createElement(ToastRow, { key: toast.id, toast });
  }));
}

// src/client/local-ticket-view.tsx
function filterStorageKey(workspaceKey) {
  return "aidos:board:local:filter:" + workspaceKey;
}
function intersectProjectIds(stored, tickets) {
  if (stored === null) return null;
  const present = /* @__PURE__ */ new Set();
  for (const ticket of tickets) present.add(ticket.projectId);
  const kept = stored.filter((id) => present.has(id));
  if (kept.length === present.size) return null;
  return kept;
}
function restoreFilter(workspaceKey, tickets) {
  try {
    const raw = window.localStorage.getItem(filterStorageKey(workspaceKey));
    if (raw === null) return cloneAppliedState(DEFAULT_APPLIED);
    const parsed = JSON.parse(raw);
    const stateIds = Array.isArray(parsed.stateIds) ? parsed.stateIds.filter(
      (state) => STATE_CHECKLIST_ORDER.includes(state)
    ) : [...DEFAULT_APPLIED.stateIds];
    const projectIds = Array.isArray(parsed.projectIds) ? intersectProjectIds(
      parsed.projectIds.filter((id) => typeof id === "number"),
      tickets
    ) : null;
    const sortKey = parsed.sortKey === "confidence" || parsed.sortKey === "gates" || parsed.sortKey === "time" || parsed.sortKey === "alpha" ? parsed.sortKey : "confidence";
    return {
      projectIds,
      stateIds,
      sortKey,
      descending: typeof parsed.descending === "boolean" ? parsed.descending : true,
      search: typeof parsed.search === "string" ? parsed.search : ""
    };
  } catch {
    return cloneAppliedState(DEFAULT_APPLIED);
  }
}
function ticketIdFromSearch(search) {
  const match = /[?&]ticket=(\d+)/.exec(search);
  if (match === null) return null;
  return Number(match[1]);
}
function setTicketParam(id) {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete("ticket");
    window.history.replaceState({}, "", url);
  } else {
    url.searchParams.set("ticket", String(id));
    window.history.pushState({}, "", url);
  }
}
function useTopChromeClearance(ref) {
  import_react27.default.useEffect(function() {
    const node = ref.current;
    if (node === null || typeof window === "undefined") return;
    let frame = 0;
    const timers2 = [];
    const measure = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      let chromeBottom = 0;
      const consider = (element) => {
        const rect = element.getBoundingClientRect();
        if (rect.height === 0 || rect.bottom <= 0) return;
        if (rect.top > box.top + 4) return;
        if (rect.bottom > chromeBottom) chromeBottom = rect.bottom;
      };
      document.querySelectorAll(".bmu-topbar, [data-bmu-topbar]").forEach(function(bar) {
        consider(bar);
        for (const child of Array.from(bar.children)) consider(child);
      });
      if (box.width > 0 && typeof document.elementsFromPoint === "function") {
        const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + 2);
        for (const element of stack) {
          if (element === node || node.contains(element)) break;
          const position = window.getComputedStyle(element).position;
          if (position === "fixed" || position === "sticky") consider(element);
        }
      }
      const overlap = Math.max(0, Math.round(chromeBottom - box.top));
      node.style.setProperty("--aidos-top-clearance", `${overlap}px`);
      node.style.setProperty("--aidos-top-chrome", `${Math.max(0, Math.round(chromeBottom))}px`);
    };
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    for (const delay of [120, 600, 1600]) {
      timers2.push(window.setTimeout(schedule, delay));
    }
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    const viewport = window.visualViewport;
    if (viewport) viewport.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    return function() {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      for (const timer of timers2) window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (viewport) viewport.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [ref]);
}
function LocalTicketView(props) {
  const [retryNonce, setRetryNonce] = import_react27.default.useState(0);
  import_react27.default.useEffect(function() {
    logDebug("board view mounted");
  }, []);
  import_react27.default.useEffect(
    function() {
      if (retryNonce > 0) {
        logWarn(
          `#100 REMOUNT: retryNonce -> ${retryNonce}; ProjectionReader state (selection included) was destroyed`
        );
      }
    },
    [retryNonce]
  );
  return /* @__PURE__ */ import_react27.default.createElement(
    ProjectionReader,
    {
      key: retryNonce,
      sessionId: props.sessionId,
      useProjection: props.useProjection,
      onRetry: () => {
        logWarn("#100 onRetry called -> forcing a remount");
        setRetryNonce((n) => n + 1);
      }
    }
  );
}
function ProjectionReader(props) {
  const sessionId = props.sessionId;
  const ticketsProjection = props.useProjection("aidos.tickets");
  const evidenceProjection = props.useProjection("aidos.evidence");
  const commentsProjection = props.useProjection("aidos.comments");
  const planProjection = props.useProjection("aidos.plan");
  const loaded = ticketsProjection !== void 0 && evidenceProjection !== void 0 && commentsProjection !== void 0;
  const ownProjectId = Object.values(ticketsProjection ?? {})[0]?.projectId ?? null;
  const ownPlan = ownProjectId === null ? null : (planProjection ?? {})[String(ownProjectId)] ?? null;
  const [merge, setMergeState] = import_react27.default.useState(() => getMerge(sessionId));
  const [mergePending, setMergePending] = import_react27.default.useState(() => isMergePulling(sessionId) && getMerge(sessionId) === null);
  const ownVersion = ticketsProjection === void 0 ? null : JSON.stringify(ticketsProjection).length + ":" + Object.keys(ticketsProjection).length;
  import_react27.default.useEffect(function() {
    if (!loaded || ownVersion === null) return;
    if (getPulledVersion(sessionId) === ownVersion) return;
    setMergePending(getMerge(sessionId) === null);
    let cancelled = false;
    const pull = async function() {
      try {
        const result = await callAidosRemote("workspaceTickets", {}, sessionId);
        setMerge(sessionId, result);
        setMergePulling(sessionId, false);
        setPulledVersion(sessionId, ownVersion);
        if (cancelled) return;
        setMergeState(result);
        setMergePending(false);
      } catch {
        setMergePulling(sessionId, false);
        if (cancelled) return;
        setMergePending(false);
      }
    };
    void pull();
    return function() {
      cancelled = true;
    };
  }, [loaded, sessionId, ownVersion]);
  const ownRows = Object.values(ticketsProjection ?? {}).map(
    (row) => ({ ...row, sourceSessionId: sessionId, foreign: false })
  );
  const foreignRows = merge !== null ? merge.tickets.filter((row) => row.sourceSessionId !== sessionId) : [];
  const ownWorkspaceKey = ownRows.length > 0 ? ownRows[0].workspaceKey : void 0;
  const boardTickets = [
    ...ownRows,
    ...foreignRows
  ];
  const rawTickets = boardTickets;
  const ownEvidence = evidenceProjection ?? {};
  const ownComments = commentsProjection ?? {};
  const foreignEvidence = {};
  const foreignComments = {};
  if (merge !== null) {
    for (const [key, value] of Object.entries(merge.evidence)) {
      if (!key.startsWith(sessionId + ":")) foreignEvidence[key] = value;
    }
    for (const [key, value] of Object.entries(merge.comments)) {
      if (!key.startsWith(sessionId + ":")) foreignComments[key] = value;
    }
  }
  const rawEvidence = { ...foreignEvidence, ...ownEvidence };
  const rawComments = { ...foreignComments, ...ownComments };
  const allTicketsCount = rawTickets.length;
  const rawWsSet = new Set(rawTickets.map((ticket) => ticket.workspaceKey));
  const workspaceKey = rawTickets.length === 0 ? "default" : rawWsSet.size === 1 ? rawTickets[0].workspaceKey : `default:${sessionId}`;
  const [applied, setAppliedStateLocal] = import_react27.default.useState(function() {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedKeyRaw, setSelectedKeyRaw] = import_react27.default.useState(function() {
    const stored = getSelection(sessionId);
    return stored === null ? null : asBoardKey(stored);
  });
  const selectedKey = selectedKeyRaw;
  const setSelectedKey = import_react27.default.useCallback(
    function(next) {
      setSelection(sessionId, next);
      setSelectedKeyRaw(next);
    },
    [sessionId]
  );
  const [createOpen, setCreateOpen] = import_react27.default.useState(false);
  const [planOpen, setPlanOpen] = import_react27.default.useState(false);
  const [queueOpen, setQueueOpen] = import_react27.default.useState(false);
  const [nominations, setNominations] = import_react27.default.useState([]);
  const [approvals, setApprovals] = import_react27.default.useState([]);
  const ownBoardKeys = new Set(ownRows.map((row) => boardKeyOf(row)));
  const awaitingApprovalKeys = new Set(
    approvals.map((approval) => String(approval.ticketId)).filter((key) => ownBoardKeys.has(key))
  );
  const [queueError, setQueueError] = import_react27.default.useState(null);
  const refreshNominations = import_react27.default.useCallback(
    function() {
      setQueueError(null);
      void callAidosRemote("actionNominations", {}, sessionId).then((rows) => {
        setNominations(rows ?? []);
      }).catch((error2) => {
        setNominations([]);
        const detail = "nominations: " + (error2 instanceof Error ? error2.message : String(error2));
        setQueueError((prev) => prev == null ? detail : prev + "; " + detail);
      });
      void callAidosRemote("pendingApprovals", {}, sessionId).then((rows) => {
        setApprovals(rows ?? []);
      }).catch((error2) => {
        setApprovals([]);
        const detail = "approvals: " + (error2 instanceof Error ? error2.message : String(error2));
        setQueueError((prev) => prev == null ? detail : prev + "; " + detail);
      });
    },
    [sessionId]
  );
  import_react27.default.useEffect(
    function() {
      if (!queueOpen) return;
      const timer = setInterval(refreshNominations, 4e3);
      return function() {
        clearInterval(timer);
      };
    },
    [queueOpen, refreshNominations]
  );
  const [errorTimedOut, setErrorTimedOut] = import_react27.default.useState(false);
  const deepLinkHandled = import_react27.default.useRef(false);
  const restoredRef = import_react27.default.useRef(false);
  const layoutRef = import_react27.default.useRef(null);
  useTopChromeClearance(layoutRef);
  const count = openCount(rawTickets);
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count]
  );
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      logDebug("board loaded: " + allTicketsCount + " tickets");
    },
    [loaded]
  );
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      if (restoredRef.current) return;
      restoredRef.current = true;
      const restored = restoreFilter(workspaceKey, rawTickets);
      setAppliedStateLocal(restored);
      setAppliedState(sessionId, restored);
    },
    [loaded, workspaceKey]
  );
  import_react27.default.useEffect(
    function() {
      if (!loaded) return;
      if (deepLinkHandled.current) return;
      deepLinkHandled.current = true;
      const id = ticketIdFromSearch(window.location.search);
      if (id === null) return;
      const row = rawTickets.find((ticket) => ticket.id === id);
      if (row !== void 0) {
        setSelectedKey(boardKeyOf(row));
      } else {
        showToast("Ticket " + id + " not found", "info");
      }
    },
    [loaded]
  );
  import_react27.default.useEffect(function() {
    logDebug("#100 ProjectionReader MOUNTED");
    return function() {
      const had = new URL(window.location.href).searchParams.has("ticket");
      logWarn(
        `#100 ProjectionReader UNMOUNTING; ticket param present=${had}` + (had ? " -> STRIPPING IT (the deep link that could restore the selection)" : "")
      );
      if (had) setTicketParam(null);
    };
  }, []);
  import_react27.default.useEffect(
    function() {
      if (loaded) {
        setErrorTimedOut(false);
        return;
      }
      const timer = window.setTimeout(function() {
        setErrorTimedOut(true);
      }, 5e3);
      return function() {
        window.clearTimeout(timer);
      };
    },
    [loaded]
  );
  const error = errorTimedOut && !loaded ? /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-error" }, /* @__PURE__ */ import_react27.default.createElement("span", null, "The board projection is unavailable. Retry to re-read it."), /* @__PURE__ */ import_react27.default.createElement("button", { className: "aidos-btn", onClick: props.onRetry }, "Retry")) : null;
  const filtered = filterTickets(rawTickets, applied);
  function applyState(state) {
    const next = cloneAppliedState(state);
    setAppliedStateLocal(next);
    setAppliedState(sessionId, next);
    try {
      window.localStorage.setItem(filterStorageKey(workspaceKey), JSON.stringify(next));
    } catch {
    }
  }
  function clearFilters() {
    applyState(cloneAppliedState(DEFAULT_APPLIED));
  }
  function selectTicket(key) {
    if (selectedKey === key) {
      logWarn(`#100 selectTicket(${key}) matched the open selection -> TOGGLING CLOSED`);
      closeDetail();
      return;
    }
    logDebug(`#100 selectTicket(${key})`);
    setSelectedKey(key);
    const numeric = Number(key);
    setTicketParam(Number.isInteger(numeric) ? numeric : null);
  }
  function closeDetail() {
    logWarn(
      "#100 closeDetail() called; stack: " + (new Error().stack ?? "unavailable").split("\n").slice(1, 5).join(" <- ")
    );
    setSelectedKey(null);
    setTicketParam(null);
  }
  const lastSelected = import_react27.default.useRef(null);
  const resolution = resolveSelection(rawTickets, selectedKey, lastSelected.current);
  const lastLogged = import_react27.default.useRef("");
  const shape = `${resolution.reason}|sel=${selectedKey ?? "-"}|rows=${rawTickets.length}|own=${ownRows.length}|foreign=${foreignRows.length}|ref=${lastSelected.current === null ? "null" : "held"}`;
  if (shape !== lastLogged.current && (selectedKey !== null || lastSelected.current !== null)) {
    lastLogged.current = shape;
    const noisy = resolution.reason === "gone" || resolution.reason === "held";
    (noisy ? logWarn : logDebug)(`#100 select: ${shape}`);
  }
  if (resolution.reason === "resolved" || resolution.reason === "reanchored") {
    lastSelected.current = resolution.ticket;
  } else if (resolution.reason === "none" || resolution.reason === "gone") {
    lastSelected.current = null;
  }
  const reanchoredKey = resolution.reanchorKey;
  import_react27.default.useEffect(
    function() {
      if (reanchoredKey !== null) setSelectedKey(reanchoredKey);
    },
    [reanchoredKey]
  );
  const selectedTicket = resolution.ticket;
  const selectedBoardKey = selectedTicket === null ? null : boardKeyOf(selectedTicket);
  const activeRow = activeTicketRow(rawTickets);
  const activeBoardKey = activeRow === null ? null : boardKeyOf(activeRow);
  const selectedEvidence = selectedBoardKey === null ? [] : rawEvidence[selectedBoardKey] ?? [];
  const selectedComments = selectedBoardKey === null ? [] : rawComments[selectedBoardKey] ?? [];
  const [evidenceCollapsed, setEvidenceCollapsed] = import_react27.default.useState(function() {
    return evidenceIsMany(selectedEvidence);
  });
  import_react27.default.useEffect(function() {
    setEvidenceCollapsed(evidenceIsMany(selectedEvidence));
  }, [selectedTicket?.id]);
  const ticketsByKey = /* @__PURE__ */ new Map();
  const remember = (key, view) => {
    if (!ticketsByKey.has(key)) ticketsByKey.set(key, view);
  };
  for (const view of rawTickets) {
    remember(boardKeyOf(view), view);
    remember(String(view.id), view);
    remember(view.workspaceKey + ":" + String(view.id), view);
  }
  const absentNotice = resolution.absent ? /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-detail-absent", role: "status" }, "This ticket is not on the board right now. You are seeing the last version that loaded. Close the panel to return to the grid.") : null;
  const lastPanelKey = import_react27.default.useRef(null);
  if (selectedBoardKey !== lastPanelKey.current) {
    if (lastPanelKey.current !== null && selectedBoardKey !== null) {
      logWarn(
        `#100 DetailView KEY CHANGED ${lastPanelKey.current} -> ${selectedBoardKey}; it remounts and any open modal is destroyed`
      );
    } else if (lastPanelKey.current !== null && selectedBoardKey === null) {
      logWarn(`#100 detail panel CLOSING (was ${lastPanelKey.current})`);
    }
    lastPanelKey.current = selectedBoardKey;
  }
  const detailPanel = selectedTicket === null ? null : /* @__PURE__ */ import_react27.default.createElement(import_react27.default.Fragment, null, absentNotice, /* @__PURE__ */ import_react27.default.createElement(
    DetailView,
    {
      key: selectedBoardKey,
      ticket: selectedTicket,
      evidence: selectedEvidence,
      comments: selectedComments,
      evidenceCollapsed,
      onToggleEvidence: () => {
        setEvidenceCollapsed((v2) => !v2);
      },
      onClose: closeDetail,
      agentId: sessionId,
      ticketIdKey: selectedBoardKey ?? String(selectedTicket.id),
      onFieldSaved: function() {
      },
      ticketsByKey,
      onJump: selectTicket
    }
  ));
  const createModal = /* @__PURE__ */ import_react27.default.createElement(
    CreateTicketModal,
    {
      open: createOpen,
      onClose: () => {
        setCreateOpen(false);
      },
      onCreated: (id) => {
        selectTicket(asBoardKey(String(id)));
      },
      agentId: sessionId
    }
  );
  const mergeLoading = mergePending && rawTickets.length === 0;
  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-skeleton-grid" }, [0, 1, 2, 3, 4, 5].map((index) => /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-skeleton-tile", key: index })));
  } else if (mergeLoading) {
    body = /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-merge-loading", role: "status" }, /* @__PURE__ */ import_react27.default.createElement("span", { className: "aidos-merge-spinner", "aria-hidden": "true" }), /* @__PURE__ */ import_react27.default.createElement("span", null, "Loading workspace tickets\u2026"));
  } else {
    body = /* @__PURE__ */ import_react27.default.createElement(
      TicketView,
      {
        ownWorkspaceKey,
        awaitingApprovalKeys,
        sessionId,
        tickets: filtered,
        allTicketsCount,
        applied,
        selectedId: selectedKey,
        activeTicketId: activeBoardKey,
        evidenceByTicket: rawEvidence,
        onSelect: selectTicket,
        onApply: applyState,
        onJump: selectTicket,
        onClearFilters: clearFilters,
        onPlan: () => {
          setPlanOpen(true);
        },
        onCreate: () => {
          setCreateOpen(true);
        },
        onQueue: () => {
          refreshNominations();
          setQueueOpen(true);
        },
        queueCount: queueEntriesFor(rawTickets, rawEvidence).length
      }
    );
  }
  async function performQueueAction(entry, outcome) {
    if (outcome.status === "rejected") {
      if (entry.approvalId !== void 0) {
        await callAidosRemote(
          "resolveApproval",
          { requestId: entry.approvalId, approved: false },
          sessionId
        );
        showToast("Request rejected", "info");
      }
      return;
    }
    const first = outcome.values[0];
    const note = first !== void 0 && first.kind === "confirm" ? first.note.trim() : "";
    const criterion = first !== void 0 && first.kind === "confirm" ? first.criterion : void 0;
    const payload = {};
    if (note !== "") payload.note = note;
    if (criterion !== void 0) payload.criteria = criterion;
    const ticketId = entry.boardKey;
    try {
      if (entry.approvalId !== void 0) {
        const step = outcome.values[0];
        const paths = step !== void 0 && step.kind === "path-list" ? step.paths : [];
        await callAidosRemote(
          "resolveApproval",
          { requestId: entry.approvalId, approved: true, paths },
          sessionId
        );
        showToast("Approved " + paths.length + " path(s)", "success");
        return;
      }
      if (entry.actionId === "signoff") {
        await callAidosRemote(
          "userAttachEvidence",
          { ticketId, kind: "builtin:user_signoff", payload },
          sessionId
        );
        try {
          await callAidosRemote(
            "userMoveTicket",
            { ticketId, to: "in_progress" },
            sessionId
          );
        } catch (moveError) {
          const detail = moveError instanceof Error ? moveError.message : String(moveError);
          throw new Error(
            `the signoff row was attached to #${ticketId}, but the move to in_progress failed: ${detail} \u2014 the row is already there, so move the ticket from its detail panel rather than signing off again`
          );
        }
        showToast("Signed off", "success");
      } else if (entry.actionId === "verify") {
        await callAidosRemote(
          "userAttachEvidence",
          { ticketId, kind: "builtin:user_verified", payload },
          sessionId
        );
        showToast("Verified", "success");
      } else if (entry.actionId === "mark-done") {
        await callAidosRemote("userMoveTicket", { ticketId, to: "done" }, sessionId);
        showToast("Marked done", "success");
      }
    } catch (error2) {
      showToast(error2 instanceof Error ? error2.message : String(error2), "refusal");
      throw error2;
    }
  }
  const queueModal = queueOpen ? /* @__PURE__ */ import_react27.default.createElement(
    ModalShell,
    {
      title: "Waiting on you",
      wide: true,
      onClose: () => {
        setQueueOpen(false);
      }
    },
    /* @__PURE__ */ import_react27.default.createElement(
      QueuePanel,
      {
        tickets: rawTickets,
        evidenceByTicket: rawEvidence,
        nominations,
        approvals,
        error: queueError,
        onRefresh: refreshNominations,
        onOpen: (entry) => {
          setQueueOpen(false);
          selectTicket(entry.boardKey);
        },
        onAct: async (entry, outcome) => {
          await performQueueAction(entry, outcome);
          refreshNominations();
        },
        onDismiss: (nominationId) => {
          void callAidosRemote("dismissNomination", { nominationId }, sessionId).then(() => {
            showToast("Suggestion dismissed", "info");
            refreshNominations();
          }).catch((error2) => {
            showToast(
              error2 instanceof Error ? error2.message : String(error2),
              "refusal"
            );
          });
        }
      }
    )
  ) : null;
  const planModal = /* @__PURE__ */ import_react27.default.createElement(
    PlanMetaModal,
    {
      open: planOpen,
      planMeta: ownPlan === null ? null : {
        frontmatter: ownPlan.frontmatter,
        preamble: ownPlan.context.preamble,
        contextSections: ownPlan.context.contextSections
      },
      agentId: sessionId,
      onClose: () => {
        setPlanOpen(false);
      }
    }
  );
  return /* @__PURE__ */ import_react27.default.createElement(import_react27.default.Fragment, null, /* @__PURE__ */ import_react27.default.createElement("div", { className: "aidos-layout", ref: layoutRef, "data-conversation-composer-overlay": "" }, body, detailPanel), createModal, planModal, queueModal, /* @__PURE__ */ import_react27.default.createElement(ToastContainer, null));
}

// src/client/index.ts
var name = "aidos";
var inject = ["slots"];
var AIDOS_PRESET = "aidos";
function injectStyles() {
  if (typeof document === "undefined") return;
  for (const sheet of [
    { marker: "aidos/board.css", text: board_default },
    { marker: "aidos/plan-meta.css", text: plan_meta_default }
  ]) {
    if (document.querySelector(`style[data-plugin-css="${sheet.marker}"]`) !== null) {
      continue;
    }
    const tag = document.createElement("style");
    tag.dataset.plugin = "aidos";
    tag.dataset.pluginCss = sheet.marker;
    tag.textContent = sheet.text;
    document.head.appendChild(tag);
  }
}
function registerTicketsTab(slots) {
  return slots.inject(
    "conversation.view",
    () => slots.register(
      {
        name: "conversation.view",
        id: "tickets",
        order: 20,
        label: badgeLabel
      },
      LocalTicketView
    )
  );
}
function apply(ctx) {
  injectStyles();
  let registration = null;
  let want = false;
  function reconcile(slots) {
    if (want && registration === null) {
      registration = registerTicketsTab(slots);
    }
    if (!want && registration !== null) {
      registration();
      registration = null;
    }
  }
  ctx.effect(function() {
    const slots = ctx.get("slots");
    if (slots === void 0) return () => {
    };
    const sessions = ctx.get("sessions");
    if (sessions === void 0 || typeof sessions.list?.getSnapshot !== "function" || typeof sessions.list?.subscribe !== "function") {
      want = true;
      reconcile(slots);
      return function() {
        want = false;
        reconcile(slots);
      };
    }
    let list = sessions.list.getSnapshot();
    const sync = function() {
      const preset = list.current ? list.byId[list.current]?.agentPreset : void 0;
      want = preset === void 0 || preset === AIDOS_PRESET;
      reconcile(slots);
    };
    const disposeSubscribe = sessions.list.subscribe(function() {
      list = sessions.list.getSnapshot();
      sync();
    });
    sync();
    return function() {
      disposeSubscribe();
      want = false;
      reconcile(slots);
    };
  }, "aidos: tickets tab visibility");
  let lastLabel = badgeLabel();
  setCountCallback(function() {
    if (registration === null) return;
    const next = badgeLabel();
    if (next === lastLabel) return;
    lastLabel = next;
    const slots = ctx.get("slots");
    if (slots === void 0) return;
    registration();
    registration = registerTicketsTab(slots);
  });
}
		return module.exports;
	}
});
