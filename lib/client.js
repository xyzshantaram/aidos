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

// src/client/styles.ts
var STYLE_TAG_ID = "aidos/board.css";
var CSS_TEXT = [
  // root and layout
  ".aidos-root{box-sizing:border-box;display:flex;gap:16px;padding:14px;color:var(--dsw-alias-label-primary);flex:1;min-width:0}",
  ".aidos-sidebar{flex:none;width:260px;display:flex;flex-direction:column;gap:12px;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}",
  ".aidos-layout{display:flex;gap:16px;align-items:flex-start;flex:1;min-width:0}",
  ".aidos-grid-wrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}",
  ".aidos-grid-chrome{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;align-content:start}",
  // buttons
  ".aidos-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px}",
  ".aidos-btn:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}",
  ".aidos-btn-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);border-color:transparent}",
  ".aidos-btn-dot{position:relative}",
  '.aidos-btn-dot::after{content:"";position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);border:1px solid var(--dsw-alias-bg-tertiary)}',
  ".aidos-toggle-btn{min-width:0}",
  ".aidos-sidebar-toggle{margin-left:auto}",
  // sections and controls
  ".aidos-panel-section{display:flex;flex-direction:column;gap:8px}",
  ".aidos-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-panel-title{font-size:12px;font-weight:600;margin:0;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:0.5px}",
  ".aidos-check-list{display:flex;flex-direction:column;gap:4px}",
  ".aidos-check-row{display:flex;align-items:center;gap:6px;font-size:12px;line-height:18px;cursor:pointer}",
  ".aidos-check-row input{cursor:pointer}",
  ".aidos-check-count{color:var(--dsw-alias-label-tertiary)}",
  ".aidos-sort-row{display:flex;align-items:center;gap:6px}",
  ".aidos-sort-row select{flex:1;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 4px}",
  ".aidos-actions-row{display:flex;gap:8px;flex-wrap:wrap}",
  // search and autocomplete
  ".aidos-search-box{position:relative}",
  ".aidos-search-input{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}",
  ".aidos-autocomplete{position:absolute;z-index:20;top:calc(100% + 2px);left:0;right:0;max-height:220px;overflow:auto;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 6px 20px var(--dsw-alias-bg-mask-drop)}",
  ".aidos-suggestion{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:none;border:none;padding:6px 8px;cursor:pointer}",
  ".aidos-suggestion:hover{background:var(--dsw-alias-interactive-bg-hover)}",
  ".aidos-suggestion-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".aidos-ticket-id-badge{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 6px}",
  // the ticket tile
  ".aidos-tile{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;aspect-ratio:1/1;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;cursor:pointer;min-width:0;text-align:left}",
  ".aidos-tile:hover{border-color:var(--dsw-alias-border-l4)}",
  ".aidos-tile-selected{border:2px solid var(--dsw-alias-brand-primary);padding:11px}",
  ".aidos-tile-title{font-size:13px;font-weight:600;line-height:18px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".aidos-tile-meta{display:flex;align-items:center;justify-content:space-between;gap:6px}",
  ".aidos-tile-gate{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary)}",
  // the confidence ring
  ".aidos-ring-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}",
  ".aidos-ring{width:64px;height:64px}",
  ".aidos-ring-percent{font-size:13px;font-weight:700;fill:var(--dsw-alias-label-primary)}",
  ".aidos-ring-asterisk{font-size:10px;fill:var(--dsw-alias-state-warn-primary)}",
  ".aidos-ring-na{font-size:11px;fill:var(--dsw-alias-label-tertiary)}",
  // the state badge
  ".aidos-state-badge{flex:none;font-size:10px;line-height:14px;border-radius:999px;padding:0 8px;white-space:nowrap}",
  ".aidos-state-open{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2)}",
  ".aidos-state-in-progress{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary);border:1px solid var(--dsw-alias-state-warn-secondary)}",
  ".aidos-state-awaiting-verification{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);border:1px solid var(--dsw-alias-state-business-primary)}",
  ".aidos-state-done{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary);border:1px solid var(--dsw-alias-state-success-secondary)}",
  // placeholder evidence chips
  ".aidos-evidence-row{display:flex;gap:6px;flex-wrap:wrap}",
  ".aidos-evidence-tag{font-size:10px;line-height:14px;border:1px solid;border-radius:999px;padding:0 8px}",
  // detail panel: fields, criteria, evidence
  ".aidos-detail-note{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);margin:0}",
  ".aidos-evidence-tags{display:flex;gap:6px;flex-wrap:wrap}",
  ".aidos-criterion{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}",
  ".aidos-criterion-uncovered{background:var(--dsw-alias-bg-warn-soft);opacity:0.7}",
  ".aidos-criterion-ungrouped{border-style:dashed}",
  ".aidos-criterion-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-criterion-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}",
  ".aidos-criterion-count{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary)}",
  ".aidos-evidence-row-item{display:flex;gap:6px;align-items:baseline;font-size:11px;line-height:16px}",
  ".aidos-evidence-kind{font-weight:600;color:var(--dsw-alias-label-primary)}",
  ".aidos-evidence-author{color:var(--dsw-alias-label-tertiary)}",
  ".aidos-evidence-meta{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".aidos-evidence-body{display:flex;flex-direction:column;gap:6px}",
  ".aidos-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;text-align:center;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l3);border-radius:12px}",
  ".aidos-empty-title{font-size:14px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary)}",
  ".aidos-empty-note{font-size:12px;line-height:18px;margin:0;color:var(--dsw-alias-label-secondary)}",
  ".aidos-error{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-secondary);border-radius:12px;font-size:12px;line-height:18px}",
  // skeleton tiles
  ".aidos-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}",
  ".aidos-skeleton-tile{aspect-ratio:1/1;border-radius:12px;background:var(--dsw-alias-bg-skeleton)}",
  // the detail side panel
  ".aidos-detail{flex:none;width:300px;display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}",
  ".aidos-detail-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-detail-title{font-size:14px;font-weight:600;line-height:20px;margin:0}",
  ".aidos-detail-close{cursor:pointer;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}",
  ".aidos-detail-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
  // the create modal
  ".aidos-modal-mask{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-drop)}",
  ".aidos-modal{box-sizing:border-box;width:420px;max-width:calc(100vw - 32px);display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 12px 40px var(--dsw-alias-bg-mask-drop)}",
  ".aidos-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-modal-title{font-size:14px;font-weight:600;margin:0}",
  ".aidos-modal-close{cursor:pointer;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}",
  ".aidos-modal-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
  // the toast
  ".aidos-toast{position:fixed;z-index:200;left:50%;bottom:32px;transform:translateX(-50%);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 14px;box-shadow:0 8px 24px var(--dsw-alias-bg-mask-drop)}"
].join("");
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.querySelector('style[data-plugin-css="' + STYLE_TAG_ID + '"]') !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "aidos";
  tag.dataset.pluginCss = STYLE_TAG_ID;
  tag.textContent = CSS_TEXT;
  document.head.appendChild(tag);
}

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
var import_react5 = __toESM(require("react"), 1);

