/**
 * The filter sidebar. Every control stages locally, writes back to the
 * view-state store, and Apply hands the staged state to the parent.
 */

import react from "react";

import type { BoardKey } from "./board-logic";
import { STATE_CHECKLIST_ORDER, autocompleteTickets, fullTicketId, idColor, stateLabel, ticketChipLabel, boardKeyOf } from "./board-logic";
import { logDebug } from "./log";
import type { AppliedState } from "./view-state";
import {
  cloneAppliedState,
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
  onJump: (key: BoardKey) => void;
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

/**
 * How long the panel waits before a change lands, in milliseconds.
 *
 * Exported so the rule is a value a test can read rather than a number
 * buried in a setTimeout. "A second or two" was the brief: long enough to
 * absorb a burst of clicks, short enough that nobody starts looking for the
 * button that used to be there.
 */
export const FILTER_APPLY_DELAY_MS = 1200;

/**
 * What replaced the Apply button: the panel's own account of itself.
 *
 * Three states, and the middle one is the reason this exists. PENDING says
 * a change is coming, so a board that has not updated yet is never mistaken
 * for one that is stuck -- with no button to press, that ambiguity is the
 * whole risk of auto-applying. DIRTY-but-not-pending means a staged change
 * whose settle was cancelled (the panel was reopened, say), which earns a
 * plain word rather than an animation. Otherwise the board matches the
 * filters and the panel says nothing at all.
 */
function FilterApplyStatus(props: { pending: boolean; dirty: boolean }) {
  if (props.pending) {
    return (
      <span className="aidos-filter-status" aria-live="polite">
        <span className="aidos-merge-spinner" />
        <span>Filtering…</span>
      </span>
    );
  }
  if (props.dirty) {
    return (
      <span className="aidos-filter-status" aria-live="polite">
        <span>Not applied yet</span>
      </span>
    );
  }
  return <span className="aidos-filter-status" />;
}

export function FilterPanel(props: FilterPanelProps) {
  const sessionId = props.sessionId;
  const stagedRef = react.useRef(getStagedState(sessionId));
  const [staged, setStaged] = react.useState(stagedRef.current);
  const [searchInput, setSearchInput] = react.useState(stagedRef.current.search);
  const [focused, setFocused] = react.useState(false);
  const debounceRef = react.useRef<number | null>(null);
  /*
   * THE FILTER APPLIES ITSELF (user, 2026-09-08). There is no Apply button:
   * a change lands on its own after a short settle, and the panel says so
   * while it waits.
   *
   * The settle is not zero on purpose. Applying on every keystroke and
   * every checkbox re-filters and re-renders the whole board mid-gesture,
   * which is worse than a button for anyone who ticks three states in a
   * row. A second or two is long enough to absorb a burst of clicks and
   * short enough that nobody reaches for a button that is not there.
   *
   * The SPINNER is the other half of dropping the button, and it is not
   * decoration: without a button, an interface that has not updated yet is
   * indistinguishable from one that is stuck. The spinner says "your click
   * landed, the board is about to change".
   */
  const applyRef = react.useRef<number | null>(null);
  const [applyPending, setApplyPending] = react.useState(false);

  /** Schedule the staged state to land, replacing any pending settle. */
  function scheduleApply(next: AppliedState) {
    if (applyRef.current !== null) window.clearTimeout(applyRef.current);
    setApplyPending(true);
    applyRef.current = window.setTimeout(function () {
      applyRef.current = null;
      setApplyPending(false);
      props.onApply(next);
    }, FILTER_APPLY_DELAY_MS);
  }

  /** Land the staged state NOW, cancelling any settle. For explicit acts. */
  function applyNow(next: AppliedState) {
    if (applyRef.current !== null) window.clearTimeout(applyRef.current);
    applyRef.current = null;
    setApplyPending(false);
    props.onApply(next);
  }

  function updateStaged(next: AppliedState) {
    stagedRef.current = next;
    setStaged(next);
    setStagedState(sessionId, next);
    scheduleApply(next);
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
    logDebug("filter panel mounted");
  }, []);

  react.useEffect(function () {
    return function () {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      /*
       * A pending settle dies with the panel. Firing onApply from a
       * cleanup would push a filter change into a parent that is unmounting
       * or has already moved on -- and the staged state is durable
       * (setStagedState), so nothing is lost: reopening the panel shows the
       * same staging and applies it on the next touch.
       */
      if (applyRef.current !== null) window.clearTimeout(applyRef.current);
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

  function reset() {
    /*
     * Reset lands IMMEDIATELY. It is an explicit "put it back", not part of
     * a burst of adjustments, so making the user watch a spinner for it
     * would be ceremony. It still writes the staged store first, so the
     * cleared state is what a reopened panel shows.
     */
    setSearchInput("");
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    const cleared = cloneAppliedState(DEFAULT_APPLIED);
    stagedRef.current = cleared;
    setStaged(cleared);
    setStagedState(sessionId, cleared);
    applyNow(cleared);
  }

  const projectRows =
    props.projects === undefined
      ? null
      : (
          <div className="aidos-panel-section">
            <div className="aidos-panel-head">
              <h4 className="aidos-panel-title">Projects</h4>
            </div>
            <div className="aidos-check-list">
              {props.projects.map((project) => {
                const checked =
                  staged.projectIds === null || staged.projectIds.includes(project.id);
                return (
                  <label className="aidos-check-row" key={project.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        toggleProject(project.id);
                      }}
                    />
                    <span>{project.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

  const stateRows = (
    <div className="aidos-panel-section">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">State</h4>
      </div>
      <div className="aidos-check-list">
        {STATE_CHECKLIST_ORDER.map((state) => {
          const checked = staged.stateIds.includes(state);
          const count = props.tickets.filter((t) => t.state === state).length;
          return (
            <label className="aidos-check-row" key={state}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  toggleState(state);
                }}
              />
              <span>{stateLabel(state)}</span>
              <span className="aidos-check-count">{String(count)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const sortRows = (
    <div className="aidos-panel-section">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Sort</h4>
      </div>
      <div className="aidos-sort-row">
        <select
          value={staged.sortKey}
          onChange={(event: react.ChangeEvent<HTMLSelectElement>) => {
            updateStaged({
              ...staged,
              sortKey: event.target.value as AppliedState["sortKey"],
            });
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="aidos-btn aidos-toggle-btn"
          title={staged.descending ? "Sort ascending" : "Sort descending"}
          data-dsh-tip=""
          aria-label={staged.descending ? "Sort ascending" : "Sort descending"}
          onClick={() => {
            updateStaged({ ...staged, descending: !staged.descending });
          }}
        >
          {staged.descending ? "↓" : "↑"}
        </button>
      </div>
    </div>
  );

  const searchSection = (
    <div className="aidos-panel-section">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Search</h4>
      </div>
      <div className="aidos-search-box">
        <input
          className="aidos-search-input"
          type="text"
          placeholder="Title or id"
          value={searchInput}
          onChange={(event) => {
            updateSearch(event.target.value);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            window.setTimeout(function () {
              setFocused(false);
            }, 120);
          }}
        />
        {focused && suggestions.length > 0 ? (
          <div className="aidos-autocomplete">
            {suggestions.map((ticket) => (
              <button
                className="aidos-suggestion"
                key={ticket.id}
                onMouseDown={(event: react.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  clearSearch();
                  props.onJump(boardKeyOf(ticket));
                }}
              >
                <span className="aidos-suggestion-title">{ticket.title}</span>
                <span
                  className="aidos-chip aidos-chip-id"
                  style={{ ["--chip-hue"]: idColor(fullTicketId(ticket)) } as react.CSSProperties}
                  title={fullTicketId(ticket)}
                  data-dsh-tip=""
                >
                  {ticketChipLabel(ticket)}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  const actionRows = (
    <div className="aidos-actions-row">
      <FilterApplyStatus pending={applyPending} dirty={dirty} />
      <button className="aidos-btn" onClick={reset}>
        Reset
      </button>
    </div>
  );

  // Horizontal filter bar: state chips, sort, and search inline on top of
  // the grid, so the whole width goes to ticket columns. `collapsed` hides
  // everything but the toggle.
  const stateChips = (
    <div className="aidos-filter-chips">
      {STATE_CHECKLIST_ORDER.map((state) => {
        const checked = staged.stateIds.includes(state);
        const count = props.tickets.filter((t) => t.state === state).length;
        return (
          <button
            key={state}
            className={
              "aidos-filter-chip" + (checked ? " aidos-filter-chip-on" : "")
            }
            onClick={() => {
              toggleState(state);
            }}
          >
            {stateLabel(state)}
            <span className="aidos-check-count">{String(count)}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="aidos-filterbar">
      <div className="aidos-filterbar-left">
        {stateChips}
        {props.projects === undefined ? null : props.projects.length === 0 ? null : (
          <select
            className="aidos-filter-project"
            value={
              staged.projectIds === null
                ? "all"
                : staged.projectIds.join(",")
            }
            onChange={(event: react.ChangeEvent<HTMLSelectElement>) => {
              const value = event.target.value;
              if (value === "all") {
                updateStaged({ ...staged, projectIds: null });
                return;
              }
              updateStaged({
                ...staged,
                projectIds: value === "" ? [] : value.split(",").map(Number),
              });
            }}
          >
            <option value="all">All projects</option>
            {props.projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        <div className="aidos-sort-row">
          <select
            value={staged.sortKey}
            onChange={(event: react.ChangeEvent<HTMLSelectElement>) => {
              updateStaged({
                ...staged,
                sortKey: event.target.value as AppliedState["sortKey"],
              });
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="aidos-btn aidos-toggle-btn"
            title={staged.descending ? "Sort ascending" : "Sort descending"}
            data-dsh-tip=""
            aria-label={staged.descending ? "Sort ascending" : "Sort descending"}
            onClick={() => {
              updateStaged({ ...staged, descending: !staged.descending });
            }}
          >
            {staged.descending ? "\u2193" : "\u2191"}
          </button>
        </div>
        <div className="aidos-search-box aidos-filterbar-search">
          <input
            className="aidos-search-input"
            type="text"
            placeholder="Title or id"
            value={searchInput}
            onChange={(event) => {
              updateSearch(event.target.value);
            }}
            onFocus={() => {
              setFocused(true);
            }}
            onBlur={() => {
              window.setTimeout(function () {
                setFocused(false);
              }, 120);
            }}
          />
          {focused && suggestions.length > 0 ? (
            <div className="aidos-autocomplete">
              {suggestions.map((ticket) => (
                <button
                  className="aidos-suggestion"
                  key={ticket.id}
                  onMouseDown={(event: react.MouseEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    clearSearch();
                    props.onJump(boardKeyOf(ticket));
                  }}
                >
                  <span className="aidos-suggestion-title">{ticket.title}</span>
                  <span
                    className="aidos-chip aidos-chip-id"
                    style={{ ["--chip-hue"]: idColor(fullTicketId(ticket)) } as react.CSSProperties}
                    title={fullTicketId(ticket)}
                    data-dsh-tip=""
                  >
                    {ticketChipLabel(ticket)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <FilterApplyStatus pending={applyPending} dirty={dirty} />
        <button className="aidos-btn" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
