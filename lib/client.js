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
var board_default = '/* Dark Settings Form Control Design System \u2014 applied to aidos board */\n\n/* \u2500\u2500 1. Tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n:root,\n.aidos-root {\n  --bg: #2c2c2e;\n  --surface: #232324;\n  --surface-hover: #303032;\n  --surface-active: #43454a;\n  --border: #3e3e3f;\n  --border-subtle: #303031;\n  --border-focus: #66676b;\n  --text-primary: #f9fafb;\n  --text-secondary: #adb2b8;\n  --text-muted: #88898a;\n  --text-disabled: #757575;\n  --control-text: #f9fafb;\n  --radius-sm: 0.375rem;\n  --radius-md: 0.625rem;\n  --radius-lg: 0.875rem;\n  --radius-pill: 999rem;\n  --space-1: 0.5rem;\n  --space-2: 1rem;\n  --space-3: 1.5rem;\n  --space-4: 2rem;\n  --space-5: 2.5rem;\n  --space-6: 3rem;\n\n  /* Id badge hues (U6): mid-saturation backgrounds that keep white text readable. */\n  --badge-hue-1: #4e6fa8;\n  --badge-hue-2: #7a5ea0;\n  --badge-hue-3: #2f8a7f;\n  --badge-hue-4: #a86a4e;\n  --badge-hue-5: #5f8a3c;\n  --badge-hue-6: #a85578;\n  --badge-hue-7: #3c7fa8;\n  --badge-hue-8: #8a8a3c;\n\n  /* State chips (U14): mid-saturation backgrounds that keep white text readable. */\n  --state-open: #4e5a66;\n  --state-in-progress: #3c6ea5;\n  --state-awaiting: #a07a2a;\n  --state-done: #3f8a52;\n  --metric-bg: #3a3c41;\n}\n\n/* \u2500\u2500 2. Typography + base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-root {\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-1);\n  padding: 0.75rem 1rem 1.5rem;\n  width: 100%;\n  min-height: 0;\n  height: 100%;\n  max-height: 100%;\n  overflow: hidden;\n  background: var(--bg);\n  color: var(--text-primary);\n  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n\n.aidos-root *,\n.aidos-detail,\n.aidos-detail *,\n.aidos-modal,\n.aidos-modal * {\n  box-sizing: border-box;\n}\n\n/* page title helper (spec \xA73) \u2014 used by board chrome if needed */\n.aidos-page-title {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 650;\n  line-height: 1.2;\n  color: var(--text-primary);\n}\n\n/* \u2500\u2500 3. Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-layout {\n  display: flex;\n  gap: var(--space-2);\n  align-items: stretch;\n  height: var(--aidos-board-height, 100%);\n  min-width: 0;\n  width: 100%;\n  /* The view sets --aidos-board-height at runtime: the room left inside the\n     nearest scrolling ancestor, below the top of the board. The fallback\n     keeps the board inside the window when no measurement arrives. */\n  max-height: var(--aidos-board-height, 100dvh);\n  overflow: hidden;\n  flex: 1;\n}\n\n/* U18: the board tiles inside the view. The layout caps its own height, and\n   each pane scrolls on its own, so the page behind the board never scrolls.\n   A host that gives no definite height leaves the cap at the viewport. */\n\n/* U18: the board tiles inside the view. The layout caps its own height, and\n   each pane scrolls on its own, so the page behind the board never scrolls.\n   A host that gives no definite height leaves the cap at the viewport. */\n.aidos-layout:has(> .aidos-detail) {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  align-items: stretch;\n}\n\n.aidos-layout > .aidos-detail {\n  height: 100%;\n  max-height: 100%;\n  min-height: 0;\n  overflow-y: auto;\n  width: auto;\n}\n\n/* The detail panel is a column flex box with a capped height, so its\n   children must never shrink. Without this the summary table (overflow\n   hidden) collapses on a ticket with a long description. */\n.aidos-layout > .aidos-detail > * {\n  flex: none;\n}\n\n\n.aidos-grid-wrap {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);\n  min-height: 0;\n  overflow-y: auto;\n}\n\n/* The toolbar row sits above the filter bar: the ticket count on the left and\n   the board actions on the right. It stays outside the scrolling grid, so it\n   never moves. */\n.aidos-toolbar {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-1);\n  flex: none;\n  padding-block: 2px;\n}\n\n.aidos-toolbar-actions {\n  display: flex;\n  align-items: center;\n  gap: var(--space-1);\n}\n\n.aidos-board-grid {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 10px;\n  align-content: start;\n}\n\n@media (max-width: 1400px) {\n  .aidos-board-grid {\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }\n}\n\n@media (max-width: 900px) {\n  .aidos-board-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n}\n\n/* Detail open: the grid drops one column step (spec \xA75). */\n.aidos-layout:has(> .aidos-detail) .aidos-board-grid {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}\n\n@media (max-width: 1400px) {\n  .aidos-layout:has(> .aidos-detail) .aidos-board-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n}\n\n@media (max-width: 900px) {\n  .aidos-layout:has(> .aidos-detail) .aidos-board-grid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n}\n/* \u2500\u2500 4. Section headers (spec \xA75) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-panel-section {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-1);\n}\n\n.aidos-panel-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-1);\n}\n\n.aidos-panel-title,\n.section-title {\n  margin: 0;\n  font-size: 1.125rem;\n  line-height: 1.2;\n  font-weight: 600;\n  color: var(--text-primary);\n  text-transform: none;\n  letter-spacing: 0;\n}\n\n.aidos-panel-title {\n  font-size: 11px;\n  line-height: 16px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  color: var(--text-muted);\n}\n\n.section-description {\n  margin: 0.625rem 0 0;\n  color: var(--text-secondary);\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n\n/* \u2500\u2500 5. Setting card (spec \xA76) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.setting-card,\n.aidos-detail,\n.aidos-sidebar {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  padding: 1.25rem;\n}\n\n.aidos-filterbar {\n  flex: none;\n  width: 100%;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  padding: 6px 10px;\n}\n\n.aidos-filterbar-left {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n.aidos-filter-chips {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n\n.aidos-filter-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  border: 1px solid var(--border);\n  border-radius: 4px;\n  background: var(--surface);\n  color: var(--text-secondary);\n  font-size: 11px;\n  line-height: 18px;\n  padding: 2px 8px;\n  cursor: pointer;\n}\n\n.aidos-filter-chip-on {\n  background: var(--surface-active);\n  color: var(--text-primary);\n  border-color: var(--border-focus);\n}\n\n.aidos-filter-chip .aidos-check-count {\n  margin-left: 0;\n}\n\n.aidos-filterbar .aidos-sort-row select,\n.aidos-filter-project {\n  height: 1.75rem;\n  border-radius: 4px;\n  border: 1px solid var(--border);\n  background: var(--surface);\n  color: var(--text-primary);\n  font-size: 12px;\n  padding: 0 6px;\n}\n\n.aidos-filterbar-search {\n  width: 180px;\n}\n\n.aidos-detail {\n  flex: none;\n  width: 300px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  align-self: flex-start;\n}\n\n/* checkbox that lives inside a setting-card grid (spec \xA76) */\n.setting-card {\n  display: grid;\n  grid-template-columns: 1.25rem 1fr;\n  gap: 1rem;\n  align-items: start;\n}\n\n.setting-checkbox {\n  width: 1.25rem;\n  height: 1.25rem;\n  flex: 0 0 1.25rem;\n  border-radius: 0.1875rem;\n  accent-color: var(--text-primary);\n}\n\n/* \u2500\u2500 6. Segmented control (spec \xA77) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.segmented-control {\n  display: flex;\n  padding: 0.25rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.segment {\n  min-width: 8.75rem;\n  height: 2.375rem;\n  border: 0;\n  border-radius: 0.4375rem;\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n\n.segment[data-active="true"] {\n  background: var(--surface-active);\n  color: var(--text-primary);\n  font-weight: 600;\n}\n\n/* \u2500\u2500 7. Control list (spec \xA78) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.control-list {\n  overflow: hidden;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.control-list-row {\n  min-height: 3rem;\n  padding: 0 0.875rem;\n  display: flex;\n  align-items: center;\n  gap: 0.625rem;\n}\n\n.control-list-row + .control-list-row {\n  border-top: 1px solid var(--border-subtle);\n}\n\n/* criteria \u2014 one bullet per criterion (spec \xA76) */\n.aidos-criteria {\n  margin: 0;\n  padding-left: 18px;\n  list-style: disc;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.aidos-criterion {\n  min-width: 0;\n  font-size: 13px;\n  line-height: 22px;\n  padding-block: 2px;\n  color: var(--text-secondary);\n}\n\n/* One criterion row holds the label plus its icon controls. The controls\n   sit on the right and reach full opacity only on hover or focus inside\n   the row. */\n.aidos-criterion-row {\n  display: flex;\n  align-items: baseline;\n  gap: 6px;\n  min-width: 0;\n}\n\n.aidos-criterion-actions {\n  display: inline-flex;\n  align-items: center;\n  flex: none;\n  gap: 2px;\n  margin-left: auto;\n  opacity: 0;\n}\n\n.aidos-criterion-row:hover .aidos-criterion-actions,\n.aidos-criterion-row:focus-within .aidos-criterion-actions {\n  opacity: 1;\n}\n\n/* Last row of the criteria block: an input plus a small add button. */\n.aidos-criteria-add {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.aidos-criteria-add input,\n.aidos-criterion-row input {\n  flex: 1;\n  min-width: 0;\n  height: 1.75rem;\n  font-size: 12px;\n  padding-inline: 6px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  background: var(--surface);\n  color: var(--text-primary);\n}\n\n.aidos-criterion-uncovered {\n  color: var(--text-muted);\n  background: var(--surface-hover);\n}\n\n.aidos-evidence-delete {\n  flex: none;\n  margin-left: auto;\n  width: 18px;\n  height: 18px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: 0;\n  border-radius: 3px;\n  background: transparent;\n  color: var(--text-muted);\n  font-size: 10px;\n  line-height: 1;\n  cursor: pointer;\n}\n\n.aidos-evidence-delete:hover {\n  background: var(--surface-active);\n  color: #f9fafb;\n}\n\n.aidos-evidence-delete:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n\n.aidos-evidence-kind {\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.aidos-evidence-author {\n  color: var(--text-muted);\n}\n\n.aidos-evidence-meta {\n  color: var(--text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.aidos-evidence-body {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n/* \u2500\u2500 8. Chips (spec \xA73, \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-chip {\n  height: 20px;\n  display: inline-flex;\n  align-items: center;\n  padding-inline: 7px;\n  border: 0;\n  border-radius: 3px;\n  background: var(--metric-bg);\n  color: #f9fafb;\n  font-size: 11px;\n  line-height: 16px;\n  font-weight: 600;\n  white-space: nowrap;\n  flex: none;\n}\n\n/* The markup sets the hashed background inline. This fallback keeps the chip readable without it. */\n.aidos-chip-id,\n.aidos-chip-kind,\n.aidos-chip-dep {\n  background: var(--badge-hue-1);\n}\n\n/* A kind chip splits when it carries a count: the keyword keeps the kind\n   color, and the count segment inverts it. The chip drops its own inline\n   padding so the count segment reaches the chip edge. */\n.aidos-chip-kind {\n  padding-inline: 0;\n  overflow: hidden;\n  letter-spacing: 0.04em;\n}\n\n.aidos-chip-key {\n  padding-inline: 7px;\n}\n\n.aidos-chip-count {\n  align-self: stretch;\n  display: inline-flex;\n  align-items: center;\n  padding-inline: 5px;\n  background: #f9fafb;\n  font-weight: 700;\n}\n\n\n.aidos-chip-state-open {\n  background: var(--state-open);\n}\n\n.aidos-chip-state-in-progress {\n  background: var(--state-in-progress);\n}\n\n.aidos-chip-state-awaiting-verification {\n  background: var(--state-awaiting);\n}\n\n.aidos-chip-state-done {\n  background: var(--state-done);\n}\n\n.aidos-dep-row {\n  display: flex;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n\n/* \u2500\u2500 9. Icon button (spec \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.icon-button,\n.aidos-close-btn {\n  width: 2rem;\n  height: 2rem;\n  display: inline-grid;\n  place-items: center;\n  border: 0;\n  border-radius: var(--radius-sm);\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 1.25rem;\n  cursor: pointer;\n}\n\n.icon-button:hover,\n.aidos-close-btn:hover {\n  background: var(--surface-hover);\n  color: var(--text-primary);\n}\n\n.aidos-close-btn {\n  border: none;\n  font-size: 16px;\n  line-height: 16px;\n  padding: 0;\n}\n\n/* \u2500\u2500 10. Mode switch (spec \xA711) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.mode-switch {\n  display: inline-flex;\n  padding: 0.25rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.mode-switch > button {\n  height: 2.125rem;\n  padding-inline: 1.25rem;\n  border: 0;\n  border-radius: var(--radius-sm);\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n\n.mode-switch > button[data-active="true"] {\n  background: var(--surface-active);\n  color: var(--text-primary);\n  font-weight: 600;\n}\n\n/* \u2500\u2500 11. Text input (spec \xA712) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.text-input,\n.aidos-search-input,\n.aidos-dep-search-input,\n.aidos-field-editor-input,\n.aidos-evidence-attach-kind-select,\n.aidos-evidence-attach-note,\n.aidos-comment-textarea,\n.aidos-modal-row input,\n.aidos-modal-row textarea,\n.aidos-modal-row select {\n  height: 2.5rem;\n  width: 100%;\n  padding-inline: 0.75rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n  color: var(--text-primary);\n  font-size: 0.875rem;\n  outline: none;\n  font-family: inherit;\n}\n\n.aidos-search-input,\n.aidos-dep-search-input,\n.aidos-field-editor-input,\n.aidos-evidence-attach-kind-select {\n  height: 2.5rem;\n}\n\n.aidos-modal-row textarea,\n.aidos-evidence-attach-note,\n.aidos-comment-textarea,\n.aidos-field-editor-input[type="textarea"] {\n  height: auto;\n  min-height: 2.5rem;\n  padding-block: 0.5rem;\n  resize: none;\n}\n\n.text-input::placeholder,\n.aidos-search-input::placeholder,\n.aidos-dep-search-input::placeholder,\n.aidos-field-editor-input::placeholder,\n.aidos-modal-row input::placeholder,\n.aidos-modal-row textarea::placeholder {\n  color: var(--text-muted);\n}\n\n.text-input:focus,\n.aidos-search-input:focus,\n.aidos-dep-search-input:focus,\n.aidos-field-editor-input:focus,\n.aidos-evidence-attach-kind-select:focus,\n.aidos-evidence-attach-note:focus,\n.aidos-comment-textarea:focus,\n.aidos-modal-row input:focus,\n.aidos-modal-row textarea:focus,\n.aidos-modal-row select:focus {\n  border-color: var(--border-focus);\n}\n\n/* forms never overflow their container (spec \xA78) */\n.aidos-root input,\n.aidos-root textarea,\n.aidos-root select,\n.aidos-detail input,\n.aidos-detail textarea,\n.aidos-detail select,\n.aidos-modal input,\n.aidos-modal textarea,\n.aidos-modal select {\n  box-sizing: border-box;\n  max-width: 100%;\n  min-width: 0;\n}\n\n/* search box wrapper */\n.aidos-search-box {\n  position: relative;\n}\n\n.aidos-autocomplete {\n  position: absolute;\n  z-index: 20;\n  top: calc(100% + 2px);\n  left: 0;\n  right: 0;\n  max-height: 220px;\n  overflow: auto;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);\n}\n\n.aidos-suggestion {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  text-align: left;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: none;\n  border: none;\n  padding: 6px 8px;\n  cursor: pointer;\n}\n\n.aidos-suggestion:hover {\n  background: var(--surface-hover);\n}\n\n.aidos-suggestion-title {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* \u2500\u2500 12. Primary button (spec \xA713) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.primary-button,\n.aidos-btn-primary,\n.aidos-action-btn-primary,\n.aidos-comment-send,\n.aidos-evidence-attach-form .aidos-btn-primary {\n  width: auto;\n}\n\n.aidos-comment-send {\n  height: 2rem;\n  padding-inline: 0.75rem;\n  border: 0;\n  border-radius: 4px;\n  background: #adb2b8;\n  color: #232324;\n  font-size: 0.8125rem;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.primary-button:disabled,\n.aidos-btn-primary:disabled,\n.aidos-action-btn-primary:disabled,\n.aidos-comment-send:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n/* secondary button \u2014 muted bordered pill, not high-contrast */\n.aidos-btn,\n.aidos-action-btn-secondary,\n.aidos-btn-dot {\n  cursor: pointer;\n  border: 1px solid var(--border);\n  background: var(--surface);\n  color: var(--text-secondary);\n  border-radius: 4px;\n  font-size: 12px;\n  line-height: 20px;\n  padding: 5px 12px;\n}\n\n.aidos-btn:hover,\n.aidos-action-btn-secondary:hover {\n  background: var(--surface-hover);\n  color: var(--text-primary);\n  border-color: var(--border);\n}\n\n.aidos-btn:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n.aidos-btn-dot {\n  position: relative;\n}\n\n.aidos-btn-dot::after {\n  content: "";\n  position: absolute;\n  top: -3px;\n  right: -3px;\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: #adb2b8;\n  border: 1px solid var(--surface);\n}\n\n.aidos-toggle-btn {\n  min-width: 0;\n  border-radius: var(--radius-sm);\n  height: 1.75rem;\n}\n\n.aidos-sidebar-toggle {\n  margin-left: auto;\n}\n\n/* \u2500\u2500 13. Checkbox field (spec \xA714) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.checkbox-field,\n.aidos-check-row {\n  display: flex;\n  align-items: center;\n  gap: 0.625rem;\n  color: var(--text-secondary);\n  font-size: 0.84375rem;\n  cursor: pointer;\n  line-height: 18px;\n}\n\n.aidos-check-row input[type="checkbox"] {\n  width: 1.125rem;\n  height: 1.125rem;\n  flex: 0 0 1.125rem;\n  accent-color: var(--text-primary);\n  cursor: pointer;\n  border-radius: 0.1875rem;\n}\n\n.aidos-check-count {\n  color: var(--text-muted);\n  margin-left: auto;\n}\n\n.aidos-check-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n/* \u2500\u2500 14. Tile \u2014 reinterpreted as setting-card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-tile {\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  height: 168px;\n  flex: none;\n  padding: 10px 12px;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  min-width: 0;\n  overflow: hidden;\n  text-align: left;\n  color: var(--text-primary);\n}\n.aidos-tile-preview {\n  margin: 0;\n  font-size: 12px;\n  line-height: 16px;\n  color: var(--text-secondary);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.aidos-tile:hover {\n  background: var(--surface-hover);\n  border-color: var(--border);\n}\n\n.aidos-tile-selected {\n  border-color: var(--border-focus);\n  background: var(--surface-hover);\n}\n\n.aidos-tile-title {\n  font-size: 13px;\n  font-weight: 600;\n  line-height: 18px;\n  margin: 0;\n  overflow: hidden;\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  color: var(--text-primary);\n}\n\n.aidos-tile-meta {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 6px;\n  min-width: 0;\n}\n\n.aidos-tile-chips {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  margin-top: auto;\n  min-width: 0;\n  white-space: nowrap;\n  overflow: hidden;\n}\n\n/* The confidence ring and the tile gate text are gone: the tile shows a gate\n   chip and a confidence chip instead (U15). */\n\n/* detail header / body. The head keeps the title on the left and the\n   close button on the right. */\n.aidos-detail-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-detail-title {\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 20px;\n  margin: 0;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--text-primary);\n}\n\n/* Chip row between the header and the facts table. */\n.aidos-detail-chips {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n/* Small square control for a 12px icon. It carries no border and no\n   background until hover. */\n.aidos-icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  flex: none;\n  width: 20px;\n  height: 20px;\n  padding: 4px;\n  box-sizing: content-box;\n  border: 0;\n  border-radius: 3px;\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 12px;\n  line-height: 1;\n  vertical-align: middle;\n  cursor: pointer;\n}\n\n.aidos-icon-btn:hover,\n.aidos-icon-btn:focus-visible {\n  background: var(--surface-hover);\n  color: var(--text-primary);\n}\n\n.aidos-detail-body {\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n\n.aidos-detail-note {\n  font-size: 0.8125rem;\n  line-height: 16px;\n  color: var(--text-secondary);\n  margin: 0;\n}\n\n/* quick facts (spec \xA76) */\n.aidos-facts {\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  overflow: hidden;\n}\n\n.aidos-facts-row {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 8px;\n  padding: 7px 10px;\n}\n\n.aidos-facts-row + .aidos-facts-row {\n  border-top: 1px solid var(--border-subtle);\n}\n\n.aidos-facts-label {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--text-muted);\n}\n\n.aidos-facts-value {\n  margin: 0;\n  font-size: 0.8125rem;\n  line-height: 16px;\n  color: var(--text-primary);\n}\n\n.aidos-facts-asterisk {\n  margin-left: 2px;\n  color: var(--text-secondary);\n  cursor: help;\n}\n\n/* description section (U7, U8) */\n.aidos-description {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n/* collapsible sections (U9) */\n.aidos-collapsible {\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  padding: 8px;\n}\n/* detail panels (spec \xA76) */\n.aidos-panel {\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  padding: 10px 12px;\n  min-width: 0;\n}\n\n/* Panels sit in the detail column flex box, so the 10px gap separates them.\n   The margin keeps stacked panels apart when markup skips the flex gap. */\n.aidos-panel + .aidos-panel {\n  margin-top: 10px;\n}\n\n/* The panel head is the disclosure summary. It keeps the title on the left\n   and draws its own chevron on the right. */\n.aidos-panel-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-1);\n  padding-block: 2px;\n  list-style: none;\n  cursor: pointer;\n}\n\n.aidos-panel-head::-webkit-details-marker {\n  display: none;\n}\n\n.aidos-panel-head::after {\n  content: "";\n  flex: none;\n  width: 6px;\n  height: 6px;\n  margin-left: auto;\n  border-right: 1.5px solid var(--text-muted);\n  border-bottom: 1.5px solid var(--text-muted);\n  /* Closed points right. Open points down. */\n  transform: rotate(-45deg);\n  transition: transform 0.15s ease;\n}\n\n.aidos-panel[open] > .aidos-panel-head::after {\n  transform: rotate(45deg);\n}\n\n.aidos-panel-body {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding-top: 8px;\n  min-width: 0;\n}\n\n\n/* evidence \u2014 one row reads as one bullet on one line (spec \xA76) */\n.aidos-evidence-list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.aidos-evidence-item {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  padding-block: 4px;\n  font-size: 12px;\n  line-height: 20px;\n  min-width: 0;\n  white-space: nowrap;\n  overflow: hidden;\n}\n\n/* rendered markdown (spec \xA77) */\n.aidos-md {\n  min-width: 0;\n  font-size: 13px;\n  line-height: 20px;\n  color: var(--text-secondary);\n}\n\n.aidos-md p {\n  margin: 0 0 6px;\n}\n\n.aidos-md p:last-child {\n  margin-bottom: 0;\n}\n\n.aidos-md ul,\n.aidos-md ol {\n  margin: 0 0 6px;\n  padding-left: 18px;\n}\n\n.aidos-md li {\n  margin: 0;\n}\n\n.aidos-md code {\n  padding: 0 3px;\n  border-radius: 3px;\n  background: var(--surface-active);\n  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  font-size: 12px;\n}\n\n.aidos-md pre {\n  margin: 0 0 6px;\n  padding: 6px 8px;\n  border-radius: 3px;\n  background: var(--surface-active);\n  overflow-x: auto;\n}\n\n.aidos-md pre code {\n  padding: 0;\n  background: none;\n}\n\n.aidos-md a {\n  color: var(--text-primary);\n}\n\n.aidos-md strong {\n  color: var(--text-primary);\n}\n\n.aidos-md em {\n  color: var(--text-secondary);\n}\n\n.aidos-md h1,\n.aidos-md h2,\n.aidos-md h3,\n.aidos-md h4 {\n  margin: 8px 0 6px;\n  color: var(--text-primary);\n  font-weight: 600;\n}\n\n.aidos-md h1 {\n  font-size: 14px;\n  line-height: 20px;\n}\n\n.aidos-md h2 {\n  font-size: 13px;\n  line-height: 20px;\n}\n\n.aidos-md h3 {\n  font-size: 13px;\n  line-height: 20px;\n}\n\n.aidos-md h4 {\n  font-size: 12px;\n  line-height: 18px;\n}\n\n.aidos-md blockquote {\n  margin: 0 0 6px;\n  padding-left: 8px;\n  border-left: 2px solid var(--border);\n  color: var(--text-muted);\n}\n\n.aidos-md-clipped {\n  max-height: 320px;\n  overflow: hidden;\n  -webkit-mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);\n  mask-image: linear-gradient(to bottom, #000 78%, transparent 100%);\n}\n\n.aidos-md-more {\n  align-self: flex-start;\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 11px;\n  line-height: 16px;\n  font-weight: 600;\n  color: var(--text-secondary);\n  cursor: pointer;\n}\n\n.aidos-md-more:hover {\n  color: var(--text-primary);\n}\n\n/* sort row \u2014 style select as text-input */\n.aidos-sort-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.aidos-sort-row select {\n  flex: 1;\n  min-width: 0;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  padding: 4px 8px;\n  height: 2.5rem;\n}\n\n.aidos-sort-row select:focus {\n  border-color: var(--border-focus);\n  outline: none;\n}\n\n.aidos-actions-row {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n}\n\n/* dependency search */\n.aidos-dep-search {\n  display: flex;\n  gap: 6px;\n}\n\n.aidos-dep-results {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n  overflow: hidden;\n}\n\n.aidos-dep-result {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  text-align: left;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: none;\n  border: none;\n  padding: 6px 8px;\n  cursor: pointer;\n}\n\n.aidos-dep-result:hover {\n  background: var(--surface-hover);\n}\n\n.aidos-dep-result:disabled {\n  cursor: default;\n  opacity: 0.6;\n}\n\n/* empty / error */\n.aidos-empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n  padding: 40px 16px;\n  text-align: center;\n  color: var(--text-secondary);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  background: var(--surface);\n}\n\n.aidos-empty-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0;\n  color: var(--text-primary);\n}\n\n.aidos-empty-note {\n  font-size: 0.875rem;\n  line-height: 1.5;\n  margin: 0;\n  color: var(--text-secondary);\n}\n\n.aidos-error {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n  padding: 24px 16px;\n  color: var(--text-primary);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  background: var(--surface);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n/* skeleton */\n.aidos-skeleton-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));\n  gap: 14px;\n}\n\n.aidos-skeleton-tile {\n  aspect-ratio: 1 / 1;\n  border-radius: var(--radius-lg);\n  background: var(--surface);\n  border: 1px solid var(--border-subtle);\n}\n\n/* modal */\n.aidos-modal-mask {\n  position: fixed;\n  inset: 0;\n  z-index: 100;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.55);\n}\n\n.aidos-modal {\n  box-sizing: border-box;\n  width: 420px;\n  max-width: calc(100vw - 32px);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 1.25rem;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);\n  color: var(--text-primary);\n}\n\n.aidos-modal-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-modal-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0;\n  line-height: 1.2;\n  color: var(--text-primary);\n}\n\n.aidos-modal-body {\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n\n/* toast */\n.aidos-toast-stack {\n  position: fixed;\n  z-index: 200;\n  left: 50%;\n  bottom: 32px;\n  transform: translateX(-50%);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  pointer-events: none;\n}\n\n.aidos-toast {\n  pointer-events: auto;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  max-width: min(560px, calc(100vw - 32px));\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  padding: 8px 14px;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);\n}\n\n.aidos-toast-text {\n  flex: 1;\n  min-width: 0;\n}\n\n.aidos-toast-refusal {\n  border-left: 3px solid #e07a5f;\n}\n\n.aidos-toast-info {\n  border-left: 3px solid var(--text-secondary);\n}\n\n.aidos-toast-success {\n  border-left: 3px solid #adb2b8;\n}\n\n.aidos-toast-dismiss {\n  cursor: pointer;\n  flex: none;\n  border: none;\n  background: none;\n  color: var(--text-secondary);\n  font-size: 16px;\n  line-height: 16px;\n  padding: 0;\n}\n\n.aidos-toast-dismiss:hover {\n  color: var(--text-primary);\n}\n\n/* modal form */\n.aidos-modal-form {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.aidos-modal-row {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.aidos-modal-row label {\n  font-size: 0.8125rem;\n  line-height: 18px;\n  color: var(--text-secondary);\n}\n\n/* field editor */\n.aidos-field-editor {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n/* action bar */\n/* The action bar is the footer of the detail pane. It pins to the bottom of\n   the scroll box, so the state moves stay in reach while the panel scrolls. */\n.aidos-action-bar {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: flex-end;\n  position: sticky;\n  bottom: 0;\n  z-index: 1;\n  margin-top: auto;\n  padding-block: 8px;\n  border-top: 1px solid var(--border-subtle);\n  background: var(--bg);\n}\n\n/* spoiler (submit-for-review) */\n.aidos-spoiler {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.aidos-spoiler-summary {\n  cursor: pointer;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-secondary);\n}\n\n/* comments */\n/* A row of controls that sits at the right edge of its block: the comment\n   send button, the evidence attach button, and the save and cancel pair of an\n   inline editor. */\n.aidos-form-actions {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 8px;\n}\n\n/* The inline editor of a panel: the raw text behind a rendered block. */\n.aidos-panel-body textarea {\n  width: 100%;\n  min-height: 9rem;\n  padding: 8px 10px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  background: var(--surface);\n  color: var(--text-primary);\n  font: inherit;\n  resize: vertical;\n}\n\n.aidos-comment {\n  font-size: 12px;\n  line-height: 20px;\n  color: var(--text-primary);\n  background: var(--bg);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 8px 10px;\n}\n\n/* evidence attach form */\n.aidos-evidence-attach-form {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n/* active marker */\n.aidos-active-marker {\n  flex: none;\n  font-size: 10px;\n  line-height: 14px;\n  color: #232324;\n  background: #adb2b8;\n  border-radius: var(--radius-pill);\n  padding: 0 8px;\n  white-space: nowrap;\n}\n\n/* helper text (spec \xA713) */\n.helper-text {\n  font-size: 0.8125rem;\n  color: var(--text-secondary);\n  line-height: 1.5;\n  margin: 0;\n}\n\n/* \u2500\u2500 15. Responsive (spec \xA720) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (max-width: 700px) {\n  .aidos-root {\n    padding: 1.5rem 1rem 2.5rem;\n  }\n\n  .aidos-layout {\n    flex-direction: column;\n  }\n\n  .aidos-sidebar,\n  .aidos-detail {\n    width: 100%;\n  }\n\n  .segmented-control,\n  .mode-switch {\n    width: 100%;\n  }\n\n  .segment,\n  .mode-switch > button {\n    flex: 1;\n  }\n\n  .control-list-row {\n    flex-wrap: wrap;\n  }\n}\n\n/* \u2500\u2500 workspace merge loading \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-merge-loading {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n  min-height: 240px;\n  gap: 10px;\n  padding: 24px 4px;\n  color: var(--text-secondary);\n  font-size: 12px;\n}\n\n.aidos-merge-spinner {\n  width: 14px;\n  height: 14px;\n  flex: none;\n  border: 2px solid var(--border);\n  border-top-color: var(--text-secondary);\n  border-radius: 50%;\n  animation: aidos-merge-spin 0.8s linear infinite;\n}\n\n@keyframes aidos-merge-spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .aidos-merge-spinner {\n    animation-duration: 2s;\n  }\n}\n';