// src/client/ticket-view.tsx
var import_react3 = __toESM(require("react"), 1);

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
    updateStaged({
      ...DEFAULT_APPLIED,
      stateIds: [...DEFAULT_APPLIED.stateIds],
      projectIds: DEFAULT_APPLIED.projectIds === null ? null : [...DEFAULT_APPLIED.projectIds]
    });
  }
  const projectRows = props.projects === void 0 ? null : import_react.default.createElement(
    "div",
    { className: "aidos-panel-section" },
    import_react.default.createElement(
      "div",
      { className: "aidos-panel-head" },
      import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Projects")
    ),
    import_react.default.createElement(
      "div",
      { className: "aidos-check-list" },
      props.projects.map((project) => {
        const checked = staged.projectIds === null || staged.projectIds.includes(project.id);
        return import_react.default.createElement(
          "label",
          { className: "aidos-check-row", key: project.id },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked,
            onChange: function() {
              toggleProject(project.id);
            }
          }),
          import_react.default.createElement("span", null, project.name)
        );
      })
    )
  );
  const stateRows = import_react.default.createElement(
    "div",
    { className: "aidos-panel-section" },
    import_react.default.createElement(
      "div",
      { className: "aidos-panel-head" },
      import_react.default.createElement("h4", { className: "aidos-panel-title" }, "State")
    ),
    import_react.default.createElement(
      "div",
      { className: "aidos-check-list" },
      STATE_CHECKLIST_ORDER.map((state) => {
        const checked = staged.stateIds.includes(state);
        const count = props.tickets.filter((t) => t.state === state).length;
        return import_react.default.createElement(
          "label",
          { className: "aidos-check-row", key: state },
          import_react.default.createElement("input", {
            type: "checkbox",
            checked,
            onChange: function() {
              toggleState(state);
            }
          }),
          import_react.default.createElement("span", null, stateLabel(state)),
          import_react.default.createElement("span", { className: "aidos-check-count" }, String(count))
        );
      })
    )
  );
  const sortRows = import_react.default.createElement(
    "div",
    { className: "aidos-panel-section" },
    import_react.default.createElement(
      "div",
      { className: "aidos-panel-head" },
      import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Sort")
    ),
    import_react.default.createElement(
      "div",
      { className: "aidos-sort-row" },
      import_react.default.createElement(
        "select",
        {
          value: staged.sortKey,
          onChange: function(event) {
            updateStaged({
              ...staged,
              sortKey: event.target.value
            });
          }
        },
        SORT_OPTIONS.map(
          (option) => import_react.default.createElement("option", { key: option.key, value: option.key }, option.label)
        )
      )
    ),
    import_react.default.createElement(
      "div",
      { className: "aidos-actions-row" },
      import_react.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-toggle-btn",
          onClick: function() {
            updateStaged({ ...staged, descending: !staged.descending });
          }
        },
        staged.descending ? "Descending" : "Ascending"
      )
    )
  );
  const searchSection = import_react.default.createElement(
    "div",
    { className: "aidos-panel-section" },
    import_react.default.createElement(
      "div",
      { className: "aidos-panel-head" },
      import_react.default.createElement("h4", { className: "aidos-panel-title" }, "Search")
    ),
    import_react.default.createElement(
      "div",
      { className: "aidos-search-box" },
      import_react.default.createElement("input", {
        className: "aidos-search-input",
        type: "text",
        placeholder: "Title or id",
        value: searchInput,
        onChange: function(event) {
          updateSearch(event.target.value);
        },
        onFocus: function() {
          setFocused(true);
        },
        onBlur: function() {
          window.setTimeout(function() {
            setFocused(false);
          }, 120);
        }
      }),
      focused && suggestions.length > 0 ? import_react.default.createElement(
        "div",
        { className: "aidos-autocomplete" },
        suggestions.map(
          (ticket) => import_react.default.createElement(
            "button",
            {
              className: "aidos-suggestion",
              key: ticket.id,
              onMouseDown: function(event) {
                event.preventDefault();
                clearSearch();
                props.onJump(ticket.id);
              }
            },
            import_react.default.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
            import_react.default.createElement("span", { className: "aidos-ticket-id-badge" }, "#" + ticket.id)
          )
        )
      ) : null
    )
  );
  const actionRows = import_react.default.createElement(
    "div",
    { className: "aidos-actions-row" },
    import_react.default.createElement(
      "button",
      {
        className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
        onClick: apply2
      },
      "Apply"
    ),
    import_react.default.createElement(
      "button",
      { className: "aidos-btn", onClick: reset },
      "Reset"
    )
  );
  return import_react.default.createElement(
    "div",
    { className: "aidos-sidebar" },
    import_react.default.createElement(
      "div",
      { className: "aidos-panel-head" },
      import_react.default.createElement("h3", { className: "aidos-panel-title" }, "Filters"),
      import_react.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-sidebar-toggle",
          onClick: props.onToggleCollapsed
        },
        props.collapsed ? "Show" : "Hide"
      )
    ),
    props.collapsed ? null : projectRows,
    props.collapsed ? null : stateRows,
    props.collapsed ? null : sortRows,
    props.collapsed ? null : searchSection,
    props.collapsed ? null : actionRows
  );
}

