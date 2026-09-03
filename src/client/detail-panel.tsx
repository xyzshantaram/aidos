/**
 * Ticket U16: the ticket detail panel, per UI-SPEC section 6. The header
 * carries the title editor and the close button. A chips row follows, then a
 * facts table, the action row, the description panel, the criteria panel, the
 * dependencies panel, and the evidence panel. Every panel is a details
 * disclosure.
 *
 * DetailView wraps the panel: it owns the action modals, it hands the panel
 * the action row to place, and it renders the comments section. The evidence
 * attach form lives in the evidence panel body.
 */

import react from "react";
import { AllowlistEditor } from "./allowlist-editor";
import { EvidenceViewer } from "./evidence-viewer";
import { CriterionLinker, criterionOf } from "./criterion-linker";
import { marked } from "marked";

import {
  badgeClass,
  criteriaLines,
  displayDep,
  formatGateFraction,
  fullTicketId,
  hasCriteria,
  idColor,
  stateLabel,
  ticketChipLabel,
  ringPercent,
  uncoveredCriteria,
} from "./board-logic";
import { FieldEditor } from "./field-editor";
import { ActionBar } from "./action-bar";
import { CommentsSection } from "./comments-section";
import { EvidenceAttach, VerifyModal } from "./evidence-attach";
import { AllowlistRequestCard } from "./allowlist-request-card";
import { EvidenceStrip } from "./evidence-strip";
import { TicketStrip } from "./ticket-strip";
import { SignoffDialog } from "./signoff-dialog";
import { SendBackModal } from "./send-back-modal";
import { MarkDoneModal } from "./mark-done-modal";
import { PencilIcon, TrashIcon, WarningIcon } from "./icons";
import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import type { EvidenceRowLike } from "./board-logic";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow, CommentRecord } from "../kernel/types";

/**
 * Clip the rendered description at this many raw characters. The spec asks
 * for a fixed threshold, not a height measurement, so the count reads from
 * the source text and stays deterministic.
 */
const DESCRIPTION_CLIP_CHARS = 800;

export interface DetailPanelProps {
  ticket: TicketView;
  /**
   * The board write identity: the plain id for an own ticket,
   * `<sourceSessionId>:<id>` for a foreign one. Write components route
   * through it; the host sends foreign writes to the owner session.
   */
  ticketIdKey: string;
  evidence: readonly EvidenceRow[];
  evidenceCollapsed: boolean;
  onToggleEvidence: () => void;
  onClose: () => void;
  agentId: string;
  onFieldSaved: () => void;
  /** Opens the allowlist editor; the editor state lives in DetailView. */
  onOpenAllowlist?: () => void;
  /** Opens the evidence viewer for one row (#50). */
  onViewEvidence?: (row: EvidenceRowLike) => void;
  /** Always-present action descriptors with unlock reasons (#62). */
  actionHints?: Record<string, string>;
  /** Every board-known ticket view keyed for dependency cards. */
  ticketsByKey?: Map<string, TicketView>;
  /** Jump the board's selection to another ticket (dependency cards). */
  onJump?: (key: string) => void;
}

/**
 * The panel plus the action row. DetailView owns the action modals, so it
 * builds the row and passes it in.
 */
interface DetailPanelBodyProps extends DetailPanelProps {
  actions: react.ReactNode;
}

export interface DetailViewProps extends DetailPanelProps {
  comments: CommentRecord[];
}

/** Show one refusal or error as a toast. */
function showError(error: unknown) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}

/**
 * The description panel: rendered markdown through marked, a muted note
 * when empty, and a pencil in the summary row that opens an inline editor.
 */