// css-text:/home/sid/repos/aidos/src/client/plan-meta.css
var plan_meta_default = "/* Plan-meta modal styles (Ticket U12). Board.css owns the shared modal\n   tokens; this file styles only the aidos-plan-meta-* classes. */\n\n.aidos-plan-meta-modal {\n  box-sizing: border-box;\n  width: 640px;\n  max-width: calc(100vw - 32px);\n  max-height: calc(100vh - 96px);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 1.25rem;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);\n  color: var(--text-primary);\n}\n\n.aidos-plan-meta-blocks {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  overflow-y: auto;\n}\n\n.aidos-plan-meta-block {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 8px;\n  background: var(--bg);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n}\n\n.aidos-plan-meta-block-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-plan-meta-block-title {\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.aidos-plan-meta-toggle {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 0;\n  border: none;\n  background: none;\n  font: inherit;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--text-primary);\n  cursor: pointer;\n  text-align: left;\n}\n\n.aidos-plan-meta-toggle:hover {\n  color: var(--text-secondary);\n}\n\n.aidos-plan-meta-text {\n  margin: 0;\n  padding: 6px 8px;\n  font-family: inherit;\n  font-size: 0.8125rem;\n  line-height: 1.5;\n  white-space: pre-wrap;\n  word-break: break-word;\n  color: var(--text-secondary);\n  background: var(--surface);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-sm);\n  max-height: 240px;\n  overflow-y: auto;\n}\n\n.aidos-plan-meta-input {\n  box-sizing: border-box;\n  width: 100%;\n  min-height: 96px;\n  padding: 6px 8px;\n  font: inherit;\n  font-size: 0.8125rem;\n  line-height: 1.5;\n  color: var(--control-text);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  resize: vertical;\n}\n\n.aidos-plan-meta-input:focus {\n  outline: none;\n  border-color: var(--border-focus);\n}\n\n.aidos-plan-meta-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.aidos-plan-meta-note {\n  margin: 0;\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n";

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
    label: "Review pass",
    description: "A reviewer read the change and reported findings.",
    weight: 1,
    allowedAuthors: ["agent", "user"]
  },
  {
    id: "builtin:review_note",
    label: "Review note",
    description: "A remark from a review.",
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
    label: "Comment",
    description: "A remark on the ticket.",
    weight: 0.5,
    allowedAuthors: ["user", "agent"]
  },
  {
    id: "builtin:imported_state",
    label: "Imported state",
    description: "The state that a plan document claimed at import time.",
    weight: 0,
    allowedAuthors: ["system"]
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
    allowedActors: ["user", "agent"]
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
  gates: [...DEFAULT_GATES]
};

