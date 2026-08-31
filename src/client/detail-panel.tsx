/**
 * Tickets U2b + U2c, reworked by U7 to U10: the ticket detail panel. A
 * quick-facts summary table sits on top (U7), the description follows it
 * (U8), and Dependencies and Evidence are collapsible panels (U9) whose
 * evidence rows render as single-line bullets (U10). Fields stay editable
 * through FieldEditor, and uncovered criteria stay tinted.
 *
 * DetailView wraps the panel: it owns the action modals and renders the
 * action bar, the comments section, and the evidence attach form.
 */

import react from "react";

import {
  badgeClass,
  displayDep,
  formatGateFraction,
  groupEvidenceByCriterion,
  fullTicketId,
  hasCriteria,
  idColor,
  ringPercent,
  stateLabel,
  kindLabel,
  uncoveredCriteria,
} from "./board-logic";
import { EvidenceTags } from "./evidence-tags";
import { FieldEditor } from "./field-editor";
import { ActionBar } from "./action-bar";
import { CommentsSection } from "./comments-section";
import { EvidenceAttachForm } from "./evidence-attach-form";
import { SignoffDialog } from "./signoff-dialog";
import { SendBackModal } from "./send-back-modal";
import { MarkDoneModal } from "./mark-done-modal";
import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import type { EvidenceRowLike } from "./board-logic";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow, CommentRecord } from "../kernel/types";

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
}

export interface DetailViewProps extends DetailPanelProps {
  comments: CommentRecord[];
}

/** One criterion row: the label, an uncovered tint when nothing addresses it. */
function renderCriterionGroup(
  group: ReturnType<typeof groupEvidenceByCriterion>[number],
  onDelete: (row: EvidenceRowLike) => void,
  deletingAt: number | null,
) {
  const isUngrouped = group.criterion === "";
  const rowClass = isUngrouped
    ? "aidos-criterion aidos-criterion-ungrouped"
    : group.matched
      ? "aidos-criterion"
      : "aidos-criterion aidos-criterion-uncovered";
  const label = isUngrouped ? (
    "Ungrouped"
  ) : (
    <span className="aidos-criterion-label">{group.criterion}</span>
  );

  const rows = group.rows.map((row, rowIndex) => (
    <div className="aidos-evidence-row-item" key={rowIndex}>
      <span className="aidos-evidence-kind">{kindLabel(row.kind)}</span>
      <span className="aidos-evidence-author">{row.author}</span>
      {typeof row.payload.criteria === "string" ? (
        <span className="aidos-evidence-meta">
          {"criterion: " + row.payload.criteria}
        </span>
      ) : null}
      <button
        className="aidos-evidence-delete"
        title="Delete this evidence row"
        disabled={deletingAt !== null}
        onClick={() => {
          onDelete(row);
        }}
      >
        {"\u2715"}
      </button>
    </div>
  ));

  return (
    <div className={rowClass} key={group.criterion}>
      <div className="aidos-criterion-head">
        {label}
        <span className="aidos-criterion-count">{String(group.rows.length)}</span>
      </div>
      {rows}
    </div>
  );
}

/** The collapsible evidence section: criteria in order, ungrouped last. */
function renderEvidenceSection(
  props: DetailPanelProps,
  onDeleteEvidence: (row: EvidenceRowLike) => void,
  deletingAt: number | null,
) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const body = (
    <div className="aidos-evidence-body">
      {groups.length === 0 && props.evidence.length === 0 ? (
        <p className="aidos-detail-note">No evidence rows yet.</p>
      ) : (
        groups.map((group) =>
          renderCriterionGroup(group, onDeleteEvidence, deletingAt),
        )
      )}
    </div>
  );

  return (
    <div className="aidos-panel-section aidos-collapsible">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Evidence</h4>
        <button
          className="aidos-btn aidos-toggle-btn"
          onClick={props.onToggleEvidence}
        >
          {props.evidenceCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {props.evidenceCollapsed ? null : body}
    </div>
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
 * The Dependencies section: the current dependsOn badges plus a search box
 * that finds tickets across live sessions and adds one reference. Search
 * calls the searchTickets Remote; adding calls userSetTicket with the
 * current list plus the new reference.
 */
function DependencySection(props: {
  ticketId: number | string;
  dependsOn: string[];
  agentId: string;
  onSaved: () => void;
}) {
  const [query, setQuery] = react.useState("");
  const [hits, setHits] = react.useState<TicketSearchHit[] | null>(null);
  const [searching, setSearching] = react.useState(false);
  const [adding, setAdding] = react.useState<string | null>(null);
  const [collapsed, setCollapsed] = react.useState(false);
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
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setAdding(null);
    }
  }

  const body = (
    <>
      <div className="aidos-dep-row">
        {current.length === 0 ? (
          <p className="aidos-detail-note">No dependencies.</p>
        ) : (
          current.map((ref) => (
            <span key={ref} className="aidos-dep-badge" title={ref}>
              {displayDep(ref)}
            </span>
          ))
        )}
      </div>
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
                <span className="aidos-ticket-id-badge">
                  {displayDep(refOf(hit))}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="aidos-panel-section aidos-collapsible">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Dependencies</h4>
        <button
          className="aidos-btn aidos-toggle-btn"
          onClick={() => {
            setCollapsed(!collapsed);
          }}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {collapsed ? null : body}
    </div>
  );
}

