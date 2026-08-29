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
var board_default = '/* Dark Settings Form Control Design System \u2014 applied to aidos board */\n\n/* \u2500\u2500 1. Tokens \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n:root,\n.aidos-root {\n  --bg: #2c2c2e;\n  --surface: #232324;\n  --surface-hover: #303032;\n  --surface-active: #43454a;\n  --border: #3e3e3f;\n  --border-subtle: #303031;\n  --border-focus: #66676b;\n  --text-primary: #f9fafb;\n  --text-secondary: #adb2b8;\n  --text-muted: #88898a;\n  --text-disabled: #757575;\n  --control-text: #f9fafb;\n  --radius-sm: 0.375rem;\n  --radius-md: 0.625rem;\n  --radius-lg: 0.875rem;\n  --radius-pill: 999rem;\n  --space-1: 0.5rem;\n  --space-2: 1rem;\n  --space-3: 1.5rem;\n  --space-4: 2rem;\n  --space-5: 2.5rem;\n  --space-6: 3rem;\n}\n\n/* \u2500\u2500 2. Typography + base \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-root {\n  box-sizing: border-box;\n  display: flex;\n  gap: var(--space-2);\n  padding: 1.5rem 1.25rem 2.5rem;\n  width: 100%;\n  min-height: 100%;\n  background: var(--bg);\n  color: var(--text-primary);\n  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n\n.aidos-root * {\n  box-sizing: border-box;\n}\n\n/* page title helper (spec \xA73) \u2014 used by board chrome if needed */\n.aidos-page-title {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 650;\n  line-height: 1.2;\n  color: var(--text-primary);\n}\n\n/* \u2500\u2500 3. Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-layout {\n  display: flex;\n  gap: var(--space-2);\n  align-items: flex-start;\n  flex: 1;\n  min-width: 0;\n}\n\n.aidos-grid-wrap {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);\n}\n\n.aidos-grid-chrome {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-1);\n}\n\n.aidos-board-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));\n  gap: 14px;\n  align-content: start;\n}\n\n/* \u2500\u2500 4. Section headers (spec \xA75) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-panel-section {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-1);\n}\n\n.aidos-panel-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: var(--space-1);\n}\n\n.aidos-panel-title,\n.section-title {\n  margin: 0;\n  font-size: 1.125rem;\n  line-height: 1.2;\n  font-weight: 600;\n  color: var(--text-primary);\n  text-transform: none;\n  letter-spacing: 0;\n}\n\n.aidos-panel-title {\n  font-size: 12px;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n  color: var(--text-secondary);\n}\n\n.section-description {\n  margin: 0.625rem 0 0;\n  color: var(--text-secondary);\n  font-size: 0.875rem;\n  line-height: 1.5;\n}\n\n/* \u2500\u2500 5. Setting card (spec \xA76) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.setting-card,\n.aidos-detail,\n.aidos-sidebar {\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  padding: 1.25rem;\n}\n\n.aidos-sidebar {\n  flex: none;\n  width: 260px;\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);\n  align-self: flex-start;\n}\n\n.aidos-detail {\n  flex: none;\n  width: 300px;\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  align-self: flex-start;\n}\n\n/* checkbox that lives inside a setting-card grid (spec \xA76) */\n.setting-card {\n  display: grid;\n  grid-template-columns: 1.25rem 1fr;\n  gap: 1rem;\n  align-items: start;\n}\n\n.setting-checkbox {\n  width: 1.25rem;\n  height: 1.25rem;\n  flex: 0 0 1.25rem;\n  border-radius: 0.1875rem;\n  accent-color: var(--text-primary);\n}\n\n/* \u2500\u2500 6. Segmented control (spec \xA77) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.segmented-control {\n  display: flex;\n  padding: 0.25rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.segment {\n  min-width: 8.75rem;\n  height: 2.375rem;\n  border: 0;\n  border-radius: 0.4375rem;\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n\n.segment[data-active="true"] {\n  background: var(--surface-active);\n  color: var(--text-primary);\n  font-weight: 600;\n}\n\n/* \u2500\u2500 7. Control list (spec \xA78) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.control-list {\n  overflow: hidden;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.control-list-row {\n  min-height: 3rem;\n  padding: 0 0.875rem;\n  display: flex;\n  align-items: center;\n  gap: 0.625rem;\n}\n\n.control-list-row + .control-list-row {\n  border-top: 1px solid var(--border-subtle);\n}\n\n/* used for criteria / evidence rows - map directly */\n.aidos-criterion {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 6px 8px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.aidos-criterion-uncovered {\n  background: var(--surface-hover);\n  opacity: 0.9;\n  border-style: dashed;\n}\n\n.aidos-criterion-ungrouped {\n  border-style: dashed;\n}\n\n.aidos-criterion-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-criterion-label {\n  font-size: 11px;\n  line-height: 16px;\n  color: var(--text-secondary);\n}\n\n.aidos-criterion-count {\n  font-size: 10px;\n  line-height: 14px;\n  color: var(--text-muted);\n}\n\n.aidos-evidence-row-item {\n  display: flex;\n  gap: 6px;\n  align-items: baseline;\n  font-size: 11px;\n  line-height: 16px;\n}\n\n.aidos-evidence-kind {\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.aidos-evidence-author {\n  color: var(--text-muted);\n}\n\n.aidos-evidence-meta {\n  color: var(--text-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.aidos-evidence-body {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n/* \u2500\u2500 8. Pills (spec \xA79) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.pill,\n.aidos-evidence-tag,\n.aidos-dep-badge,\n.aidos-state-badge,\n.aidos-ticket-id-badge {\n  height: 1.75rem;\n  display: inline-flex;\n  align-items: center;\n  padding-inline: 0.5rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-sm);\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 0.8125rem;\n  white-space: nowrap;\n}\n\n.pill[data-active="true"] {\n  background: var(--surface-active);\n  color: var(--text-primary);\n}\n\n.aidos-evidence-tag {\n  font-size: 10px;\n  line-height: 14px;\n  border-radius: var(--radius-pill);\n  padding: 0 8px;\n}\n\n.aidos-dep-badge {\n  font-size: 10px;\n  line-height: 14px;\n  border-radius: var(--radius-pill);\n  padding: 0 8px;\n  color: var(--text-secondary);\n  background: var(--surface);\n}\n\n.aidos-state-badge {\n  font-size: 10px;\n  line-height: 14px;\n  border-radius: var(--radius-pill);\n  padding: 0 8px;\n}\n\n.aidos-state-open {\n  color: var(--text-secondary);\n  background: var(--surface);\n  border-color: var(--border);\n}\n\n.aidos-state-in-progress {\n  color: var(--text-primary);\n  background: var(--surface-hover);\n  border-color: var(--border);\n}\n\n.aidos-state-awaiting-verification {\n  color: var(--text-primary);\n  background: var(--surface-active);\n  border-color: var(--border);\n}\n\n.aidos-state-done {\n  color: var(--text-secondary);\n  background: transparent;\n  border-color: var(--border-subtle);\n}\n\n.aidos-ticket-id-badge {\n  font-size: 10px;\n  line-height: 14px;\n  border-radius: var(--radius-pill);\n  padding: 0 6px;\n  height: auto;\n}\n\n.aidos-evidence-row,\n.aidos-dep-row {\n  display: flex;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n\n/* \u2500\u2500 9. Icon button (spec \xA710) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.icon-button,\n.aidos-close-btn {\n  width: 2rem;\n  height: 2rem;\n  display: inline-grid;\n  place-items: center;\n  border: 0;\n  border-radius: var(--radius-sm);\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 1.25rem;\n  cursor: pointer;\n}\n\n.icon-button:hover,\n.aidos-close-btn:hover {\n  background: var(--surface-hover);\n  color: var(--text-primary);\n}\n\n.aidos-close-btn {\n  border: none;\n  font-size: 16px;\n  line-height: 16px;\n  padding: 0;\n}\n\n/* \u2500\u2500 10. Mode switch (spec \xA711) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.mode-switch {\n  display: inline-flex;\n  padding: 0.25rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n}\n\n.mode-switch > button {\n  height: 2.125rem;\n  padding-inline: 1.25rem;\n  border: 0;\n  border-radius: var(--radius-sm);\n  background: transparent;\n  color: var(--text-secondary);\n  font-size: 0.875rem;\n  cursor: pointer;\n}\n\n.mode-switch > button[data-active="true"] {\n  background: var(--surface-active);\n  color: var(--text-primary);\n  font-weight: 600;\n}\n\n/* \u2500\u2500 11. Text input (spec \xA712) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.text-input,\n.aidos-search-input,\n.aidos-dep-search-input,\n.aidos-field-editor-input,\n.aidos-evidence-attach-kind-select,\n.aidos-evidence-attach-note,\n.aidos-comment-textarea,\n.aidos-modal-row input,\n.aidos-modal-row textarea,\n.aidos-modal-row select {\n  height: 2.5rem;\n  width: 100%;\n  padding-inline: 0.75rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n  color: var(--text-primary);\n  font-size: 0.875rem;\n  outline: none;\n  font-family: inherit;\n}\n\n.aidos-search-input,\n.aidos-dep-search-input,\n.aidos-field-editor-input,\n.aidos-evidence-attach-kind-select {\n  height: 2.5rem;\n}\n\n.aidos-modal-row textarea,\n.aidos-evidence-attach-note,\n.aidos-comment-textarea,\n.aidos-field-editor-input[type="textarea"] {\n  height: auto;\n  min-height: 2.5rem;\n  padding-block: 0.5rem;\n  resize: vertical;\n}\n\n.text-input::placeholder,\n.aidos-search-input::placeholder,\n.aidos-dep-search-input::placeholder,\n.aidos-field-editor-input::placeholder,\n.aidos-modal-row input::placeholder,\n.aidos-modal-row textarea::placeholder {\n  color: var(--text-muted);\n}\n\n.text-input:focus,\n.aidos-search-input:focus,\n.aidos-dep-search-input:focus,\n.aidos-field-editor-input:focus,\n.aidos-evidence-attach-kind-select:focus,\n.aidos-evidence-attach-note:focus,\n.aidos-comment-textarea:focus,\n.aidos-modal-row input:focus,\n.aidos-modal-row textarea:focus,\n.aidos-modal-row select:focus {\n  border-color: var(--border-focus);\n}\n\n/* search box wrapper */\n.aidos-search-box {\n  position: relative;\n}\n\n.aidos-autocomplete {\n  position: absolute;\n  z-index: 20;\n  top: calc(100% + 2px);\n  left: 0;\n  right: 0;\n  max-height: 220px;\n  overflow: auto;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);\n}\n\n.aidos-suggestion {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  text-align: left;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: none;\n  border: none;\n  padding: 6px 8px;\n  cursor: pointer;\n}\n\n.aidos-suggestion:hover {\n  background: var(--surface-hover);\n}\n\n.aidos-suggestion-title {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/* \u2500\u2500 12. Primary button (spec \xA713) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.primary-button,\n.aidos-btn-primary,\n.aidos-action-btn-primary,\n.aidos-comment-send {\n  height: 2.375rem;\n  padding-inline: 1.125rem;\n  border: 0;\n  border-radius: var(--radius-pill);\n  background: #adb2b8;\n  color: #232324;\n  font-size: 0.875rem;\n  font-weight: 600;\n  cursor: pointer;\n}\n\n.primary-button:disabled,\n.aidos-btn-primary:disabled,\n.aidos-action-btn-primary:disabled,\n.aidos-comment-send:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n/* secondary button \u2014 muted bordered pill, not high-contrast */\n.aidos-btn,\n.aidos-action-btn-secondary,\n.aidos-btn-dot {\n  cursor: pointer;\n  border: 1px solid var(--border);\n  background: var(--surface);\n  color: var(--text-secondary);\n  border-radius: var(--radius-pill);\n  font-size: 12px;\n  line-height: 20px;\n  padding: 2px 12px;\n}\n\n.aidos-btn:hover,\n.aidos-action-btn-secondary:hover {\n  background: var(--surface-hover);\n  color: var(--text-primary);\n  border-color: var(--border);\n}\n\n.aidos-btn:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n.aidos-btn-dot {\n  position: relative;\n}\n\n.aidos-btn-dot::after {\n  content: "";\n  position: absolute;\n  top: -3px;\n  right: -3px;\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: #adb2b8;\n  border: 1px solid var(--surface);\n}\n\n.aidos-toggle-btn {\n  min-width: 0;\n  border-radius: var(--radius-sm);\n  height: 1.75rem;\n}\n\n.aidos-sidebar-toggle {\n  margin-left: auto;\n}\n\n/* \u2500\u2500 13. Checkbox field (spec \xA714) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.checkbox-field,\n.aidos-check-row {\n  display: flex;\n  align-items: center;\n  gap: 0.625rem;\n  color: var(--text-secondary);\n  font-size: 0.84375rem;\n  cursor: pointer;\n  line-height: 18px;\n}\n\n.aidos-check-row input[type="checkbox"] {\n  width: 1.125rem;\n  height: 1.125rem;\n  flex: 0 0 1.125rem;\n  accent-color: var(--text-primary);\n  cursor: pointer;\n  border-radius: 0.1875rem;\n}\n\n.aidos-check-count {\n  color: var(--text-muted);\n  margin-left: auto;\n}\n\n.aidos-check-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n/* \u2500\u2500 14. Tile \u2014 reinterpreted as setting-card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n.aidos-tile {\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  aspect-ratio: 1 / 1;\n  padding: 1.25rem;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  cursor: pointer;\n  min-width: 0;\n  text-align: left;\n  color: var(--text-primary);\n}\n\n.aidos-tile:hover {\n  background: var(--surface-hover);\n  border-color: var(--border);\n}\n\n.aidos-tile-selected {\n  border-color: var(--border-focus);\n  background: var(--surface-hover);\n}\n\n.aidos-tile-title {\n  font-size: 0.9375rem;\n  font-weight: 500;\n  line-height: 18px;\n  margin: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--text-primary);\n}\n\n.aidos-tile-meta {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 6px;\n}\n\n.aidos-tile-gate {\n  font-size: 0.8125rem;\n  line-height: 16px;\n  color: var(--text-secondary);\n}\n\n/* confidence ring wrapper */\n.aidos-ring-wrap {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n}\n\n.aidos-ring {\n  width: 64px;\n  height: 64px;\n}\n\n.aidos-ring-percent {\n  font-size: 13px;\n  font-weight: 700;\n  fill: var(--text-primary);\n}\n\n.aidos-ring-asterisk {\n  font-size: 10px;\n  fill: var(--text-secondary);\n}\n\n.aidos-ring-na {\n  font-size: 11px;\n  fill: var(--text-muted);\n}\n\n/* detail header / body */\n.aidos-detail-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-detail-title {\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 20px;\n  margin: 0;\n  color: var(--text-primary);\n}\n\n.aidos-detail-body {\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n\n.aidos-detail-note {\n  font-size: 0.8125rem;\n  line-height: 16px;\n  color: var(--text-secondary);\n  margin: 0;\n}\n\n/* sort row \u2014 style select as text-input */\n.aidos-sort-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.aidos-sort-row select {\n  flex: 1;\n  min-width: 0;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  padding: 4px 8px;\n  height: 2.5rem;\n}\n\n.aidos-sort-row select:focus {\n  border-color: var(--border-focus);\n  outline: none;\n}\n\n.aidos-actions-row {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n}\n\n/* dependency search */\n.aidos-dep-search {\n  display: flex;\n  gap: 6px;\n}\n\n.aidos-dep-results {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n  overflow: hidden;\n}\n\n.aidos-dep-result {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  text-align: left;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: none;\n  border: none;\n  padding: 6px 8px;\n  cursor: pointer;\n}\n\n.aidos-dep-result:hover {\n  background: var(--surface-hover);\n}\n\n.aidos-dep-result:disabled {\n  cursor: default;\n  opacity: 0.6;\n}\n\n/* empty / error */\n.aidos-empty {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n  padding: 40px 16px;\n  text-align: center;\n  color: var(--text-secondary);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  background: var(--surface);\n}\n\n.aidos-empty-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0;\n  color: var(--text-primary);\n}\n\n.aidos-empty-note {\n  font-size: 0.875rem;\n  line-height: 1.5;\n  margin: 0;\n  color: var(--text-secondary);\n}\n\n.aidos-error {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n  padding: 24px 16px;\n  color: var(--text-primary);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  background: var(--surface);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n/* skeleton */\n.aidos-skeleton-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));\n  gap: 14px;\n}\n\n.aidos-skeleton-tile {\n  aspect-ratio: 1 / 1;\n  border-radius: var(--radius-lg);\n  background: var(--surface);\n  border: 1px solid var(--border-subtle);\n}\n\n/* modal */\n.aidos-modal-mask {\n  position: fixed;\n  inset: 0;\n  z-index: 100;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.55);\n}\n\n.aidos-modal {\n  box-sizing: border-box;\n  width: 420px;\n  max-width: calc(100vw - 32px);\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  padding: 1.25rem;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-lg);\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);\n  color: var(--text-primary);\n}\n\n.aidos-modal-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.aidos-modal-title {\n  font-size: 1.125rem;\n  font-weight: 600;\n  margin: 0;\n  line-height: 1.2;\n  color: var(--text-primary);\n}\n\n.aidos-modal-body {\n  font-size: 0.875rem;\n  line-height: 1.5;\n  color: var(--text-secondary);\n}\n\n/* toast */\n.aidos-toast-stack {\n  position: fixed;\n  z-index: 200;\n  left: 50%;\n  bottom: 32px;\n  transform: translateX(-50%);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  pointer-events: none;\n}\n\n.aidos-toast {\n  pointer-events: auto;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  max-width: min(560px, calc(100vw - 32px));\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: var(--radius-md);\n  padding: 8px 14px;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);\n}\n\n.aidos-toast-text {\n  flex: 1;\n  min-width: 0;\n}\n\n.aidos-toast-refusal {\n  border-left: 3px solid #e07a5f;\n}\n\n.aidos-toast-info {\n  border-left: 3px solid var(--text-secondary);\n}\n\n.aidos-toast-success {\n  border-left: 3px solid #adb2b8;\n}\n\n.aidos-toast-dismiss {\n  cursor: pointer;\n  flex: none;\n  border: none;\n  background: none;\n  color: var(--text-secondary);\n  font-size: 16px;\n  line-height: 16px;\n  padding: 0;\n}\n\n.aidos-toast-dismiss:hover {\n  color: var(--text-primary);\n}\n\n/* modal form */\n.aidos-modal-form {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n}\n\n.aidos-modal-row {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.aidos-modal-row label {\n  font-size: 0.8125rem;\n  line-height: 18px;\n  color: var(--text-secondary);\n}\n\n/* field editor */\n.aidos-field-editor {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n/* action bar */\n.aidos-action-bar {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  align-items: center;\n}\n\n/* spoiler (submit-for-review) */\n.aidos-spoiler {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.aidos-spoiler-summary {\n  cursor: pointer;\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-secondary);\n}\n\n/* comments */\n.aidos-comments-section {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.aidos-comment {\n  font-size: 12px;\n  line-height: 18px;\n  color: var(--text-primary);\n  background: var(--bg);\n  border: 1px solid var(--border-subtle);\n  border-radius: var(--radius-md);\n  padding: 6px 8px;\n}\n\n/* evidence attach form */\n.aidos-evidence-attach-form {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n/* active marker */\n.aidos-active-marker {\n  flex: none;\n  font-size: 10px;\n  line-height: 14px;\n  color: #232324;\n  background: #adb2b8;\n  border-radius: var(--radius-pill);\n  padding: 0 8px;\n  white-space: nowrap;\n}\n\n/* helper text (spec \xA713) */\n.helper-text {\n  font-size: 0.8125rem;\n  color: var(--text-secondary);\n  line-height: 1.5;\n  margin: 0;\n}\n\n/* \u2500\u2500 15. Responsive (spec \xA720) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n@media (max-width: 700px) {\n  .aidos-root {\n    padding: 1.5rem 1rem 2.5rem;\n  }\n\n  .aidos-layout {\n    flex-direction: column;\n  }\n\n  .aidos-sidebar,\n  .aidos-detail {\n    width: 100%;\n  }\n\n  .segmented-control,\n  .mode-switch {\n    width: 100%;\n  }\n\n  .segment,\n  .mode-switch > button {\n    flex: 1;\n  }\n\n  .control-list-row {\n    flex-wrap: wrap;\n  }\n}\n';

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
  return "aidos-state-badge aidos-state-" + stateClass(state);
}
function hasCriteria(ticket) {
  return ticket.criteria.trim().length > 0;
}
function compareTitles(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  return 0;
}
function compareTickets(a, b, key, descending) {
  const aHas = hasCriteria(a);
  const bHas = hasCriteria(b);
  if (aHas !== bHas) return aHas ? -1 : 1;
  let primary = 0;
  let tiebreak = 0;
  switch (key) {
    case "confidence":
      primary = a.confidenceScore - b.confidenceScore;
      tiebreak = (a.gateFraction ?? 0) - (b.gateFraction ?? 0);
      break;
    case "gates":
      primary = (a.gateFraction ?? 0) - (b.gateFraction ?? 0);
      tiebreak = a.confidenceScore - b.confidenceScore;
      break;
    case "time":
      primary = a.updatedAt - b.updatedAt;
      tiebreak = compareTitles(a.title, b.title);
      break;
    case "alpha":
      primary = compareTitles(a.title, b.title);
      tiebreak = a.updatedAt - b.updatedAt;
      break;
  }
  let cmp = primary;
  if (descending) cmp = -cmp;
  if (cmp === 0) {
    cmp = tiebreak;
    if (descending) cmp = -cmp;
  }
  if (cmp === 0) cmp = a.id - b.id;
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
  out.sort((a, b) => compareTickets(a, b, filter.sortKey, filter.descending));
  return out;
}
function autocompleteTickets(tickets, query, limit = 8) {
  const out = [];
  for (const ticket of tickets) {
    if (!matchesSearch(ticket, query)) continue;
    out.push(ticket);
  }
  out.sort((a, b) => a.id - b.id);
  return out.slice(0, limit);
}
function openCount(tickets) {
  let count = 0;
  for (const ticket of tickets) {
    if (ticket.state !== "done") count += 1;
  }
  return count;
}
function formatGateFraction(fraction, hasCriteriaValue) {
  if (!hasCriteriaValue) return "N/A";
  if (fraction === null) return "\u2014";
  return Math.round(fraction * 100) + "%";
}
function ringPercent(score) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score * 20));
}
function parseCriteria(criteria) {
  return criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
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
function evidenceKindCounts(evidence) {
  const counts2 = /* @__PURE__ */ new Map();
  for (const row of evidence) {
    counts2.set(row.kind, (counts2.get(row.kind) ?? 0) + 1);
  }
  const out = [];
  for (const [kind, count] of counts2) {
    out.push({ kind, count, color: kindColor(kind) });
  }
  out.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
    return 0;
  });
  return out;
}
function displayDep(ref) {
  return ref.replace(/^--.*--:/, "aidos#");
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

// src/client/local-ticket-view.tsx
var import_react16 = __toESM(require("react"), 1);

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
function statesEqual(a, b) {
  if (a.sortKey !== b.sortKey) return false;
  if (a.descending !== b.descending) return false;
  if (a.search !== b.search) return false;
  if (a.stateIds.length !== b.stateIds.length) return false;
  for (let i = 0; i < a.stateIds.length; i += 1) {
    if (a.stateIds[i] !== b.stateIds[i]) return false;
  }
  if (a.projectIds === null || b.projectIds === null) {
    if (a.projectIds !== b.projectIds) return false;
  } else {
    if (a.projectIds.length !== b.projectIds.length) return false;
    for (let i = 0; i < a.projectIds.length; i += 1) {
      if (a.projectIds[i] !== b.projectIds[i]) return false;
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
        props.onJump(ticket.id);
      }
    },
    /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
    /* @__PURE__ */ import_react.default.createElement("span", { className: "aidos-ticket-id-badge" }, "#" + ticket.id)
  ))) : null));
  const actionRows = /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-actions-row" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
      onClick: apply2
    },
    "Apply"
  ), /* @__PURE__ */ import_react.default.createElement("button", { className: "aidos-btn", onClick: reset }, "Reset"));
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-sidebar" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "aidos-panel-title" }, "Filters"), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-sidebar-toggle",
      onClick: props.onToggleCollapsed
    },
    props.collapsed ? "Show" : "Hide"
  )), props.collapsed ? null : projectRows, props.collapsed ? null : stateRows, props.collapsed ? null : sortRows, props.collapsed ? null : searchSection, props.collapsed ? null : actionRows);
}

