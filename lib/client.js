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
var board_default = '/* root and layout */\n.aidos-root{box-sizing:border-box;display:flex;gap:16px;padding:14px;color:var(--dsw-alias-label-primary);flex:1;min-width:0}\n.aidos-sidebar{flex:none;width:260px;display:flex;flex-direction:column;gap:12px;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}\n.aidos-layout{display:flex;gap:16px;align-items:flex-start;flex:1;min-width:0}\n.aidos-grid-wrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}\n.aidos-grid-chrome{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;align-content:start}\n\n/* buttons */\n.aidos-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px}\n.aidos-btn:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}\n.aidos-btn-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);border-color:transparent}\n.aidos-btn-primary:hover{background:var(--dsw-alias-brand-primary);filter:brightness(0.9)}\n.aidos-btn-dot{position:relative}\n.aidos-btn-dot::after{content:"";position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);border:1px solid var(--dsw-alias-bg-tertiary)}\n.aidos-toggle-btn{min-width:0}\n.aidos-sidebar-toggle{margin-left:auto}\n\n/* sections and controls */\n.aidos-panel-section{display:flex;flex-direction:column;gap:8px}\n.aidos-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-panel-title{font-size:12px;font-weight:600;margin:0;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:0.5px}\n.aidos-check-list{display:flex;flex-direction:column;gap:4px}\n.aidos-check-row{display:flex;align-items:center;gap:6px;font-size:12px;line-height:18px;cursor:pointer}\n.aidos-check-row input{cursor:pointer}\n.aidos-check-count{color:var(--dsw-alias-label-tertiary)}\n.aidos-sort-row{display:flex;align-items:center;gap:6px}\n.aidos-sort-row select{flex:1;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 4px}\n.aidos-actions-row{display:flex;gap:8px;flex-wrap:wrap}\n\n/* search and autocomplete */\n.aidos-search-box{position:relative}\n.aidos-search-input{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}\n.aidos-autocomplete{position:absolute;z-index:20;top:calc(100% + 2px);left:0;right:0;max-height:220px;overflow:auto;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 6px 20px var(--dsw-alias-bg-mask-drop)}\n.aidos-suggestion{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:none;border:none;padding:6px 8px;cursor:pointer}\n.aidos-suggestion:hover{background:var(--dsw-alias-interactive-bg-hover)}\n.aidos-suggestion-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.aidos-ticket-id-badge{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 6px}\n\n/* the ticket tile */\n.aidos-tile{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;aspect-ratio:1/1;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;cursor:pointer;min-width:0;text-align:left}\n.aidos-tile:hover{border-color:var(--dsw-alias-border-l4)}\n.aidos-tile-selected{border:2px solid var(--dsw-alias-brand-primary);padding:11px}\n.aidos-tile-title{font-size:13px;font-weight:600;line-height:18px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.aidos-tile-meta{display:flex;align-items:center;justify-content:space-between;gap:6px}\n.aidos-tile-gate{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary)}\n\n/* the confidence ring */\n.aidos-ring-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}\n.aidos-ring{width:64px;height:64px}\n.aidos-ring-percent{font-size:13px;font-weight:700;fill:var(--dsw-alias-label-primary)}\n.aidos-ring-asterisk{font-size:10px;fill:var(--dsw-alias-state-warn-primary)}\n.aidos-ring-na{font-size:11px;fill:var(--dsw-alias-label-tertiary)}\n\n/* the state badge */\n.aidos-state-badge{flex:none;font-size:10px;line-height:14px;border-radius:999px;padding:0 8px;white-space:nowrap}\n.aidos-state-open{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2)}\n.aidos-state-in-progress{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary);border:1px solid var(--dsw-alias-state-warn-secondary)}\n.aidos-state-awaiting-verification{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);border:1px solid var(--dsw-alias-state-business-primary)}\n.aidos-state-done{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary);border:1px solid var(--dsw-alias-state-success-secondary)}\n\n/* evidence tags (unified: was .aidos-evidence-row and .aidos-evidence-tags) */\n.aidos-evidence-row{display:flex;gap:6px;flex-wrap:wrap}\n.aidos-evidence-tag{font-size:10px;line-height:14px;border:1px solid;border-radius:999px;padding:0 8px}\n\n/* detail panel: fields, criteria, evidence */\n.aidos-detail-note{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);margin:0}\n.aidos-criterion{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}\n.aidos-criterion-uncovered{background:var(--dsw-alias-bg-warn-soft);opacity:0.7}\n.aidos-criterion-ungrouped{border-style:dashed}\n.aidos-criterion-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-criterion-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}\n.aidos-criterion-count{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary)}\n.aidos-evidence-row-item{display:flex;gap:6px;align-items:baseline;font-size:11px;line-height:16px}\n.aidos-evidence-kind{font-weight:600;color:var(--dsw-alias-label-primary)}\n.aidos-evidence-author{color:var(--dsw-alias-label-tertiary)}\n.aidos-evidence-meta{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.aidos-evidence-body{display:flex;flex-direction:column;gap:6px}\n.aidos-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;text-align:center;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l3);border-radius:12px}\n.aidos-empty-title{font-size:14px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary)}\n.aidos-empty-note{font-size:12px;line-height:18px;margin:0;color:var(--dsw-alias-label-secondary)}\n.aidos-error{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-secondary);border-radius:12px;font-size:12px;line-height:18px}\n\n/* skeleton tiles */\n.aidos-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}\n.aidos-skeleton-tile{aspect-ratio:1/1;border-radius:12px;background:var(--dsw-alias-bg-skeleton)}\n\n/* the detail side panel */\n.aidos-detail{flex:none;width:300px;display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}\n.aidos-detail-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-detail-title{font-size:14px;font-weight:600;line-height:20px;margin:0}\n.aidos-detail-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}\n\n/* close buttons (unified: was .aidos-detail-close and .aidos-modal-close) */\n.aidos-close-btn{cursor:pointer;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}\n\n/* the create modal */\n.aidos-modal-mask{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-drop)}\n.aidos-modal{box-sizing:border-box;width:420px;max-width:calc(100vw - 32px);display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 12px 40px var(--dsw-alias-bg-mask-drop)}\n.aidos-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}\n.aidos-modal-title{font-size:14px;font-weight:600;margin:0}\n.aidos-modal-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}\n\n/* the toast */\n.aidos-toast{position:fixed;z-index:200;left:50%;bottom:32px;transform:translateX(-50%);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 14px;box-shadow:0 8px 24px var(--dsw-alias-bg-mask-drop)}\n';

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
var import_react7 = __toESM(require("react"), 1);

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
    /* @__PURE__ */ import_react4.default.createElement(EvidenceTags, { evidence: props.evidence })
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
var import_react6 = __toESM(require("react"), 1);
function renderCriterionGroup(group) {
  const isUngrouped = group.criterion === "";
  const rowClass = isUngrouped ? "aidos-criterion aidos-criterion-ungrouped" : group.matched ? "aidos-criterion" : "aidos-criterion aidos-criterion-uncovered";
  const label = isUngrouped ? "Ungrouped" : /* @__PURE__ */ import_react6.default.createElement("span", { className: "aidos-criterion-label" }, group.criterion);
  const rows = group.rows.map((row, rowIndex) => /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-evidence-row-item", key: rowIndex }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "aidos-evidence-kind" }, row.kind), /* @__PURE__ */ import_react6.default.createElement("span", { className: "aidos-evidence-author" }, row.author), typeof row.payload.criteria === "string" ? /* @__PURE__ */ import_react6.default.createElement("span", { className: "aidos-evidence-meta" }, "criterion: " + row.payload.criteria) : null));
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: rowClass, key: group.criterion }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-criterion-head" }, label, /* @__PURE__ */ import_react6.default.createElement("span", { className: "aidos-criterion-count" }, String(group.rows.length))), rows);
}
function renderEvidenceSection(props) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const body = /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-evidence-body" }, groups.length === 0 && props.evidence.length === 0 ? /* @__PURE__ */ import_react6.default.createElement("p", { className: "aidos-detail-note" }, "No evidence rows yet.") : groups.map((group) => renderCriterionGroup(group)));
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-panel-section" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-panel-head" }, /* @__PURE__ */ import_react6.default.createElement("h4", { className: "aidos-panel-title" }, "Evidence"), /* @__PURE__ */ import_react6.default.createElement(
    "button",
    {
      className: "aidos-btn aidos-toggle-btn",
      onClick: props.onToggleEvidence
    },
    props.evidenceCollapsed ? "Expand" : "Collapse"
  )), props.evidenceCollapsed ? null : body);
}
function DetailPanel(props) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);
  return /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-detail" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-detail-head" }, /* @__PURE__ */ import_react6.default.createElement("h3", { className: "aidos-detail-title" }, ticket.title), /* @__PURE__ */ import_react6.default.createElement("button", { className: "aidos-close-btn", onClick: props.onClose }, "\xD7")), /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-ring-wrap" }, /* @__PURE__ */ import_react6.default.createElement(ConfidenceRing, { ticket })), /* @__PURE__ */ import_react6.default.createElement("div", { className: "aidos-tile-meta" }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "aidos-tile-gate" }, formatGateFraction(ticket.gateFraction, hasCriteria(ticket))), /* @__PURE__ */ import_react6.default.createElement("span", { className: badge }, stateLabel(ticket.state))), ticket.description ? /* @__PURE__ */ import_react6.default.createElement("p", { className: "aidos-detail-body" }, ticket.description) : null, /* @__PURE__ */ import_react6.default.createElement("p", { className: "aidos-detail-body" }, "#" + ticket.id), /* @__PURE__ */ import_react6.default.createElement(EvidenceTags, { evidence: props.evidence }), uncovered.length > 0 ? /* @__PURE__ */ import_react6.default.createElement("p", { className: "aidos-detail-note" }, uncovered.length + " uncovered criteria") : null, renderEvidenceSection(props));
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
    ) : [];
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
  const [retryNonce, setRetryNonce] = import_react7.default.useState(0);
  return /* @__PURE__ */ import_react7.default.createElement(
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
  const loaded = ticketsProjection !== void 0 && evidenceProjection !== void 0;
  const rawTickets = ticketsProjection === void 0 ? [] : Object.values(ticketsProjection);
  const rawEvidence = evidenceProjection === void 0 ? {} : evidenceProjection;
  const allTicketsCount = rawTickets.length;
  const workspaceKey = rawTickets.length > 0 && typeof rawTickets[0].workspaceKey === "string" ? rawTickets[0].workspaceKey : "default";
  const [applied, setAppliedStateLocal] = import_react7.default.useState(function() {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedId, setSelectedId] = import_react7.default.useState(null);
  const [createOpen, setCreateOpen] = import_react7.default.useState(false);
  const [toast, setToast] = import_react7.default.useState(null);
  const [errorTimedOut, setErrorTimedOut] = import_react7.default.useState(false);
  const deepLinkHandled = import_react7.default.useRef(false);
  const restoredRef = import_react7.default.useRef(false);
  const count = openCount(rawTickets);
  import_react7.default.useEffect(
    function() {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count]
  );
  import_react7.default.useEffect(
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
  import_react7.default.useEffect(
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
        setToast("Ticket " + id + " not found");
      }
    },
    [loaded]
  );
  import_react7.default.useEffect(function() {
    return function() {
      if (new URL(window.location.href).searchParams.has("ticket")) setTicketParam(null);
    };
  }, []);
  import_react7.default.useEffect(
    function() {
      if (toast === null) return;
      const timer = window.setTimeout(function() {
        setToast(null);
      }, 3e3);
      return function() {
        window.clearTimeout(timer);
      };
    },
    [toast]
  );
  import_react7.default.useEffect(
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
  const error = errorTimedOut && !loaded ? /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-error" }, /* @__PURE__ */ import_react7.default.createElement("span", null, "The board projection is unavailable. Retry to re-read it."), /* @__PURE__ */ import_react7.default.createElement("button", { className: "aidos-btn", onClick: props.onRetry }, "Retry")) : null;
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
  const [evidenceCollapsed, setEvidenceCollapsed] = import_react7.default.useState(function() {
    return evidenceIsMany(selectedEvidence);
  });
  const detailPanel = selectedTicket === null ? null : /* @__PURE__ */ import_react7.default.createElement(
    DetailPanel,
    {
      ticket: selectedTicket,
      evidence: selectedEvidence,
      evidenceCollapsed,
      onToggleEvidence: () => {
        setEvidenceCollapsed((v) => !v);
      },
      onClose: closeDetail
    }
  );
  const createModal = createOpen ? /* @__PURE__ */ import_react7.default.createElement(
    "div",
    {
      className: "aidos-modal-mask",
      onClick: () => {
        setCreateOpen(false);
      }
    },
    /* @__PURE__ */ import_react7.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: (event) => {
          event.stopPropagation();
        }
      },
      /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-modal-head" }, /* @__PURE__ */ import_react7.default.createElement("h3", { className: "aidos-modal-title" }, "Create a ticket"), /* @__PURE__ */ import_react7.default.createElement(
        "button",
        {
          className: "aidos-close-btn",
          onClick: () => {
            setCreateOpen(false);
          }
        },
        "\xD7"
      )),
      /* @__PURE__ */ import_react7.default.createElement("p", { className: "aidos-modal-body" }, "The create form arrives in a later update. This modal is a stub.")
    )
  ) : null;
  const toastEl = toast === null ? null : /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-toast" }, toast);
  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-skeleton-grid" }, [0, 1, 2, 3, 4, 5].map((index) => /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-skeleton-tile", key: index })));
  } else {
    body = /* @__PURE__ */ import_react7.default.createElement(
      TicketView,
      {
        sessionId,
        tickets: filtered,
        allTicketsCount,
        applied,
        selectedId,
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
  return /* @__PURE__ */ import_react7.default.createElement(import_react7.default.Fragment, null, /* @__PURE__ */ import_react7.default.createElement("div", { className: "aidos-layout" }, body, detailPanel), createModal, toastEl);
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
