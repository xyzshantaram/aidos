/**
 * The aidos-core service. A Cordis Service over the session log, following
 * the dsh-goal pattern. SPEC-B1.md sections 4b and 6 are the contract.
 *
 * The service wraps the B0 kernel over the session log: reads fold the
 * session's aidos events and run the pure projection units; writes validate
 * (the invariant), append one whole-value aidos event via
 * `session.append`, then fold. The author is always stamped from the entry
 * point — the tool body passes the agent, and the agent is never read from
 * a payload.
 */

import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { z as zod } from "zod";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { Session } from "@deepseek-ai/dsh-session";
import type { SessionEvent } from "@deepseek-ai/dsh-session";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
// The Remote decorator and the Typert service base: the B2 human surface.
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
// Load the Context augmentations the service reads (workspace binding and
// the projection registry) and the projection table its units merge into.
import "@deepseek-ai/dsh-workspace";
import "@deepseek-ai/dsh-session-projection";
import type { KindDef } from "../kernel/types";

// The node builtins ("fs", "path") are declared in ./node-builtins.d.ts.
import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { execFile } from "node:child_process";
import { createInitialState } from "../kernel/fold";
import type { AidosState } from "../kernel/fold";
import { validateAidosEvent, planContextLineCount } from "../kernel/invariants";
import { checkGate, isLegalTransition } from "../kernel/gates";
import {
  confidenceScoreOf,
  filterTicketViews,
  gateProgressOf,
  ticketsProjection,
} from "../kernel/projections";
import type { TicketSortKey, TicketView } from "../kernel/projections";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { parsePlan, renderPlan } from "../plan/plan";
import type { PlanTicket } from "../plan/plan";
import { DEFAULT_CONFIG, PLAN_CONTEXT_LIMIT } from "../kernel/constants";
import { STATE_ORDER } from "../kernel/types";
import { slugFromTitle, workspaceKeyFromPath } from "../kernel/slug";
import type { SessionHeader, SessionId } from "@deepseek-ai/dsh-session";
import { deepClone, refusalReason, rowOf } from "../kernel/helpers";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { scratchRootForAgent } from "../tools/scratch";
import type {
  Actor,
  AidosConfig,
  CommentRecord,
  ContextSection,
  EvidenceRow,
  PlanMetaView,
  PlanValue,
  ProjectId,
  TicketId,
  TicketRow,
  TicketSnapshot,
  TicketState,
} from "../kernel/types";
import {
  InvariantError,
  AllowlistActorRefused,
  AllowlistCoverageRefused,
  ContextTooLongError,
  EvidenceAuthorRefused,
  DuplicateSlug,
  ForeignWorkspace,
  GateRefused,
  ProjectNotEmptyError,
  UnknownKind,
  UnknownProject,
  UnknownTicket,
} from "../kernel/types";
import type { AidosEvent, EvidenceDetachedEvent } from "../kernel/events";
import { AIDOS_EVENT_TYPES, foldSessionEvent, registerAidosInvariant } from "./invariant";
import { aidosSessionEventTypesRegistered, registerAidosSessionEventTypes } from "./session-events";

/** The session event types the aidos stream owns (the kernel event kinds). */
export { AIDOS_EVENT_TYPES };

/**
 * A payload that is not one JSON object. The tool renders it as
 * `bad_payload`; the service refuses it before any append.
 */
export class BadPayloadError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * A plan file that could not be read. The tool renders it as
 * `file_not_read`; the refusal carries the path.
 */
export class FileNotReadError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(message);
    this.path = path;
  }
}

// ---- the session event vocabulary ----

declare module "@deepseek-ai/dsh-session/types" {
  interface SessionEventMap {
    "ticket/change": import("../kernel/events").TicketChangeEvent;
    "evidence/attached": import("../kernel/events").EvidenceAttachedEvent;
    "evidence/detached": import("../kernel/events").EvidenceDetachedEvent;
    "evidence/linked": import("../kernel/events").EvidenceLinkedEvent;
    "plan/change": import("../kernel/events").PlanChangeEvent;
    "comment/added": import("../kernel/events").CommentAddedEvent;
    "aidos/refusal": import("../kernel/events").RefusalEvent;
    "project/created": import("../kernel/events").ProjectCreatedEvent;
    "project/moved": import("../kernel/events").ProjectMovedEvent;
    "phase/set": import("../kernel/events").PhaseSetEvent;
  }
}

// ---- the projection table ----

declare module "@deepseek-ai/dsh-session-projection/types" {
  interface SessionProjectionMap {
    /** Ticket id to the board row: the snapshot plus score and fraction. */
    "aidos.tickets": Record<string, TicketView>;
    /** Ticket id to its evidence rows, oldest first. */
    "aidos.evidence": Record<string, EvidenceRow[]>;
    /** Project id to the whole-value plan. */
    "aidos.plan": Record<string, PlanValue>;
    /** Ticket id to its comments, oldest first. */
    "aidos.comments": Record<string, CommentRecord[]>;
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    aidos: AidosService;
  }
}

// ---- the aidos settings namespace ----

/** The settings shape of one evidence kind. */
export interface AidosSettingsKind {
  id: string;
  label: string;
  description: string;
  weight: number;
  allowedAuthors: Actor[];
}

/** The settings shape of one gate. */
export interface AidosSettingsGate {
  fromState: TicketState;
  toState: TicketState;
  requiredKinds: string[];
  allowedActors: Actor[];
  /** #107: kind id -> the kind whose presence excuses it. */
  excusedBy: Record<string, string>;
}

/** The resolved value of the `aidos` settings namespace. */
export interface AidosSettings {
  kinds: AidosSettingsKind[];
  gates: AidosSettingsGate[];
  injectEnabled: boolean;
  injectDebounceMs: number;
}

const ACTOR_UNION = z.union(["agent", "user", "system"]);

/** The schemastery schema of the aidos settings namespace. */
export const AIDOS_SETTINGS_SCHEMA = z.object({
  injectEnabled: z.boolean().default(true),
  injectDebounceMs: z.number().default(30000),
  kinds: z
    .array(
      z.object({
        id: z.string().required(),
        label: z.string().default(""),
        description: z.string().default(""),
        weight: z.number().default(1),
        allowedAuthors: z.array(ACTOR_UNION).default(["agent", "user"]),
      }),
    )
    .default([]),
  gates: z
    .array(
      z.object({
        fromState: z.union([...STATE_ORDER]).required(),
        toState: z.union([...STATE_ORDER]).required(),
        requiredKinds: z.array(z.string()).default([]),
        allowedActors: z.array(ACTOR_UNION).default([]),
        // #107: kind id -> the kind that excuses it. Without this the schema
        // would silently DROP the field from a custom config, so a workspace
        // that configured an excuse would quietly not get one.
        excusedBy: z.dict(z.string()).default({}),
      }),
    )
    .default([]),
});

/**
 * Validate one resolved settings value and detach it as an AidosConfig.
 * A gate referencing an unregistered kind fails here, at config load, not at
 * gate time (SPEC-B1 decision 14).
 */
/**
 * Resolve the settings into the runtime config, validating as it goes.
 *
 * Exported so its VALIDATION is testable (#107 review, finding 3). The rules
 * it enforces -- an excuse naming an unregistered kind, an excuse for a kind
 * the gate does not require, a zero-weight kind used as an excuse -- are
 * exactly the kind of guard that silently rots when nothing can reach it.
 */
export function resolveConfig(settings: AidosSettings, ctx?: Context): AidosConfig {
  const kinds = settings.kinds.map((kind) => ({
    id: kind.id,
    label: kind.label,
    description: kind.description,
    weight: kind.weight,
    allowedAuthors: [...kind.allowedAuthors],
  }));
  const injectEnabled = settings.injectEnabled;
  const injectDebounceMs = settings.injectDebounceMs;
  const gates = settings.gates.map((gate) => ({
    fromState: gate.fromState,
    toState: gate.toState,
    requiredKinds: [...gate.requiredKinds],
    allowedActors: [...gate.allowedActors],
    excusedBy: { ...gate.excusedBy },
  }));
  const known = new Set(kinds.map((kind) => kind.id));
  for (const gate of gates) {
    /*
     * #107: an excuse naming an unregistered kind would never fire, so the
     * gate would silently keep demanding what the config meant to excuse --
     * a misconfiguration that looks like working software. Refused loudly,
     * exactly as an unregistered requiredKind already is.
     */
    for (const [required, excuse] of Object.entries(gate.excusedBy)) {
      /*
       * #107 review, finding 3: a NON-CONTRIBUTING kind may never excuse.
       *
       * `builtin:review_fail` is registered, so the known-kind check below
       * passed it -- meaning a hand-written config could name a FAILED
       * review as the thing that excuses a machine check. #96's invariant
       * ("review_fail satisfies nothing") was enforced on requiredKinds and
       * not on this new axis.
       *
       * Keyed on WEIGHT 0 rather than on the id, so the rule covers the
       * class rather than one name: any kind declared as contributing
       * nothing cannot be made to contribute by the back door.
       *
       * Severity is genuinely low and worth stating plainly: this needs a
       * hand-written workspace config, and anyone who can add a perverse
       * excuse can already delete requiredKinds outright. This is
       * defence-in-depth and an asymmetry fix, not an escalation path.
       */
      const excuseDef = kinds.find((kind) => kind.id === excuse);
      if (excuseDef !== undefined && excuseDef.weight === 0) {
        const message = `aidos config: gate ${gate.fromState} -> ${gate.toState} excuses ${required} with ${excuse}, which has weight 0 and may never satisfy or excuse anything`;
        ctx?.logger?.warn?.(message);
        throw new Error(message);
      }
      if (typeof excuse !== "string" || !known.has(excuse)) {
        const message = `aidos config: gate ${gate.fromState} -> ${gate.toState} excuses ${required} with an unregistered kind ${excuse}`;
        ctx?.logger?.warn?.(message);
        throw new Error(message);
      }
      if (!gate.requiredKinds.includes(required)) {
        const message = `aidos config: gate ${gate.fromState} -> ${gate.toState} excuses ${required}, which it does not require`;
        ctx?.logger?.warn?.(message);
        throw new Error(message);
      }
    }
    for (const kind of gate.requiredKinds) {
      if (!known.has(kind)) {
        const message = `aidos config: gate ${gate.fromState} -> ${gate.toState} requires an unregistered kind ${kind}`;
        ctx?.logger?.warn?.(message);
        throw new Error(message);
      }
    }
  }
  return { kinds, gates, injectEnabled, injectDebounceMs };
}

// ---- projection state and apply bodies (plain JSON per the unit contract) ----

/** The internal state of the aidos.tickets unit: snapshots plus evidence. */
export interface TicketsProjectionState {
  tickets: Record<string, TicketSnapshot>;
  evidence: Record<string, EvidenceRow[]>;
}

/** The projection-grade fold of the tickets unit. */
export function applyTicketsProjection(
  state: TicketsProjectionState,
  event: SessionEvent,
): TicketsProjectionState {
  if (event.type === "ticket/change") {
    const ticket = event.data.ticket;
    return {
      tickets: { ...state.tickets, [String(ticket.id)]: ticket },
      evidence: state.evidence,
    };
  }
  if (event.type === "evidence/attached") {
    const id = String(event.data.ticketId);
    const rows = state.evidence[id] ?? [];
    return {
      tickets: state.tickets,
      evidence: { ...state.evidence, [id]: [...rows, event.data.row] },
    };
  }
  if (event.type === "evidence/detached") {
    const id = String(event.data.ticketId);
    const rows = state.evidence[id];
    if (rows === undefined) return state;
    const index = rows.findIndex(
      (row) => row.at === event.data.at && row.kind === event.data.rowKind,
    );
    if (index < 0) return state;
    const next = [...rows];
    next.splice(index, 1);
    return {
      tickets: state.tickets,
      evidence: { ...state.evidence, [id]: next },
    };
  }
  return state;
}

/** The projection-grade fold of the aidos.evidence unit. */
export function applyEvidenceProjection(
  state: Record<string, EvidenceRow[]>,
  event: SessionEvent,
): Record<string, EvidenceRow[]> {
  if (event.type === "evidence/attached") {
    const id = String(event.data.ticketId);
    const rows = state[id] ?? [];
    return { ...state, [id]: [...rows, event.data.row] };
  }
  if (event.type === "evidence/detached") {
    const id = String(event.data.ticketId);
    const rows = state[id];
    if (rows === undefined) return state;
    const index = rows.findIndex(
      (row) => row.at === event.data.at && row.kind === event.data.rowKind,
    );
    if (index < 0) return state;
    const next = [...rows];
    next.splice(index, 1);
    return { ...state, [id]: next };
  }
  if (event.type === "evidence/linked") {
    // Rewrite payload.criteria on the named row, immutably.
    const id = String(event.data.ticketId);
    const rows = state[id];
    if (rows === undefined) return state;
    const index = rows.findIndex(
      (row) => row.at === event.data.at && row.kind === event.data.rowKind,
    );
    if (index < 0) return state;
    const next = [...rows];
    next[index] = {
      ...next[index]!,
      payload: { ...next[index]!.payload, criteria: event.data.criterion },
    };
    return { ...state, [id]: next };
  }
  return state;
}

/** The projection-grade fold of the aidos.plan unit. */
export function applyPlanProjection(
  state: Record<string, PlanValue>,
  event: SessionEvent,
): Record<string, PlanValue> {
  if (event.type !== "plan/change") return state;
  return { ...state, [String(event.data.projectId)]: event.data.plan };
}

/** The projection-grade fold of the aidos.comments unit. */
export function applyCommentsProjection(
  state: Record<string, CommentRecord[]>,
  event: SessionEvent,
): Record<string, CommentRecord[]> {
  if (event.type !== "comment/added") return state;
  const id = String(event.data.ticketId);
  const rows = state[id] ?? [];
  return {
    ...state,
    [id]: [
      ...rows,
      {
        ticketId: event.data.ticketId,
        text: event.data.text,
        author: event.data.author,
        at: event.data.at,
      },
    ],
  };
}

// ---- projection schemas (zod, the wire payload validator) ----