// src/client/ticket-tile.tsx
var import_react4 = __toESM(require("react"), 1);

// src/client/confidence-ring.tsx
var import_react2 = __toESM(require("react"), 1);
function ConfidenceRing({ ticket }) {
  const has = hasCriteria(ticket);
  const percent = ringPercent(ticket.confidenceScore);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const arcLength = has ? percent / 100 * circumference : 0;
  return /* @__PURE__ */ import_react2.default.createElement("svg", { className: "aidos-ring", viewBox: "0 0 64 64" }, /* @__PURE__ */ import_react2.default.createElement(
    "circle",
    {
      cx: 32,
      cy: 32,
      r: radius,
      fill: "none",
      stroke: "var(--border)",
      strokeWidth: 5
    }
  ), has && percent > 0 ? /* @__PURE__ */ import_react2.default.createElement(
    "circle",
    {
      cx: 32,
      cy: 32,
      r: radius,
      fill: "none",
      stroke: "var(--text-secondary)",
      strokeWidth: 5,
      strokeLinecap: "round",
      strokeDasharray: arcLength + " " + circumference,
      transform: "rotate(-90 32 32)"
    }
  ) : null, /* @__PURE__ */ import_react2.default.createElement(
    "text",
    {
      x: 32,
      y: 37,
      textAnchor: "middle",
      className: has ? "aidos-ring-percent" : "aidos-ring-na"
    },
    has ? Math.round(percent) + "%" : "N/A"
  ), has && percent > 0 ? /* @__PURE__ */ import_react2.default.createElement(
    "text",
    {
      x: 47,
      y: 24,
      textAnchor: "middle",
      className: "aidos-ring-asterisk",
      ...{ title: "Advisory score. It never unlocks anything." }
    },
    "*"
  ) : null);
}