function DescriptionPanel(props: {
  ticket: TicketView;
  ticketIdKey: string;
  agentId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = react.useState(false);
  const [draft, setDraft] = react.useState("");
  const [saving, setSaving] = react.useState(false);
  const [expanded, setExpanded] = react.useState(false);
  const text = props.ticket.description;
  const empty = text.trim() === "";
  const long = text.length > DESCRIPTION_CLIP_CHARS;
  const clipped = long && !expanded;
  const html = empty
    ? ""
    : String(marked.parse(text, { async: false }));

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, description: draft },
        props.agentId,
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

  let body: react.ReactNode;
  if (editing) {
    body = (
      <>
        <textarea
          value={draft}
          disabled={saving}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <div className="aidos-form-actions">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={saving}
            onClick={() => {
              void save();
            }}
          >
            Save
          </button>
          <button
            className="aidos-btn"
            disabled={saving}
            onClick={cancel}
          >
            Cancel
          </button>
        </div>
      </>
    );
  } else if (empty) {
    body = <p className="aidos-detail-note">No description.</p>;
  } else {
    body = (
      <>
        <div
          className={"aidos-md" + (clipped ? " aidos-md-clipped" : "")}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {long ? (
          <button
            className="aidos-md-more"
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <details className="aidos-panel" open>
      <summary className="aidos-panel-head">
        <span className="aidos-panel-title">Description</span>
        <button
          className="aidos-icon-btn"
          title="Edit"
          aria-label="Edit description"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDraft(text);
            setEditing(true);
          }}
        >
          <PencilIcon />
        </button>
      </summary>
      <div className="aidos-panel-body">{body}</div>
    </details>
  );
}

/** One criteria line in edit mode: an input with Save and Cancel. */
function CriterionEditor(props: {
  line: string;
  saving: boolean;
  onSave: (draft: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = react.useState(props.line);
  return (
    <span className="aidos-criterion-row">
      <input
        type="text"
        value={draft}
        disabled={props.saving}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            props.onSave(draft);
          }
        }}
      />
      <span className="aidos-criterion-actions">
        <button
          className="aidos-btn"
          disabled={props.saving}
          onClick={() => {
            props.onSave(draft);
          }}
        >
          Save
        </button>
        <button
          className="aidos-btn"
          disabled={props.saving}
          onClick={props.onCancel}
        >
          Cancel
        </button>
      </span>
    </span>
  );
}