// src/client/ticket-tile.tsx
var import_react2 = __toESM(require("react"), 1);
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
  }
}
function renderRing(ticket) {
  const has = hasCriteria(ticket);
  const percent = ringPercent(ticket.confidenceScore);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const arcLength = has ? percent / 100 * circumference : 0;
  const track = import_react2.default.createElement("circle", {
    cx: 32,
    cy: 32,
    r: radius,
    fill: "none",
    stroke: "var(--dsw-alias-border-l2)",
    strokeWidth: 5
  });
  const arc = has && percent > 0 ? import_react2.default.createElement("circle", {
    cx: 32,
    cy: 32,
    r: radius,
    fill: "none",
    stroke: "var(--dsw-alias-brand-primary)",
    strokeWidth: 5,
    strokeLinecap: "round",
    strokeDasharray: arcLength + " " + circumference,
    transform: "rotate(-90 32 32)"
  }) : null;
  const percentText = import_react2.default.createElement(
    "text",
    {
      x: 32,
      y: 37,
      textAnchor: "middle",
      className: has ? "aidos-ring-percent" : "aidos-ring-na"
    },
    has ? Math.round(percent) + "%" : "N/A"
  );
  const asterisk = has && percent > 0 ? import_react2.default.createElement(
    "text",
    {
      x: 47,
      y: 24,
      textAnchor: "middle",
      className: "aidos-ring-asterisk",
      title: "Advisory score. It never unlocks anything."
    },
    "*"
  ) : null;
  return import_react2.default.createElement(
    "svg",
    { className: "aidos-ring", viewBox: "0 0 64 64" },
    track,
    arc,
    percentText,
    asterisk
  );
}
function renderEvidenceTags(props) {
  const counts2 = evidenceKindCounts(props.evidence);
  const tags = counts2.map(function(count) {
    return import_react2.default.createElement(
      "span",
      {
        className: "aidos-evidence-tag",
        key: count.kind,
        style: { borderColor: count.color, color: count.color }
      },
      count.kind + " " + count.count
    );
  });
  return tags.length === 0 ? null : import_react2.default.createElement("div", { className: "aidos-evidence-row" }, tags);
}
function TicketTile(props) {
  const ticket = props.ticket;
  const className = "aidos-tile" + (props.selected ? " aidos-tile-selected" : "");
  const badgeClass = "aidos-state-badge aidos-state-" + stateClass(ticket.state);
  return import_react2.default.createElement(
    "button",
    {
      className,
      onClick: props.onSelect,
      title: ticket.title
    },
    import_react2.default.createElement("h3", { className: "aidos-tile-title" }, ticket.title),
    import_react2.default.createElement("div", { className: "aidos-ring-wrap" }, renderRing(ticket)),
    import_react2.default.createElement(
      "div",
      { className: "aidos-tile-meta" },
      import_react2.default.createElement(
        "span",
        { className: "aidos-tile-gate" },
        formatGateFraction(ticket.gateFraction, hasCriteria(ticket))
      ),
      import_react2.default.createElement(
        "span",
        { className: badgeClass },
        stateLabel(ticket.state)
      )
    ),
    renderEvidenceTags(props)
  );
}

