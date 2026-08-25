/**
 * Ticket U2b + U2c: the ticket detail panel. Fields on top (each editable
 * through FieldEditor), evidence grouped by criterion below in a collapsible
 * section, uncovered criteria tinted.
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
  hasCriteria,
  stateLabel,
  uncoveredCriteria,
} from "./board-logic";
import { ConfidenceRing } from "./confidence-ring";
import { EvidenceTags } from "./evidence-tags";
import { FieldEditor } from "./field-editor";
import { ActionBar } from "./action-bar";
import { CommentsSection } from "./comments-section";
import { EvidenceAttachForm } from "./evidence-attach-form";
import { SignoffDialog } from "./signoff-dialog";
import { SendBackModal } from "./send-back-modal";
import { MarkDoneModal } from "./mark-done-modal";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow, CommentRecord } from "../kernel/types";

export interface DetailPanelProps {
  ticket: TicketView;
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
      <span className="aidos-evidence-kind">{row.kind}</span>
      <span className="aidos-evidence-author">{row.author}</span>
      {typeof row.payload.criteria === "string" ? (
        <span className="aidos-evidence-meta">
          {"criterion: " + row.payload.criteria}
        </span>
      ) : null}
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
function renderEvidenceSection(props: DetailPanelProps) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const body = (
    <div className="aidos-evidence-body">
      {groups.length === 0 && props.evidence.length === 0 ? (
        <p className="aidos-detail-note">No evidence rows yet.</p>
      ) : (
        groups.map((group) => renderCriterionGroup(group))
      )}
    </div>
  );

  return (
    <div className="aidos-panel-section">
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
  ticketId: number;
  dependsOn: string[];
  agentId: string;
  onSaved: () => void;
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
        { ticketId: props.ticketId, dependsOn: [...current, ref] },
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

  return (
    <div className="aidos-panel-section">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Dependencies</h4>
      </div>
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
    </div>
  );
}

export function DetailPanel(props: DetailPanelProps) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);

  return (
    <>
      <div className="aidos-detail-head">
        <FieldEditor
          field="title"
          ticketId={ticket.id}
          value={ticket.title}
          agentId={props.agentId}
          onSaved={props.onFieldSaved}
        />
        <button className="aidos-close-btn" onClick={props.onClose}>
          {"\u00d7"}
        </button>
      </div>
      <div className="aidos-ring-wrap"><ConfidenceRing ticket={ticket} /></div>
      <div className="aidos-tile-meta">
        <span className="aidos-tile-gate">
          {formatGateFraction(ticket.gateFraction, hasCriteria(ticket))}
        </span>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <DependencySection
        ticketId={ticket.id}
        dependsOn={ticket.dependsOn}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="description"
        ticketId={ticket.id}
        value={ticket.description}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="criteria"
        ticketId={ticket.id}
        value={ticket.criteria}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="phase"
        ticketId={ticket.id}
        value={ticket.phase}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <FieldEditor
        field="order"
        ticketId={ticket.id}
        value={ticket.order}
        agentId={props.agentId}
        onSaved={props.onFieldSaved}
      />
      <p className="aidos-detail-body">{"#" + ticket.id}</p>
      <EvidenceTags evidence={props.evidence} />
      {uncovered.length > 0 ? (
        <p className="aidos-detail-note">
          {uncovered.length + " uncovered criteria"}
        </p>
      ) : null}
      {renderEvidenceSection(props)}
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
        ticketId={ticket.id}
        comments={props.comments}
        agentId={agentId}
      />
      <EvidenceAttachForm ticketId={ticket.id} agentId={agentId} />
      {signoffOpen ? (
        <SignoffDialog
          open
          ticketId={ticket.id}
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
          ticketId={ticket.id}
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
          ticketId={ticket.id}
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