// src/client/board-logic.ts
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
    out.push(group.criterion);
  }
  return out;
}
function evidenceIsMany(evidence, threshold = 6) {
  return evidence.length > threshold;
}
var KIND_COLORS = [
  "var(--border)",
  "var(--border-subtle)",
  "var(--text-secondary)",
  "var(--text-muted)",
  "var(--surface-active)",
  "var(--surface-hover)"
];
function kindColor(kind) {
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
  "builtin:review_pass": "REVIEWED",
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
function evidenceKindCounts(evidence) {
  const counts2 = /* @__PURE__ */ new Map();
  for (const row of evidence) {
    counts2.set(row.kind, (counts2.get(row.kind) ?? 0) + 1);
  }
  const out = [];
  for (const [kind, count] of counts2) {
    out.push({ kind, count, color: kindColor(kind) });
  }
  out.sort((a, b2) => {
    if (b2.count !== a.count) return b2.count - a.count;
    if (a.kind < b2.kind) return -1;
    if (a.kind > b2.kind) return 1;
    return 0;
  });
  return out;
}
function displayDep(ref) {
  return ref.replace(/^--.*--:/, "aidos#");
}
function fullTicketId(ticket) {
  return ticket.workspaceKey + ":" + ticket.slug;
}
function ticketChipLabel(ticket) {
  return displayDep(ticket.workspaceKey + ":" + ticket.id);
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

// src/client/view-state.ts
var DEFAULT_APPLIED = {
  projectIds: null,
  stateIds: [...STATE_CHECKLIST_ORDER],
  sortKey: "confidence",
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
var import_react17 = __toESM(require("react"), 1);

// src/client/ticket-view.tsx
var import_react4 = __toESM(require("react"), 1);

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
        props.onJump(String(ticket.id));
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
        props.onJump(String(ticket.id));
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
var import_react3 = __toESM(require("react"), 1);

// src/client/evidence-tags.tsx
var import_react2 = __toESM(require("react"), 1);
function EvidenceTags({ evidence }) {
  const counts2 = evidenceKindCounts(evidence);
  if (counts2.length === 0) return null;
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, counts2.map((count) => /* @__PURE__ */ import_react2.default.createElement(
    "span",
    {
      key: count.kind,
      className: "aidos-chip aidos-chip-kind",
      style: { background: count.color },
      title: kindDescription(count.kind)
    },
    /* @__PURE__ */ import_react2.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(count.kind)),
    count.count > 1 ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "aidos-chip-count", style: { color: count.color } }, String(count.count)) : null
  )));
}

