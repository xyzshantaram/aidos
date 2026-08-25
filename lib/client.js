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
var board_default = '/* root and layout */\n.aidos-root{box-sizing:border-box;display:flex;gap:16px;padding:14px;color:var(--dsw-alias-label-primary);flex:1;min-width:0}\n.aidos-sidebar{flex:none;width:260px;display:flex;flex-direction:column;gap:12px;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}\n.aidos-layout{display:flex;gap:16px;align-items:flex-start;flex:1;min-width:0}\n.aidos-grid-wrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}\n.aidos-grid-chrome{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;align-content:start}\n\n/* buttons */\n.aidos-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px}\n.aidos-btn:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}\n.aidos-btn-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);border-color:transparent}\n.aidos-btn-primary:hover{background:var(--dsw-alias-brand-primary);filter:brightness(0.9)}\n.aidos-btn-dot{position:relative}\n.aidos-btn-dot::after{content:"";position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);border:1px solid var(--dsw-alias-bg-tertiary)}\n.aidos-toggle-btn{min-width:0}\n.aidos-sidebar-toggle{margin-left:auto}\n\n/* sections and controls */\n.aidos-panel-section{display:flex;flex-direction:column;gap:8px}\n.aidos-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-panel-title{font-size:12px;font-weight:600;margin:0;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:0.5px}\n.aidos-check-list{display:flex;flex-direction:column;gap:4px}\n.aidos-check-row{display:flex;align-items:center;gap:6px;font-size:12px;line-height:18px;cursor:pointer}\n.aidos-check-row input{cursor:pointer}\n.aidos-check-count{color:var(--dsw-alias-label-tertiary)}\n.aidos-sort-row{display:flex;align-items:center;gap:6px}\n.aidos-sort-row select{flex:1;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 4px}\n.aidos-actions-row{display:flex;gap:8px;flex-wrap:wrap}\n\n/* search and autocomplete */\n.aidos-search-box{position:relative}\n.aidos-search-input{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}\n.aidos-autocomplete{position:absolute;z-index:20;top:calc(100% + 2px);left:0;right:0;max-height:220px;overflow:auto;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 6px 20px var(--dsw-alias-bg-mask-drop)}\n.aidos-suggestion{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:none;border:none;padding:6px 8px;cursor:pointer}\n.aidos-suggestion:hover{background:var(--dsw-alias-interactive-bg-hover)}\n.aidos-suggestion-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.aidos-ticket-id-badge{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 6px}\n\n/* the ticket tile */\n.aidos-tile{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;aspect-ratio:1/1;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;cursor:pointer;min-width:0;text-align:left}\n.aidos-tile:hover{border-color:var(--dsw-alias-border-l4)}\n.aidos-tile-selected{border:2px solid var(--dsw-alias-brand-primary);padding:11px}\n.aidos-tile-title{font-size:13px;font-weight:600;line-height:18px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.aidos-tile-meta{display:flex;align-items:center;justify-content:space-between;gap:6px}\n.aidos-tile-gate{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary)}\n\n/* the confidence ring */\n.aidos-ring-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}\n.aidos-ring{width:64px;height:64px}\n.aidos-ring-percent{font-size:13px;font-weight:700;fill:var(--dsw-alias-label-primary)}\n.aidos-ring-asterisk{font-size:10px;fill:var(--dsw-alias-state-warn-primary)}\n.aidos-ring-na{font-size:11px;fill:var(--dsw-alias-label-tertiary)}\n\n/* the state badge */\n.aidos-state-badge{flex:none;font-size:10px;line-height:14px;border-radius:999px;padding:0 8px;white-space:nowrap}\n.aidos-state-open{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2)}\n.aidos-state-in-progress{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary);border:1px solid var(--dsw-alias-state-warn-secondary)}\n.aidos-state-awaiting-verification{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);border:1px solid var(--dsw-alias-state-business-primary)}\n.aidos-state-done{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary);border:1px solid var(--dsw-alias-state-success-secondary)}\n\n/* evidence tags (unified: was .aidos-evidence-row and .aidos-evidence-tags) */\n.aidos-evidence-row{display:flex;gap:6px;flex-wrap:wrap}\n.aidos-evidence-tag{font-size:10px;line-height:14px;border:1px solid;border-radius:999px;padding:0 8px}\n\n/* dependency badges and search (D1) */\n.aidos-dep-row{display:flex;gap:6px;flex-wrap:wrap}\n.aidos-dep-badge{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-state-info-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 8px;white-space:nowrap}\n.aidos-dep-search{display:flex;gap:6px}\n.aidos-dep-search-input{box-sizing:border-box;flex:1;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}\n.aidos-dep-results{display:flex;flex-direction:column;gap:4px}\n.aidos-dep-result{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:none;border:none;padding:6px 8px;cursor:pointer}\n.aidos-dep-result:hover{background:var(--dsw-alias-interactive-bg-hover)}\n.aidos-dep-result:disabled{cursor:default;opacity:0.6}\n\n/* detail panel: fields, criteria, evidence */\n.aidos-detail-note{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);margin:0}\n.aidos-criterion{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}\n.aidos-criterion-uncovered{background:var(--dsw-alias-bg-warn-soft);opacity:0.7}\n.aidos-criterion-ungrouped{border-style:dashed}\n.aidos-criterion-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-criterion-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}\n.aidos-criterion-count{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary)}\n.aidos-evidence-row-item{display:flex;gap:6px;align-items:baseline;font-size:11px;line-height:16px}\n.aidos-evidence-kind{font-weight:600;color:var(--dsw-alias-label-primary)}\n.aidos-evidence-author{color:var(--dsw-alias-label-tertiary)}\n.aidos-evidence-meta{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.aidos-evidence-body{display:flex;flex-direction:column;gap:6px}\n.aidos-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;text-align:center;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l3);border-radius:12px}\n.aidos-empty-title{font-size:14px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary)}\n.aidos-empty-note{font-size:12px;line-height:18px;margin:0;color:var(--dsw-alias-label-secondary)}\n.aidos-error{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-secondary);border-radius:12px;font-size:12px;line-height:18px}\n\n/* skeleton tiles */\n.aidos-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}\n.aidos-skeleton-tile{aspect-ratio:1/1;border-radius:12px;background:var(--dsw-alias-bg-skeleton)}\n\n/* the detail side panel */\n.aidos-detail{flex:none;width:300px;display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}\n.aidos-detail-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-detail-title{font-size:14px;font-weight:600;line-height:20px;margin:0}\n.aidos-detail-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}\n\n/* close buttons (unified: was .aidos-detail-close and .aidos-modal-close) */\n.aidos-close-btn{cursor:pointer;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}\n\n/* the create modal */\n.aidos-modal-mask{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-drop)}\n.aidos-modal{box-sizing:border-box;width:420px;max-width:calc(100vw - 32px);display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 12px 40px var(--dsw-alias-bg-mask-drop)}\n.aidos-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-modal-title{font-size:14px;font-weight:600;margin:0}\n.aidos-modal-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}\n\n/* the toast */\n.aidos-toast{position:fixed;z-index:200;left:50%;bottom:32px;transform:translateX(-50%);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 14px;box-shadow:0 8px 24px var(--dsw-alias-bg-mask-drop)}\n\n/* the toast stack (U2c: replaces the single-string U2a toast) */\n.aidos-toast-stack{position:fixed;z-index:200;left:50%;bottom:32px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}\n.aidos-toast-stack .aidos-toast{position:static;transform:none;display:flex;align-items:center;gap:10px;pointer-events:auto;max-width:min(560px,calc(100vw - 32px))}\n.aidos-toast-text{flex:1;min-width:0}\n.aidos-toast-refusal{border-left:3px solid var(--dsw-alias-state-error-primary)}\n.aidos-toast-info{border-left:3px solid var(--dsw-alias-state-info-primary)}\n.aidos-toast-success{border-left:3px solid var(--dsw-alias-state-success-primary)}\n.aidos-toast-dismiss{cursor:pointer;flex:none;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}\n.aidos-toast-dismiss:hover{color:var(--dsw-alias-label-primary)}\n\n/* the create modal form (U2c) */\n.aidos-modal-form{display:flex;flex-direction:column;gap:10px}\n.aidos-modal-row{display:flex;flex-direction:column;gap:4px}\n.aidos-modal-row label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}\n.aidos-modal-row input,.aidos-modal-row textarea{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}\n.aidos-modal-row textarea{resize:vertical;min-height:72px}\n\n/* the inline field editor (U2c) */\n.aidos-field-editor{display:flex;flex-direction:column;gap:6px}\n.aidos-field-editor-input{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}\n\n/* the action buttons (U2c) */\n.aidos-action-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}\n.aidos-action-btn-primary{cursor:pointer;border:1px solid transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px}\n.aidos-action-btn-primary:hover{filter:brightness(0.9)}\n.aidos-action-btn-secondary{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px}\n.aidos-action-btn-secondary:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}\n\n/* the submit-for-review spoiler (U2c) */\n.aidos-spoiler{display:flex;flex-direction:column;gap:8px}\n.aidos-spoiler-summary{cursor:pointer;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}\n\n/* the comments section (U2c) */\n.aidos-comments-section{display:flex;flex-direction:column;gap:8px}\n.aidos-comment{font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 8px}\n.aidos-comment-textarea{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;resize:vertical;min-height:56px}\n.aidos-comment-send{cursor:pointer;border:1px solid transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px;align-self:flex-start}\n.aidos-comment-send:hover{filter:brightness(0.9)}\n\n/* the active-ticket marker (U2c) */\n.aidos-active-marker{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-brand-primary);border-radius:999px;padding:0 8px;white-space:nowrap}\n\n/* the evidence attach form (U2c) */\n.aidos-evidence-attach-form{display:flex;flex-direction:column;gap:8px}\n.aidos-evidence-attach-kind-select{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 4px}\n.aidos-evidence-attach-note{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;resize:vertical;min-height:48px}\n';

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
  "var(--dsw-alias-state-success-primary)",
  "var(--dsw-alias-state-business-primary)",
  "var(--dsw-alias-state-warn-primary)",
  "var(--dsw-alias-state-info-primary)",
  "var(--dsw-alias-state-error-primary)",
  "var(--dsw-alias-brand-primary)"
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
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "aidos-actions-row" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      onClick: () => {
        updateStaged({ ...staged, descending: !staged.descending });
      }
    },
    staged.descending ? "Descending" : "Ascending"
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
      stroke: "var(--dsw-alias-border-l2)",
      strokeWidth: 5
    }
  ), has && percent > 0 ? /* @__PURE__ */ import_react2.default.createElement(
    "circle",
    {
      cx: 32,
      cy: 32,
      r: radius,
      fill: "none",
      stroke: "var(--dsw-alias-brand-primary)",
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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random();
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
async function callAidosRemote(method, args, agentId) {
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
  let response;
  try {
    response = await fetch(`/api/aidos/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope)
    });
  } catch (error) {
    throw new AidosRemoteError(
      "transport_error",
      `The request to the aidos Remote failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!response.ok) {
    throw new AidosRemoteError(
      "transport_error",
      `The aidos Remote answered with HTTP ${response.status}.`
    );
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new AidosRemoteError(
      "transport_error",
      "The aidos Remote answered with a body that is not JSON."
    );
  }
  if (body.type !== "server-response") {
    throw new AidosRemoteError(
      "transport_error",
      "The aidos Remote answered with an unexpected response shape."
    );
  }
  const result = body.result;
  if (result === void 0) {
    throw new AidosRemoteError(
      "transport_error",
      "The aidos Remote answered without a result."
    );
  }
  if (result.ok === true) {
    const value = result.value;
    if (value === void 0) return null;
    return value;
  }
  if (result.ok === false) {
    const errorBody = result.error;
    const code = typeof errorBody?.code === "string" ? errorBody.code : "refused";
    const message = errorText(errorBody) || `The aidos Remote refused the request (${code}).`;
    throw new AidosRemoteError(code, message, errorExtra(errorBody));
  }
  throw new AidosRemoteError(
    "transport_error",
    "The aidos Remote answered with an unrecognized result."
  );
}

// src/client/toast-store.ts
var TOAST_DURATION_MS = 6e3;
function makeToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random();
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
        { ticketId: props.ticketId, dependsOn: [...current, ref] },
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
  const workspaceKey = rawTickets.length === 0 ? "default" : new Set(rawTickets.map((ticket) => ticket.workspaceKey)).size === 1 ? rawTickets[0].workspaceKey : "default";
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