// src/client/evidence-tags.tsx
var import_react3 = __toESM(require("react"), 1);
function EvidenceTags({ evidence }) {
  const counts2 = evidenceKindCounts(evidence);
  if (counts2.length === 0) return null;
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "aidos-evidence-row" }, counts2.map((count) => /* @__PURE__ */ import_react3.default.createElement(
    "span",
    {
      key: count.kind,
      className: "aidos-evidence-tag",
      style: { borderColor: count.color, color: count.color }
    },
    count.kind + " " + count.count
  )));
}

// src/client/ticket-tile.tsx
function TicketTile(props) {
  const ticket = props.ticket;
  const className = "aidos-tile" + (props.selected ? " aidos-tile-selected" : "");
  const badge = badgeClass(ticket.state);
  return /* @__PURE__ */ import_react4.default.createElement(
    "button",
    {
      className,
      onClick: props.onSelect,
      title: ticket.title
    },
    /* @__PURE__ */ import_react4.default.createElement("h3", { className: "aidos-tile-title" }, ticket.title),
    /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-ring-wrap" }, /* @__PURE__ */ import_react4.default.createElement(ConfidenceRing, { ticket })),
    /* @__PURE__ */ import_react4.default.createElement("div", { className: "aidos-tile-meta" }, /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-tile-gate" }, formatGateFraction(ticket.gateFraction, hasCriteria(ticket))), /* @__PURE__ */ import_react4.default.createElement("span", { className: badge }, stateLabel(ticket.state))),
    props.active === true ? /* @__PURE__ */ import_react4.default.createElement("span", { className: "aidos-active-marker" }, "Active") : null,
    /* @__PURE__ */ import_react4.default.createElement(EvidenceTags, { evidence: props.evidence }),
    ticket.dependsOn?.map((ref) => /* @__PURE__ */ import_react4.default.createElement("span", { key: ref, className: "aidos-dep-badge", title: ref }, displayDep(ref)))
  );
}

// src/client/ticket-view.tsx
function TicketView(props) {
  const [collapsed, setCollapsed] = import_react5.default.useState(false);
  const tiles = props.tickets.map((ticket) => /* @__PURE__ */ import_react5.default.createElement(
    TicketTile,
    {
      key: ticket.id,
      ticket,
      evidence: props.evidenceByTicket?.[String(ticket.id)] ?? [],
      selected: ticket.id === props.selectedId,
      active: ticket.id === props.activeTicketId,
      onSelect: () => {
        props.onSelect(ticket.id);
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
  return /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-root" }, /* @__PURE__ */ import_react5.default.createElement(
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
  ), /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-grid-wrap" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "aidos-grid-chrome" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "aidos-empty-note" }, props.tickets.length + " of " + props.allTicketsCount + " tickets"), /* @__PURE__ */ import_react5.default.createElement("button", { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate }, "Create")), content));
}

// src/client/detail-panel.tsx
var import_react13 = __toESM(require("react"), 1);

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
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-field-editor" }, /* @__PURE__ */ import_react6.default.createElement("span", null, String(props.value), " ", /* @__PURE__ */ import_react6.default.createElement("button", { className: "aidos-btn", onClick: beginEdit }, "Edit")));
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
  const [collapsed, setCollapsed] = import_react8.default.useState(comments.length === 1);
  const [draft, setDraft] = import_react8.default.useState("");
  const [sending, setSending] = import_react8.default.useState(false);
  import_react8.default.useEffect(function() {
    logDebug("comments section mounted");
  }, []);
  const newestFirst = [...comments].sort((a, b) => b.at - a.at);
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
  return /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-comments-section" }, /* @__PURE__ */ import_react8.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react8.default.createElement("h4", { className: "aidos-panel-title" }, "Comments"), /* @__PURE__ */ import_react8.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      onClick: () => {
        setCollapsed(!collapsed);
      }
    },
    collapsed ? "Expand" : "Collapse"
  )), collapsed ? null : /* @__PURE__ */ import_react8.default.createElement(import_react8.default.Fragment, null, rows.length === 0 ? /* @__PURE__ */ import_react8.default.createElement("p", { className: "aidos-detail-note" }, "No comments yet.") : rows, /* @__PURE__ */ import_react8.default.createElement(
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
  ), /* @__PURE__ */ import_react8.default.createElement(
    "button",
    {
      className: "aidos-comment-send",
      disabled: sending || draft.trim() === "",
      onClick: send
    },
    "Send"
  )));
}