// src/client/ticket-tile.tsx
function TicketTile(props) {
  const ticket = props.ticket;
  const className = "aidos-tile" + (props.selected ? " aidos-tile-selected" : "");
  const badge = badgeClass(ticket.state);
  return /* @__PURE__ */ import_react3.default.createElement("button", { className, onClick: props.onSelect }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "aidos-tile-meta" }, /* @__PURE__ */ import_react3.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(fullTicketId(ticket)) },
      title: fullTicketId(ticket)
    },
    ticketChipLabel(ticket)
  ), /* @__PURE__ */ import_react3.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react3.default.createElement("h3", { className: "aidos-tile-title" }, ticket.title), /* @__PURE__ */ import_react3.default.createElement("p", { className: "aidos-tile-preview" }, ticket.description), /* @__PURE__ */ import_react3.default.createElement("div", { className: "aidos-tile-chips" }, /* @__PURE__ */ import_react3.default.createElement("span", { className: "aidos-chip aidos-chip-metric" }, "Gate " + formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))), /* @__PURE__ */ import_react3.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-metric",
      title: "Advisory score. It never unlocks anything."
    },
    "Conf " + ringPercent(ticket.confidenceScore) + "%"
  ), /* @__PURE__ */ import_react3.default.createElement(EvidenceTags, { evidence: props.evidence }), ticket.dependsOn?.map((ref) => /* @__PURE__ */ import_react3.default.createElement("span", { key: ref, className: "aidos-chip aidos-chip-dep", title: ref }, displayDep(ref)))), props.active === true ? /* @__PURE__ */ import_react3.default.createElement("span", { className: "aidos-active-marker" }, "Active") : null);
}