// src/client/ticket-view.tsx
function TicketView(props) {
  const [collapsed, setCollapsed] = import_react3.default.useState(false);
  const tiles = props.tickets.map(function(ticket) {
    return import_react3.default.createElement(TicketTile, {
      key: ticket.id,
      ticket,
      evidence: props.evidenceByTicket?.[String(ticket.id)] ?? [],
      selected: ticket.id === props.selectedId,
      onSelect: function() {
        props.onSelect(ticket.id);
      }
    });
  });
  let content;
  if (props.allTicketsCount === 0) {
    content = import_react3.default.createElement(
      "div",
      { className: "aidos-empty" },
      import_react3.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets yet"),
      import_react3.default.createElement(
        "p",
        { className: "aidos-empty-note" },
        "This session holds no tickets. Create the first one to start the board."
      ),
      import_react3.default.createElement(
        "button",
        { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate },
        "Create a ticket"
      )
    );
  } else if (props.tickets.length === 0) {
    content = import_react3.default.createElement(
      "div",
      { className: "aidos-empty" },
      import_react3.default.createElement("h3", { className: "aidos-empty-title" }, "No tickets match"),
      import_react3.default.createElement(
        "p",
        { className: "aidos-empty-note" },
        "The active filters hide every ticket. Clear them to see the board."
      ),
      import_react3.default.createElement(
        "button",
        { className: "aidos-btn", onClick: props.onClearFilters },
        "Clear filters"
      )
    );
  } else {
    content = import_react3.default.createElement("div", { className: "aidos-board-grid" }, tiles);
  }
  return import_react3.default.createElement(
    "div",
    { className: "aidos-root" },
    import_react3.default.createElement(FilterPanel, {
      sessionId: props.sessionId,
      projects: props.projects,
      applied: props.applied,
      tickets: props.tickets,
      onApply: props.onApply,
      onJump: props.onJump,
      collapsed,
      onToggleCollapsed: function() {
        setCollapsed(!collapsed);
      }
    }),
    import_react3.default.createElement(
      "div",
      { className: "aidos-grid-wrap" },
      import_react3.default.createElement(
        "div",
        { className: "aidos-grid-chrome" },
        import_react3.default.createElement(
          "span",
          { className: "aidos-empty-note" },
          props.tickets.length + " of " + props.allTicketsCount + " tickets"
        ),
        import_react3.default.createElement(
          "button",
          { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate },
          "Create"
        )
      ),
      content
    )
  );
}