// src/client/evidence-attach-form.tsx
var import_react9 = __toESM(require("react"), 1);

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
  rest.sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
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
    /* @__PURE__ */ import_react9.default.createElement(
      "button",
      {
        className: "aidos-btn aidos-btn-primary",
        disabled: working || kind === "",
        type: "submit"
      },
      working ? "Working\u2026" : "Attach"
    )
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
  const criteriaLines = props.ticket.criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const kindCounts = /* @__PURE__ */ new Map();
  for (const row of props.evidence) {
    kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + 1);
  }
  const summary = [];
  for (const [kind, count] of kindCounts) {
    summary.push({ kind, count });
  }
  summary.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
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
      step === 1 ? /* @__PURE__ */ import_react12.default.createElement("div", { className: "aidos-modal-form" }, /* @__PURE__ */ import_react12.default.createElement("p", { className: "aidos-modal-body" }, "The ticket criteria:"), criteriaLines.length === 0 ? /* @__PURE__ */ import_react12.default.createElement("p", { className: "aidos-detail-note" }, "No criteria on this ticket.") : /* @__PURE__ */ import_react12.default.createElement("ul", { className: "aidos-check-list" }, criteriaLines.map((line) => /* @__PURE__ */ import_react12.default.createElement("li", { className: "aidos-check-row", key: line }, line))), /* @__PURE__ */ import_react12.default.createElement(
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
function renderCriterionGroup(group) {
  const isUngrouped = group.criterion === "";
  const rowClass = isUngrouped ? "aidos-criterion aidos-criterion-ungrouped" : group.matched ? "aidos-criterion" : "aidos-criterion aidos-criterion-uncovered";
  const label = isUngrouped ? "Ungrouped" : /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-criterion-label" }, group.criterion);
  const rows = group.rows.map((row, rowIndex) => /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-evidence-row-item", key: rowIndex }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-evidence-kind" }, row.kind), /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-evidence-author" }, row.author), typeof row.payload.criteria === "string" ? /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-evidence-meta" }, "criterion: " + row.payload.criteria) : null));
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: rowClass, key: group.criterion }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-criterion-head" }, label, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-criterion-count" }, String(group.rows.length))), rows);
}
function renderEvidenceSection(props) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const body = /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-evidence-body" }, groups.length === 0 && props.evidence.length === 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : groups.map((group) => renderCriterionGroup(group)));
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react13.default.createElement("h4", { className: "aidos-panel-title" }, "Evidence"), /* @__PURE__ */ import_react13.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      onClick: props.onToggleEvidence
    },
    props.evidenceCollapsed ? "Expand" : "Collapse"
  )), props.evidenceCollapsed ? null : body);
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
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
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
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setAdding(null);
    }
  }
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react13.default.createElement("h4", { className: "aidos-panel-title" }, "Dependencies")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-dep-row" }, current.length === 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, "No dependencies.") : current.map((ref) => /* @__PURE__ */ import_react13.default.createElement("span", { key: ref, className: "aidos-dep-badge", title: ref }, displayDep(ref)))), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-dep-search" }, /* @__PURE__ */ import_react13.default.createElement(
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
    /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-ticket-id-badge" }, displayDep(refOf(hit)))
  ))) : null);
}
function DetailPanel(props) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);
  return /* @__PURE__ */ import_react13.default.createElement(import_react13.default.Fragment, null, /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-detail-head" }, /* @__PURE__ */ import_react13.default.createElement(
    FieldEditor,
    {
      field: "title",
      ticketId: ticket.id,
      value: ticket.title,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement("button", { className: "aidos-close-btn", onClick: props.onClose }, "\xD7")), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-ring-wrap" }, /* @__PURE__ */ import_react13.default.createElement(ConfidenceRing, { ticket })), /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-tile-meta" }, /* @__PURE__ */ import_react13.default.createElement("span", { className: "aidos-tile-gate" }, formatGateFraction(ticket.gateFraction, hasCriteria(ticket))), /* @__PURE__ */ import_react13.default.createElement("span", { className: badge }, stateLabel(ticket.state))), /* @__PURE__ */ import_react13.default.createElement(
    DependencySection,
    {
      ticketId: ticket.id,
      dependsOn: ticket.dependsOn,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    FieldEditor,
    {
      field: "description",
      ticketId: ticket.id,
      value: ticket.description,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    FieldEditor,
    {
      field: "criteria",
      ticketId: ticket.id,
      value: ticket.criteria,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    FieldEditor,
    {
      field: "phase",
      ticketId: ticket.id,
      value: ticket.phase,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement(
    FieldEditor,
    {
      field: "order",
      ticketId: ticket.id,
      value: ticket.order,
      agentId: props.agentId,
      onSaved: props.onFieldSaved
    }
  ), /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-body" }, "#" + ticket.id), /* @__PURE__ */ import_react13.default.createElement(EvidenceTags, { evidence: props.evidence }), uncovered.length > 0 ? /* @__PURE__ */ import_react13.default.createElement("p", { className: "aidos-detail-note" }, uncovered.length + " uncovered criteria") : null, renderEvidenceSection(props));
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
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ import_react13.default.createElement("div", { className: "aidos-detail" }, /* @__PURE__ */ import_react13.default.createElement(
    DetailPanel,
    {
      ticket,
      evidence: props.evidence,
      evidenceCollapsed: props.evidenceCollapsed,
      onToggleEvidence: props.onToggleEvidence,
      onClose: props.onClose,
      agentId,
      onFieldSaved: props.onFieldSaved
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
  ), /* @__PURE__ */ import_react13.default.createElement(
    CommentsSection,
    {
      ticketId: ticket.id,
      comments: props.comments,
      agentId
    }
  ), /* @__PURE__ */ import_react13.default.createElement(EvidenceAttachForm, { ticketId: ticket.id, agentId }), signoffOpen ? /* @__PURE__ */ import_react13.default.createElement(
    SignoffDialog,
    {
      open: true,
      ticketId: ticket.id,
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
      ticketId: ticket.id,
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
      ticketId: ticket.id,
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
var import_react15 = __toESM(require("react"), 1);
function ToastRow(props) {
  const toast = props.toast;
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-toast aidos-toast-" + toast.kind }, /* @__PURE__ */ import_react15.default.createElement("span", { className: "aidos-toast-text" }, toast.text), /* @__PURE__ */ import_react15.default.createElement(
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
  const [toasts2, setToasts] = import_react15.default.useState([]);
  import_react15.default.useEffect(
    function() {
      return subscribeToasts(setToasts);
    },
    []
  );
  return /* @__PURE__ */ import_react15.default.createElement("div", { className: "aidos-toast-stack" }, toasts2.map(function(toast) {
    return /* @__PURE__ */ import_react15.default.createElement(ToastRow, { key: toast.id, toast });
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
  const [retryNonce, setRetryNonce] = import_react16.default.useState(0);
  import_react16.default.useEffect(function() {
    logDebug("board view mounted");
  }, []);
  return /* @__PURE__ */ import_react16.default.createElement(
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
  const loaded = ticketsProjection !== void 0 && evidenceProjection !== void 0 && commentsProjection !== void 0;
  const rawTickets = ticketsProjection === void 0 ? [] : Object.values(ticketsProjection);
  const rawEvidence = evidenceProjection === void 0 ? {} : evidenceProjection;
  const rawComments = commentsProjection === void 0 ? {} : commentsProjection;
  const allTicketsCount = rawTickets.length;
  const rawWsSet = new Set(rawTickets.map((ticket) => ticket.workspaceKey));
  const workspaceKey = rawTickets.length === 0 ? "default" : rawWsSet.size === 1 ? rawTickets[0].workspaceKey : `default:${sessionId}`;
  const [applied, setAppliedStateLocal] = import_react16.default.useState(function() {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedId, setSelectedId] = import_react16.default.useState(null);
  const [createOpen, setCreateOpen] = import_react16.default.useState(false);
  const [errorTimedOut, setErrorTimedOut] = import_react16.default.useState(false);
  const deepLinkHandled = import_react16.default.useRef(false);
  const restoredRef = import_react16.default.useRef(false);
  const count = openCount(rawTickets);
  import_react16.default.useEffect(
    function() {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count]
  );
  import_react16.default.useEffect(
    function() {
      if (!loaded) return;
      logDebug("board loaded: " + allTicketsCount + " tickets");
    },
    [loaded]
  );
  import_react16.default.useEffect(
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
  import_react16.default.useEffect(
    function() {
      if (!loaded) return;
      if (deepLinkHandled.current) return;
      deepLinkHandled.current = true;
      const id = ticketIdFromSearch(window.location.search);
      if (id === null) return;
      const exists = rawTickets.some((ticket) => ticket.id === id);
      if (exists) {
        setSelectedId(id);
      } else {
        showToast("Ticket " + id + " not found", "info");
      }
    },
    [loaded]
  );
  import_react16.default.useEffect(function() {
    return function() {
      if (new URL(window.location.href).searchParams.has("ticket")) setTicketParam(null);
    };
  }, []);
  import_react16.default.useEffect(
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
  const error = errorTimedOut && !loaded ? /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-error" }, /* @__PURE__ */ import_react16.default.createElement("span", null, "The board projection is unavailable. Retry to re-read it."), /* @__PURE__ */ import_react16.default.createElement("button", { className: "aidos-btn", onClick: props.onRetry }, "Retry")) : null;
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
  function selectTicket(id) {
    if (selectedId === id) {
      closeDetail();
      return;
    }
    setSelectedId(id);
    setTicketParam(id);
  }
  function closeDetail() {
    setSelectedId(null);
    setTicketParam(null);
  }
  const selectedTicket = selectedId === null ? null : rawTickets.find((ticket) => ticket.id === selectedId) ?? null;
  const selectedEvidence = selectedTicket === null ? [] : rawEvidence[String(selectedTicket.id)] ?? [];
  const selectedComments = selectedTicket === null ? [] : rawComments[String(selectedTicket.id)] ?? [];
  const [evidenceCollapsed, setEvidenceCollapsed] = import_react16.default.useState(function() {
    return evidenceIsMany(selectedEvidence);
  });
  import_react16.default.useEffect(function() {
    setEvidenceCollapsed(evidenceIsMany(selectedEvidence));
  }, [selectedTicket?.id]);
  const detailPanel = selectedTicket === null ? null : /* @__PURE__ */ import_react16.default.createElement(
    DetailView,
    {
      key: selectedTicket.id,
      ticket: selectedTicket,
      evidence: selectedEvidence,
      comments: selectedComments,
      evidenceCollapsed,
      onToggleEvidence: () => {
        setEvidenceCollapsed((v) => !v);
      },
      onClose: closeDetail,
      agentId: sessionId,
      onFieldSaved: function() {
      }
    }
  );
  const createModal = /* @__PURE__ */ import_react16.default.createElement(
    CreateTicketModal,
    {
      open: createOpen,
      onClose: () => {
        setCreateOpen(false);
      },
      onCreated: (id) => {
        selectTicket(id);
      },
      agentId: sessionId
    }
  );
  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-skeleton-grid" }, [0, 1, 2, 3, 4, 5].map((index) => /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-skeleton-tile", key: index })));
  } else {
    body = /* @__PURE__ */ import_react16.default.createElement(
      TicketView,
      {
        sessionId,
        tickets: filtered,
        allTicketsCount,
        applied,
        selectedId,
        activeTicketId: activeTicketId(rawTickets),
        evidenceByTicket: rawEvidence,
        onSelect: selectTicket,
        onApply: applyState,
        onJump: selectTicket,
        onClearFilters: clearFilters,
        onCreate: () => {
          setCreateOpen(true);
        }
      }
    );
  }
  return /* @__PURE__ */ import_react16.default.createElement(import_react16.default.Fragment, null, /* @__PURE__ */ import_react16.default.createElement("div", { className: "aidos-layout" }, body, detailPanel), createModal, /* @__PURE__ */ import_react16.default.createElement(ToastContainer, null));
}

// src/client/index.ts
var name = "aidos";
var inject = ["slots"];
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector('style[data-plugin-css="aidos/board.css"]') !== null)
    return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "aidos";
  tag.dataset.pluginCss = "aidos/board.css";
  tag.textContent = board_default;
  document.head.appendChild(tag);
}
function apply(ctx) {
  injectStyles();
  let disposeRegistration = null;
  function registerView() {
    disposeRegistration = ctx.slots.inject("conversation.view", function() {
      return ctx.slots.register(
        { name: "conversation.view", id: "tickets", order: 20, label: badgeLabel },
        LocalTicketView
      );
    });
  }
  registerView();
  setCountCallback(function() {
    if (disposeRegistration !== null) disposeRegistration();
    registerView();
  });
}
		return module.exports;
	}
});