/** The criteria panel: one line per row, each with edit and delete. */
function CriteriaPanel(props: {
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  ticketIdKey: string;
  agentId: string;
  onSaved: () => void;
  /** Opens the evidence viewer for one row (#50). */
  onViewEvidence?: (row: EvidenceRowLike) => void;
  /** The `at` of a row currently being deleted, if any. */
  deletingAt?: number | null;
}) {
  const [editingIndex, setEditingIndex] = react.useState<number | null>(null);
  const [saving, setSaving] = react.useState(false);
  const [addDraft, setAddDraft] = react.useState("");
  const lines = criteriaLines(props.ticket.criteria);
  const uncovered = uncoveredCriteria(props.ticket.criteria, props.evidence);
  const uncoveredSet = new Set(uncovered);
  const covered = lines.length - uncovered.length;

  // One save path for every criteria change: edit, delete, and add all
  // rebuild the whole list and write it once. It reports success, so the add
  // row knows when to clear its draft.
  async function saveLines(survivors: string[]): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, criteria: survivors.join("\n") },
        props.agentId,
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

  function replaceLine(index: number, replacement: string) {
    const survivors = lines.slice();
    survivors[index] = replacement;
    void saveLines(survivors);
  }

  function removeLine(index: number) {
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

  return (
    <details className="aidos-panel">
      <summary className="aidos-panel-head">
        <span className="aidos-panel-title">
          {"Criteria " + covered + "/" + lines.length}
        </span>
      </summary>
      <div className="aidos-panel-body">
        {lines.length === 0 ? (
          <p className="aidos-detail-note">No criteria yet — add the first one below.</p>
        ) : null}
        <ul className="aidos-criteria">
            {lines.map((line, index) => (
              <li
                key={index + ":" + line}
                className={
                  uncoveredSet.has(line)
                    ? "aidos-criterion aidos-criterion-uncovered"
                    : "aidos-criterion"
                }
              >
                {editingIndex === index ? (
                  <CriterionEditor
                    line={line}
                    saving={saving}
                    onSave={(draft) => {
                      replaceLine(index, draft.trim());
                    }}
                    onCancel={() => {
                      setEditingIndex(null);
                    }}
                  />
                ) : (
                  <span className="aidos-criterion-row">
                    {uncoveredSet.has(line) ? (
                      <span
                        className="aidos-criterion-warn"
                        title="No evidence covers this criterion yet"
                        aria-label="Uncovered criterion"
                      >
                        <WarningIcon />
                      </span>
                    ) : null}
                    <span className="aidos-criterion-text">{line}</span>
                    <span className="aidos-criterion-actions">
                      <button
                        className="aidos-icon-btn"
                        title="Edit"
                        aria-label={"Edit criterion " + (index + 1)}
                        onClick={() => {
                          setEditingIndex(index);
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        className="aidos-icon-btn"
                        title="Delete"
                        aria-label={"Delete criterion " + (index + 1)}
                        disabled={saving}
                        onClick={() => {
                          removeLine(index);
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  </span>
                )}
                {editingIndex !== index ? (
                  <ul className="aidos-criterion-linked">
                    {props.evidence
                      .filter((row) => criterionOf(row) === line)
                      .map((row) => (
                        <li className="aidos-criterion-linked-row" key={String(row.at) + ":" + row.kind}>
                          <EvidenceStrip
                            row={row}
                            onView={props.onViewEvidence}
                            deleting={props.deletingAt === row.at}
                          />
                        </li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
            <li className="aidos-criteria-add">
              <input
                type="text"
                value={addDraft}
                disabled={saving}
                placeholder="Add a criterion"
                onChange={(event) => {
                  setAddDraft(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addLine();
                  }
                }}
              />
              <button
                className="aidos-btn"
                disabled={saving || addDraft.trim() === ""}
                onClick={() => {
                  void addLine();
                }}
              >
                Add
              </button>
            </li>
          </ul>
      </div>
    </details>
  );
}

/** One search hit rendered in the dependency add list. */
interface TicketSearchHit {
  sessionId: string;
  ticketId: number;
  title: string;
  state: string;
  workspaceKey: string;
  dependsOn: string[];
}

/** The stored reference of one hit. */
function refOf(hit: TicketSearchHit): string {
  return hit.workspaceKey + ":" + hit.ticketId;
}

/**
 * One dependency as a mini-card (#board-feedback): the referenced ticket's
 * title and state chip when the board knows it, the raw reference when it
 * does not (a foreign or closed session), and an Open button that jumps the
 * board's selection to that ticket. Basic status only — the card is a
 * pointer, not a second detail panel.
 */
function DependencyCard(props: {
  depRef: string;
  agentId: string;
  ticketsByKey?: Map<string, TicketView>;
  onJump?: (key: string) => void;
  workspaceKey?: string;
}) {
  const ref = props.depRef;
  // A ref is either `workspaceKey:id` or a legacy plain id. A plain id
  // resolves against the REFERENCING ticket's workspace (the only board a
  // plain ref could have meant), which is why the board said "not on this
  // board" for every plain-id dependency before.
  const key = ref.includes(":") ? ref : (props.workspaceKey ?? "") + ":" + ref;
  const known = props.ticketsByKey?.get(key) ?? props.ticketsByKey?.get(ref);
  const jumpKey = key;
  const open = () => {
    if (props.onJump !== undefined) {
      props.onJump(jumpKey);
    }
  };
  /*
   * #93: a dependency renders through the SHARED TicketStrip, not a private
   * dep-card. A referenced ticket now looks identical in the dependency
   * section, the human work queue, and (later) tool-call cards — which is the
   * whole point of the component. The unknown-ref fallback keeps the strip's
   * shape without inventing a ticket that does not exist.
   */
  if (known === undefined) {
    return (
      <li className="aidos-ticket-strip">
        <div className="aidos-ticket-strip-main">
          <span className="aidos-chip aidos-chip-dep" title={ref}>
            {displayDep(ref)}
          </span>
          <span className="aidos-ticket-strip-body">
            <span className="aidos-ticket-strip-title aidos-dep-card-unknown">
              not on this board
            </span>
            <span className="aidos-ticket-strip-meta">{ref}</span>
          </span>
        </div>
      </li>
    );
  }
  return (
    <TicketStrip
      ticket={known}
      meta={"depends on " + displayDep(ref)}
      onOpen={props.onJump !== undefined ? open : undefined}
    />
  );
}

/**
 * The dependencies panel: the current dependsOn chips plus a search box
 * that finds tickets across live sessions and adds one reference. Search
 * calls the searchTickets Remote; adding calls userSetTicket with the
 * current list plus the new reference.
 */
function DependencySection(props: {
  ticketId: number | string;
  dependsOn: string[];
  agentId: string;
  onSaved: () => void;
  /** Jump the board's selection to one dependency ticket. */
  onJump?: (key: string) => void;
  /** Every board-known ticket view, keyed by `workspaceKey:id` and plain id. */
  ticketsByKey?: Map<string, TicketView>;
  /** The referencing ticket's workspaceKey: resolves plain-id refs. */
  workspaceKey?: string;
}) {
  const [query, setQuery] = react.useState("");
  const [hits, setHits] = react.useState<TicketSearchHit[] | null>(null);
  const [searching, setSearching] = react.useState(false);
  const [adding, setAdding] = react.useState<string | null>(null);
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
        props.agentId,
      );
      const rows = Array.isArray(result)
        ? (result as unknown as TicketSearchHit[])
        : [];
      setHits(rows);
    } catch (error) {
      showError(error);
      setHits(null);
    } finally {
      setSearching(false);
    }
  }

  async function add(ref: string) {
    if (adding !== null) return;
    if (current.includes(ref)) {
      showToast("Already a dependency", "info");
      return;
    }
    setAdding(ref);
    try {
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketId, dependsOn: [...new Set([...current, ref])] },
        props.agentId,
      );
      showToast("Dependency added", "success");
      props.onSaved();
    } catch (error) {
      showError(error);
    } finally {
      setAdding(null);
    }
  }

  return (
    <details className="aidos-panel">
      <summary className="aidos-panel-head">
        <span className="aidos-panel-title">Dependencies</span>
      </summary>
      <div className="aidos-panel-body">
        {current.length === 0 ? (
          <p className="aidos-detail-note">No dependencies.</p>
        ) : (
          <ul className="aidos-ticket-strips">
            {current.map((ref) => (
              <DependencyCard
                key={ref}
                depRef={ref}
                agentId={props.agentId}
                ticketsByKey={props.ticketsByKey}
                onJump={props.onJump}
                workspaceKey={props.workspaceKey}
              />
            ))}
          </ul>
        )}
        <div className="aidos-dep-search">
          <input
            className="aidos-dep-search-input"
            value={query}
            placeholder="Search tickets"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
          />
          <button
            className="aidos-btn"
            disabled={searching}
            onClick={() => {
              void search();
            }}
          >
            Search
          </button>
        </div>
        {hits !== null ? (
          <div className="aidos-dep-results">
            {hits.length === 0 ? (
              <p className="aidos-detail-note">No matches.</p>
            ) : (
              hits.map((hit) => (
                <button
                  key={refOf(hit)}
                  className="aidos-dep-result"
                  disabled={adding !== null}
                  onClick={() => {
                    void add(refOf(hit));
                  }}
                  title={refOf(hit)}
                >
                  <span className="aidos-suggestion-title">{hit.title}</span>
                  <span className="aidos-chip aidos-chip-id">
                    {displayDep(refOf(hit))}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </details>
  );
}

/** The evidence panel: one flat row per evidence row, plus the attach form. */
function EvidencePanel(props: {
  evidence: readonly EvidenceRow[];
  evidenceCollapsed: boolean;
  onToggleEvidence: () => void;
  onDelete: (row: EvidenceRowLike) => void;
  deletingAt: number | null;
  ticketIdKey: string;
  agentId: string;
  /** Opens the evidence viewer for one row (#50). */
  onViewEvidence?: (row: EvidenceRowLike) => void;
  /** The ticket's criteria lines, for the #69 linker section. */
  criteria: string[];
  /** Called after a link/unlink so the owner refreshes. */
  onLinked: () => void;
}) {
  return (
    <details
      className="aidos-panel"
      open={!props.evidenceCollapsed}
      onToggle={(event) => {
        const open = (event.target as HTMLDetailsElement).open;
        if (open === props.evidenceCollapsed) {
          props.onToggleEvidence();
        }
      }}
    >
      <summary className="aidos-panel-head">
        <span className="aidos-panel-title">Evidence</span>
      </summary>
      <div className="aidos-panel-body">
        {props.evidence.length === 0 ? (
          <p className="aidos-detail-note">No evidence rows yet.</p>
        ) : (
          <ul className="aidos-evidence-list">
            {props.evidence.map((row, index) => (
              <EvidenceStrip
                key={row.at ?? index}
                row={row}
                onView={props.onViewEvidence}
                onDelete={props.onDelete}
                deleting={props.deletingAt !== null}
                criterionLabel={
                  typeof row.payload.criteria === "string"
                    ? row.payload.criteria
                    : undefined
                }
              />
            ))}
          </ul>
        )}
        {props.criteria.length > 0 ? (
          <details className="aidos-panel aidos-panel-nested">
            <summary className="aidos-panel-head">
              <span className="aidos-panel-title">Link evidence to criteria</span>
            </summary>
            <div className="aidos-panel-body">
              <CriterionLinker
                criteria={props.criteria}
                evidence={props.evidence}
                ticketIdKey={props.ticketIdKey}
                agentId={props.agentId}
                onChanged={props.onLinked}
              />
            </div>
          </details>
        ) : null}
        <EvidenceAttach ticketId={props.ticketIdKey} agentId={props.agentId} />
      </div>
    </details>
  );
}

export function DetailPanel(props: DetailPanelBodyProps) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const [deletingAt, setDeletingAt] = react.useState<number | null>(null);

  async function deleteEvidence(row: EvidenceRowLike) {
    if (deletingAt !== null) return;
    const at = row.at ?? 0;
    setDeletingAt(at);
    try {
      await callAidosRemote(
        "userDetachEvidence",
        { ticketId: props.ticketIdKey, at, rowKind: row.kind },
        props.agentId,
      );
      showToast("Evidence deleted", "success");
    } catch (error) {
      showError(error);
    } finally {
      setDeletingAt(null);
    }
  }

  return (
    <>
      <div className="aidos-detail-head">
        <FieldEditor
          field="title"
          ticketId={props.ticketIdKey}
          value={ticket.title}
          agentId={props.agentId}
          onSaved={props.onFieldSaved}
        />
        <button className="aidos-close-btn" onClick={props.onClose}>
          {"\u00d7"}
        </button>
      </div>
      <div className="aidos-detail-chips">
        <span
          className="aidos-chip aidos-chip-id"
          style={{ background: idColor(fullTicketId(ticket)) }}
          title={fullTicketId(ticket)}
        >
          {ticketChipLabel(ticket)}
        </span>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <dl className="aidos-facts">
        <div className="aidos-facts-row">
          <dt className="aidos-facts-label">State</dt>
          <dd className="aidos-facts-value">{stateLabel(ticket.state)}</dd>
        </div>
        <div className="aidos-facts-row">
          <dt className="aidos-facts-label">Gate</dt>
          <dd className="aidos-facts-value">
            {formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))}
          </dd>
        </div>
        <div className="aidos-facts-row">
          <dt className="aidos-facts-label">Confidence</dt>
          <dd className="aidos-facts-value">
            {String(ringPercent(ticket.confidenceScore)) + "%"}
            <span
              className="aidos-facts-asterisk"
              title="Advisory score. It never unlocks anything."
            >
              {"*"}
            </span>
          </dd>
        </div>
        <div className="aidos-facts-row">
          <dt className="aidos-facts-label">Phase</dt>
          <dd className="aidos-facts-value">{String(ticket.phase)}</dd>
        </div>
        <div className="aidos-facts-row">
          <dt className="aidos-facts-label">Order</dt>
          <dd className="aidos-facts-value">{String(ticket.order)}</dd>
        </div>
        <div className="aidos-facts-row">
          <dt className="aidos-facts-label">Slug</dt>
          <dd className="aidos-facts-value">{ticket.slug}</dd>
        </div>
      </dl>
      <AllowlistRequestCard
        ticketId={props.ticketIdKey}
        agentId={props.agentId}
        onResolved={props.onFieldSaved}
      />
      {props.actions}
      <DescriptionPanel
        ticket={ticket}
        ticketIdKey={props.ticketIdKey}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <CriteriaPanel
        ticket={ticket}
        evidence={props.evidence}
        ticketIdKey={props.ticketIdKey}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
        onViewEvidence={props.onViewEvidence}
        deletingAt={deletingAt}
      />
      <DependencySection
        ticketId={props.ticketIdKey}
        dependsOn={ticket.dependsOn}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
        ticketsByKey={props.ticketsByKey}
        onJump={props.onJump}
        workspaceKey={ticket.workspaceKey}
      />
      <EvidencePanel
        evidence={props.evidence}
        evidenceCollapsed={props.evidenceCollapsed}
        onToggleEvidence={props.onToggleEvidence}
        onDelete={(row) => {
          void deleteEvidence(row);
        }}
        deletingAt={deletingAt}
        ticketIdKey={props.ticketIdKey}
        agentId={props.agentId}
        onViewEvidence={props.onViewEvidence}
        criteria={criteriaLines(ticket.criteria)}
        onLinked={props.onFieldSaved}
      />
    </>
  );
}

/**
 * The interactive detail view. Owns the action modals and renders the detail
 * panel, the action bar, and the comments. The evidence attach form lives in
 * the evidence panel. Submit for review moves the ticket directly; the other
 * actions open their modals.
 */
export function DetailView(props: DetailViewProps) {
  const [signoffOpen, setSignoffOpen] = react.useState(false);
  const [verifyOpen, setVerifyOpen] = react.useState(false);
  const [sendBackOpen, setSendBackOpen] = react.useState(false);
  const [markDoneOpen, setMarkDoneOpen] = react.useState(false);
  const [allowlistOpen, setAllowlistOpen] = react.useState(false);
  const [viewingEvidence, setViewingEvidence] = react.useState<EvidenceRowLike | null>(null);
  const [submitting, setSubmitting] = react.useState(false);

  const ticket = props.ticket;
  const agentId = props.agentId;

  react.useEffect(function () {
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
        agentId,
      );
      showToast("Submitted for review", "success");
      props.onClose();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="aidos-detail">
      <DetailPanel
        ticket={ticket}
        ticketIdKey={props.ticketIdKey}
        evidence={props.evidence}
        evidenceCollapsed={props.evidenceCollapsed}
        onToggleEvidence={props.onToggleEvidence}
        onClose={props.onClose}
        agentId={agentId}
        onFieldSaved={props.onFieldSaved}
        onOpenAllowlist={() => {
          setAllowlistOpen(true);
        }}
        onViewEvidence={(row) => {
          setViewingEvidence(row);
        }}
        actions={
          <ActionBar
            ticket={ticket}
            evidence={props.evidence}
            onOpenSignoff={() => {
              setSignoffOpen(true);
            }}
            onOpenVerify={() => {
              setVerifyOpen(true);
            }}
            onOpenSendBack={() => {
              setSendBackOpen(true);
            }}
            onOpenMarkDone={() => {
              setMarkDoneOpen(true);
            }}
            onOpenSubmitForReview={() => {
              void submitForReview();
            }}
            onOpenAllowlist={() => {
              setAllowlistOpen(true);
            }}
          />
        }
      />
      <EvidenceViewer
        row={viewingEvidence}
        onClose={() => {
          setViewingEvidence(null);
        }}
      />
      {allowlistOpen ? (
        <AllowlistEditor
          open
          ticketId={ticket.id}
          ticketIdKey={props.ticketIdKey}
          currentAllowlist={ticket.allowlist ?? []}
          agentId={agentId}
          onClose={() => {
            setAllowlistOpen(false);
          }}
          onSaved={props.onFieldSaved}
        />
      ) : null}
      <CommentsSection
        ticketId={props.ticketIdKey}
        comments={props.comments}
        agentId={agentId}
      />
      {signoffOpen ? (
        <SignoffDialog
          open
          ticketId={props.ticketIdKey}
          ticketTitle={ticket.title}
          onClose={() => {
            setSignoffOpen(false);
          }}
          onSignedOff={function () {
            setSignoffOpen(false);
          }}
          agentId={agentId}
        />
      ) : null}
      {verifyOpen ? (
        <VerifyModal
          ticketId={props.ticketIdKey}
          agentId={agentId}
          onClose={() => {
            setVerifyOpen(false);
          }}
        />
      ) : null}
      {sendBackOpen ? (
        <SendBackModal
          open
          ticketId={props.ticketIdKey}
          onClose={() => {
            setSendBackOpen(false);
          }}
          onSentBack={function () {
            setSendBackOpen(false);
          }}
          agentId={agentId}
        />
      ) : null}
      {markDoneOpen ? (
        <MarkDoneModal
          open
          ticketId={props.ticketIdKey}
          ticket={ticket}
          evidence={props.evidence}
          onClose={() => {
            setMarkDoneOpen(false);
          }}
          onMarkedDone={props.onClose}
          agentId={agentId}
        />
      ) : null}
    </div>
  );
}