// src/client/detail-panel.tsx
var import_react4 = __toESM(require("react"), 1);
function stateClass2(state) {
  switch (state) {
    case "open":
      return "open";
    case "in_progress":
      return "in-progress";
    case "awaiting_verification":
      return "awaiting-verification";
    case "done":
      return "done";
  }
}
function renderRing2(ticket) {
  const has = hasCriteria(ticket);
  const percent = ringPercent(ticket.confidenceScore);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const arcLength = has ? percent / 100 * circumference : 0;
  const track = import_react4.default.createElement("circle", {
    cx: 32,
    cy: 32,
    r: radius,
    fill: "none",
    stroke: "var(--dsw-alias-border-l2)",
    strokeWidth: 5
  });
  const arc = has && percent > 0 ? import_react4.default.createElement("circle", {
    cx: 32,
    cy: 32,
    r: radius,
    fill: "none",
    stroke: "var(--dsw-alias-brand-primary)",
    strokeWidth: 5,
    strokeLinecap: "round",
    strokeDasharray: arcLength + " " + circumference,
    transform: "rotate(-90 32 32)"
  }) : null;
  const percentText = import_react4.default.createElement(
    "text",
    {
      x: 32,
      y: 37,
      textAnchor: "middle",
      className: has ? "aidos-ring-percent" : "aidos-ring-na"
    },
    has ? Math.round(percent) + "%" : "N/A"
  );
  const asterisk = has && percent > 0 ? import_react4.default.createElement(
    "text",
    {
      x: 47,
      y: 24,
      textAnchor: "middle",
      className: "aidos-ring-asterisk",
      title: "Advisory score. It never unlocks anything."
    },
    "*"
  ) : null;
  return import_react4.default.createElement(
    "svg",
    { className: "aidos-ring", viewBox: "0 0 64 64" },
    track,
    arc,
    percentText,
    asterisk
  );
}
function renderCriterionGroup(group, index) {
  const isUngrouped = group.criterion === "";
  const rowClass = isUngrouped ? "aidos-criterion aidos-criterion-ungrouped" : group.matched ? "aidos-criterion" : "aidos-criterion aidos-criterion-uncovered";
  const label = isUngrouped ? "Ungrouped" : import_react4.default.createElement(
    "span",
    { className: "aidos-criterion-label" },
    group.criterion
  );
  const rows = group.rows.map(function(row, rowIndex) {
    return import_react4.default.createElement(
      "div",
      { className: "aidos-evidence-row-item", key: rowIndex },
      import_react4.default.createElement(
        "span",
        { className: "aidos-evidence-kind" },
        row.kind
      ),
      import_react4.default.createElement(
        "span",
        { className: "aidos-evidence-author" },
        row.author
      ),
      typeof row.payload.criteria === "string" ? import_react4.default.createElement(
        "span",
        { className: "aidos-evidence-meta" },
        "criterion: " + row.payload.criteria
      ) : null
    );
  });
  return import_react4.default.createElement(
    "div",
    { className: rowClass, key: index },
    import_react4.default.createElement(
      "div",
      { className: "aidos-criterion-head" },
      label,
      import_react4.default.createElement(
        "span",
        { className: "aidos-criterion-count" },
        String(group.rows.length)
      )
    ),
    rows
  );
}
function renderEvidenceSection(props) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const uncovered = uncoveredCriteria(props.ticket.criteria, props.evidence);
  const body = import_react4.default.createElement(
    "div",
    { className: "aidos-evidence-body" },
    groups.length === 0 && props.evidence.length === 0 ? import_react4.default.createElement(
      "p",
      { className: "aidos-detail-note" },
      "No evidence rows yet."
    ) : groups.map(function(group, index) {
      return renderCriterionGroup(group, index);
    })
  );
  return import_react4.default.createElement(
    "div",
    { className: "aidos-panel-section" },
    import_react4.default.createElement(
      "div",
      { className: "aidos-panel-head" },
      import_react4.default.createElement(
        "h4",
        { className: "aidos-panel-title" },
        "Evidence"
      ),
      import_react4.default.createElement(
        "button",
        {
          className: "aidos-btn aidos-toggle-btn",
          onClick: props.onToggleEvidence
        },
        props.evidenceCollapsed ? "Expand" : "Collapse"
      )
    ),
    props.evidenceCollapsed ? null : body
  );
}
function renderKindTags(props) {
  const counts2 = evidenceKindCounts(props.evidence);
  const tags = counts2.map(function(count, index) {
    return import_react4.default.createElement(
      "span",
      {
        className: "aidos-evidence-tag",
        key: count.kind,
        style: { borderColor: count.color, color: count.color }
      },
      count.kind + " " + count.count
    );
  });
  return tags.length === 0 ? null : import_react4.default.createElement("div", { className: "aidos-evidence-tags" }, tags);
}
function DetailPanel(props) {
  const ticket = props.ticket;
  const badgeClass = "aidos-state-badge aidos-state-" + stateClass2(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);
  return import_react4.default.createElement(
    "div",
    { className: "aidos-detail" },
    import_react4.default.createElement(
      "div",
      { className: "aidos-detail-head" },
      import_react4.default.createElement("h3", { className: "aidos-detail-title" }, ticket.title),
      import_react4.default.createElement(
        "button",
        { className: "aidos-detail-close", onClick: props.onClose },
        "\xD7"
      )
    ),
    import_react4.default.createElement("div", { className: "aidos-ring-wrap" }, renderRing2(ticket)),
    import_react4.default.createElement(
      "div",
      { className: "aidos-tile-meta" },
      import_react4.default.createElement(
        "span",
        { className: "aidos-tile-gate" },
        formatGateFraction(ticket.gateFraction, hasCriteria(ticket))
      ),
      import_react4.default.createElement(
        "span",
        { className: badgeClass },
        stateLabel(ticket.state)
      )
    ),
    ticket.description ? import_react4.default.createElement("p", { className: "aidos-detail-body" }, ticket.description) : null,
    import_react4.default.createElement("p", { className: "aidos-detail-body" }, "#" + ticket.id),
    renderKindTags(props),
    uncovered.length > 0 ? import_react4.default.createElement(
      "p",
      { className: "aidos-detail-note" },
      uncovered.length + " uncovered criteria"
    ) : null,
    renderEvidenceSection(props)
  );
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
      (state) => state === "open" || state === "in_progress" || state === "awaiting_verification" || state === "done"
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
function LocalTicketView(props) {
  const [retryNonce, setRetryNonce] = import_react5.default.useState(0);
  return import_react5.default.createElement(ProjectionReader, {
    key: retryNonce,
    sessionId: props.sessionId,
    useProjection: props.useProjection,
    onRetry: function() {
      setRetryNonce(function(n) {
        return n + 1;
      });
    }
  });
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
  const [applied, setAppliedStateLocal] = import_react5.default.useState(function() {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedId, setSelectedId] = import_react5.default.useState(null);
  const [createOpen, setCreateOpen] = import_react5.default.useState(false);
  const [toast, setToast] = import_react5.default.useState(null);
  const [errorTimedOut, setErrorTimedOut] = import_react5.default.useState(false);
  const deepLinkHandled = import_react5.default.useRef(false);
  const restoredRef = import_react5.default.useRef(false);
  const count = openCount(rawTickets);
  import_react5.default.useEffect(
    function() {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count]
  );
  import_react5.default.useEffect(
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
  import_react5.default.useEffect(
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
  import_react5.default.useEffect(function() {
    return function() {
      const url = new URL(window.location.href);
      if (url.searchParams.has("ticket")) {
        url.searchParams.delete("ticket");
        window.history.replaceState({}, "", url);
      }
    };
  }, []);
  import_react5.default.useEffect(
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
  import_react5.default.useEffect(
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
  const error = errorTimedOut && !loaded ? import_react5.default.createElement(
    "div",
    { className: "aidos-error" },
    import_react5.default.createElement(
      "span",
      null,
      "The board projection is unavailable. Retry to re-read it."
    ),
    import_react5.default.createElement(
      "button",
      {
        className: "aidos-btn",
        onClick: props.onRetry
      },
      "Retry"
    )
  ) : null;
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
    const url = new URL(window.location.href);
    url.searchParams.set("ticket", String(id));
    window.history.pushState({}, "", url);
  }
  function closeDetail() {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("ticket");
    window.history.replaceState({}, "", url);
  }
  const selectedTicket = selectedId === null ? null : rawTickets.find((ticket) => ticket.id === selectedId) ?? null;
  const selectedEvidence = selectedTicket === null ? [] : rawEvidence[String(selectedTicket.id)] ?? [];
  const [evidenceCollapsed, setEvidenceCollapsed] = import_react5.default.useState(function() {
    return evidenceIsMany(selectedEvidence);
  });
  const detailPanel = selectedTicket === null ? null : import_react5.default.createElement(DetailPanel, {
    ticket: selectedTicket,
    evidence: selectedEvidence,
    evidenceCollapsed,
    onToggleEvidence: function() {
      setEvidenceCollapsed(function(v) {
        return !v;
      });
    },
    onClose: closeDetail
  });
  const createModal = createOpen ? import_react5.default.createElement(
    "div",
    { className: "aidos-modal-mask", onClick: function() {
      setCreateOpen(false);
    } },
    import_react5.default.createElement(
      "div",
      {
        className: "aidos-modal",
        onClick: function(event) {
          event.stopPropagation();
        }
      },
      import_react5.default.createElement(
        "div",
        { className: "aidos-modal-head" },
        import_react5.default.createElement("h3", { className: "aidos-modal-title" }, "Create a ticket"),
        import_react5.default.createElement(
          "button",
          { className: "aidos-modal-close", onClick: function() {
            setCreateOpen(false);
          } },
          "\xD7"
        )
      ),
      import_react5.default.createElement(
        "p",
        { className: "aidos-modal-body" },
        "The create form arrives in a later update. This modal is a stub."
      )
    )
  ) : null;
  const toastEl = toast === null ? null : import_react5.default.createElement("div", { className: "aidos-toast" }, toast);
  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = import_react5.default.createElement(
      "div",
      { className: "aidos-skeleton-grid" },
      [0, 1, 2, 3, 4, 5].map(function(index) {
        return import_react5.default.createElement("div", {
          className: "aidos-skeleton-tile",
          key: index
        });
      })
    );
  } else {
    body = import_react5.default.createElement(TicketView, {
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
      onCreate: function() {
        setCreateOpen(true);
      }
    });
  }
  return import_react5.default.createElement(
    import_react5.default.Fragment,
    null,
    import_react5.default.createElement(
      "div",
      { className: "aidos-layout" },
      body,
      detailPanel
    ),
    createModal,
    toastEl
  );
}

// src/client/index.ts
var name = "aidos";
var inject = ["slots"];
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