/**
 * The description section (U7, U8): the editor sits directly below the
 * summary table, and an empty description shows a muted note beside the
 * Edit button.
 */
function DescriptionSection(props: {
  ticket: TicketView;
  ticketIdKey: string;
  agentId: string;
  onSaved: () => void;
}) {
  const empty = props.ticket.description.trim() === "";
  return (
    <div className="aidos-description">
      {empty ? <p className="aidos-detail-note">No description.</p> : null}
      <FieldEditor
        field="description"
        ticketId={props.ticketIdKey}
        value={props.ticket.description}
        agentId={props.agentId}
        onSaved={props.onSaved}
      />
    </div>
  );
}

export function DetailPanel(props: DetailPanelProps) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);
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
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setDeletingAt(null);
    }
  }

  return (
    <>
      <div className="aidos-detail-head">
        <span
          className="aidos-id-badge"
          style={{ background: idColor(fullTicketId(ticket)) }}
          title={fullTicketId(ticket)}
        >
          {displayDep(fullTicketId(ticket))}
        </span>
        <FieldEditor
          field="title"
          ticketId={props.ticketIdKey}
          value={ticket.title}
          agentId={props.agentId}
          onSaved={props.onFieldSaved}
        />
        <span className={badge}>{stateLabel(ticket.state)}</span>
        <button className="aidos-close-btn" onClick={props.onClose}>
          {"\u00d7"}
        </button>
      </div>
      <dl className="aidos-summary-table">
        <div className="aidos-summary-row">
          <dt className="aidos-summary-label">Gate</dt>
          <dd className="aidos-summary-value">
            {formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))}
          </dd>
        </div>
        <div className="aidos-summary-row">
          <dt className="aidos-summary-label">Confidence</dt>
          <dd className="aidos-summary-value">
            {String(ringPercent(ticket.confidenceScore)) + "%"}
            <span
              className="aidos-summary-asterisk"
              title="Advisory score. It never unlocks anything."
            >
              {"*"}
            </span>
          </dd>
        </div>
        <div className="aidos-summary-row">
          <dt className="aidos-summary-label">Phase</dt>
          <dd className="aidos-summary-value">{String(ticket.phase)}</dd>
        </div>
        <div className="aidos-summary-row">
          <dt className="aidos-summary-label">Order</dt>
          <dd className="aidos-summary-value">{String(ticket.order)}</dd>
        </div>
      </dl>
      <DescriptionSection
        ticket={ticket}
        ticketIdKey={props.ticketIdKey}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="criteria"
        ticketId={props.ticketIdKey}
        value={ticket.criteria}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="phase"
        ticketId={props.ticketIdKey}
        value={ticket.phase}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="order"
        ticketId={props.ticketIdKey}
        value={ticket.order}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      {uncovered.length > 0 ? (
        <p className="aidos-detail-note">
          {uncovered.length + " uncovered criteria"}
        </p>
      ) : null}
      <DependencySection
        ticketId={props.ticketIdKey}
        dependsOn={ticket.dependsOn}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      {renderEvidenceSection(
        props,
        (row) => {
          void deleteEvidence(row);
        },
        deletingAt,
      )}
    </>
  );
}

/**
 * The interactive detail view. Owns the action modals and renders the action
 * bar, the field-editor panel, the comments, and the evidence attach form.
 * Submit for review moves the ticket directly; the other actions open their
 * modals.
 */
export function DetailView(props: DetailViewProps) {
  const [signoffOpen, setSignoffOpen] = react.useState(false);
  const [sendBackOpen, setSendBackOpen] = react.useState(false);
  const [markDoneOpen, setMarkDoneOpen] = react.useState(false);
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
        { ticketId: ticket.id, to: "awaiting_verification" },
        agentId,
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
      />
      <ActionBar
        ticket={ticket}
        onOpenSignoff={() => {
          setSignoffOpen(true);
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
      />
      <CommentsSection
        ticketId={props.ticketIdKey}
        comments={props.comments}
        agentId={agentId}
      />
      <EvidenceAttachForm ticketId={props.ticketIdKey} agentId={agentId} />
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