// src/client/ticket-view.tsx
function TicketView(props) {
  const [collapsed, setCollapsed] = import_react4.default.useState(false);
  const boardKeyOf = (ticket) => ticket.foreign === true && ticket.sourceSessionId !== void 0 ? ticket.sourceSessionId + ":" + ticket.id : String(ticket.id);
  const tiles = props.tickets.map((ticket) => /* @__PURE__ */ import_react4.default.createElement(
    TicketTile,
    {
      key: boardKeyOf(ticket),
      ticket,
      evidence: props.evidenceByTicket?.[boardKeyOf(ticket)] ?? [],
      selected: boardKeyOf(ticket) === props.selectedId,
      active: boardKeyOf(ticket) === props.activeTicketId,
      onSelect: () => {
        props.onSelect(boardKeyOf(ticket));
      }
    }
  ));
  let content;
  if (props.allTicketsCount === 0) {
    content = /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-empty" }, /* @__PURE__ */ import_react4.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets yet"), /* @__PURE__ */ import_react4.default.createElement("p", { className: "aidos-empty-note" }, "This session holds no tickets. Create the first one to start the board."), /* @__PURE__ */ import_react4.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create a ticket"));
  } else if (props.tickets.length === 0) {
    content = /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-empty" }, /* @__PURE__ */ import_react4.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets match"), /* @__PURE__ */ import_react4.default.createElement("p", { className: "aidos-empty-note" }, "The active filters hide every ticket. Clear them to see the board."), /* @__PURE__ */ import_react4.default.createElement("button", { className: "aidos-btn", onClick: props.onClearFilters }, "Clear filters"));
  } else {
    content = /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-board-grid" }, tiles);
  }
  return /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-root" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-toolbar" }, /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-empty-note" }, props.tickets.length + " of " + props.allTicketsCount + " tickets"), /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-toolbar-actions" }, /* @__PURE__ */ import_react4.default.createElement("button", { className: "aidos-btn", onClick: props.onPlan }, "Plan"), /* @__PURE__ */ import_react4.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create"))), /* @__PURE__ */ import_react4.default.createElement(
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
  ), /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-grid-wrap" }, content));
}

// src/client/detail-panel.tsx
var import_react13 = __toESM(require("react"), 1);

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

// src/client/icons.tsx
var import_react5 = __toESM(require("react"), 1);
function PencilIcon() {
  return /* @__PURE__ */ import_react5.default.createElement(
    "svg",
    {
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      fill: "none",
      stroke: "currentColor",
      "aria-hidden": "true"
    },
    /* @__PURE__ */ import_react5.default.createElement("path", { d: "M8.5 1.5l2 2L4 10l-2.5.5L2 8z" })
  );
}
function TrashIcon() {
  return /* @__PURE__ */ import_react5.default.createElement(
    "svg",
    {
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      fill: "none",
      stroke: "currentColor",
      "aria-hidden": "true"
    },
    /* @__PURE__ */ import_react5.default.createElement("path", { d: "M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3" })
  );
}

// src/client/field-editor.tsx
var TEXTAREA_FIELDS = ["description", "criteria"];
function FieldEditor(props) {
  const [editing, setEditing] = import_react6.default.useState(false);
  const [draft, setDraft] = import_react6.default.useState(String(props.value));
  const [saving, setSaving] = import_react6.default.useState(false);
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
    return /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-field-editor" }, isTextarea ? /* @__PURE__ */ import_react6.default.createElement(
      "textarea",
      {
        className: "aidos-field-editor-input",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ) : /* @__PURE__ */ import_react6.default.createElement(
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
    ), /* @__PURE__ */ import_react6.default.createElement("span", null, /* @__PURE__ */ import_react6.default.createElement("button", { className: "aidos-btn", disabled: saving, onClick: save }, "Save"), " ", /* @__PURE__ */ import_react6.default.createElement("button", { className: "aidos-btn", disabled: saving, onClick: cancel }, "Cancel")));
  }
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-field-editor" }, /* @__PURE__ */ import_react6.default.createElement("span", null, props.children !== void 0 ? props.children : String(props.value), " ", /* @__PURE__ */ import_react6.default.createElement(
    "button",
    {
      className: "aidos-icon-btn",
      title: "Edit",
      "aria-label": "Edit " + props.field,
      onClick: beginEdit
    },
    /* @__PURE__ */ import_react6.default.createElement(PencilIcon, null)
  )));
}

// src/client/action-bar.tsx
var import_react7 = __toESM(require("react"), 1);

// src/client/action-visibility.ts
function actionsFor(ticket) {
  switch (ticket.state) {
    case "open":
      return [{ id: "signoff", label: "Sign off", primary: true }];
    case "in_progress":
      return [{ id: "submit-for-review", label: "Submit for review" }];
    case "awaiting_verification":
      return [
        { id: "send-back", label: "Send back" },
        { id: "mark-done", label: "Mark done", primary: true }
      ];
    case "done":
      return [];
  }
}

// src/client/action-bar.tsx
var OPENERS = {
  signoff: "onOpenSignoff",
  "submit-for-review": "onOpenSubmitForReview",
  "send-back": "onOpenSendBack",
  "mark-done": "onOpenMarkDone"
};
function ActionBar(props) {
  const actions = actionsFor(props.ticket);
  import_react7.default.useEffect(function() {
    logDebug("action bar mounted");
  }, []);
  if (actions.length === 0) return null;
  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]];
    if (action.id === "submit-for-review") {
      return /* @__PURE__ */ import_react7.default.createElement("details", { className: "aidos-spoiler", key: action.id }, /* @__PURE__ */ import_react7.default.createElement("summary", { className: "aidos-spoiler-summary" }, "Advanced"), /* @__PURE__ */ import_react7.default.createElement(
        "button",
        {
          className: "aidos-action-btn-secondary",
          onClick: opener
        },
        action.label
      ));
    }
    const className = action.primary ? "aidos-action-btn-primary" : "aidos-action-btn-secondary";
    return /* @__PURE__ */ import_react7.default.createElement("button", { className, key: action.id, onClick: opener }, action.label);
  });
  return /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-action-bar" }, buttons);
}

// src/client/comments-section.tsx
var import_react8 = __toESM(require("react"), 1);
var EMPTY_COMMENTS = [];
function CommentsSection(props) {
  const comments = props.comments ?? EMPTY_COMMENTS;
  const [draft, setDraft] = import_react8.default.useState("");
  const [sending, setSending] = import_react8.default.useState(false);
  import_react8.default.useEffect(function() {
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
    return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-comment", key: index }, /* @__PURE__ */ import_react8.default.createElement("div", null, /* @__PURE__ */ import_react8.default.createElement("span", { className: "aidos-evidence-author" }, comment.author)), /* @__PURE__ */ import_react8.default.createElement("p", { className: "aidos-detail-body" }, comment.text), /* @__PURE__ */ import_react8.default.createElement("p", { className: "aidos-detail-note" }, time));
  });
  return /* @__PURE__ */ import_react8.default.createElement("details", { className: "aidos-panel", open: comments.length !== 1 }, /* @__PURE__ */ import_react8.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react8.default.createElement("h4", { className: "aidos-panel-title" }, "Comments")), /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-panel-body" }, rows.length === 0 ? /* @__PURE__ */ import_react8.default.createElement("p", { className: "aidos-detail-note" }, "No comments yet.") : rows, /* @__PURE__ */ import_react8.default.createElement(
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
  ), /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react8.default.createElement(
    "button",
    {
      className: "aidos-comment-send",
      disabled: sending || draft.trim() === "",
      onClick: send
    },
    "Send"
  ))));
}

// src/client/evidence-attach-form.tsx
var import_react9 = __toESM(require("react"), 1);

// src/client/user-evidence-kinds.ts
var HUMAN_ONLY_IDS = ["builtin:user_signoff", "builtin:user_verified", "builtin:file_allowlist"];
var SYSTEM_ONLY_ID = "builtin:imported_state";
function userEvidenceKinds() {
  const humanOnly = [];
  const rest = [];
  for (const kind of BUILTIN_KINDS) {
    if (!kind.allowedAuthors.includes("user")) continue;
    if (kind.id === SYSTEM_ONLY_ID) continue;
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

// src/client/evidence-attach-form.tsx
function EvidenceAttachForm(props) {
  const kinds = userEvidenceKinds();
  const [kind, setKind] = import_react9.default.useState(kinds.length > 0 ? kinds[0].id : "");
  const [note, setNote] = import_react9.default.useState("");
  const [working, setWorking] = import_react9.default.useState(false);
  async function attach() {
    if (working) return;
    if (kind === "") return;
    setWorking(true);
    try {
      const payload = note.trim() === "" ? {} : { note };
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind, payload },
        props.agentId
      );
      showToast("Evidence attached", "success");
      setNote("");
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
  return /* @__PURE__ */ import_react9.default.createElement(
    "form",
    {
      className: "aidos-evidence-attach-form",
      onSubmit: (event) => {
        event.preventDefault();
        void attach();
      }
    },
    /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "Evidence kind"), /* @__PURE__ */ import_react9.default.createElement(
      "select",
      {
        className: "aidos-evidence-attach-kind-select",
        value: kind,
        disabled: working,
        onChange: (event) => {
          setKind(event.target.value);
        }
      },
      kinds.map((descriptor) => /* @__PURE__ */ import_react9.default.createElement("option", { value: descriptor.id, key: descriptor.id }, descriptor.label))
    )),
    /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react9.default.createElement("label", null, "Note (optional)"), /* @__PURE__ */ import_react9.default.createElement(
      "textarea",
      {
        className: "aidos-evidence-attach-note",
        value: note,
        disabled: working,
        onChange: (event) => {
          setNote(event.target.value);
        }
      }
    )),
    /* @__PURE__ */ import_react9.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react9.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: working || kind === "",
        type: "submit"
      },
      working ? "Working\u2026" : "Attach"
    ))
  );
}

// src/client/signoff-dialog.tsx
var import_react10 = __toESM(require("react"), 1);
function SignoffDialog(props) {
  const [working, setWorking] = import_react10.default.useState(false);
  import_react10.default.useEffect(function() {
    if (props.open) logDebug("signoff dialog opened");
  }, [props.open]);
  if (!props.open) return null;
  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
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
  return /* @__PURE__ */ import_react10.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!working) props.onClose();
      }
    },
    /* @__PURE__ */ import_react10.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react10.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react10.default.createElement("h3", { className: "aidos-modal-title" }, "Sign off ticket"), /* @__PURE__ */ import_react10.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!working) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react10.default.createElement("p", { className: "aidos-modal-body" }, "Signoff grants the agent write access on this ticket. Confirm to proceed."),
      /* @__PURE__ */ import_react10.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react10.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: working,
          onClick: confirm
        },
        working ? "Working\u2026" : "Confirm"
      ))
    )
  );
}