const STATE_ENUM = zod.enum([...STATE_ORDER]);
const ACTOR_ZOD = zod.union([
  zod.literal("agent"),
  zod.literal("user"),
  zod.literal("system"),
]);
const EVIDENCE_ROW_ZOD = zod.object({
  kind: zod.string(),
  author: ACTOR_ZOD,
  at: zod.number(),
  payload: zod.record(zod.string(), zod.unknown()),
});
const TICKET_VIEW_ZOD = zod.object({
  id: zod.number(),
  projectId: zod.number(),
  title: zod.string(),
  description: zod.string(),
  body: zod.string(),
  criteria: zod.string(),
  phase: zod.number(),
  order: zod.number(),
  state: STATE_ENUM,
  confidenceScore: zod.number(),
  gateFraction: zod.number().nullable(),
  gatePresent: zod.number().nullable(),
  gateTotal: zod.number().nullable(),
  updatedAt: zod.number(),
  workspaceKey: zod.string(),
  slug: zod.string(),
  dependsOn: zod.array(zod.string()),
  allowlist: zod.array(zod.string()),
});
const PLAN_VALUE_ZOD = zod.object({
  frontmatter: zod.string(),
  context: zod.object({
    preamble: zod.string(),
    contextSections: zod.array(
      zod.object({ heading: zod.string(), text: zod.string(), index: zod.number() }),
    ),
  }),
  rules: zod.string(),
});
const COMMENT_ZOD = zod.object({
  ticketId: zod.number(),
  text: zod.string(),
  author: ACTOR_ZOD,
  at: zod.number(),
});
const TICKETS_PROJECTION_ZOD = zod.record(zod.string(), TICKET_VIEW_ZOD);
const EVIDENCE_PROJECTION_ZOD = zod.record(zod.string(), zod.array(EVIDENCE_ROW_ZOD));
const PLAN_PROJECTION_ZOD = zod.record(zod.string(), PLAN_VALUE_ZOD);
const COMMENTS_PROJECTION_ZOD = zod.record(zod.string(), zod.array(COMMENT_ZOD));

// ---- shared small helpers ----

/** One plain JSON object. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The title a newly created phase takes when none is named. */
const DEFAULT_PHASE_TITLE = "Untitled phase";

// ---- the service ----

/** One per-session fold cache. */
interface SessionCache {
  state: AidosState;
  observedSeq: number;
}

export interface AidosCoreConfig {
  /** The project name a session takes when it binds its workspace. */
  defaultProjectName?: string;
  /** Clock for `at`/`updatedAt`, seconds as float. Default Date.now()/1000. Injectable for deterministic tests. */
  now?: () => number;
}

export interface SetTicketArgs {
  ticketId?: number | string;
  projectId?: number;
  title?: string;
  description?: string;
  body?: string;
  criteria?: string;
  phase?: number;
  phaseTitle?: string;
  order?: number;
  slug?: string;
  /**
   * Ticket dependencies as `<workspaceKey>:<ticketId>` references. Empty
   * or absent leaves the field unchanged on edit. Informational only: no
   * gate enforces them.
   */
  dependsOn?: string[];
  /**
   * The file allowlist for this ticket. User-only: the agent tool path
   * cannot set it, and every path must be covered by an approved
   * `builtin:file_allowlist` evidence row on this ticket.
   */
  allowlist?: string[];
}

export interface AttachEvidenceArgs {
  ticketId: number | string;
  kind: string;
  payload?: Record<string, unknown>;
}

export interface MoveTicketArgs {
  ticketId: number | string;
  to: TicketState;
}

export interface AddCommentArgs {
  ticketId: number | string;
  text: string;
}

export interface PlanImportArgs {
  file: string;
  projectId?: number;
}

/**
 * One plan-meta write. Every present field replaces the stored one, and
 * absent fields keep the stored value. The board edits one block at a time
 * where plan_import replaces the whole plan.
 */
export interface PlanMetaSetArgs {
  projectId?: number;
  frontmatter?: string;
  preamble?: string;
  contextSections?: ContextSection[];
}
/**
 * One board row in the workspace merge. Own rows are plain TicketViews with
 * `foreign: false`; foreign rows carry the owning session id (the writer)
 * and keep their in-log ticket id in `id`.
 */
export interface BoardTicketView extends TicketView {
  /** The session whose log owns this row's authoritative state. */
  sourceSessionId: string;
  /** Whether the owning log is a different session than the reader's. */
  foreign: boolean;
}

/** Routing target for a foreign write is not a live session. */
export class OwnerUnavailable extends Error {
  readonly sessionId: string;
  constructor(sessionId: string) {
    super(`ticket's owning session ${sessionId} is not open; open it to change this ticket`);
    this.sessionId = sessionId;
  }
}

export interface EvidenceView {
  ticketId: number;
  kind: string;
  payload: Record<string, unknown>;
}

/** One dependency-search hit, carrying the stored reference fields. */
export interface TicketSearchResult {
  sessionId: string;
  ticketId: number;
  title: string;
  state: string;
  workspaceKey: string;
  dependsOn: string[];
}

/**
 * The ticket service, backed by the owning session log. The constructor
 * registers the four projection units and the invariant companion.
 * The class extends TypertRemoteService, so the Gateway exports the
 * user-actor entry points under the `aidos` namespace. The agent tool
 * layer calls the agent-actor methods directly.
 */
/**
 * Make one interpolated fragment safe to drop into a Markdown list item.
 *
 * The digest is rendered as Markdown, and every dynamic part of it -- ticket
 * TITLES, evidence NOTES, path lists -- is authored by a human or by an
 * agent and can contain anything. Two things actually break:
 *
 *  1. NEWLINES. An evidence note is free-form and frequently multi-line (a
 *     review verdict, for instance). A raw newline ends the list item, and
 *     if the next line happens to begin with "-" or "#" it starts a new list
 *     or a heading -- so one note silently restructures the whole digest.
 *  2. INLINE MARKUP. A title containing *, _, `, [ or ] renders as emphasis,
 *     code or a link fragment. "automated_check + review_pass" is a real
 *     example from this project, and a stray backtick swallows the rest of
 *     the line into a code span.
 *
 * Whitespace is collapsed first, then the inline specials are escaped. `#`
 * and `-` are NOT escaped: they are only structural at the START of a line,
 * and after the collapse nothing interpolated can be at the start of one.
 */
