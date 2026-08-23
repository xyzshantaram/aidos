/**
 * The filter sidebar. Every control stages locally, writes back to the
 * view-state store, and Apply hands the staged state to the parent.
 */

import react from "react";

import { STATE_CHECKLIST_ORDER, autocompleteTickets, stateLabel } from "./board-logic";
import type { AppliedState } from "./view-state";
import {
  DEFAULT_APPLIED,
  getStagedState,
  setStagedState,
} from "./view-state";
import type { TicketView } from "../kernel/projections";

export interface FilterPanelProps {
  sessionId: string;
  projects?: { id: number; name: string }[];
  applied: AppliedState;
  tickets: TicketView[];
  onApply: (state: AppliedState) => void;
  onJump: (ticketId: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Deep compare two applied states. */
function statesEqual(a: AppliedState, b: AppliedState): boolean {
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


const SORT_OPTIONS: { key: AppliedState["sortKey"]; label: string }[] = [
  { key: "confidence", label: "Confidence" },
  { key: "gates", label: "Gates" },
  { key: "time", label: "Time updated" },
  { key: "alpha", label: "Alphabetical" },
];

export function FilterPanel(props: FilterPanelProps) {
  const sessionId = props.sessionId;
  const stagedRef = react.useRef(getStagedState(sessionId));
  const [staged, setStaged] = react.useState(stagedRef.current);
  const [searchInput, setSearchInput] = react.useState(stagedRef.current.search);
  const [focused, setFocused] = react.useState(false);
  const debounceRef = react.useRef<number | null>(null);

  function updateStaged(next: AppliedState) {
    stagedRef.current = next;
    setStaged(next);
    setStagedState(sessionId, next);
  }

  function updateSearch(value: string) {
    setSearchInput(value);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(function () {
      updateStaged({ ...stagedRef.current, search: value });
    }, 150);
  }

  function clearSearch() {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    setSearchInput("");
    updateStaged({ ...stagedRef.current, search: "" });
  }

  react.useEffect(function () {
    return function () {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const dirty = !statesEqual(staged, props.applied);
  const suggestions = autocompleteTickets(props.tickets, searchInput);

  function toggleState(state: AppliedState["stateIds"][number]) {
    const has = staged.stateIds.includes(state);
    const next = has
      ? staged.stateIds.filter((s) => s !== state)
      : [...staged.stateIds, state];
    updateStaged({ ...staged, stateIds: next });
  }

  function toggleProject(projectId: number) {
    const all = (props.projects ?? []).map((p) => p.id);
    const current = staged.projectIds === null ? all : staged.projectIds;
    const has = current.includes(projectId);
    const next = has
      ? current.filter((id) => id !== projectId)
      : [...current, projectId];
    const projectIds = next.length === all.length ? null : next;
    updateStaged({ ...staged, projectIds });
  }

  function apply() {
    props.onApply(staged);
  }

  function reset() {
    setSearchInput("");
    updateStaged({
      ...DEFAULT_APPLIED,
      stateIds: [...DEFAULT_APPLIED.stateIds],
      projectIds: DEFAULT_APPLIED.projectIds === null ? null : [...DEFAULT_APPLIED.projectIds],
    });
  }

  const projectRows =
    props.projects === undefined
      ? null
      : react.createElement(
          "div",
          { className: "aidos-panel-section" },
          react.createElement(
            "div",
            { className: "aidos-panel-head" },
            react.createElement("h4", { className: "aidos-panel-title" }, "Projects"),
          ),
          react.createElement(
            "div",
            { className: "aidos-check-list" },
            props.projects.map((project) => {
              const checked =
                staged.projectIds === null || staged.projectIds.includes(project.id);
              return react.createElement(
                "label",
                { className: "aidos-check-row", key: project.id },
                react.createElement("input", {
                  type: "checkbox",
                  checked: checked,
                  onChange: function () {
                    toggleProject(project.id);
                  },
                }),
                react.createElement("span", null, project.name),
              );
            }),
          ),
        );

  const stateRows = react.createElement(
    "div",
    { className: "aidos-panel-section" },
    react.createElement(
      "div",
      { className: "aidos-panel-head" },
      react.createElement("h4", { className: "aidos-panel-title" }, "State"),
    ),
    react.createElement(
      "div",
      { className: "aidos-check-list" },
      STATE_CHECKLIST_ORDER.map((state) => {
        const checked = staged.stateIds.includes(state);
        const count = props.tickets.filter((t) => t.state === state).length;
        return react.createElement(
          "label",
          { className: "aidos-check-row", key: state },
          react.createElement("input", {
            type: "checkbox",
            checked: checked,
            onChange: function () {
              toggleState(state);
            },
          }),
          react.createElement("span", null, stateLabel(state)),
          react.createElement("span", { className: "aidos-check-count" }, String(count)),
        );
      }),
    ),
  );

  const sortRows = react.createElement(
    "div",
    { className: "aidos-panel-section" },
    react.createElement(
      "div",
      { className: "aidos-panel-head" },
      react.createElement("h4", { className: "aidos-panel-title" }, "Sort"),
    ),
    react.createElement(
      "div",
      { className: "aidos-sort-row" },
      react.createElement(
        "select",
        {
          value: staged.sortKey,
          onChange: function (event: react.ChangeEvent<HTMLSelectElement>) {
            updateStaged({
              ...staged,
              sortKey: event.target.value as AppliedState["sortKey"],
            });
          },
        },
        SORT_OPTIONS.map((option) =>
          react.createElement("option", { key: option.key, value: option.key }, option.label),
        ),
      ),
    ),
    react.createElement(
      "div",
      { className: "aidos-actions-row" },
      react.createElement(
        "button",
        {
          className: "aidos-btn aidos-toggle-btn",
          onClick: function () {
            updateStaged({ ...staged, descending: !staged.descending });
          },
        },
        staged.descending ? "Descending" : "Ascending",
      ),
    ),
  );

  const searchSection = react.createElement(
    "div",
    { className: "aidos-panel-section" },
    react.createElement(
      "div",
      { className: "aidos-panel-head" },
      react.createElement("h4", { className: "aidos-panel-title" }, "Search"),
    ),
    react.createElement(
      "div",
      { className: "aidos-search-box" },
      react.createElement("input", {
        className: "aidos-search-input",
        type: "text",
        placeholder: "Title or id",
        value: searchInput,
        onChange: function (event) {
          updateSearch(event.target.value);
        },
        onFocus: function () {
          setFocused(true);
        },
        onBlur: function () {
          window.setTimeout(function () {
            setFocused(false);
          }, 120);
        },
      }),
      focused && suggestions.length > 0
        ? react.createElement(
            "div",
            { className: "aidos-autocomplete" },
            suggestions.map((ticket) =>
              react.createElement(
                "button",
                {
                  className: "aidos-suggestion",
                  key: ticket.id,
                  onMouseDown: function (event: react.MouseEvent<HTMLButtonElement>) {
                    event.preventDefault();
                    clearSearch();
                    props.onJump(ticket.id);
                  },
                },
                react.createElement("span", { className: "aidos-suggestion-title" }, ticket.title),
                react.createElement("span", { className: "aidos-ticket-id-badge" }, "#" + ticket.id),
              ),
            ),
          )
        : null,
    ),
  );

  const actionRows = react.createElement(
    "div",
    { className: "aidos-actions-row" },
    react.createElement(
      "button",
      {
        className: dirty ? "aidos-btn aidos-btn-dot" : "aidos-btn",
        onClick: apply,
      },
      "Apply",
    ),
    react.createElement(
      "button",
      { className: "aidos-btn", onClick: reset },
      "Reset",
    ),
  );

  return react.createElement(
    "div",
    { className: "aidos-sidebar" },
    react.createElement(
      "div",
      { className: "aidos-panel-head" },
      react.createElement("h3", { className: "aidos-panel-title" }, "Filters"),
      react.createElement(
        "button",
        {
          className: "aidos-btn aidos-sidebar-toggle",
          onClick: props.onToggleCollapsed,
        },
        props.collapsed ? "Show" : "Hide",
      ),
    ),
    props.collapsed ? null : projectRows,
    props.collapsed ? null : stateRows,
    props.collapsed ? null : sortRows,
    props.collapsed ? null : searchSection,
    props.collapsed ? null : actionRows,
  );
}