// src/client/send-back-modal.tsx
var import_react11 = __toESM(require("react"), 1);
function SendBackModal(props) {
  const [reason, setReason] = import_react11.default.useState("");
  const [working, setWorking] = import_react11.default.useState(false);
  import_react11.default.useEffect(function() {
    if (props.open) logDebug("send back modal opened");
  }, [props.open]);
  if (!props.open) return null;
  async function sendBack() {
    if (working) return;
    if (reason.trim() === "") return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: reason },
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
  return /* @__PURE__ */ import_react11.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!working) props.onClose();
      }
    },
    /* @__PURE__ */ import_react11.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react11.default.createElement("h3", { className: "aidos-modal-title" }, "Send back"), /* @__PURE__ */ import_react11.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!working) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react11.default.createElement("p", { className: "aidos-modal-body" }, "Send the ticket back to in progress. The reason attaches as a comment."),
      /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react11.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react11.default.createElement("label", null, "Reason"), /* @__PURE__ */ import_react11.default.createElement(
        "textarea",
        {
          value: reason,
          disabled: working,
          onChange: (event) => {
            setReason(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react11.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: working || reason.trim() === "",
          onClick: sendBack
        },
        working ? "Working\u2026" : "Send back"
      ))
    )
  );
}

// src/client/mark-done-modal.tsx
var import_react12 = __toESM(require("react"), 1);
function MarkDoneModal(props) {
  const [step, setStep] = import_react12.default.useState(1);
  const [finalComment, setFinalComment] = import_react12.default.useState("");
  const [working, setWorking] = import_react12.default.useState(false);
  import_react12.default.useEffect(function() {
    if (props.open) logDebug("mark done modal opened");
  }, [props.open]);
  if (!props.open) return null;
  const criteriaLines2 = props.ticket.criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const kindCounts = /* @__PURE__ */ new Map();
  for (const row of props.evidence) {
    kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + 1);
  }
  const summary = [];
  for (const [kind, count] of kindCounts) {
    summary.push({ kind, count });
  }
  summary.sort((a, b2) => {
    if (a.count !== b2.count) return b2.count - a.count;
    if (a.kind < b2.kind) return -1;
    if (a.kind > b2.kind) return 1;
    return 0;
  });
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
  return /* @__PURE__ */ import_react12.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!working) props.onClose();
      }
    },
    /* @__PURE__ */ import_react12.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react12.default.createElement("h3", { className: "aidos-modal-title" }, "Mark done"), /* @__PURE__ */ import_react12.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            if (!working) props.onClose();
          },
          "aria-label": "Close"
        },
        "\xD7"
      )),
      step === 1 ? /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react12.default.createElement("p", { className: "aidos-modal-body" }, "The ticket criteria:"), criteriaLines2.length === 0 ? /* @__PURE__ */ import_react12.default.createElement("p", { className: "aidos-detail-note" }, "No criteria on this ticket.") : /* @__PURE__ */ import_react12.default.createElement("ul", { className: "aidos-check-list" }, criteriaLines2.map((line) => /* @__PURE__ */ import_react12.default.createElement("li", { className: "aidos-check-row", key: line }, line))), /* @__PURE__ */ import_react12.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          onClick: () => {
            setStep(2);
          }
        },
        "Continue"
      )) : /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react12.default.createElement("p", { className: "aidos-modal-body" }, "The evidence summary:"), summary.length === 0 ? /* @__PURE__ */ import_react12.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : /* @__PURE__ */ import_react12.default.createElement("ul", { className: "aidos-check-list" }, summary.map((entry) => /* @__PURE__ */ import_react12.default.createElement("li", { className: "aidos-check-row", key: entry.kind }, entry.kind + ": " + entry.count))), /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react12.default.createElement("label", null, "Final comment (optional)"), /* @__PURE__ */ import_react12.default.createElement(
        "textarea",
        {
          value: finalComment,
          disabled: working,
          onChange: (event) => {
            setFinalComment(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react12.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-btn-primary",
          disabled: working,
          onClick: confirm
        },
        working ? "Working\u2026" : "Confirm"
      ))
    )
  );
}