function _mdInline(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\\`*_[\]<>])/g, "\\$1");
}

/**
 * The digest suffix for one evidence row (#63 follow-up): surface the
 * payload's HUMAN-READABLE content in the injection line, not just the kind.
 * Review notes and verification notes ride a `note`; allowlists list their
 * paths; anything else with a single string field uses that. Capped so a
 * long note cannot flood the digest.
 */
/**
 * The one truncation rule for digest text (#106).
 *
 * This was a closure inside _evidenceDigestSuffix, so the comment digest
 * could not reuse it without writing a SECOND rule -- and two truncation
 * rules drift, which is how this codebase ended up with eleven copies of a
 * board key. Hoisted rather than duplicated. The cap exists so one long note
 * cannot flood a digest that may batch many changes.
 */
/**
 * Raised from 160 to 1000 (user-reported, 2026-09-03).
 *
 * 160 was chosen so one long note could not flood a batched digest. In
 * practice it truncated the user MID-SENTENCE: a signoff note asking
 * "...is markdown rendering for board update digest fixed? We should test
 * if it properly renders md because …" lost the actual question, and the
 * agent could not act on what it could not read.
 *
 * The cap is for FLOOD control, not brevity. A note a human writes TO the
 * agent is the highest-value text in the digest, and truncating it defeats
 * the mechanism: the whole point of #106 is that the human should not have
 * to repeat themselves in chat.
 *
 * Exported so tests derive their fixtures from it. Both existing cap tests
 * hardcoded a 400-character string, which silently stopped exercising the
 * cap the moment it moved -- a test that passes because its input no longer
 * reaches the branch it is testing.
 */
export const DIGEST_TEXT_CAP = 1000;

function _ellipsize(text: string): string {
  return text.length > DIGEST_TEXT_CAP ? `${text.slice(0, DIGEST_TEXT_CAP)}…` : text;
}

function _evidenceDigestSuffix(kind: string, payload: Record<string, unknown>): string {
  // #106 follow-up: the suffix carries free-form note/verdict text straight
  // into a Markdown list item, so it needs the same inline escaping and
  // newline collapse the rest of the line gets.
  const ellipsize = (text: string): string => _mdInline(_ellipsize(text));
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    return ` — "${ellipsize(payload.note.trim())}"`;
  }
  if (Array.isArray(payload.paths)) {
    const paths = payload.paths.filter((p): p is string => typeof p === "string");
    if (paths.length > 0) {
      return ` — ${paths.length} path(s): ${ellipsize(paths.join(", "))}`;
    }
  }
  // #68: a commit-carrying row names the commit and subject so the digest
  // reader knows WHAT was attached without opening the viewer.
  if (typeof payload.commit === "string" && payload.commit.trim() !== "") {
    const hash = payload.commit.trim().slice(0, 12);
    const subject = typeof payload.subject === "string" ? " " + payload.subject.trim() : "";
    return ` — commit ${hash}${ellipsize(subject)}`;
  }
  if (kind === "builtin:imported_state" && typeof payload.claimed_state === "string") {
    return ` — claimed ${payload.claimed_state}`;
  }
  if (kind === "builtin:review_pass" || kind === "builtin:user_verified" || kind === "builtin:automated_check") {
    // A verdict row with no note still says what was asserted, from the
    // payload's first string field when there is one.
    for (const value of Object.values(payload)) {
      if (typeof value === "string" && value.trim() !== "") {
        return ` — "${ellipsize(value.trim())}"`;
      }
    }
  }
  return "";
}

/**
 * One pending agent-to-user approval (#51, the #56 seam's first consumer).
 * Kind-generic on purpose: the allowlist flow is the first consumer, but a
 * signoff request, a criteria confirmation, or any future agent-to-user ask
 * rides the same queue -> card -> resolve path. In-memory by design: a
 * restart drops pending requests, and the requesting agent re-requests.
 */
export interface PendingApproval {
  id: string;
  /** The requesting session: ticket ids collide across sessions (#51 review). */
  sessionId: string;
  ticketId: number;
  /** The approval kind; the card renders and resolves by it. */
  kind: string;
  /** Human-readable prompt shown on the card. */
  prompt: string;
  /** The proposed payload — for allowlists, { paths: string[] }. */
  payload: Record<string, unknown>;
  at: number;
}

/**
 * The actions a human performs, and therefore the only ones the agent may
 * nominate (#93). Kept in step with HUMAN_ACTIONS in src/client/human-queue.ts:
 * the client drops a nomination whose action the gate refuses, and this list
 * refuses one the human could never perform at all.
 */
export const HUMAN_NOMINATION_ACTIONS: readonly string[] = [
  "signoff",
  "verify",
  "mark-done",
];

/**
 * One agent-to-human suggestion (#93). Session-scoped by decision: a restart
 * drops it and the queue falls back to its derived half.
 */
export interface ActionNomination {
  id: string;
  /** The nominating session; ticket ids collide across sessions. */
  sessionId: string;
  ticketId: number;
  /** One of HUMAN_NOMINATION_ACTIONS. */
  actionId: string;
  /** Why the agent is asking for this one, in its own words. */
  reason: string;
  at: number;
}

/**
 * Validate one proposed allowlist path set (#51). Every path must resolve
 * inside the session workspace and exist on disk; the list must be non-empty;
 * duplicates are collapsed. Returns the bad paths so the refusal can name
 * each one — the agent can fix its proposal without a round trip.
 */
/**
 * The result of validating a proposed allowlist. `created` names the subset
 * of `paths` that does not exist on disk yet (#104) -- valid, and shown to
 * the human as "will be created" so their approval stays informed.
 */
type ValidatedAllowlist =
  | { ok: true; paths: string[]; created: string[] }
  | { ok: false; bad: Array<{ path: string; reason: string }> };

function validateAllowlistPaths(
  cwd: string,
  paths: readonly string[],
): ValidatedAllowlist {
  // Containment uses relative() + the "../" check, NOT startsWith: the
  // prefix test has the sibling hole ("/ws-evil/x".startsWith("/ws") is
  // true), which the #51 review demonstrated. Same contract as isUnder in
  // the write boundary.
  const base = resolve(cwd);
  const contains = (candidate: string): boolean => {
    const rel = relative(base, resolve(candidate));
    const norm = rel.replace(/\\/g, "/");
    return rel === "" || (!norm.startsWith("../") && norm !== ".." && !isAbsolute(rel));
  };
  const seen = new Set<string>();
  const clean: string[] = [];
  const created: string[] = [];
  const bad: Array<{ path: string; reason: string }> = [];
  for (const raw of paths) {
    if (typeof raw !== "string" || raw.trim() === "") {
      bad.push({ path: String(raw), reason: "empty" });
      continue;
    }
    /*
     * #104 review, finding A: a NUL byte must be refused EXPLICITLY.
     *
     * It used to be caught by accident. existsSync() returns false for a
     * path containing NUL rather than throwing, so "src/foo\0bar" was
     * refused as "does not exist" -- and removing that refusal turned an
     * accidental rejection into an acceptance, writing a NUL path into a
     * security-relevant allowlist. Not exploitable through Node's fs, which
     * rejects NUL itself, but a write boundary should refuse it on purpose
     * rather than rely on a side effect of a check that no longer exists.
     */
    if (raw.includes("\0")) {
      bad.push({ path: raw.replace(/\0/g, "\\0"), reason: "contains a NUL byte" });
      continue;
    }
    const p = raw.trim().replace(/\/+$/, "");
    if (p === "") continue;
    if (seen.has(p)) continue;
    seen.add(p);
    const abs = resolve(cwd, p);
    if (!contains(abs)) {
      bad.push({ path: p, reason: "escapes the workspace" });
      continue;
    }
    /*
     * #104: a path that does not exist yet is VALID and merely NEW.
     *
     * The old refusal made a ticket whose entire purpose is to CREATE
     * something unable to be authorised to create it -- #102 (add a
     * screenshots/ gallery) was refused its own directory. Worse, the only
     * workaround was to request the PARENT directory, which is a strictly
     * WIDER grant than the one that was refused: a validator that pushes
     * users toward broader permissions is working against its own purpose.
     *
     * Nothing is weakened by this. The containment check above is purely
     * LEXICAL -- relative() plus a "../" test, never touching the
     * filesystem -- so it already gives a correct answer for a path that
     * does not exist, and a path inside the workspace has every ancestor
     * inside it too. Existence was never the safety property; containment
     * is, and it still runs first and still refuses.
     *
     * The path is flagged so the approval card can say "will be created",
     * keeping the human's consent informed rather than silent.
     */
    if (!existsSync(abs)) {
      created.push(p);
    }
    clean.push(p);
  }
  if (bad.length > 0) return { ok: false, bad };
  if (clean.length === 0) return { ok: false, bad: [{ path: "(all)", reason: "the list is empty" }] };
  return { ok: true, paths: clean, created };
}

export class AidosService extends TypertRemoteService {
  static inject = [
    "agents",
    "sessionProjections",
    "invariants",
    "settings",
    "workspaceRegistry",
    "sessions",
  ];

  static Config = z.object({});

  private readonly _config: AidosCoreConfig;
  private readonly _caches = new WeakMap<Session, SessionCache>();
  private _resolvedConfig: AidosConfig;
  constructor(ctx: Context, config?: AidosCoreConfig) {
    super(ctx, "aidos");

    // Register the aidos session event types with the host reader before any
    // session bootstrap append (project/created in _ensureProject below) can
    // happen. Idempotent; see ./session-events for the issue-#52 rationale.
registerAidosSessionEventTypes(ctx);

    // Ensure aidos events carry ignorable:true so the persistence read path accepts them
    // (KNOWN_SESSION_EVENT_TYPES does not include plugin types). Instead of the fragile
    // global Object.freeze trap, we keep Session.prototype.append intact and make _commit
    // set the marker via a per-session instance patch that wraps the returned event.
    // The constructor no longer mutates the prototype.
    // NOTE: actual ignorable is set in _commit after session.append returns; the envelope
    // is frozen but we mutate via defineProperty before freeze in the per-session wrapper below.
    // For now, no prototype mutation here — see _commit for the per-session handling.
    this._config = config ?? {};
    this._resolvedConfig = {
      injectEnabled: DEFAULT_CONFIG.injectEnabled,
      injectDebounceMs: DEFAULT_CONFIG.injectDebounceMs,
      kinds: DEFAULT_CONFIG.kinds.map((kind) => ({ ...kind, allowedAuthors: [...kind.allowedAuthors] })),
      gates: DEFAULT_CONFIG.gates.map((gate) => ({
        ...gate,
        requiredKinds: [...gate.requiredKinds],
        allowedActors: [...gate.allowedActors],
      })),
    };

    // Config: the aidos settings namespace. Defaults are DEFAULT_CONFIG;
    // the resolved value layers schema defaults, then base, then the user.
    // The registration and the watch ride the inject child's fiber, so a
    // settings service going away restores the defaults with it.
    ctx.inject(["settings"], (settingsCtx) => {
      const scope = settingsCtx.settings.register(
        settingsNamespace("aidos"),
        AIDOS_SETTINGS_SCHEMA,
        /*
         * #107: gates are normalised so every one carries an excusedBy.
         *
         * GateDef leaves the field OPTIONAL, because most gates excuse
         * nothing and an author should not have to write an empty object.
         * The settings schema defaults it, so its parsed shape has the field
         * present. Filling it here reconciles the two at the single point
         * where they meet, instead of casting (which would hide the
         * mismatch) or forcing every gate literal and its verbatim mirror to
         * carry `excusedBy: {}` (which would be noise in the table that is
         * meant to be the readable statement of the rules).
         */
        {
          base: {
            ...DEFAULT_CONFIG,
            gates: DEFAULT_CONFIG.gates.map((gate) => ({
              ...gate,
              excusedBy: gate.excusedBy ?? {},
            })),
          },
        },
      );
      this._resolvedConfig = resolveConfig(scope.get(), ctx);
      scope.watch((next) => {
        this._resolvedConfig = resolveConfig(next, ctx);
      });
    });

    // The four projection units, registered under their keys.
    ctx.inject(["sessionProjections"], (projectionCtx) => {
      this._registerProjections(projectionCtx);
    });

    // The invariant companion, when the registry is composed.
    if (ctx.invariants) {
      registerAidosInvariant(ctx);
    }

  }

  // ---- reads ----

  /** The board rows of one agent's session. Sorted by phase and order. */
  getTickets(
    agent: Agent,
    opts?: {
      projectId?: number;
      stateIds?: readonly string[];
      projectIds?: readonly number[];
      search?: string;
      sortKey?: TicketSortKey;
      descending?: boolean;
    },
  ): TicketView[] {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    let projectId: ProjectId;
    if (opts?.projectId !== undefined) {
      projectId = opts.projectId;
      if (!cache.state.projects.has(projectId)) {
        throw new UnknownProject(projectId);
      }
    } else {
      projectId = this._ensureProject(agent).projectId;
    }
    const views = ticketsProjection(cache.state, this._resolvedConfig);
    const scoped = [...views.values()].filter((view) => view.projectId === projectId);
    // FilterPanel-parity filtering (#49): server-side, no default narrowing.
    return filterTicketViews(scoped, {
      stateIds: opts?.stateIds,
      projectIds: opts?.projectIds,
      search: opts?.search,
      sortKey: opts?.sortKey,
      descending: opts?.descending,
    });
  }

  /**
   * ONE ticket in full, with its evidence and comments (#92).
   *
   * The companion to summary board reads. `getTickets` stays a FULL-row API
   * because internal callers depend on it -- `src/tools/allowlist.ts` computes
   * the write boundary from its `allowlist` field, and summarising it there
   * would quietly weaken the file guard. So the summarising happens in the
   * TOOL layer, where the token cost actually lands, and this method is how a
   * caller gets everything back for the one ticket it is about to work on.
   *
   * Accepts a composite `sessionId:id` so a foreign ticket resolves too.
   */
  getTicket(
    agent: Agent,
    args: { ticketId: number | string },
  ): {
    ticket: TicketView;
    evidence: EvidenceRow[];
    comments: CommentRecord[];
  } {
    const routed = this._routedAgent(agent, args.ticketId);
    const id = this._resolveTicketId(routed, args.ticketId);
    const cache = this._cache(routed.session);
    this._sync(routed.session, cache);
    const views = ticketsProjection(cache.state, this._resolvedConfig);
    const ticket = views.get(id as TicketId);
    if (ticket === undefined) {
      throw new UnknownTicket(id);
    }
    return {
      ticket,
      evidence: [...(cache.state.evidence.get(id as TicketId) ?? [])],
      comments: [...(cache.state.comments.get(id as TicketId) ?? [])],
    };
  }

  /** The distinct ticket states of one agent's session (the mask input). */
  ticketStates(agent: Agent): TicketState[] {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const states = new Set<TicketState>();
    for (const snapshot of cache.state.tickets.values()) {
      states.add(snapshot.state);
    }
    return STATE_ORDER.filter((state) => states.has(state));
  }

  /**
   * The bash policy context for one agent: which guard profile applies and
   * where scratch lives. bash-guard reads this to pick a command-ruleset and
   * to allow writes to the scratch dirs in every phase (no phase may block
   * scratch — both /tmp/dsh and the aidos durable scratch stay writable).
   *
   * A session that does not run the `aidos` preset gets no profile at all:
   * `{ profile: "none", scratchDir: "", workspaceRoot: "" }`, computed before
   * any session-cache, ticket, or delegation-depth logic runs. bash-guard
   * treats "none" as "base guards only, no overlay."
   *
   * Profile derivation, aidos-preset sessions only:
   *  - primary agent, no ticket in_progress         => "planning"
   *  - primary agent, at least one in_progress       => "implementation"
   *  - subagent (delegation depth > 0), provider p   => `subagent-${p}`
   *    (an unknown provider falls back to "subagent-coder")
   */
  bashContext(agent: Agent): { profile: string; scratchDir: string; workspaceRoot: string } {
    const presets = this.ctx.get("agentPresets") as
      | { composedPreset: (agentCtx: unknown) => string | undefined }
      | undefined;
    // Deny by default (A5): an agent that cannot prove it composes the aidos
    // preset gets no bash profile at all — same contract as isAidosAgent.
    if (presets === undefined) {
      return { profile: "none", scratchDir: "", workspaceRoot: "" };
    }
    let composed: string | undefined;
    try {
      composed = presets.composedPreset(agent.ctx);
    } catch {
      return { profile: "none", scratchDir: "", workspaceRoot: "" };
    }
    if (composed !== "aidos") {
      return { profile: "none", scratchDir: "", workspaceRoot: "" };
    }
    let profile: string;
    if (delegationDepthOf(agent) === 0) {
      let states: TicketState[];
      try {
        states = this.ticketStates(agent);
      } catch (error) {
        this.ctx.logger?.warn?.(`aidos: ticketStates failed in bashContext: ${error instanceof Error ? error.message : String(error)}`);
        states = [];
      }
      const hasInProgress = states.some((state) => state === "in_progress");
      const hasAwaiting = states.some((state) => state === "awaiting_verification");
      // Awaiting-verification without concurrent in_progress moves bash
      // into the awaiting_verification profile (replaces bash-ask.ts).
      // dotfiles-ai provides guards/profile-awaiting_verification which asks
      // on every command except scratch. See the dotfiles prompt.
      if (hasAwaiting && !hasInProgress) {
        profile = "awaiting_verification";
      } else {
        profile = hasInProgress ? "implementation" : "planning";
      }
    } else {
      const kind = this.subagentKind(agent);
      profile = kind ? `subagent-${kind}` : "subagent-coder";
    }
    let scratchDir: string;
    try {
      scratchDir = scratchRootForAgent(agent);
    } catch (error) {
      this.ctx.logger?.warn?.(`aidos: scratchRootForAgent failed in bashContext: ${error instanceof Error ? error.message : String(error)}`);
      scratchDir = "";
    }
    const workspaceRoot = (agent.session?.header?.cwd as string | undefined) ?? "";
    return { profile, scratchDir, workspaceRoot };
  }

  /** The dsh-subagent provider that spawned the agent, if it is a subagent. */
  private subagentKind(agent: Agent): string | undefined {
    const direct = (agent as unknown as { descriptor?: { provider?: string } }).descriptor?.provider;
    if (direct) return direct;
    const session = agent.session as unknown as { events?: ReadonlyArray<{ type?: string; provider?: string }> } | undefined;
    const events = session?.events;
    if (!events) return undefined;
    for (const event of events) {
      if (event.type === "subagent/descriptor") return event.provider;
    }
    return undefined;
  }

  /** The union of the in-progress tickets' allowlists (the write boundary). */
  allowlistUnion(agent: Agent): string[] {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const union: string[] = [];
    const seen = new Set<string>();
    for (const snapshot of cache.state.tickets.values()) {
      if (snapshot.state !== "in_progress") continue;
      for (const entry of snapshot.allowlist) {
        if (!seen.has(entry)) {
          seen.add(entry);
          union.push(entry);
        }
      }
    }
    return union;
  }

  /** Serialize one project's plan as markdown. */
  plan(agent: Agent, opts?: { projectId?: number }): string {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = opts?.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const meta = this._planMetaOf(projectId, cache.state);
    const tickets: PlanTicket[] = this._ticketsFor(projectId, cache.state).map((row): PlanTicket => ({
      id: String(row.id),
      title: row.title,
      // Pre-P12 rows hold the prose in the body, later rows in the
      // description, so the export reads the description first.
      body: row.description || row.body,
      criteria: row.criteria,
      claimedState: row.state,
      order: row.order,
      phase: row.phase,
    }));
    // #5/P11: the export is flat — every ticket in store order, no phase
    // grouping, no `## Phase N` headings ever. The ticket's `phase` and
    // `order` fields remain in the kernel; the document shape no longer
    // carries them.
    return renderPlan({
      frontmatter: meta.frontmatter,
      frontmatterData: {},
      preamble: meta.preamble,
      contextSections: meta.contextSections,
      tickets,
    });
  }

  /**
   * The stored plan meta of one project: frontmatter, preamble, and context
   * sections. A project without a plan/change event yields the empty
 * default, so the board can open the editor on a fresh session. An absent
 * project is a refusal, like plan().
   */
  planMeta(agent: Agent, opts?: { projectId?: number }): PlanMetaView {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = opts?.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    return this._planMetaOf(projectId, cache.state);
  }

  // ---- writes ----

  /** Create or edit one ticket. Creates the phase when absent. */
  setTicket(agent: Agent, args: SetTicketArgs): TicketRow {
    if (args.ticketId !== undefined) {
      return this._editTicket(agent, args, "agent");
    }
    return this._createTicket(agent, args, "agent");
  }

  /**
   * The user-actor set path, exported over the typert Remote surface. It
   * creates a ticket and edits the named fields. It never changes state,
   * and only this path may set a ticket's allowlist. The agent path passes
   * the "agent" actor and refuses the field.
   */
  @Remote("userSetTicket")
  userSetTicket(agent: Agent, args: SetTicketArgs): TicketRow {
    if (args.ticketId !== undefined) {
      return this._editTicket(this._routedAgent(agent, args.ticketId), args, "user");
    }
    return this._createTicket(agent, args, "user");
  }

  /**
   * The cross-workspace dependency search, exported over the typert Remote
   * surface. Matches one query against the title of every live session's
   * tickets, and returns the stored reference fields the board needs to
   * render a dependency badge and to add a dependency. Only live sessions
   * are reachable: a session that is not open right now has no disk-scan
   * path and contributes nothing.
   */
  @Remote("searchTickets")
  searchTickets(agent: Agent, args: { query: string }): TicketSearchResult[] {
    const query = (args.query ?? "").toLowerCase().trim();
    if (!query) return [];
    const results: TicketSearchResult[] = [];
    for (const session of this.ctx.sessions.list()) {
      let snap;
      try {
        snap = this.ctx.sessionProjections.snapshot(session);
      } catch (error) {
        this.ctx.logger?.debug?.(`aidos: no projection snapshot for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const tickets = snap.values["aidos.tickets"];
      if (!tickets) continue;
      for (const [id, ticket] of Object.entries(tickets)) {
        if (!ticket.title.toLowerCase().includes(query)) continue;
        results.push({
          sessionId: session.id,
          ticketId: Number(id),
          title: ticket.title,
          state: ticket.state,
          workspaceKey: ticket.workspaceKey,
          dependsOn: ticket.dependsOn ?? [],
        });
      }
    }
    return results.slice(0, 50);
  }

  /**
   * The cross-workspace board read, exported over the typert Remote surface.
   * Reads one session's tickets by its session id, through the live session
   * store and the aidos.tickets projection. The board UI (U2d) calls this
   * with a session id it does not itself own, so the arg carries the id
   * instead of the calling agent. Only live sessions are reachable: a
   * session that is not open right now has no disk-scan path and returns an
   * empty board (the client treats that as "session not open").
   */
  @Remote("coldTickets")
  coldTickets(agent: Agent, args: { sessionId: string; states?: string[] }): TicketView[] {
    const session = this.ctx.sessions.get(args.sessionId as any);
    if (!session) return [];
    let snap;
    try {
      snap = this.ctx.sessionProjections.snapshot(session);
    } catch (error) {
      this.ctx.logger?.debug?.(`aidos: no projection snapshot for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
    const tickets = snap.values["aidos.tickets"];
    if (!tickets) return [];
    let rows = Object.values(tickets);
    if (args.states && args.states.length > 0) {
      rows = rows.filter((ticket) => (args.states as string[]).includes(ticket.state));
    }
    return rows;
  }

  // ---- cross-session board (workspace merge) ----

  /**
   * One source session's contribution to the workspace board: the ticket
   * views of one session log plus its evidence and comments maps. The
   * session that owns a log is the only writer to it (owner routing);
   * every other session's board shows these rows read-only.
   */
  private _foldExternalLog(meta: SessionHeader, events: readonly SessionEvent[]): {
    state: AidosState;
  } {
    const state = createInitialState();
    for (const event of events) {
      foldSessionEvent(state, event);
    }
    void meta;
    return { state };
  }

  /**
   * Every live session bound to the agent's workspace path, excluding the
   * caller's own session. Live sessions fold from the in-memory log.
   */
  private _liveWorkspaceSessions(agent: Agent): Session[] {
    const path = this._workspacePath(agent);
    const out: Session[] = [];
    for (const candidate of this.ctx.agents.list()) {
      if (candidate.session.id === agent.session.id) continue;
      try {
        if (this._workspacePath(candidate) !== path) continue;
      } catch {
        continue;
      }
      out.push(candidate.session);
    }
    return out;
  }

  /**
   * The ids of every persisted session whose header cwd matches the agent's
   * workspace path, excluding the caller's own session and every live one.
   */
  private async _closedWorkspaceSessionIds(
    agent: Agent,
    exclude: Set<string>,
  ): Promise<SessionId[]> {
    const persistence = this.ctx.get("sessionPersistence") as
      | {
          list: () => Promise<SessionHeader[]>;
        }
      | undefined;
    if (persistence === undefined) return [];
    const path = this._workspacePath(agent);
    let headers: SessionHeader[];
    try {
      headers = await persistence.list();
    } catch (error) {
      this.ctx.logger?.warn?.(`aidos: persistence.list failed in workspace merge: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
    const ids: SessionId[] = [];
    for (const header of headers) {
      if (header.cwd === undefined) continue;
      if (header.cwd !== path) continue;
      if (header.id === agent.session.id) continue;
      if (exclude.has(header.id)) continue;
      ids.push(header.id);
    }
    return ids;
  }

  /**
   * The workspace board: the caller's own tickets plus every ticket held in
   * another session's log of the SAME workspace path — live sessions fold
   * from memory, closed sessions from a persistence inspect (never a live
   * log). Ticket ids collide across sessions, so each foreign row is
   * re-keyed `<sourceSessionId>:<ticketId>` and carries `sourceSessionId`
   * for the board badge and for owner-routed writes. Own rows keep plain
   * numeric ids and carry no source marker.
   */
  @Remote("workspaceTickets")
  async workspaceTickets(agent: Agent, args?: Record<string, never>): Promise<{
    tickets: BoardTicketView[];
    evidence: Record<string, EvidenceRow[]>;
    comments: Record<string, CommentRecord[]>;
  }> {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ownViews = ticketsProjection(cache.state, this._resolvedConfig);
    const ownSort = (a: TicketView, b: TicketView) =>
      a.phase - b.phase || a.order - b.order || a.id - b.id;

    const tickets: BoardTicketView[] = [];
    const evidence: Record<string, EvidenceRow[]> = {};
    const comments: Record<string, CommentRecord[]> = {};

    for (const view of [...ownViews.values()].sort(ownSort)) {
      tickets.push({ ...view, sourceSessionId: agent.session.id, foreign: false });
      const key = String(view.id);
      evidence[key] = [...(cache.state.evidence.get(view.id) ?? [])];
      comments[key] = [...(cache.state.comments.get(view.id) ?? [])];
    }

    const liveSessions = this._liveWorkspaceSessions(agent);
    const liveIds = new Set<string>();
    for (const session of liveSessions) {
      liveIds.add(session.id);
      const state = this._cache(session).state;
      this._sync(session, this._caches.get(session)!);
      const views = ticketsProjection(state, this._resolvedConfig);
      for (const view of [...views.values()].sort(ownSort)) {
        const key = session.id + ":" + view.id;
        tickets.push({
          ...view,
          id: view.id,
          sourceSessionId: session.id,
          foreign: true,
        } as BoardTicketView);
        evidence[key] = [...(state.evidence.get(view.id) ?? [])];
        comments[key] = [...(state.comments.get(view.id) ?? [])];
      }
    }

    const closedIds = await this._closedWorkspaceSessionIds(agent, liveIds);
    for (const id of closedIds) {
      let inspection: { meta: SessionHeader; events: readonly SessionEvent[] };
      try {
        const persistence = this.ctx.get("sessionPersistence") as {
          inspect: (id: SessionId) => Promise<{ meta: SessionHeader; events: readonly SessionEvent[] }>;
        };
        inspection = await persistence.inspect(id);
      } catch (error) {
        this.ctx.logger?.debug?.(`aidos: inspect failed for ${id}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const { state } = this._foldExternalLog(inspection.meta, inspection.events);
      const views = ticketsProjection(state, this._resolvedConfig);
      for (const view of [...views.values()].sort(ownSort)) {
        const key = id + ":" + view.id;
        tickets.push({
          ...view,
          id: view.id,
          sourceSessionId: id,
          foreign: true,
        } as BoardTicketView);
        evidence[key] = [...(state.evidence.get(view.id) ?? [])];
        comments[key] = [...(state.comments.get(view.id) ?? [])];
      }
    }

    tickets.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    return { tickets, evidence, comments };
  }

  /**
   * The agent the write should run against. A numeric ticketId (or a plain
   * slug reference in the caller's own workspace) targets the caller's own
   * session; a `<sourceSessionId>:<ticketId>` string routes to the owner
   * session. Owner routing keeps one authoritative log per ticket.
   */
  private _routedAgent(agent: Agent, ticketRef: number | string | undefined): Agent {
    if (ticketRef === undefined || typeof ticketRef === "number") return agent;
    const colon = ticketRef.indexOf(":");
    if (colon <= 0) return agent;
    const head = ticketRef.slice(0, colon);
    const tail = ticketRef.slice(colon + 1);
    // Only a fully numeric tail routes (see _resolveTicketId): a
    // workspaceKey:slug reference stays local.
    if (!/^\d+$/.test(tail)) return agent;
    return this._ownerAgent(agent, head);
  }

  /**
   * Resolve the writer session for a foreign ticket reference
   * `<sourceSessionId>:<ticketId>`. A live source session returns it;
   * a closed one resumes nothing here — routing only reaches live owners.
   */
  private _ownerSession(agent: Agent, sourceSessionId: string): Session {
    if (sourceSessionId === agent.session.id) return agent.session;
    for (const candidate of this.ctx.agents.list()) {
      if (candidate.session.id === sourceSessionId) return candidate.session;
    }
    throw new OwnerUnavailable(sourceSessionId);
  }

  /**
   * A synthetic agent handle that pins the OWNER session as the write
   * target. The writes below need only `agent.session` (and its header for
   * cwd assertions), which the owner session carries.
   */
  private _ownerAgent(agent: Agent, sourceSessionId: string): Agent {
    const owner = this._ownerSession(agent, sourceSessionId);
    return { ...agent, session: owner } as unknown as Agent;
  }

  /** Attach agent-authored evidence. The author is the agent, never the payload. */
  agentAttachEvidence(agent: Agent, args: AttachEvidenceArgs): EvidenceView {
    return this._attachEvidence(agent, args, "agent");
  }

  /**
   * The user-actor attach path, exported over the typert Remote surface.
   * The human-only kinds (`builtin:user_signoff` and `builtin:user_verified`)
   * accept rows here and nowhere else. No tool reaches this path.
   */
  // ---- the pending-approval store (#51, the #56 seam's first consumer) ----

  /** In-memory pending approvals keyed by request id. Restarts drop them. */
  private readonly _pendingApprovals = new Map<string, PendingApproval>();
  private _approvalSeq = 0;

  /**
   * The AGENT surface (#51): propose an allowlist for one ticket. Validates
   * immediately (every path inside the session workspace and existing; the
   * list deduped and non-empty — the refusal names each bad path), queues
   * the request for the board, and returns AT ONCE. No blocking: tool
   * timeouts make sync-wait unworkable, and the outcome reaches the agent
   * through the digest when the user resolves the card.
   */
  @Remote("requestAllowlist")
  requestAllowlist(agent: Agent, args: { ticketId: number; paths: string[] }): {
    ok: true;
    status: "pending";
    ticketId: number;
    requestId: string;
    proposed: string[];
    /** #104: the subset of `proposed` that does not exist on disk yet. */
    created: string[];
  } {
    const cwd = agent.session?.header?.cwd ?? "";
    if (cwd === "") {
      throw new Error("the session has no workspace cwd; cannot validate paths");
    }
    const result = validateAllowlistPaths(cwd, args.paths ?? []);
    if (!result.ok) {
      const detail = result.bad.map((b) => `${b.path} (${b.reason})`).join("; ");
      throw new Error(`allowlist proposal refused: ${detail}`);
    }
    // The ticket must exist — a request for an unknown id queues a card no
    // poll can ever show (finding 6).
    const snapshot = this._cache(agent.session).state.tickets.get(args.ticketId as TicketId);
    if (snapshot === undefined) {
      throw new Error(`unknown ticket ${args.ticketId}`);
    }
    // A per-session cap bounds a looping agent (finding 6).
    const sessionId = String(agent.session.id);
    const mine = [...this._pendingApprovals.values()].filter((row) => row.sessionId === sessionId);
    if (mine.length >= 5) {
      throw new Error("too many pending allowlist requests (5); resolve some on the board first");
    }
    this._approvalSeq += 1;
    const id = `req-${Date.now()}-${this._approvalSeq}`;
    const pending: PendingApproval = {
      id,
      sessionId,
      ticketId: args.ticketId,
      kind: "allowlist",
      prompt: `Approve write access for ticket #${args.ticketId}`,
      /*
       * #104: `created` names the proposed paths that do not exist yet, so
       * the card can say "will be created". Approving a path into existence
       * is a different decision from approving writes to something already
       * there, and the human should be able to see which one they are
       * making rather than discovering it afterwards.
       */
      payload: { paths: result.paths, created: result.created },
      at: this._now(),
    };
    this._pendingApprovals.set(id, pending);
    return {
      ok: true,
      status: "pending",
      ticketId: args.ticketId,
      requestId: id,
      proposed: result.paths,
      created: result.created,
    };
  }

  /**
   * The BOARD surface: the oldest pending approval for one ticket, or null.
   * Peek, not pop — resolution is explicit through resolveApproval, so a
   * card survives a re-render.
   */
  @Remote("pendingApproval")
  pendingApproval(agent: Agent, args: { ticketId: number | string }): PendingApproval | null {
    // Two scoping rules (#51 review): the SESSION (ids collide across
    // sessions once workspaceTickets merges boards), and the ticketId
    // COERCED to a number (the client's ticketIdKey is a string; strict ===
    // against the store's numbers silently nulled every poll).
    const sessionId = String(agent.session.id);
    const wanted = Number(args.ticketId);
    const rows = [...this._pendingApprovals.values()]
      .filter((row) => row.sessionId === sessionId && row.ticketId === wanted)
      .sort((a, b) => a.at - b.at);
    return rows[0] ?? null;
  }

  /**
   * EVERY pending approval for this session, oldest first (#93).
   *
   * `pendingApproval` above answers "is one waiting on THIS ticket?", which
   * only helps a human already looking at that ticket. Nothing could answer
   * "is anything waiting on me at all?", so a queued approval card was
   * invisible until you happened to open the right ticket — five of them
   * stacked up unseen in one session. The work queue needs this to surface
   * them, and the ticket strip needs it to mark the rows that carry one.
   */
  @Remote("pendingApprovals")
  // The parameter MUST be named `args` (#93): the typert descriptor reflects
  // on the parameter NAME, so `_args` -- the usual unused-parameter spelling --
  // declares a Remote that accepts nothing, and every client call is refused
  // with `unexpected "args"`. workspaceTickets above is the working precedent.
  pendingApprovals(agent: Agent, args?: Record<string, never>): PendingApproval[] {
    const sessionId = String(agent.session.id);
    return [...this._pendingApprovals.values()]
      .filter((row) => row.sessionId === sessionId)
      .sort((a, b) => a.at - b.at);
  }

  /**
   * The BOARD surface: resolve one pending approval. `approved` carries the
   * (possibly edited) paths; `rejected` resolves with no attach. Either way
   * the queue drops the request and the digest tells the agent the outcome.
   * Returns what the agent will be told.
   */
  @Remote("resolveApproval")
  resolveApproval(
    agent: Agent,
    args: { requestId: string; approved: boolean; paths?: string[] },
  ): { resolved: string } {
    const pending = this._pendingApprovals.get(args.requestId);
    if (pending === undefined) {
      throw new Error(`unknown approval request ${args.requestId}`);
    }
    // The resolver must be the requesting session (finding 2): ids collide
    // across sessions, and cross-session approval would attach evidence to
    // the wrong session's ticket.
    if (pending.sessionId !== String(agent.session.id)) {
      throw new Error(`approval request ${args.requestId} belongs to another session`);
    }
    this._pendingApprovals.delete(args.requestId);
    if (!args.approved) {
      this._queueInjection(
        agent.session,
        `Allowlist request for #${pending.ticketId} was rejected on the board — do not write; re-propose if still needed`,
      );
      return { resolved: "rejected" };
    }
    // The click is the user authorship: attach + field write here, so the
    // coverage gate sees a user-authored row and the union updates at once.
    // Re-validate the edited paths (finding 3): the card sends whatever is
    // in the textarea, so approve-time is when containment + existence are
    // re-checked — propose-time validation alone is not the gate.
    const rawPaths = args.paths ?? (pending.payload.paths as string[]);
    const cwd = agent.session?.header?.cwd ?? "";
    const revalidated = validateAllowlistPaths(cwd, rawPaths);
    if (!revalidated.ok) {
      const detail = revalidated.bad.map((b) => `${b.path} (${b.reason})`).join("; ");
      this._queueInjection(
        agent.session,
        `Allowlist approval for #${pending.ticketId} was refused: ${detail} — the agent should re-propose`,
      );
      return { resolved: `refused: ${detail}` };
    }
    const paths = revalidated.paths;
    this.userAttachEvidence(agent, {
      ticketId: pending.ticketId,
      kind: "builtin:file_allowlist",
      payload: { paths },
    });
    this.userSetTicket(agent, { ticketId: pending.ticketId, allowlist: paths });
    return { resolved: `approved: ${paths.join(", ")}` };
  }

  // ---- the action-nomination store (#93) --------------------------------

  /**
   * Session-scoped nominations, keyed by id. Decided with the user
   * 2026-09-03: NO kernel event and no durable field. A restart drops them
   * and the queue degrades to its DERIVED half, which is recomputed from
   * board state and needs no persistence — so the worst case is losing the
   * agent's commentary, never losing the ask itself.
   */
  private readonly _nominations = new Map<string, ActionNomination>();
  private _nominationSeq = 0;
  /**
   * Dismissals, keyed `sessionId|ticketId|actionId`, for the session's life
   * (#93 review, finding 3). Without this the agent could re-propose an ask
   * the human had just declined, and could not tell a dismissed item from an
   * unhandled one -- the steering injection alone was a one-shot signal.
   */
  private readonly _dismissed = new Set<string>();

  /**
   * The AGENT surface: nominate tickets for the human's attention, each with
   * a reason. This does NOT create work — a nomination only annotates an ask
   * the gate already allows, and the client drops any that names an
   * unavailable action. The agent cannot conjure a button.
   */
  @Remote("suggestActions")
  suggestActions(
    agent: Agent,
    args: { suggestions: { ticketId: number | string; actionId: string; reason: string }[] },
  ): {
    ok: true;
    accepted: number;
    nominations: ActionNomination[];
    /** Asks the human already dismissed this session; re-raised knowingly. */
    previouslyDismissed: string[];
  } {
    const sessionId = String(agent.session.id);
    const suggestions = args.suggestions ?? [];
    if (suggestions.length === 0) {
      throw new Error("no suggestions given");
    }
    /*
     * The cap counts only genuinely NEW (ticket, action) pairs (#93 third
     * review, finding 5). Counting every suggestion made a REPLACING
     * re-nomination look like a new one, so at the cap an agent could never
     * revise the reason on an ask it had already made -- it could only be
     * refused, forever.
     */
    const cap = 20;
    const mine = [...this._nominations.values()].filter((n) => n.sessionId === sessionId);
    const existingPairs = new Set(mine.map((n) => `${n.ticketId}|${n.actionId}`));
    const incomingNew = new Set(
      suggestions
        .map((sug) => `${Number(sug.ticketId)}|${sug.actionId}`)
        .filter((pair) => !existingPairs.has(pair)),
    );
    if (mine.length + incomingNew.size > cap) {
      throw new Error(
        `too many nominations (cap ${cap}); the human dismisses or acts on them to make room`,
      );
    }
    const state = this._cache(agent.session).state;

    /*
     * VALIDATE THE WHOLE BATCH FIRST, then commit (#93 review, finding 2).
     * The first cut validated and mutated in one pass, so a batch of
     * [valid, bad] reported a refusal to the agent while the valid entry had
     * ALREADY landed -- and worse, had already deleted the nomination it
     * replaced. A refused call must change nothing.
     */
    const validated: { ticketId: number; actionId: string; reason: string }[] = [];
    for (const suggestion of suggestions) {
      const ticketId = Number(suggestion.ticketId);
      if (!Number.isFinite(ticketId)) {
        throw new Error(`bad ticketId ${String(suggestion.ticketId)}`);
      }
      if (state.tickets.get(ticketId as TicketId) === undefined) {
        throw new Error(`unknown ticket ${ticketId}`);
      }
      if (!HUMAN_NOMINATION_ACTIONS.includes(suggestion.actionId)) {
        throw new Error(
          `action ${suggestion.actionId} is not one a human performs; expected one of ` +
            HUMAN_NOMINATION_ACTIONS.join(", "),
        );
      }
      const reason = (suggestion.reason ?? "").trim();
      if (reason === "") {
        throw new Error(`nomination for #${ticketId} has no reason`);
      }
      validated.push({ ticketId, actionId: suggestion.actionId, reason });
    }

    const accepted: ActionNomination[] = [];
    for (const entry of validated) {
      // One nomination per (ticket, action): re-nominating REPLACES the
      // reason rather than stacking a second identical row on the queue.
      for (const [id, existing] of this._nominations) {
        if (
          existing.sessionId === sessionId &&
          existing.ticketId === entry.ticketId &&
          existing.actionId === entry.actionId
        ) {
          this._nominations.delete(id);
        }
      }
      this._nominationSeq += 1;
      const nomination: ActionNomination = {
        id: `nom-${Date.now()}-${this._nominationSeq}`,
        sessionId,
        ticketId: entry.ticketId,
        actionId: entry.actionId,
        reason: entry.reason,
        at: this._now(),
      };
      this._nominations.set(nomination.id, nomination);
      accepted.push(nomination);
    }
    /*
     * ACCEPT-BUT-FLAG, not refuse (#93 re-review). A dismissal is remembered
     * for the session so the agent can tell a declined ask from an unhandled
     * one -- but refusing outright was wrong twice: one dismissed entry would
     * refuse the WHOLE batch, and a legitimately-changed situation could
     * never be re-raised for the session's life. The agent is told instead,
     * and decides whether it has new grounds.
     */
    const previouslyDismissed = accepted
      .filter((n) => this._dismissed.has(`${sessionId}|${n.ticketId}|${n.actionId}`))
      .map((n) => `#${n.ticketId} ${n.actionId}`);
    return {
      ok: true,
      accepted: accepted.length,
      nominations: accepted,
      previouslyDismissed,
    };
  }

  /** The BOARD surface: this session's nominations, oldest first. */
  @Remote("actionNominations")
  // Named `args`, not `_args`: see the note on pendingApprovals. This one
  // silently refused every client call, which is why agent nominations never
  // reached the queue.
  actionNominations(agent: Agent, args?: Record<string, never>): ActionNomination[] {
    const sessionId = String(agent.session.id);
    return [...this._nominations.values()]
      .filter((row) => row.sessionId === sessionId)
      .sort((a, b) => a.at - b.at);
  }

  /**
   * Drop a nomination without acting on it. The agent is told, so it stops
   * re-asking for something the human deliberately declined.
   */
  @Remote("dismissNomination")
  dismissNomination(agent: Agent, args: { nominationId: string }): { dismissed: string } {
    const nomination = this._nominations.get(args.nominationId);
    if (nomination === undefined) {
      throw new Error(`unknown nomination ${args.nominationId}`);
    }
    if (nomination.sessionId !== String(agent.session.id)) {
      throw new Error(`nomination ${args.nominationId} belongs to another session`);
    }
    this._nominations.delete(args.nominationId);
    this._dismissed.add(
      `${nomination.sessionId}|${nomination.ticketId}|${nomination.actionId}`,
    );
    this._queueInjection(
      agent.session,
      `The human dismissed your suggestion to ${nomination.actionId} #${nomination.ticketId} ` +
        `("${_mdInline(nomination.reason)}") — do not re-propose it without new grounds`,
    );
    return { dismissed: args.nominationId };
  }


  /**
   * The session's workspace root, for client surfaces that need to address
   * the workspace's .dsh directory directly (the #53 Verify modal addresses
   * the paste-to-path route, which resolves the workspace itself). Read-only
   * and harmless: the cwd is not a secret to the session's own client.
   */
  @Remote("workspaceRoot")
  workspaceRoot(agent: Agent): { workspace: string } {
    const cwd = agent.session?.header?.cwd ?? "";
    return { workspace: cwd };
  }

  @Remote("userAttachEvidence")
  userAttachEvidence(agent: Agent, args: AttachEvidenceArgs): EvidenceView {
    return this._attachEvidence(this._routedAgent(agent, args.ticketId), args, "user");
  }

  /**
   * The user-actor detach path, exported over the typert Remote surface.
   * Removes one evidence row the board shows: the row is identified by its
   * stamped `at` plus its kind. Any row is detachable here (an agent row the
   * user discards, or a mistaken user row); the agent has no detach path —
   * evidence is append-only for the agent, per SPEC-B1 section 5.
   */
  @Remote("userDetachEvidence")
  userDetachEvidence(agent: Agent, args: { ticketId: number | string; at: number; rowKind: string }): {
    ticketId: number;
    removed: number;
  } {
    return this._detachEvidence(this._routedAgent(agent, args.ticketId), args as { ticketId: number; at: number; rowKind: string });
  }

  /**
   * #69: link one existing evidence row to one criterion (or clear the link
   * with criterion=null). The user drives it from the criteria panel and the
   * mark-done modal; the agent has no link path — evidence payload edits stay
   * user-owned, per the same rule as detach.
   */
  @Remote("userLinkEvidence")
  userLinkEvidence(
    agent: Agent,
    args: { ticketId: number | string; at: number; rowKind: string; criterion: string | null },
  ): { ticketId: number; linked: boolean } {
    return this._linkEvidence(
      this._routedAgent(agent, args.ticketId),
      args as { ticketId: number; at: number; rowKind: string; criterion: string | null },
    );
  }

  /**
   * #78: the recent git history of the ticket's workspace, for the commit
   * picker. Read-only: one `git log` with a fixed format string, run with
   * execFile (no shell), bounded output, in the workspace root.
   */
  @Remote("userRecentCommits")
  userRecentCommits(agent: Agent, args: { ticketId: number | string }): Promise<{
    ticketId: number;
    commits: { hash: string; subject: string; author: string; date: string }[];
  }> {
    return this._recentCommits(this._routedAgent(agent, args.ticketId), args as { ticketId: number });
  }

  /**
   * #78: attach one git commit as evidence. The commit is resolved through
   * git show in the workspace root (never trusted from the client), and the
   * row carries hash, subject, author, branch, and the short date.
   */
  @Remote("userAttachCommitEvidence")
  userAttachCommitEvidence(
    agent: Agent,
    args: { ticketId: number | string; hash: string; note?: string },
  ): Promise<{ ticketId: number; payload: Record<string, unknown> }> {
    return this._attachCommitEvidence(
      this._routedAgent(agent, args.ticketId),
      args as { ticketId: number; hash: string; note?: string },
    );
  }

  /** Move one ticket as the agent. The gate enforces every transition. */
  agentMoveTicket(agent: Agent, args: MoveTicketArgs): {
    ticketId: number;
    fromState: TicketState;
    toState: TicketState;
  } {
    return this._moveTicket(agent, args, "agent");
  }

  /**
   * The user-actor move path, exported over the typert Remote surface. The
   * human-only gates (`awaiting_verification -> done`, and the send-back
   * edge) accept moves here and nowhere else. No tool reaches this path.
   */
  @Remote("userMoveTicket")
  userMoveTicket(agent: Agent, args: MoveTicketArgs): {
    ticketId: number;
    fromState: TicketState;
    toState: TicketState;
  } {
    return this._moveTicket(this._routedAgent(agent, args.ticketId), args, "user");
  }

  /** Append one agent-authored comment to one ticket. */
  agentAddComment(agent: Agent, args: AddCommentArgs): CommentRecord {
    return this._addComment(agent, args, "agent");
  }

  /** The user-actor comment path, exported over the typert Remote surface. */
  @Remote("userAddComment")
  userAddComment(agent: Agent, args: AddCommentArgs): CommentRecord {
    return this._addComment(this._routedAgent(agent, args.ticketId), args, "user");
  }

  /**
   * The agent-actor plan-meta path. Shares the whole-value merge with the
   * user path: present fields replace, absent fields keep. The board modal
   * reaches the user path; plan_import stays the whole-plan replace from a
   * parsed file.
   */
  agentSetPlanMeta(agent: Agent, args: PlanMetaSetArgs): PlanMetaView {
    return this._setPlanMeta(agent, args, "agent");
  }

  /**
   * The user-actor plan-meta path, exported over the typert Remote surface.
   * Every present field replaces the stored one and absent fields keep the
   * stored value, so the board edits one block at a time. The commit is one
   * whole-value plan/change event; the agent path is plan_import, which
   * replaces the whole plan from a parsed file.
   */
  @Remote("userSetPlanMeta")
  userSetPlanMeta(agent: Agent, args: PlanMetaSetArgs): PlanMetaView {
    return this._setPlanMeta(agent, args, "user");
  }

  /** Import one plan file into an empty project. */
  planImport(agent: Agent, args: PlanImportArgs): {
    tickets: number[];
  } {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = args.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }

    // The file read (through the workspace root), then parse first: a parse
    // error imports nothing.
    const text = this._readPlanFile(agent, args.file);
    const document = parsePlan(text);

    // An import loads a whole plan into an empty project; it never merges.
    if (this._ticketsFor(projectId, cache.state).length > 0) {
      throw new ProjectNotEmptyError(projectId);
    }

    // The plan meta stores verbatim; rules stay "".
    const planValue: PlanValue = {
      frontmatter: document.frontmatter,
      context: {
        preamble: document.preamble,
        contextSections: document.contextSections,
      },
      rules: "",
    };
    const lines = planContextLineCount(planValue);
    if (lines > PLAN_CONTEXT_LIMIT) {
      throw new ContextTooLongError(lines - PLAN_CONTEXT_LIMIT);
    }
    this._commit(agent, {
      kind: "plan/change",
      version: 1,
      projectId,
      plan: planValue,
      at: this._now(),
    });

    const ticketIds: TicketId[] = [];
    // #5/P11: importing never commits a phase/set event. Every ticket takes
    // the kernel's default phase, so an import leaves the store flat exactly
    // as a create would.
    for (const ticket of document.tickets) {
      // The body prose lands in the description, the body field stays empty.
      // Every ticket lands in open, order from the document.
      const ticketId = this._createTicketInternal(
        agent,
        projectId,
        ticket.title,
        ticket.body,
        {
          body: "",
          criteria: ticket.criteria,
          order: ticket.order,
          phase: 1,
        },
      );
      // One imported_state row per ticket, author system.
      this._attachEvidenceInternal(
        agent,
        ticketId,
        "builtin:imported_state",
        { claimed_state: ticket.claimedState, source: args.file },
        "system",
      );
      ticketIds.push(ticketId);
    }
    return { tickets: ticketIds };
  }

  /**
   * The shared plan-meta write path. The stored meta is the merge base, so a
   * block edit reaches the log as one whole-value plan/change event that
   * keeps every block the caller left out. The cap runs over the resulting
   * meta, not the diff.
   */
  private _setPlanMeta(agent: Agent, args: PlanMetaSetArgs, actor: Actor): PlanMetaView {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = args.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }

    // Whole-value merge: absent fields keep the stored value. The sections
    // are copied so the commit never aliases the caller's array.
    const stored = this._planMetaOf(projectId, cache.state);
    const planValue: PlanValue = {
      frontmatter: args.frontmatter ?? stored.frontmatter,
      context: {
        preamble: args.preamble ?? stored.preamble,
        contextSections: args.contextSections
          ? args.contextSections.map((section) => ({ ...section }))
          : stored.contextSections,
      },
      rules: "",
    };
    const lines = planContextLineCount(planValue);
    if (lines > PLAN_CONTEXT_LIMIT) {
      throw new ContextTooLongError(lines - PLAN_CONTEXT_LIMIT);
    }
    this._commit(agent, {
      kind: "plan/change",
      version: 1,
      projectId,
      plan: planValue,
      at: this._now(),
    });
    this.ctx.logger?.info?.(`aidos: plan meta set by ${actor} for project ${projectId} in session ${agent.session.id}`);
    /*
     * #106: the plan's frontmatter, preamble and context sections are the
     * project's standing instructions -- the agent reads them as direction.
     * A human rewriting them and the agent not noticing is among the worst
     * cases in this list, because the agent then works to a plan that no
     * longer says what it thinks it says. Names the blocks that changed, not
     * their text: the context cap alone is 2000 lines.
     */
    if (actor !== "agent") {
      const blocks = (["frontmatter", "preamble", "contextSections"] as const)
        .filter((field) => args[field] !== undefined);
      if (blocks.length > 0) {
        this._queueInjection(
          agent.session,
          `Plan edited by ${actor} for project ${projectId}: ${blocks.join(", ")}`,
        );
      }
    }
    return this._planMetaOf(projectId, cache.state);
  }

  // ---- internals: the session port ----

  /** The per-session fold cache, seeding once from the session log. */
  private _cache(session: Session): SessionCache {
    let cache = this._caches.get(session);
    if (cache) return cache;
    const state = createInitialState();
    for (const event of session.events) {
      foldSessionEvent(state, event);
    }
    cache = { state, observedSeq: session.events.length };
    this._caches.set(session, cache);
    return cache;
  }

  /** Fold the events appended since the last observation. */
  private _sync(session: Session, cache: SessionCache): void {
    const events = session.events;
    for (let index = cache.observedSeq; index < events.length; index += 1) {
      foldSessionEvent(cache.state, events[index]);
    }
    cache.observedSeq = events.length;
  }

  /**
   * The append path: validate the candidate against the folded state (the
   * invariant companion's check), append to the session log, then fold.
   * A violation throws InvariantError and the log does not change.
   */
  /**
   * The injection seam (#63): user/system board events queue one-line notes
   * per session; a debounce timer flushes them as ONE digest message into
   * the live agent's inbox via agent.inject (next-step, never wakes an
   * idle agent). Agent-actor events never queue: the agent knows its own
   * moves from its tool results. Any failure is logged and swallowed —
   * the commit that produced the event never fails.
   */
  private readonly _pendingInjections = new Map<string, string[]>();
  private readonly _injectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private _queueInjection(session: Session, line: string): void {
    if ((this._resolvedConfig.injectEnabled ?? true) !== true) return;
    const key = String(session.id);
    const entry = this._pendingInjections.get(key) ?? [];
    entry.push(line);
    this._pendingInjections.set(key, entry);
    const prior = this._injectTimers.get(key);
    if (prior !== undefined) clearTimeout(prior);
    const debounce = this._resolvedConfig.injectDebounceMs ?? 30000;
    if (debounce <= 0) {
      this._flushInjection(session);
      return;
    }
    this._injectTimers.set(
      key,
      setTimeout(() => {
        this._injectTimers.delete(key);
        this._flushInjection(session);
      }, debounce),
    );
  }

  private _flushInjection(session: Session): void {
    const key = String(session.id);
    const lines = this._pendingInjections.get(key) ?? [];
    this._pendingInjections.delete(key);
    if (lines.length === 0) return;
    try {
      const live = this.ctx.agents?.get?.(session.id);
      if (live === undefined) return;
      const text =
        lines.length === 1
          ? `aidos board update: ${lines[0]}`
          : /*
             * A BLANK LINE between the header and the list. A bullet list
             * may interrupt a paragraph in CommonMark, so this mostly
             * rendered -- but "mostly" depends on the renderer, and a lazy
             * continuation can fold the first item back into the paragraph.
             * One blank line makes it unambiguous everywhere.
             */
            `aidos board update (${lines.length} changes):\n\n- ${lines.join("\n- ")}`;
      const message = createUserMessage({
        content: [{ type: "text", text }],
        source: { kind: "plugin", plugin: "aidos", form: "notice", summary: "board update digest" },
      });
      // steer, not inject (#63 follow-up, user-reported): inject is QUIET
      // delivery — an idle agent leaves it pending until something else wakes
      // it, so board updates sat unread until the user happened to prompt.
      // steer starts a turn for an idle agent and rides the next step
      // boundary for a running one, which is what "tell the agent" means.
      live.steer(message);
    } catch (error) {
      this.ctx.logger?.warn?.(
        `aidos: injection flush failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private _commit(agent: Agent, event: AidosEvent): void {
    const session = agent.session;
    const cache = this._cache(session);
    this._sync(session, cache);
    validateAidosEvent(cache.state, event);
    // Hard-fail per grill (C3): if event types are not registered the
    // durable append would make the log unreadable on restart. Refuse
    // the append rather than write an unreadable event.
    if (!aidosSessionEventTypesRegistered()) {
      throw new InvariantError(
        "aidos event types are not registered with the host reader; refusing durable append (see src/host/session-events.ts)",
      );
    }
    // The plugin registers the aidos session event types with the host session
    // reader at startup (see ./session-events.ts, the llm-fallbacks issue #52
    // pattern), so a durable append here is always readable on a later load.
    // Mark aidos events ignorable so a reader that does not recognize the type
    // can skip them. Session.append cannot write the ignorable marker itself,
    // so we swap the GLOBAL Object.freeze for the duration of ONE session.append
    // call (restored in the finally below) and set ignorable on the envelope as
    // it is frozen. This stays as a deliberate safety net for readers that load
    // the persisted log WITHOUT the aidos plugin applied; the in-host reader
    // already accepts these types via the KNOWN_SESSION_EVENT_TYPES registration
    // in ./session-events.ts.

    const isAidosType = AIDOS_EVENT_TYPES.has(event.kind);
    if (isAidosType && !(session as unknown as { __aidosPatched?: boolean }).__aidosPatched) {
      const origAppend = session.append.bind(session);
      (session as unknown as { append: unknown; __aidosPatched: boolean }).append = ((type: string, data: unknown, ...opts: unknown[]) => {
        if (!AIDOS_EVENT_TYPES.has(type)) return (origAppend as (t:string,d:unknown,...o:unknown[])=>unknown)(type, data, ...opts);
        // Intercept deepFreeze by temporarily patching Object.freeze for this call only
        const origFreeze = Object.freeze;
        let injected = false;
        (Object as unknown as { freeze: (o: unknown)=>unknown }).freeze = ((obj: unknown) => {
          if (!injected && obj !== null && typeof obj === "object" && (obj as Record<string, unknown>).type !== undefined && AIDOS_EVENT_TYPES.has((obj as Record<string, unknown>).type as string)) {
            (obj as Record<string, unknown>).ignorable = true;
            injected = true;
          }
          return origFreeze(obj as object);
        }) as typeof Object.freeze;
        try {
          return (origAppend as (t:string,d:unknown,...o:unknown[])=>unknown)(type, data, ...opts);
        } finally {
          Object.freeze = origFreeze;
        }
      }) as typeof session.append;
      (session as unknown as { __aidosPatched: boolean }).__aidosPatched = true;
    }
    session.append(event.kind, event);
    this.ctx.logger?.info?.(`aidos: committed ${event.kind} for session ${session.id}`);
    this._sync(session, cache);
  }

  /** The clock, seconds as a float, floored per ticket at the last at. */
  private _now(): number {
    return this._config.now ? this._config.now() : Date.now() / 1000;
  }

  private _atFor(session: Session, ticketId: TicketId, floor?: number): number {
    const cache = this._cache(session);
    this._sync(session, cache);
    let at = this._now();
    const lastAt = cache.state.lastAt.get(ticketId);
    if (lastAt !== undefined && lastAt > at) {
      at = lastAt;
    }
    if (floor !== undefined && floor > at) {
      at = floor;
    }
    return at;
  }

  // ---- internals: the workspace project ----

  /**
   * The workspace binding: the session's workspace record (path and name),
   * falling back to the session header cwd and then a default.
   */
  private _workspaceOf(agent: Agent): { absPath: string; name: string } {
    const registry = this.ctx.workspaceRegistry;
    if (registry) {
      try {
        for (const workspace of registry.list()) {
          if (workspace.sessionIds.includes(agent.session.id)) {
            return { absPath: workspace.path, name: workspace.title };
          }
        }
      } catch (error) {
        this.ctx.logger?.warn?.(`aidos: workspaceRegistry unavailable in _workspaceOf: ${error instanceof Error ? error.message : String(error)}`);
        // The registry may be unavailable mid-bootstrap; fall through.
      }
    }
    const cwd = agent.session.header.cwd;
    if (cwd) {
      return {
        absPath: cwd,
        name: this._config.defaultProjectName ?? (basename(cwd) || cwd),
      };
    }
    return { absPath: ".", name: this._config.defaultProjectName ?? "aidos" };
  }

  /** The workspace path the session binds to. */
  private _workspacePath(agent: Agent): string {
    return this._workspaceOf(agent).absPath;
  }

  /**
   * Bootstrap one session's workspace project: create it once, keyed by the
   * workspace path. The project id is the session's first (1 on a fresh
   * session), mirroring the CLI's init.
   */
  private _ensureProject(agent: Agent): { projectId: ProjectId } {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const binding = this._workspaceOf(agent);
    for (const [projectId, project] of cache.state.projects) {
      if (project.absPath === binding.absPath) {
        return { projectId };
      }
}
    // Gate: only create a project in aidos-preset sessions.  Standard
    // sessions must never receive aidos events.
    const presets = this.ctx.get("agentPresets");
    if (presets && presets.composedPreset(agent.ctx) !== "aidos") {
      throw new Error("aidos: _ensureProject called in non-aidos session");
    }
    const projectId = this._nextProjectId(cache.state);
    this._commit(agent, {
      kind: "project/created",
      version: 1,
      projectId,
      absPath: binding.absPath,
      name: binding.name,
      at: this._now(),
    });
    this.ctx.logger?.info?.(`aidos: project ${projectId} created for session ${agent.session.id}`);
    return { projectId };
  }

  // ---- internals: ticket writes ----

  /**
   * Create one ticket in open, creating the phase when it is absent.
   *
   * #106: takes the ACTOR, which it previously discarded while its sibling
   * _editTicket carried one. Without it there was no way to tell a ticket
   * the human filed from one the agent filed, so neither could be reported.
   */
  private _createTicket(agent: Agent, args: SetTicketArgs, actor: Actor): TicketRow {
    const title = args.title;
    if (typeof title !== "string" || title.trim() === "") {
      throw new BadPayloadError("set_ticket requires a title to create a ticket");
    }
    if (args.allowlist !== undefined) {
      // A new ticket has no ticket id yet, so no approved builtin:file_allowlist
      // evidence row can exist to cover it. Refuse rather than silently drop the
      // field: the caller must create the ticket first, then set the allowlist
      // once a covering row exists.
      throw new BadPayloadError(
        "a new ticket cannot carry an allowlist; create it, then set the allowlist once an approved builtin:file_allowlist evidence row exists",
      );
    }

    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = args.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const phase = args.phase ?? 1;
    const phases = cache.state.phases.get(projectId);
    if (!phases || !phases.has(phase)) {
      this._commit(agent, {
        kind: "phase/set",
        version: 1,
        projectId,
        number: phase,
        title: args.phaseTitle ?? DEFAULT_PHASE_TITLE,
        state: "open",
        at: this._now(),
      });
    }
    const ticketId = this._createTicketInternal(agent, projectId, title, args.description ?? "", {
      body: args.body,
      criteria: args.criteria,
      phase,
      order: args.order,
      slug: args.slug,
      dependsOn: args.dependsOn === undefined ? undefined : [...args.dependsOn],
    });
    const snapshot = this._cache(agent.session).state.tickets.get(ticketId);
    if (!snapshot) {
      throw new Error("a created ticket is missing from the folded state");
    }
    // #106: every user action reaches the agent. A ticket the human files is
    // work the agent may be expected to pick up; hearing about it only on the
    // next board read is exactly the prose-hunting this digest removes.
    if (actor !== "agent") {
      this._queueInjection(
        agent.session,
        `Ticket #${ticketId} (${_mdInline(snapshot.title)}) CREATED by ${actor}`,
      );
    }
    return rowOf(snapshot);
  }

  /**
   * Edit the named fields of one ticket; an absent field leaves its value.
   * The allowlist field is user-only: an agent actor that names it is
   * refused, and a user actor must first attach a covering
   * `builtin:file_allowlist` evidence row for every proposed path.
   */
  private _editTicket(agent: Agent, args: SetTicketArgs, actor: Actor): TicketRow {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ticketId = this._resolveTicketId(agent, args.ticketId as number | string);
    const prev = cache.state.tickets.get(ticketId);
    if (!prev) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, prev);
    const nextSlug = args.slug?.trim() ?? prev.slug;
    if (nextSlug !== prev.slug && this._slugTaken(cache.state, prev.workspaceKey, nextSlug, ticketId)) {
      throw new DuplicateSlug(nextSlug, prev.workspaceKey);
    }
    const at = this._atFor(agent.session, ticketId, prev.updatedAt);
    let allowlist: string[] | undefined;
    if (args.allowlist !== undefined) {
      if (actor !== "user") {
        throw new AllowlistActorRefused(actor);
      }
      const uncovered = this._uncoveredAllowlistPaths(cache.state.evidence, ticketId, args.allowlist);
      if (uncovered.length > 0) {
        throw new AllowlistCoverageRefused(ticketId, uncovered);
      }
      // Every requested path is covered; dedupe, keep the requested order.
      allowlist = [...new Set(args.allowlist)];
    }
    const snapshot: TicketSnapshot = {
      ...prev,
      title: args.title ?? prev.title,
      description: args.description ?? prev.description,
      body: args.body ?? prev.body,
      criteria: args.criteria ?? prev.criteria,
      phase: args.phase ?? prev.phase,
      order: args.order ?? prev.order,
      slug: nextSlug,
      ...(args.dependsOn !== undefined ? { dependsOn: [...args.dependsOn] } : {}),
      ...(allowlist !== undefined ? { allowlist } : {}),
      revision: prev.revision + 1,
      updatedAt: at,
    };
    this._commit(agent, {
      kind: "ticket/change",
      version: 1,
      operation: "set",
      ticket: snapshot,
      at,
    });
    /*
     * #106 audit: the allowlist branch below was the ONLY edit reported.
     * A human rewriting a ticket's CRITERIA -- the very thing the agent is
     * judged against -- changed nothing the agent could see. Same for the
     * description, the title and the dependencies. Report which fields
     * moved, not their full text: descriptions here run to kilobytes, and
     * #92 exists because flooding the agent's context is a real cost.
     */
    if (actor !== "agent") {
      const changed = (["title", "description", "criteria", "body", "dependsOn"] as const)
        .filter((field) => args[field] !== undefined);
      if (changed.length > 0) {
        this._queueInjection(
          agent.session,
          `Ticket #${ticketId} (${_mdInline(snapshot.title)}) edited by ${actor}: ${changed.join(", ")}`,
        );
      }
    }
    if (actor !== "agent" && allowlist !== undefined) {
      this._queueInjection(
        agent.session,
        `Allowlist updated for #${ticketId} (${_mdInline(snapshot.title)}): ${allowlist.length} path(s)`,
      );
    }
    return rowOf(snapshot);
  }

  /**
   * One evidence attach with the actor pinned at the entry point. The kind
   * definition's allowedAuthors list decides, so one check accepts a user
   * row for a human-only kind here and refuses an agent row.
   */
  private _attachEvidence(agent: Agent, args: AttachEvidenceArgs, actor: Actor): EvidenceView {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    // The kind comes first, like the CLI: a human-only kind refuses before
    // the payload is looked at, and an unregistered kind refuses after.
    const def = this._resolveKind(args.kind);
    if (!def) {
      throw new UnknownKind(args.kind);
    }
    if (!def.allowedAuthors.includes(actor)) {
      throw new EvidenceAuthorRefused(args.kind, actor);
    }
    const payload = args.payload ?? {};
    if (!isPlainRecord(payload)) {
      throw new BadPayloadError("the payload must be a JSON object");
    }
    const attached = this._attachEvidenceInternal(agent, ticketId, def.id, payload, actor);
    return { ticketId, kind: args.kind, payload: attached };
  }

  /**
   * One user-actor evidence removal. The row is named by `at` + kind, both
   * validated against the live row list; the event rides the same
   * _commit path as attach so the fold and the projections stay in sync.
   */
  private _detachEvidence(
    agent: Agent,
    args: { ticketId: number; at: number; rowKind: string },
  ): { ticketId: number; removed: number } {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    const rows = cache.state.evidence.get(ticketId) ?? [];
    const index = rows.findIndex(
      (row) => row.at === args.at && row.kind === args.rowKind,
    );
    if (index < 0) {
      throw new BadPayloadError("no evidence row matches the given at/kind");
    }
    this._commit(agent, {
      kind: "evidence/detached",
      version: 1,
      ticketId,
      at: args.at,
      rowKind: args.rowKind,
    });
    /*
     * #106 audit: a DETACH changes the gate. Evidence the agent may have
     * relied on -- a review pass, a signoff -- can disappear and the agent
     * would carry on believing the ticket was unblocked. Removal is at least
     * as consequential as attachment, and only attachment was reported.
     */
    /*
     * No actor guard, unlike the sibling reports: detach has NO agent path
     * at all -- it is reachable only through the userDetachEvidence Remote,
     * because evidence is append-only for the agent (SPEC-B1 section 5). So
     * the actor is always the human, and inventing a parameter to check it
     * would only imply a path that does not exist.
     */
    const title = cache.state.tickets.get(ticketId)?.title ?? `#${ticketId}`;
    this._queueInjection(
      agent.session,
      `Ticket #${ticketId} (${_mdInline(title)}) evidence DETACHED by user: ${args.rowKind}`,
    );
    return { ticketId, removed: 1 };
  }

  /**
   * #78: run one read-only git command in the workspace root. execFile (no
   * shell), a bounded timeout, and a fixed argument list — the hash a caller
   * passes never reaches a shell and never splits into new arguments.
   */
  private _gitInWorkspace(
    agent: Agent,
    args: string[],
  ): Promise<string> {
    const workspace = this._workspacePath(agent);
    return new Promise((resolvePromise, rejectPromise) => {
      execFile(
        "git",
        args,
        { cwd: workspace, timeout: 5000 },
        (error, stdout) => {
          if (error) {
            rejectPromise(new BadPayloadError("git " + args[0] + " failed: " + String(error.message).split("\n")[0]));
            return;
          }
          resolvePromise(stdout);
        },
      );
    });
  }

  /** A hash-like token: hex, 7..64 chars. Anything else is refused. */
  private _isHashLike(token: string): boolean {
    return /^[0-9a-f]{7,64}$/i.test(token);
  }

  /** #78: the workspace's recent commits, newest first. */
  private async _recentCommits(
    agent: Agent,
    args: { ticketId: number },
  ): Promise<{
    ticketId: number;
    commits: { hash: string; subject: string; author: string; date: string }[];
  }> {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    const out = await this._gitInWorkspace(agent, [
      "log",
      "--max-count=20",
      "--date=format:%Y-%m-%d %H:%M",
      "--pretty=%H%x1f%h%x1f%s%x1f%an%x1f%ad",
    ]);
    const commits = out
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split("\u001f"))
      .filter((fields) => fields.length === 5)
      .map((fields) => ({
        hash: fields[1]!,
        subject: fields[2]!,
        author: fields[3]!,
        date: fields[4]!,
      }));
    return { ticketId, commits };
  }

  /** #78: attach one commit as evidence, resolved in the workspace. */
  private async _attachCommitEvidence(
    agent: Agent,
    args: { ticketId: number; hash: string; note?: string },
  ): Promise<{ ticketId: number; payload: Record<string, unknown> }> {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    const hash = args.hash.trim();
    if (!this._isHashLike(hash)) {
      throw new BadPayloadError("commit hash must be a 7-64 character hex string");
    }
    const raw = await this._gitInWorkspace(agent, [
      "show",
      "--no-patch",
      "--date=format:%Y-%m-%d %H:%M",
      "--pretty=%H%x1f%s%x1f%an%x1f%ad%x1f%D",
      hash,
    ]);
    const fields = raw.split("\n")[0]!.trim().split("\u001f");
    if (fields.length < 4) {
      throw new BadPayloadError("git show returned an unexpected format for " + hash.slice(0, 12));
    }
    const [fullHash, subject, author, date] = fields as [string, string, string, string];
    const decorations = fields[4] ?? "";
    const branch = decorations.replace(/^HEAD -> /, "").split(", ")[0] ?? "";
    const payload: Record<string, unknown> = {
      commit: fullHash,
      hash: fields[1] ?? fullHash.slice(0, 12),
      subject,
      author,
      branch: branch === "" ? undefined : branch,
      date,
      ...(args.note !== undefined && args.note.trim() !== "" ? { note: args.note.trim() } : {}),
    };
    if (payload.branch === undefined) delete payload.branch;
    const attached = this._attachEvidenceInternal(agent, ticketId, "builtin:user_commit", payload, "user");
    return { ticketId, payload: attached };
  }

  /**
   * #69: link (criterion) or unlink (criterion=null) one existing evidence
   * row by appending one evidence/linked event. The criterion is validated
   * against the ticket's criteria; the row must be live on the ticket.
   */
  private _linkEvidence(
    agent: Agent,
    args: { ticketId: number; at: number; rowKind: string; criterion: string | null },
  ): { ticketId: number; linked: boolean } {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    const rows = cache.state.evidence.get(ticketId) ?? [];
    const row = rows.find((candidate) => candidate.at === args.at && candidate.kind === args.rowKind);
    if (!row) {
      throw new BadPayloadError("no evidence row matches the given at/kind");
    }
    const criterion = args.criterion === null ? null : args.criterion.trim();
    if (criterion === null) {
      this._commit(agent, {
        kind: "evidence/linked",
        version: 1,
        ticketId,
        at: args.at,
        rowKind: args.rowKind,
        criterion: "",
      });
      return { ticketId, linked: false };
    }
    if (criterion === "") {
      throw new BadPayloadError("the criterion must be a non-empty line of the ticket's criteria, or null to unlink");
    }
    const valid = snapshot.criteria
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (!valid.includes(criterion)) {
      throw new BadPayloadError("evidence criterion " + JSON.stringify(criterion) + " is not one of the ticket's criteria");
    }
    this._commit(agent, {
      kind: "evidence/linked",
      version: 1,
      ticketId,
      at: args.at,
      rowKind: args.rowKind,
      criterion,
    });
    /*
     * #106: user-only, like detach -- reachable only through the
     * userLinkEvidence Remote, so no actor guard is needed or honest here.
     * Linking evidence to a criterion is how the human says WHICH promise a
     * row keeps, and the agent is judged against exactly those criteria.
     */
    {
      const title = cache.state.tickets.get(ticketId)?.title ?? `#${ticketId}`;
      const what = args.criterion === null ? "unlinked from its criterion" : `linked to a criterion`;
      this._queueInjection(
        agent.session,
        `Ticket #${ticketId} (${_mdInline(title)}) evidence ${args.rowKind} ${what} by user`,
      );
    }
    return { ticketId, linked: true };
  }

  /**
   * One gate-checked move with the actor pinned at the entry point. The
   * gate's allowedActors list decides, so a human-only edge accepts a user
   * move here and refuses an agent move on the same check.
   */
  private _moveTicket(agent: Agent, args: MoveTicketArgs, actor: Actor): {
    ticketId: number;
    fromState: TicketState;
    toState: TicketState;
  } {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const toState = args.to;
    const ticket = cache.state.tickets.get(ticketId);
    if (!ticket) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, ticket);
    const fromState = ticket.state;

    // 1. The pair must be legal. An illegal pair is a refusal like any
    //    other: it appends one aidos/refusal record and changes no state.
    if (!isLegalTransition(fromState, toState)) {
      this._appendRefusal(agent, ticketId, fromState, toState, actor, "no gate configured for this transition");
      throw new GateRefused({ noGate: true, fromState, toState, actor });
    }

    // 2. The gate. A refusal appends one aidos/refusal record, then throws.
    const evidence = cache.state.evidence.get(ticketId) ?? [];
    try {
      checkGate(this._resolvedConfig, ticket, evidence, toState, actor);
    } catch (error) {
      if (error instanceof GateRefused) {
        this._appendRefusal(agent, ticketId, fromState, toState, actor, refusalReason(error.missingKinds, error.allowedActors));
        throw error;
      }
      throw error;
    }
    this.ctx.logger?.info?.(`aidos: gate passed for ticket ${ticketId} -> ${toState}`);

    // 3. The move itself. One whole-value ticket/change record.
    const at = this._atFor(agent.session, ticketId, ticket.updatedAt);
    const snapshot: TicketSnapshot = {
      ...ticket,
      state: toState,
      revision: ticket.revision + 1,
      updatedAt: at,
    };
    this._commit(agent, {
      kind: "ticket/change",
      version: 1,
      operation: "move",
      ticket: snapshot,
      at,
    });
    if (actor !== "agent") {
      this._queueInjection(
        agent.session,
        `Ticket #${ticketId} (${_mdInline(ticket.title)}) moved ${fromState} -> ${toState} by ${actor}`,
      );
    }
    return { ticketId, fromState, toState };
  }

  /**
   * One comment appended to one ticket, with the actor pinned at the entry
   * point. Mirrors Store.addComment's event shape; the fold and the
   * aidos.comments projection own the read side.
   */
  private _addComment(agent: Agent, args: AddCommentArgs, actor: Actor): CommentRecord {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    const at = this._atFor(agent.session, ticketId);
    this._commit(agent, {
      kind: "comment/added",
      version: 1,
      ticketId,
      text: args.text,
      author: actor,
      at,
    });
    /*
     * #106: tell the agent. This was the ONLY user-actor write in the
     * service that queued no digest line -- evidence attach, moves and
     * allowlist updates all do. So a human could type a remark on a ticket,
     * see it stored and rendered, and the agent would never hear it. The
     * worst shape of failure this project keeps hitting: the surface looks
     * like it worked.
     *
     * Guarded on the actor exactly as _attachEvidence is: the agent must
     * never be fed its own writes, which is a feedback loop, and #63's whole
     * design is that the injection carries what the HUMAN did.
     *
     * The TEXT rides along, not a bare "a comment was added" -- the content
     * is the entire value, and a bare notification would send the agent off
     * to read the ticket, which is the prose-hunting problem #93 exists to
     * remove.
     */
    if (actor !== "agent") {
      this._queueInjection(
        agent.session,
        `Ticket #${ticketId} (${_mdInline(snapshot.title)}) comment by ${actor}: "${_mdInline(_ellipsize(args.text.trim()))}"`,
      );
    }
    return { ticketId, text: args.text, author: actor, at };
  }

  /**
   * The proposed allowlist paths that no approved `builtin:file_allowlist`
   * evidence row on this ticket covers, in order. Each coverage row carries
   * the approved paths under its payload `paths` key (the attach_evidence
   * caller sends `{ paths: string[] }`; no stricter schema is forced beyond
   * `additionalProperties: true`). The kind authors the row, so the coverage
   * check reads existence only and does not re-check the row's author at
   * read time.
   */
  private _uncoveredAllowlistPaths(
    evidence: ReadonlyMap<TicketId, EvidenceRow[]> | undefined,
    ticketId: TicketId,
    proposed: readonly string[],
  ): string[] {
    const approved = new Set<string>();
    for (const row of evidence?.get(ticketId) ?? []) {
      if (row.kind !== "builtin:file_allowlist") continue;
      const paths = row.payload?.paths;
      if (Array.isArray(paths)) {
        for (const path of paths) {
          if (typeof path === "string") approved.add(path);
        }
      }
    }
    return [...new Set(proposed)].filter((path) => !approved.has(path));
  }

  /** The shared create: one whole-value ticket/change create record. */
  private _createTicketInternal(
    agent: Agent,
    projectId: ProjectId,
    title: string,
    description: string,
    opts?: { body?: string; criteria?: string; phase?: number; order?: number; slug?: string; dependsOn?: string[] },
  ): TicketId {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ticketId = this._nextTicketId(cache.state);
    const project = cache.state.projects.get(projectId);
    const workspaceKey = workspaceKeyFromPath(project?.absPath ?? this._workspacePath(agent));
    const slug = opts?.slug?.trim() || slugFromTitle(title) || `ticket-${ticketId}`;
    if (this._slugTaken(cache.state, workspaceKey, slug, null)) {
      throw new DuplicateSlug(slug, workspaceKey);
    }
    const phase = opts?.phase ?? 1;
    const order = opts?.order ?? this._nextOrder(cache.state, projectId, phase);
    const at = this._now();
    const snapshot: TicketSnapshot = {
      id: ticketId,
      projectId,
      title,
      description,
      body: opts?.body ?? "",
      criteria: opts?.criteria ?? "",
      phase,
      order,
      state: "open",
      allowlist: [],
      dependsOn: [...(opts?.dependsOn ?? [])],
      slug,
      workspaceKey,
      revision: 1,
      createdAt: at,
      updatedAt: at,
    };
    this._commit(agent, {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      ticket: snapshot,
      at,
    });
    return ticketId;
  }

  /** Attach one evidence row with a stamped actor. Returns the row payload. */
  private _attachEvidenceInternal(
    agent: Agent,
    ticketId: TicketId,
    kind: string,
    payload: Record<string, unknown>,
    actor: Actor,
  ): Record<string, unknown> {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const def = this._resolvedConfig.kinds.find((candidate) => candidate.id === kind);
    if (!def) {
      throw new UnknownKind(kind);
    }
    if (!def.allowedAuthors.includes(actor)) {
      throw new EvidenceAuthorRefused(kind, actor);
    }
    const snapshot = cache.state.tickets.get(ticketId);
    if (snapshot !== undefined && payload.criteria !== undefined) {
      const criteria = payload.criteria;
      if (typeof criteria !== "string") {
        throw new BadPayloadError("the payload.criteria must be a string");
      }
      const lines = criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      const valid = snapshot.criteria
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      for (const line of lines) {
        if (!valid.includes(line)) {
          throw new BadPayloadError("evidence criterion " + JSON.stringify(line) + " is not one of the ticket's criteria");
        }
      }
    }
    const row: EvidenceRow = {
      kind,
      author: actor,
      at: this._atFor(agent.session, ticketId),
      payload: deepClone(payload),
    };
    this._commit(agent, {
      kind: "evidence/attached",
      version: 1,
      ticketId,
      row,
    });
    if (actor !== "agent") {
      const title = cache.state.tickets.get(ticketId)?.title ?? `#${ticketId}`;
      this._queueInjection(
        agent.session,
        `Ticket #${ticketId} (${_mdInline(title)}) evidence attached: ${kind} by ${actor}` + _evidenceDigestSuffix(kind, payload),
      );
    }
    return row.payload;
  }

  /** One log-only refusal record, appended before the GateRefused throw. */
  private _appendRefusal(
    agent: Agent,
    ticketId: TicketId,
    fromState: TicketState,
    toState: TicketState,
    actor: Actor,
    reason: string,
  ): void {
    this._commit(agent, {
      kind: "aidos/refusal",
      version: 1,
      ticketId,
      fromState,
      toState,
      actor,
      reason,
      at: this._now(),
    });
  }

  /**
   * Resolve one tool kind name to its registered kind. The agent-allowed
   * kinds are offered by their short names (automated_check and friends);
   * they resolve to the registered builtin: ids so the gate's required kinds
   * match. A full id resolves exactly.
   */
  private _resolveKind(kind: string): KindDef | undefined {
    const direct = this._resolvedConfig.kinds.find((candidate) => candidate.id === kind);
    if (direct) return direct;
    if (!kind.startsWith("builtin:") && !kind.startsWith("plugin:")) {
      // Deprecated short-name alias (e.g. automated_check). Tool layer should send builtin: prefix.
      const resolved = this._resolvedConfig.kinds.find((candidate) => candidate.id === `builtin:${kind}`);
      if (resolved) this.ctx.logger?.warn?.(`aidos: short evidence kind "${kind}" resolved to "${resolved.id}" — send the full id`);
      return resolved;
    }
    return undefined;
  }

  // ---- internals: reads over the folded state ----

  private _ticketsFor(projectId: ProjectId, state: AidosState): TicketRow[] {
    const rows: TicketRow[] = [];
    for (const snapshot of state.tickets.values()) {
      if (snapshot.projectId === projectId) {
        rows.push(rowOf(snapshot));
      }
    }
    rows.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    return rows;
  }

  private _planMetaOf(
    projectId: ProjectId,
    state: AidosState,
  ): { frontmatter: string; preamble: string; contextSections: ContextSection[] } {
    const plan = state.plans.get(projectId);
    if (!plan) {
      return { frontmatter: "", preamble: "", contextSections: [] };
    }
    return {
      frontmatter: plan.frontmatter,
      preamble: plan.context.preamble,
      contextSections: plan.context.contextSections.map((section) => ({ ...section })),
    };
  }

  private _nextProjectId(state: AidosState): ProjectId {
    let max = 0;
    for (const id of state.projects.keys()) {
      if (id > max) max = id;
    }
    return max + 1;
  }

  private _nextTicketId(state: AidosState): TicketId {
    return state.nextTicketId;
  }

  /** Whether one workspace already holds the given slug on another ticket. */
  private _slugTaken(
    state: AidosState,
    workspaceKey: string,
    slug: string,
    excludeId: TicketId | null,
  ): boolean {
    for (const snapshot of state.tickets.values()) {
      if (
        snapshot.workspaceKey === workspaceKey &&
        snapshot.slug === slug &&
        snapshot.id !== excludeId
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolve a ticket reference (a numeric id or a slug) to a numeric id.
   * A bare number, a bare decimal string, or a bare slug means the current
   * workspace; a prefixed `<workspaceKey>:<slug>` reference resolves across
   * workspaces.
   */
  private _resolveTicketId(agent: Agent, ref: number | string): TicketId {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    if (typeof ref === "number") {
      if (cache.state.tickets.has(ref)) {
        return ref;
      }
      throw new UnknownTicket(ref);
    }

    // The board names an own row by `String(id)`, so a bare decimal string
    // is an id and not a slug. A slug is title-derived and never a bare
    // number, so no slug hides behind this branch.
    if (/^\d+$/.test(ref)) {
      const numeric = Number(ref);
      if (cache.state.tickets.has(numeric)) {
        return numeric;
      }
      throw new UnknownTicket(ref);
    }

    const current = workspaceKeyFromPath(this._workspacePath(agent));
    const colon = ref.indexOf(":");
    if (colon >= 0) {
      const head = ref.slice(0, colon);
      const tail = ref.slice(colon + 1);
      // A session-id-headed reference names a foreign row
      // (<sourceSessionId>:<ticketId> as the workspaceTickets merge keys
      // them): resolve it in the OWNER session's log, whose tickets the
      // caller's own log never holds. Only a fully numeric tail routes —
      // a workspaceKey:slug reference always carries a slug tail, and
      // slugs are title-derived (never bare numbers).
      if (/^\d+$/.test(tail)) {
        const ownerCache = this._cache(this._ownerSession(agent, head));
        this._sync(this._ownerSession(agent, head), ownerCache);
        const numeric = Number(tail);
        if (Number.isInteger(numeric) && ownerCache.state.tickets.has(numeric)) {
          return numeric;
        }
        throw new UnknownTicket(ref);
      }
      const slug = tail;
      for (const snapshot of cache.state.tickets.values()) {
        if (snapshot.workspaceKey === head && snapshot.slug === slug) {
          return snapshot.id;
        }
      }
      throw new UnknownTicket(`${head}:${slug}`);
    }
    for (const snapshot of cache.state.tickets.values()) {
      if (snapshot.workspaceKey === current && snapshot.slug === ref) {
        return snapshot.id;
      }
    }
    throw new UnknownTicket(ref);
  }

  /** Refuse a write against a ticket whose workspace is not the current one. */
  private _assertLocalWorkspace(agent: Agent, snapshot: TicketSnapshot): void {
    const current = workspaceKeyFromPath(this._workspacePath(agent));
    if (snapshot.workspaceKey !== current) {
      throw new ForeignWorkspace(snapshot.workspaceKey, current);
    }
  }

  /** The next free order in one phase, counted from 1. */
  private _nextOrder(state: AidosState, projectId: ProjectId, phase: number): number {
    let max = 0;
    for (const snapshot of state.tickets.values()) {
      if (
        snapshot.projectId === projectId &&
        snapshot.phase === phase &&
        snapshot.order > max
      ) {
        max = snapshot.order;
      }
    }
    return max + 1;
  }

  /**
   * Read one plan file, resolved under the session's workspace root.
   * Absolute paths are taken verbatim (tool contract: "relative to the
   * workspace or absolute") — only relative paths are confined to the
   * workspace so `../` cannot escape. See the `plan_import` file param.
   */
  private _readPlanFile(agent: Agent, file: string): string {
    let target: string;
    if (isAbsolute(file)) {
      target = file;
    } else {
      const workspace = this._workspacePath(agent);
      target = resolve(workspace, file);
      const rel = relative(workspace, target);
      const normRel = rel.replace(/\\/g, "/");
      if (rel !== "" && (normRel.startsWith("../") || normRel === ".." || isAbsolute(rel))) {
        throw new FileNotReadError(file, `cannot read the plan file ${file}: it escapes the workspace root`);
      }
    }
    try {
      return readFileSync(target, "utf8");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new FileNotReadError(file, `cannot read the plan file ${file}: ${detail}`);
    }
  }

  // ---- internals: the projection registrations ----

  private _registerProjections(projectionCtx: Context): void {
    projectionCtx.sessionProjections.register({
      key: "aidos.tickets",
      schema: TICKETS_PROJECTION_ZOD,
      init: (): TicketsProjectionState => ({ tickets: {}, evidence: {} }),
      apply: applyTicketsProjection,
      view: (state) => this._ticketsView(state),
      stateVersion: 1,
    });
    projectionCtx.sessionProjections.register({
      key: "aidos.evidence",
      schema: EVIDENCE_PROJECTION_ZOD,
      init: () => ({}),
      apply: applyEvidenceProjection,
      view: (state) => state,
      stateVersion: 1,
    });
    projectionCtx.sessionProjections.register({
      key: "aidos.plan",
      schema: PLAN_PROJECTION_ZOD,
      init: () => ({}),
      apply: applyPlanProjection,
      view: (state) => state,
      stateVersion: 1,
    });
    projectionCtx.sessionProjections.register({
      key: "aidos.comments",
      schema: COMMENTS_PROJECTION_ZOD,
      init: () => ({}),
      apply: applyCommentsProjection,
      view: (state) => state,
      stateVersion: 1,
    });
  }

  /** The board view of the tickets unit, config applied at view time. */
  private _ticketsView(state: TicketsProjectionState): Record<string, TicketView> {
    const config = this._resolvedConfig;
    const out: Record<string, TicketView> = {};
    for (const [id, snapshot] of Object.entries(state.tickets)) {
      const evidence = state.evidence[id] ?? [];
      const progress = gateProgressOf(config, snapshot, evidence);
      out[id] = {
        id: snapshot.id,
        projectId: snapshot.projectId,
        title: snapshot.title,
        description: snapshot.description,
        body: snapshot.body,
        criteria: snapshot.criteria,
        phase: snapshot.phase,
        order: snapshot.order,
        state: snapshot.state,
        dependsOn: [...(snapshot.dependsOn ?? [])],
        allowlist: [...snapshot.allowlist],
        confidenceScore: confidenceScoreOf(config, evidence),
        gateFraction: progress.fraction,
        gatePresent: progress.present,
        gateTotal: progress.total,
        updatedAt: snapshot.updatedAt,
        workspaceKey: snapshot.workspaceKey,
        slug: snapshot.slug,
      };
    }
    return out;
  }
}

/**
 * Mount the service on a context. Returns the disposer.
 *
 * The service is constructed directly (the Service constructor registers
 * `ctx.aidos` synchronously), so the harness reads the service without
 * awaiting a plugin load; the constructor's own registrations ride the
 * calling fiber and unload with it. The disposer lifts the service off the
 * context for callers that want an explicit handle.
 */
export function registerAidosService(ctx: Context, config?: AidosCoreConfig): () => void {
  const service = new AidosService(ctx, config);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    try {
      ctx.reflect.set("aidos", undefined);
    } catch (error) {
      ctx.logger?.warn?.(`aidos: could not lift the aidos service off the context: ${error instanceof Error ? error.message : String(error)}`);
      // The owning fiber may already be unloading; the registration dies
      // with it, so there is nothing left to lift.
    }
    void service;
  };
}
