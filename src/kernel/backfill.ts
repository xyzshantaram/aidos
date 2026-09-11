/**
 * #41: the one-time backfill importer.
 *
 * This module owns the READ half of the import: it folds one inspected
 * session log (the shape `ctx.get("sessionPersistence").inspect` returns —
 * the same API `workspaceTickets` uses for the cold half of the workspace
 * merge) and tracks, for every ticket, evidence row, and comment, the
 * source event's session-local `seq`. The WRITE half — renumbering into
 * the workspace id space, rewriting dependency references, stamping the
 * origin columns, and the completion marker — is `Store.backfillSessionLogs`
 * in `src/kernel/store.ts`, because the import must run through the same
 * validated, mirrored append path every other store write uses.
 *
 * MECHANISM NOTE (per #38's recorded re-scope): #41's description names
 * `ctx.get("sessionPersistence").inspect` directly, but the host's `ctx`
 * does not exist in the kernel. #38's body settles this — "their criteria
 * still hold at the conceptual level ... their MECHANISM changes"; "Do not
 * treat their existing bodies as final mechanism, only as final ACCEPTANCE
 * CRITERIA". So the importer takes already-inspected logs as a parameter
 * (each `{ sessionId, events }` shaped exactly like one inspect result),
 * and the host wiring that calls `inspect` and hands the logs over on
 * first open is #42's thin-wrapper work.
 */

import { foldAidosEvents, createInitialState } from "./fold";
import type { AidosState } from "./fold";
import type { AidosEvent } from "./events";
import type { CommentRecord, EvidenceRow, TicketId } from "./types";

/**
 * The aidos event kinds a session log can carry. Same set as the host's
 * `AIDOS_EVENT_TYPES` (src/host/invariant.ts) minus #41's own marker,
 * which never appears in a session log. Restated here because the kernel
 * does not import from the host.
 */
export const AIDOS_LOG_EVENT_KINDS: ReadonlySet<string> = new Set([
  "ticket/change",
  "evidence/attached",
  "evidence/detached",
  "evidence/linked",
  "tags/attached",
  "tags/detached",
  "plan/change",
  "comment/added",
  "aidos/refusal",
  "project/created",
  "project/moved",
  "phase/set",
]);

/** One event as `sessionPersistence.inspect` returns it. */
export interface BackfillSourceEvent {
  /** The session's own sequence number for the event. */
  seq: number;
  /** The envelope type — for aidos events, the kernel event kind. */
  type: string;
  /** The event payload. */
  data: unknown;
}

/** One inspected session log: what one `inspect(id)` call resolves to. */
export interface BackfillSessionLog {
  sessionId: string;
  events: readonly BackfillSourceEvent[];
}

/** Stable key for one evidence row: the (at, kind) identity the fold uses. */
function evidenceKey(ticketId: TicketId, row: EvidenceRow): string {
  return `${ticketId}\u0000${row.at}\u0000${row.kind}`;
}

/** One session log folded to its final state plus per-row origin seqs. */
export interface FoldedSessionLog {
  sessionId: string;
  /** The folded state: tickets, evidence, comments in their final form. */
  state: AidosState;
  /** Local ticket id -> the seq of the last event that touched it. */
  seqOfTicket: Map<TicketId, number>;
  /** (ticket, at, kind) -> the seq of the evidence/attached event. */
  seqOfEvidence: Map<string, number>;
  /** Local ticket id -> the seqs of its comments, in log order. */
  seqsOfComments: Map<TicketId, number[]>;
}

/**
 * Fold one inspected log the same way the host folds it (unknown envelope
 * types skipped, aidos kinds folded in seq order) and record the origin
 * seq of every ticket, evidence row, and comment it leaves behind.
 * A log whose aidos events fail validation throws InvariantError — a
 * corrupt log is never imported.
 */
export function foldSessionLog(log: BackfillSessionLog): FoldedSessionLog {
  const state = createInitialState();
  const seqOfTicket = new Map<TicketId, number>();
  const seqOfEvidence = new Map<string, number>();
  const seqsOfComments = new Map<TicketId, number[]>();
  for (const event of log.events) {
    if (!AIDOS_LOG_EVENT_KINDS.has(event.type)) continue;
    const aidos = event.data as AidosEvent;
    foldAidosEvents(state, aidos);
    switch (aidos.kind) {
      case "ticket/change":
        seqOfTicket.set(aidos.ticket.id, event.seq);
        break;
      case "evidence/attached":
        seqOfEvidence.set(evidenceKey(aidos.ticketId, aidos.row), event.seq);
        break;
      case "comment/added": {
        const seqs = seqsOfComments.get(aidos.ticketId) ?? [];
        seqs.push(event.seq);
        seqsOfComments.set(aidos.ticketId, seqs);
        break;
      }
      default:
        break;
    }
  }
  return { sessionId: log.sessionId, state, seqOfTicket, seqOfEvidence, seqsOfComments };
}

/** One evidence row as the import flushes it, with its origin seq. */
export interface ImportedEvidence {
  ticketId: TicketId;
  row: EvidenceRow;
  originSeq: number | null;
}

/** One comment as the import flushes it, with its origin seq. */
export interface ImportedComment {
  record: CommentRecord;
  originSeq: number | null;
}

/**
 * Every live evidence row and comment of one folded log, as import rows.
 * Evidence keeps its (at, kind) identity so a later evidence/linked in the
 * same log's fold state already points at the row the import re-creates.
 */
export function importedRowsOf(folded: FoldedSessionLog): {
  evidence: ImportedEvidence[];
  comments: ImportedComment[];
} {
  const evidence: ImportedEvidence[] = [];
  for (const [ticketId, rows] of folded.state.evidence) {
    for (const row of rows) {
      evidence.push({
        ticketId,
        row,
        originSeq: folded.seqOfEvidence.get(evidenceKey(ticketId, row)) ?? null,
      });
    }
  }
  const comments: ImportedComment[] = [];
  for (const [ticketId, records] of folded.state.comments) {
    const seqs = folded.seqsOfComments.get(ticketId) ?? [];
    for (const [index, record] of records.entries()) {
      comments.push({ record, originSeq: seqs[index] ?? null });
    }
  }
  return { evidence, comments };
}