// src/client/detail-panel.tsx
var DESCRIPTION_CLIP_CHARS = 800;
function showError(error) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}
function DescriptionPanel(props) {
  const [editing, setEditing] = import_react13.default.useState(false);
  const [draft, setDraft] = import_react13.default.useState("");
  const [saving, setSaving] = import_react13.default.useState(false);
  const [expanded, setExpanded] = import_react13.default.useState(false);
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
      showError(error);
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
    body = /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement(
      "textarea",
      {
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-form-actions" }, /* @__PURE__ */ import_react13.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: saving,
        onClick: () => {
          void save();
        }
      },
      "Save"
    ), /* @__PURE__ */ import_react13.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: cancel
      },
      "Cancel"
    )));
  } else if (empty) {
    body = /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No description.");
  } else {
    body = /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement(
      "div",
      {
        className: "aidos-md" + (clipped ? " aidos-md-clipped" : ""),
        dangerouslySetInnerHTML: { __html: html }
      }
    ), long ? /* @__PURE__ */ import_react13.default.createElement(
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
  return /* @__PURE__ */ import_react13.default.createElement("details", { className: "aidos-panel", open: true }, /* @__PURE__ */ import_react13.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-panel-title" }, "Description"), /* @__PURE__ */ import_react13.default.createElement(
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
    /* @__PURE__ */ import_react13.default.createElement(PencilIcon, null)
  )), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-body" }, body));
}
function CriterionEditor(props) {
  const [draft, setDraft] = import_react13.default.useState(props.line);
  return /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-criterion-row" }, /* @__PURE__ */ import_react13.default.createElement(
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
  ), /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-criterion-actions" }, /* @__PURE__ */ import_react13.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: props.saving,
      onClick: () => {
        props.onSave(draft);
      }
    },
    "Save"
  ), /* @__PURE__ */ import_react13.default.createElement(
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
  const [editingIndex, setEditingIndex] = import_react13.default.useState(null);
  const [saving, setSaving] = import_react13.default.useState(false);
  const [addDraft, setAddDraft] = import_react13.default.useState("");
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
      showError(error);
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
  return /* @__PURE__ */ import_react13.default.createElement("details", { className: "aidos-panel" }, /* @__PURE__ */ import_react13.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-panel-title" }, "Criteria " + covered + "/" + lines.length)), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-body" }, lines.length === 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No criteria.") : /* @__PURE__ */ import_react13.default.createElement("ul", { className: "aidos-criteria" }, lines.map((line, index) => /* @__PURE__ */ import_react13.default.createElement(
    "li",
    {
      key: index + ":" + line,
      className: uncoveredSet.has(line) ? "aidos-criterion aidos-criterion-uncovered" : "aidos-criterion"
    },
    editingIndex === index ? /* @__PURE__ */ import_react13.default.createElement(
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
    ) : /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-criterion-row" }, line, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-criterion-actions" }, /* @__PURE__ */ import_react13.default.createElement(
      "button",
      {
        className: "aidos-icon-btn",
        title: "Edit",
        "aria-label": "Edit criterion " + (index + 1),
        onClick: () => {
          setEditingIndex(index);
        }
      },
      /* @__PURE__ */ import_react13.default.createElement(PencilIcon, null)
    ), /* @__PURE__ */ import_react13.default.createElement(
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
      /* @__PURE__ */ import_react13.default.createElement(TrashIcon, null)
    )))
  )), /* @__PURE__ */ import_react13.default.createElement("li", { className: "aidos-criteria-add" }, /* @__PURE__ */ import_react13.default.createElement(
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
  ), /* @__PURE__ */ import_react13.default.createElement(
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
function DependencySection(props) {
  const [query, setQuery] = import_react13.default.useState("");
  const [hits, setHits] = import_react13.default.useState(null);
  const [searching, setSearching] = import_react13.default.useState(false);
  const [adding, setAdding] = import_react13.default.useState(null);
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
      showError(error);
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
      showError(error);
    } finally {
      setAdding(null);
    }
  }
  return /* @__PURE__ */ import_react13.default.createElement("details", { className: "aidos-panel" }, /* @__PURE__ */ import_react13.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-panel-title" }, "Dependencies")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-body" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-dep-row" }, current.length === 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No dependencies.") : current.map((ref) => /* @__PURE__ */ import_react13.default.createElement("span", { key: ref, className: "aidos-chip aidos-chip-dep", title: ref }, displayDep(ref)))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-dep-search" }, /* @__PURE__ */ import_react13.default.createElement(
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
  ), /* @__PURE__ */ import_react13.default.createElement(
    "button",
    {
      className: "aidos-btn",
      disabled: searching,
      onClick: () => {
        void search();
      }
    },
    "Search"
  )), hits !== null ? /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-dep-results" }, hits.length === 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No matches.") : hits.map((hit) => /* @__PURE__ */ import_react13.default.createElement(
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
    /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-suggestion-title" }, hit.title),
    /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-chip aidos-chip-id" }, displayDep(refOf(hit)))
  ))) : null));
}
function EvidencePanel(props) {
  return /* @__PURE__ */ import_react13.default.createElement(
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
    /* @__PURE__ */ import_react13.default.createElement("summary", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-panel-title" }, "Evidence")),
    /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-body" }, props.evidence.length === 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : /* @__PURE__ */ import_react13.default.createElement("ul", { className: "aidos-evidence-list" }, props.evidence.map((row, index) => /* @__PURE__ */ import_react13.default.createElement("li", { className: "aidos-evidence-item", key: row.at ?? index }, /* @__PURE__ */ import_react13.default.createElement(
      "span",
      {
        className: "aidos-chip aidos-chip-kind aidos-evidence-kind",
        style: { background: kindColor(row.kind) },
        title: kindDescription(row.kind)
      },
      /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-chip-key" }, kindKeyword(row.kind))
    ), /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-evidence-author" }, row.author), typeof row.payload.criteria === "string" ? /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-evidence-meta" }, "criterion: " + row.payload.criteria) : null, row.kind === "builtin:imported_state" && typeof row.payload.claimed_state === "string" ? /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-evidence-meta" }, "plan claimed: " + row.payload.claimed_state) : null, /* @__PURE__ */ import_react13.default.createElement(
      "button",
      {
        className: "aidos-evidence-delete",
        title: "Delete this evidence row",
        disabled: props.deletingAt !== null,
        onClick: () => {
          props.onDelete(row);
        }
      },
      "\u2715"
    )))), /* @__PURE__ */ import_react13.default.createElement(EvidenceAttachForm, { ticketId: props.ticketIdKey, agentId: props.agentId }))
  );
}
function DetailPanel(props) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const [deletingAt, setDeletingAt] = import_react13.default.useState(null);
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
      showError(error);
    } finally {
      setDeletingAt(null);
    }
  }
  return /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-detail-head" }, /* @__PURE__ */ import_react13.default.createElement(
    FieldEditor,
    {
      field: "title",
      ticketId: props.ticketIdKey,
      value: ticket.title,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement("button", { className: "aidos-close-btn", onClick: props.onClose }, "\xD7")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-detail-chips" }, /* @__PURE__ */ import_react13.default.createElement(
    "span",
    {
      className: "aidos-chip aidos-chip-id",
      style: { background: idColor(fullTicketId(ticket)) },
      title: fullTicketId(ticket)
    },
    ticketChipLabel(ticket)
  ), /* @__PURE__ */ import_react13.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react13.default.createElement("dl", { className: "aidos-facts" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react13.default.createElement("dt", { className: "aidos-facts-label" }, "State"), /* @__PURE__ */ import_react13.default.createElement("dd", { className: "aidos-facts-value" }, stateLabel(ticket.state))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react13.default.createElement("dt", { className: "aidos-facts-label" }, "Gate"), /* @__PURE__ */ import_react13.default.createElement("dd", { className: "aidos-facts-value" }, formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react13.default.createElement("dt", { className: "aidos-facts-label" }, "Confidence"), /* @__PURE__ */ import_react13.default.createElement("dd", { className: "aidos-facts-value" }, String(ringPercent(ticket.confidenceScore)) + "%", /* @__PURE__ */ import_react13.default.createElement(
    "span",
    {
      className: "aidos-facts-asterisk",
      title: "Advisory score. It never unlocks anything."
    },
    "*"
  ))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react13.default.createElement("dt", { className: "aidos-facts-label" }, "Phase"), /* @__PURE__ */ import_react13.default.createElement("dd", { className: "aidos-facts-value" }, String(ticket.phase))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react13.default.createElement("dt", { className: "aidos-facts-label" }, "Order"), /* @__PURE__ */ import_react13.default.createElement("dd", { className: "aidos-facts-value" }, String(ticket.order))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-facts-row" }, /* @__PURE__ */ import_react13.default.createElement("dt", { className: "aidos-facts-label" }, "Slug"), /* @__PURE__ */ import_react13.default.createElement("dd", { className: "aidos-facts-value" }, ticket.slug))), /* @__PURE__ */ import_react13.default.createElement(
    DescriptionPanel,
    {
      ticket,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    CriteriaPanel,
    {
      ticket,
      evidence: props.evidence,
      ticketIdKey: props.ticketIdKey,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    DependencySection,
    {
      ticketId: props.ticketIdKey,
      dependsOn: ticket.dependsOn,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
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
      agentId: props.agentId
    }
  ));
}
function DetailView(props) {
  const [signoffOpen, setSignoffOpen] = import_react13.default.useState(false);
  const [sendBackOpen, setSendBackOpen] = import_react13.default.useState(false);
  const [markDoneOpen, setMarkDoneOpen] = import_react13.default.useState(false);
  const [submitting, setSubmitting] = import_react13.default.useState(false);
  const ticket = props.ticket;
  const agentId = props.agentId;
  import_react13.default.useEffect(function() {
    logDebug("detail view: ticket " + ticket.id);
  }, []);
  async function submitForReview() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: ticket.id, to: "awaiting_verification" },
        agentId
      );
      showToast("Submitted for review", "success");
      props.onClose();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-detail" }, /* @__PURE__ */ import_react13.default.createElement(
    DetailPanel,
    {
      ticket,
      ticketIdKey: props.ticketIdKey,
      evidence: props.evidence,
      evidenceCollapsed: props.evidenceCollapsed,
      onToggleEvidence: props.onToggleEvidence,
      onClose: props.onClose,
      agentId,
      onFieldSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    CommentsSection,
    {
      ticketId: props.ticketIdKey,
      comments: props.comments,
      agentId
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    ActionBar,
    {
      ticket,
      onOpenSignoff: () => {
        setSignoffOpen(true);
      },
      onOpenSendBack: () => {
        setSendBackOpen(true);
      },
      onOpenMarkDone: () => {
        setMarkDoneOpen(true);
      },
      onOpenSubmitForReview: () => {
        void submitForReview();
      }
    }
  ), signoffOpen ? /* @__PURE__ */ import_react13.default.createElement(
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
  ) : null, sendBackOpen ? /* @__PURE__ */ import_react13.default.createElement(
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
  ) : null, markDoneOpen ? /* @__PURE__ */ import_react13.default.createElement(
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
var import_react14 = __toESM(require("react"), 1);
function CreateTicketModal(props) {
  const [title, setTitle] = import_react14.default.useState("");
  const [description, setDescription] = import_react14.default.useState("");
  const [criteria, setCriteria] = import_react14.default.useState("");
  const [saving, setSaving] = import_react14.default.useState(false);
  import_react14.default.useEffect(function() {
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
  return /* @__PURE__ */ import_react14.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react14.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react14.default.createElement("h3", { className: "aidos-modal-title" }, "Create a ticket"), /* @__PURE__ */ import_react14.default.createElement(
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
      /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react14.default.createElement("label", null, "Title"), /* @__PURE__ */ import_react14.default.createElement(
        "input",
        {
          type: "text",
          value: title,
          disabled: saving,
          onChange: (event) => {
            setTitle(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react14.default.createElement("label", null, "Description"), /* @__PURE__ */ import_react14.default.createElement(
        "textarea",
        {
          value: description,
          disabled: saving,
          onChange: (event) => {
            setDescription(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react14.default.createElement("div", { className: "aidos-modal-row" }, /* @__PURE__ */ import_react14.default.createElement("label", null, "Criteria"), /* @__PURE__ */ import_react14.default.createElement(
        "textarea",
        {
          value: criteria,
          disabled: saving,
          onChange: (event) => {
            setCriteria(event.target.value);
          }
        }
      )), /* @__PURE__ */ import_react14.default.createElement(
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
var import_react15 = __toESM(require("react"), 1);
function PlanMetaModal(props) {
  const [editing, setEditing] = import_react15.default.useState(null);
  const [draft, setDraft] = import_react15.default.useState("");
  const [saving, setSaving] = import_react15.default.useState(false);
  const [expanded, setExpanded] = import_react15.default.useState([]);
  import_react15.default.useEffect(function() {
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
    return /* @__PURE__ */ import_react15.default.createElement(import_react15.default.Fragment, null, /* @__PURE__ */ import_react15.default.createElement(
      "textarea",
      {
        className: "aidos-plan-meta-input",
        value: draft,
        disabled: saving,
        onChange: (event) => {
          setDraft(event.target.value);
        }
      }
    ), /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-plan-meta-actions" }, /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: saving,
        onClick: () => {
          void save(key);
        }
      },
      saving ? "Saving\u2026" : "Save"
    ), /* @__PURE__ */ import_react15.default.createElement(
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
    return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-plan-meta-block", key }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-plan-meta-block-head" }, /* @__PURE__ */ import_react15.default.createElement("span", { className: "aidos-plan-meta-block-title" }, label), /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: () => {
          beginEdit(key, text);
        }
      },
      "Edit"
    )), editing === key ? renderEditControls(key) : /* @__PURE__ */ import_react15.default.createElement("pre", { className: "aidos-plan-meta-text" }, text === "" ? "(empty)" : text));
  }
  function renderSectionBlock(position, heading, text) {
    const open = expanded.includes(position);
    return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-plan-meta-block", key: position }, /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-plan-meta-block-head" }, /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-plan-meta-toggle",
        onClick: () => {
          toggleSection(position);
        }
      },
      /* @__PURE__ */ import_react15.default.createElement("span", { "aria-hidden": "true" }, open ? "\u25BE" : "\u25B8"),
      heading
    ), /* @__PURE__ */ import_react15.default.createElement(
      "button",
      {
        className: "aidos-btn",
        disabled: saving,
        onClick: () => {
          beginEdit(position, text);
        }
      },
      "Edit"
    )), editing === position || open ? editing === position ? renderEditControls(position) : /* @__PURE__ */ import_react15.default.createElement("pre", { className: "aidos-plan-meta-text" }, text === "" ? "(empty)" : text) : null);
  }
  const meta = props.planMeta;
  return /* @__PURE__ */ import_react15.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        if (!saving) props.onClose();
      }
    },
    /* @__PURE__ */ import_react15.default.createElement(
      "div",
      {
        className: "aidos-plan-meta-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react15.default.createElement("h3", { className: "aidos-modal-title" }, "Plan"), /* @__PURE__ */ import_react15.default.createElement(
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
      meta === null ? /* @__PURE__ */ import_react15.default.createElement("p", { className: "aidos-plan-meta-note" }, "This project holds no plan yet.") : /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-plan-meta-blocks" }, renderNamedBlock("frontmatter", "Frontmatter", meta.frontmatter), renderNamedBlock("preamble", "Preamble", meta.preamble), meta.contextSections.map(
        (section, position) => renderSectionBlock(position, section.heading, section.text)
      ))
    )
  );
}

// src/client/active-ticket.ts
function activeTicketId(tickets) {
  let active = null;
  for (const ticket of tickets) {
    if (ticket.state !== "in_progress") continue;
    if (active === null || ticket.updatedAt > active.updatedAt) {
      active = ticket;
    }
  }
  return active === null ? null : active.id;
}

// src/client/toast.tsx
var import_react16 = __toESM(require("react"), 1);
function ToastRow(props) {
  const toast = props.toast;
  return /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-toast aidos-toast-" + toast.kind }, /* @__PURE__ */ import_react16.default.createElement("span", { className: "aidos-toast-text" }, toast.text), /* @__PURE__ */ import_react16.default.createElement(
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
  const [toasts2, setToasts] = import_react16.default.useState([]);
  import_react16.default.useEffect(
    function() {
      return subscribeToasts(setToasts);
    },
    []
  );
  return /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-toast-stack" }, toasts2.map(function(toast) {
    return /* @__PURE__ */ import_react16.default.createElement(ToastRow, { key: toast.id, toast });
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
function LocalTicketView(props) {
  const [retryNonce, setRetryNonce] = import_react17.default.useState(0);
  import_react17.default.useEffect(function() {
    logDebug("board view mounted");
  }, []);
  return /* @__PURE__ */ import_react17.default.createElement(
    ProjectionReader,
    {
      key: retryNonce,
      sessionId: props.sessionId,
      useProjection: props.useProjection,
      onRetry: () => {
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
  const [merge, setMergeState] = import_react17.default.useState(() => getMerge(sessionId));
  const [mergePending, setMergePending] = import_react17.default.useState(() => isMergePulling(sessionId) && getMerge(sessionId) === null);
  const ownVersion = ticketsProjection === void 0 ? null : JSON.stringify(ticketsProjection).length + ":" + Object.keys(ticketsProjection).length;
  import_react17.default.useEffect(function() {
    if (!loaded || ownVersion === null) return;
    if (getPulledVersion(sessionId) === ownVersion) return;
    const alreadyPulling = isMergePulling(sessionId);
    setMergePulling(sessionId, true);
    setMergePending(getMerge(sessionId) === null);
    let cancelled = false;
    const pull = async function() {
      try {
        const result = await callAidosRemote("workspaceTickets", {}, sessionId);
        setMerge(sessionId, result);
        setMergePulling(sessionId, false);
        if (cancelled) return;
        setMergeState(result);
        setMergePending(false);
      } catch {
        setMergePulling(sessionId, false);
        if (cancelled) return;
        setMergePending(false);
      }
    };
    if (alreadyPulling) return;
    void pull();
    return function() {
      cancelled = true;
    };
  }, [loaded, sessionId, ownVersion]);
  const boardTickets = merge !== null ? merge.tickets : Object.values(ticketsProjection ?? {}).map(
    (row) => ({ ...row, sourceSessionId: sessionId, foreign: false })
  );
  const rawTickets = boardTickets;
  const rawEvidence = merge !== null ? merge.evidence : evidenceProjection ?? {};
  const rawComments = merge !== null ? merge.comments : commentsProjection ?? {};
  const allTicketsCount = rawTickets.length;
  const rawWsSet = new Set(rawTickets.map((ticket) => ticket.workspaceKey));
  const workspaceKey = rawTickets.length === 0 ? "default" : rawWsSet.size === 1 ? rawTickets[0].workspaceKey : `default:${sessionId}`;
  const [applied, setAppliedStateLocal] = import_react17.default.useState(function() {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedKey, setSelectedKey] = import_react17.default.useState(null);
  const [createOpen, setCreateOpen] = import_react17.default.useState(false);
  const [planOpen, setPlanOpen] = import_react17.default.useState(false);
  const [errorTimedOut, setErrorTimedOut] = import_react17.default.useState(false);
  const deepLinkHandled = import_react17.default.useRef(false);
  const restoredRef = import_react17.default.useRef(false);
  const count = openCount(rawTickets);
  import_react17.default.useEffect(
    function() {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count]
  );
  import_react17.default.useEffect(
    function() {
      if (!loaded) return;
      logDebug("board loaded: " + allTicketsCount + " tickets");
    },
    [loaded]
  );
  import_react17.default.useEffect(
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
  import_react17.default.useEffect(
    function() {
      if (!loaded) return;
      if (deepLinkHandled.current) return;
      deepLinkHandled.current = true;
      const id = ticketIdFromSearch(window.location.search);
      if (id === null) return;
      const exists = rawTickets.some((ticket) => ticket.id === id);
      if (exists) {
        setSelectedKey(String(id));
      } else {
        showToast("Ticket " + id + " not found", "info");
      }
    },
    [loaded]
  );
  import_react17.default.useEffect(function() {
    return function() {
      if (new URL(window.location.href).searchParams.has("ticket")) setTicketParam(null);
    };
  }, []);
  import_react17.default.useEffect(
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
  const error = errorTimedOut && !loaded ? /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-error" }, /* @__PURE__ */ import_react17.default.createElement("span", null, "The board projection is unavailable. Retry to re-read it."), /* @__PURE__ */ import_react17.default.createElement("button", { className: "aidos-btn", onClick: props.onRetry }, "Retry")) : null;
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
      closeDetail();
      return;
    }
    setSelectedKey(key);
    const numeric = Number(key);
    setTicketParam(Number.isInteger(numeric) ? numeric : null);
  }
  function closeDetail() {
    setSelectedKey(null);
    setTicketParam(null);
  }
  const selectedTicket = selectedKey === null ? null : rawTickets.find(
    (ticket) => (ticket.foreign ? ticket.sourceSessionId + ":" + ticket.id : String(ticket.id)) === selectedKey
  ) ?? null;
  const selectedBoardKey = selectedTicket ? selectedTicket.foreign ? selectedTicket.sourceSessionId + ":" + selectedTicket.id : String(selectedTicket.id) : null;
  const selectedEvidence = selectedBoardKey === null ? [] : rawEvidence[selectedBoardKey] ?? [];
  const selectedComments = selectedBoardKey === null ? [] : rawComments[selectedBoardKey] ?? [];
  const [evidenceCollapsed, setEvidenceCollapsed] = import_react17.default.useState(function() {
    return evidenceIsMany(selectedEvidence);
  });
  import_react17.default.useEffect(function() {
    setEvidenceCollapsed(evidenceIsMany(selectedEvidence));
  }, [selectedTicket?.id]);
  const detailPanel = selectedTicket === null ? null : /* @__PURE__ */ import_react17.default.createElement(
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
      }
    }
  );
  const createModal = /* @__PURE__ */ import_react17.default.createElement(
    CreateTicketModal,
    {
      open: createOpen,
      onClose: () => {
        setCreateOpen(false);
      },
      onCreated: (id) => {
        selectTicket(String(id));
      },
      agentId: sessionId
    }
  );
  const mergeLoading = mergePending && rawTickets.length === 0;
  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-skeleton-grid" }, [0, 1, 2, 3, 4, 5].map((index) => /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-skeleton-tile", key: index })));
  } else if (mergeLoading) {
    body = /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-merge-loading", role: "status" }, /* @__PURE__ */ import_react17.default.createElement("span", { className: "aidos-merge-spinner", "aria-hidden": "true" }), /* @__PURE__ */ import_react17.default.createElement("span", null, "Loading workspace tickets\u2026"));
  } else {
    body = /* @__PURE__ */ import_react17.default.createElement(
      TicketView,
      {
        sessionId,
        tickets: filtered,
        allTicketsCount,
        applied,
        selectedId: selectedKey,
        activeTicketId: activeTicketId(rawTickets) === null ? null : String(activeTicketId(rawTickets)),
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
        }
      }
    );
  }
  const planModal = /* @__PURE__ */ import_react17.default.createElement(
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
  const layoutRef = import_react17.default.useRef(null);
  import_react17.default.useLayoutEffect(function() {
    const element = layoutRef.current;
    if (element === null) return;
    const scrollParentOf = function(node) {
      let parent = node.parentElement;
      while (parent !== null) {
        const style = window.getComputedStyle(parent);
        const scrolls = style.overflowY === "auto" || style.overflowY === "scroll";
        if (scrolls && parent.clientHeight > 0) return parent;
        parent = parent.parentElement;
      }
      return null;
    };
    const sync = function() {
      const top = element.getBoundingClientRect().top;
      const parent = scrollParentOf(element);
      const room = parent === null ? window.innerHeight - top : parent.clientHeight - (top - parent.getBoundingClientRect().top);
      element.style.setProperty("--aidos-board-height", Math.max(160, Math.round(room)) + "px");
    };
    sync();
    window.addEventListener("resize", sync);
    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(sync);
      observer.observe(document.documentElement);
      const parent = element.parentElement;
      if (parent !== null) observer.observe(parent);
    }
    return function() {
      window.removeEventListener("resize", sync);
      if (observer !== null) observer.disconnect();
    };
  }, []);
  return /* @__PURE__ */ import_react17.default.createElement(import_react17.default.Fragment, null, /* @__PURE__ */ import_react17.default.createElement("div", { className: "aidos-layout", ref: layoutRef }, body, detailPanel), createModal, planModal, /* @__PURE__ */ import_react17.default.createElement(ToastContainer, null));
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
  setCountCallback(function() {
    if (registration === null) return;
    const slots = ctx.get("slots");
    if (slots === void 0) return;
    registration();
    registration = registerTicketsTab(slots);
  });
}
		return module.exports;
	}
});
