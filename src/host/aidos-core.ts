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
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { execFile } from "node:child_process";
import {
  WORKTREE_PREPARE_CONFIG,
  type WorktreePrepareSpec,
  discoverNodeModulesDirs,
  nodeModulesLinkPlan,
  parseWorktreePrepareConfig,
  worktreePrepareConfigPath,
  stalenessVerdict,
  worktreeAddArgs,
  worktreePathFor,
  worktreeRefreshArgs,
  worktreeRemoveArgs,
} from "../kernel/worktree";

/** #101: a worktree checkout is not a 5-second operation on a big repo. */
const WORKTREE_TIMEOUT_MS = 120000;

/**
 * How long a closed session's fold stays cached in the workspace merge
 * (user-reported 2026-09-10: the merge re-inspected 225 logs per call and
 * tool-card actions timed out). A closed log cannot grow while its session
 * stays dead, so the cache is exact in-process; the TTL only bounds the
 * cross-process edge of another dsh writing to a session this one sees as
 * closed. Reopen-then-close with new events is handled by dropping the entry
 * the moment the session is live, not by this TTL.
 */
const CLOSED_FOLD_CACHE_TTL_MS = 60000;
import { createInitialState } from "../kernel/fold";
import type { AidosState } from "../kernel/fold";
import { reviewChainOf } from "../kernel/gates";
import { judgeReviewRow } from "../kernel/review-provenance";
import { reviewProvenanceReader } from "./partner-review";
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
import { boardKeyText } from "../kernel/board-key";
import { nextStep } from "../kernel/next-step";
import { recentBoardChanges } from "../kernel/recent-changes";
import type { BoardChange } from "../kernel/recent-changes";
import { DIGEST_SEPARATOR, coalesceDigestLines } from "../kernel/digest";
import {
  RETIRED_KIND,
  followSupersedeChain,
  isRetired,
  parseRetirementPayload,
  retirementOf,
} from "../kernel/retirement";
import type { RetirementInfo } from "../kernel/retirement";
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
  TagDetachRefused,
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

/**
 * #120: the working tree was dirty when a plan import was attempted. The
 * tool renders it as `plan_import_dirty_tree`; the refusal carries the
 * offending paths. A refusal imports nothing and deletes nothing.
 */
export class PlanImportDirtyTreeError extends Error {
  readonly paths: string[];
  constructor(paths: string[], message: string) {
    super(message);
    this.paths = paths;
  }
}

/**
 * #120: the plan file itself was uncommitted (untracked or modified) when
 * a plan import was attempted. The tool renders it as
 * `plan_import_file_uncommitted`; the refusal carries the file and how it
 * differs. A refusal imports nothing and deletes nothing.
 */
export class PlanImportFileUncommittedError extends Error {
  readonly file: string;
  readonly status: "untracked" | "modified";
  constructor(file: string, status: "untracked" | "modified", message: string) {
    super(message);
    this.file = file;
    this.status = status;
  }
}

/**
 * #108: retiring a ticket that live tickets depend on is REFUSED (user's
 * decision, 2026-09-03) — chosen over marking the reference because a
 * refusal is VISIBLE at the moment of the decision, while a dangling
 * reference is discovered later by whoever trips over it. The tool renders
 * it as `retire_refused`; the refusal names every blocking dependent so the
 * human can act on them rather than hunt for them.
 *
 * A refusal is not a dead end: retiring the dependents first, or
 * re-pointing their dependsOn, both clear it. Dependencies are never
 * auto-repointed — a wrong auto-edit across a dependency graph is hard to
 * notice and harder to undo. A DONE dependent does not block: it has
 * already been satisfied, so its reference is history, not an outstanding
 * need.
 */
export class RetireRefused extends Error {
  readonly ticketId: TicketId;
  readonly dependents: Array<{ id: TicketId; title: string; state: TicketState }>;
  constructor(
    ticketId: TicketId,
    dependents: Array<{ id: TicketId; title: string; state: TicketState }>,
  ) {
    const names = dependents
      .map((dep) => `#${dep.id} ${dep.title} (${dep.state})`)
      .join(", ");
    super(
      `cannot retire ticket #${ticketId}: ${dependents.length} live ticket(s) depend on it: ${names} — ` +
        `retire them first, or re-point their dependencies, then retire this one`,
    );
    this.ticketId = ticketId;
    this.dependents = dependents;
  }
}

/**
 * #108: an agent-actor write against a retired ticket. The agent's board
 * reads hide retired tickets, but an agent working from a stale read (taken
 * before the retirement) could otherwise keep writing to a ticket the human
 * hid. The refusal says what happened and what re-opens it. User-actor
 * paths stay open: the human owns the ticket and may edit it before
 * un-retiring.
 */
export class RetiredTicketWriteRefused extends Error {
  readonly ticketId: TicketId;
  constructor(ticketId: TicketId) {
    super(
      `ticket #${ticketId} is retired: it is hidden from the board until it is un-retired. ` +
        `A retired ticket takes no agent writes; un-retire it first`,
    );
    this.ticketId = ticketId;
  }
}

// ---- the session event vocabulary ----

declare module "@deepseek-ai/dsh-session/types" {
  interface SessionEventMap {
    "ticket/change": import("../kernel/events").TicketChangeEvent;
    "evidence/attached": import("../kernel/events").EvidenceAttachedEvent;
    "evidence/detached": import("../kernel/events").EvidenceDetachedEvent;
    "evidence/linked": import("../kernel/events").EvidenceLinkedEvent;
    "tags/attached": import("../kernel/events").TagsAttachedEvent;
    "tags/detached": import("../kernel/events").TagsDetachedEvent;
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
  /*
   * #180: the projection holds whole snapshots, so a tag delta must rewrite
   * the snapshot entry (immutable, like every other arm), not mutate it.
   */
  if (event.type === "tags/attached") {
    const id = String(event.data.ticketId);
    const current = state.tickets[id] as TicketSnapshot | undefined;
    if (current === undefined) return state;
    const merged = new Set(current.tags ?? []);
    for (const name of event.data.names) merged.add(name as string);
    return {
      tickets: { ...state.tickets, [id]: { ...current, tags: [...merged] } },
      evidence: state.evidence,
    };
  }
  if (event.type === "tags/detached") {
    const id = String(event.data.ticketId);
    const current = state.tickets[id] as TicketSnapshot | undefined;
    if (current === undefined) return state;
    const removed = new Set((event.data.names ?? []) as unknown as string[]);
    const next = (current.tags ?? []).filter((name) => !removed.has(name));
    return {
      tickets: { ...state.tickets, [id]: { ...current, tags: next } },
      evidence: state.evidence,
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
  tags: zod.array(zod.string()),
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

/**
 * #166: serialized tool-call markup that must never land in a ticket's text
 * fields.
 *
 * The #142 incident (its description carrying #157's write-up plus
 * `<parameter name="title">` fragments) was diagnosed against three
 * candidates, and two are refuted by the code in this file: `_editTicket`
 * builds its snapshot from exactly one ticket's previous row and commits one
 * `ticket/change` event, the fold applies that event to exactly
 * `event.ticket.id`, and the workspace merge only selects rows — so neither
 * racing set_ticket calls nor the merge can move one ticket's text into
 * another's fields. The fragments themselves match the model-facing
 * invoke/parameter serialization, which appears nowhere in src: they are
 * caller-composed text the store faithfully persisted, i.e. #167's
 * reproduced mechanism (criteria written INSIDE the description string,
 * first-hand again on #171). The live board still carries the class:
 * #148's description holds another ticket's title/criteria/phase fragments,
 * and a dozen tickets hold their own criteria inside their description
 * behind `</description><parameter name="criteria">` seams.
 *
 * This guard refuses the shape at the funnel both set_ticket paths share,
 * so the corruption cannot be stored again. It is a tripwire for accidents,
 * not a sanitizer: the write is refused, never rewritten.
 */
const TICKET_CALL_MARKUP: RegExp[] = [
  /<parameter\s+name\s*=/i,
  /<\/?invoke\b/i,
  /<\/parameter\b/i,
  /<\/(description|body|criteria|title)\b/i,
];

/**
 * #166: code spans are discussion, not serialization. #167 and #171 document
 * this exact corruption in backticks; refusing those notes would punish the
 * tickets that describe the bug. Strip fenced blocks and inline spans before
 * matching, so guidance about the markup stays writable.
 */
function _stripCodeSpans(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
}

/** The first call-markup hit in one field value, or undefined when clean. */
function _findCallMarkup(value: string): string | undefined {
  const visible = _stripCodeSpans(value);
  for (const pattern of TICKET_CALL_MARKUP) {
    const hit = pattern.exec(visible);
    if (hit) return hit[0];
  }
  return undefined;
}

/**
 * #166: refuse a set_ticket write whose text fields carry serialized
 * call markup. Runs in both _createTicket and _editTicket, so the agent and
 * user paths share it; plan_import bypasses both and is unaffected.
 */
function _assertTicketTextClean(args: SetTicketArgs): void {
  const fields = ["title", "description", "body", "criteria"] as const;
  for (const field of fields) {
    const value = args[field];
    if (typeof value !== "string") continue;
    const marker = _findCallMarkup(value);
    if (marker !== undefined) {
      throw new BadPayloadError(
        `set_ticket refuses the ${field} field: it contains serialized tool-call markup (${marker}). ` +
          "Pass description, body, and criteria as separate arguments, never one field containing another's markup. " +
          "To discuss the markup itself, put it in a code span.",
      );
    }
  }
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
  /**
   * #83: the copies of this same ticket that LOST the dedupe, newest first.
   *
   * A forked session's log contains the same tickets as its parent, so the
   * merge used to show one row per copy. Only the winner is rendered now,
   * but the losers ride along here rather than vanishing: the board can say
   * "3 other copies" and a reader can still reach them. Absent when the
   * ticket had exactly one copy, which is the common case.
   */
  supersededCopies?: Array<{ sessionId: string; updatedAt: number }>;
}

/** One superseded copy, for the dedupe's report. */
export interface SupersededCopy {
  sessionId: string;
  updatedAt: number;
}

/** #108: one resolved supersede target: enough to render a strip and a jump. */
export type SupersedeTarget = {
  ref: string;
  id: number;
  title: string;
  state: string;
  workspaceKey: string;
  sourceSessionId: string;
  /** Resolved against this merge; a ref that names an unknown ticket has no entry. */
  known: boolean;
};

/** #108: one retired row for the Retired panel. */
export interface RetiredTicketRow extends BoardTicketView {
  /** Who retired it, when, why, and in favour of what. */
  retirement: {
    at: number;
    author: string;
    reason: string | null;
    supersededBy: string[];
    /** Each reference resolved to a row on this merge where one exists. */
    supersededByTickets: SupersedeTarget[];
    /**
     * Where each supersede chain ENDS: live tickets, unknown refs, and
     * retired tickets with no onward edge. A reader clicking through a
     * chain lands here, never mid-chain.
     */
    chainTerminals: string[];
    /** True when a chain revisited a ref (a cycle was cut). */
    chainCycle: boolean;
  };
}

/** What the dedupe did, so the caller can log it without recomputing it. */
export interface DedupeReport {
  identity: string;
  winner: SupersededCopy;
  losers: SupersededCopy[];
}

/**
 * #83: collapse the workspace merge to ONE row per ticket identity.
 *
 * `workspaceTickets` assembles three groups with no dedupe between them --
 * the caller's own rows, every live workspace session's rows, and every
 * closed session's rows. A forked session's log holds the same tickets as
 * its parent, so every fork multiplied the board. Measured live: own=110,
 * foreign=164 on a 274-row board, i.e. ~60% duplicates.
 *
 * IDENTITY is `workspaceKey:slug` -- the durable global id from #35, stable
 * across a fork because a copy keeps both parts. Deliberately NOT the
 * numeric id, which collides across sessions and is the confusion behind
 * eleven bugs in this file.
 *
 * WINNER is the most recently updated copy (user's decision, 2026-09-03): a
 * fork's copy is a snapshot that stopped moving, so the newest updatedAt is
 * the live one. Ties break deterministically -- the caller's OWN row first
 * (it is the log they can actually write to), then the lowest session id --
 * so two reads of an unchanged board agree.
 *
 * NOTHING VANISHES. Losers ride on the winner's `supersededCopies`, and the
 * returned report lets the caller log every override. A silent dedupe would
 * swap one visible problem (duplicates) for a worse invisible one (a stale
 * row presented as authoritative).
 *
 * Pure, and separate from the Remote, so it is testable: logic trapped
 * inside a Remote is logic no test can reach, which is how the allowlist
 * union and the backward-gate guard both shipped unverified.
 */
export function dedupeBoardRows(rows: readonly BoardTicketView[]): {
  rows: BoardTicketView[];
  reports: DedupeReport[];
} {
  const groups = new Map<string, BoardTicketView[]>();
  const order: string[] = [];
  for (const row of rows) {
    const identity = row.workspaceKey + ":" + row.slug;
    let group = groups.get(identity);
    if (group === undefined) {
      group = [];
      groups.set(identity, group);
      order.push(identity);
    }
    group.push(row);
  }

  const out: BoardTicketView[] = [];
  const reports: DedupeReport[] = [];
  for (const identity of order) {
    const group = groups.get(identity) as BoardTicketView[];
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const ranked = [...group].sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      // Own beats foreign: it is the log the caller can write to directly.
      if (a.foreign !== b.foreign) return a.foreign ? 1 : -1;
      return a.sourceSessionId < b.sourceSessionId ? -1 : a.sourceSessionId > b.sourceSessionId ? 1 : 0;
    });
    const [winner, ...losers] = ranked;
    const copies = losers.map((row) => ({
      sessionId: row.sourceSessionId,
      updatedAt: row.updatedAt,
    }));
    out.push({ ...winner, supersededCopies: copies });
    reports.push({
      identity,
      winner: { sessionId: winner.sourceSessionId, updatedAt: winner.updatedAt },
      losers: copies,
    });
  }
  return { rows: out, reports };
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
 *     the line into a code span. `~` joined the class because the renderer
 *     treats ~~paired~~ tildes as strikethrough mid-line -- and mid-line is
 *     where escaped text always lands.
 *
 * Whitespace is collapsed first, then the inline specials are escaped. `#`
 * and `-` are NOT escaped: they are only structural at the START of a line,
 * and after the collapse nothing interpolated can be at the start of one.
 *
 * This class is hand-picked ON PURPOSE, not for lack of a library: the only
 * npm candidate (markdown-escapes) is a data table of every ASCII
 * punctuation character a backslash escape is VALID for -- escaping all 32
 * renders identically but litters ordinary prose ("first\, do this") in the
 * raw digest, which is a channel a human reads. What no library provides is
 * the decision of which characters CHANGE MEANING, and the cost of getting
 * that decision wrong is not carried by review: the u106 sweep test renders
 * every punctuation character through `marked` and fails if any of them can
 * erase or restructure a human's words.
 */
function _mdInline(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([\\`*_[\]<>~])/g, "\\$1");
}

/**
 * One inline CODE span, for a path, a kind id or a state.
 *
 * Deliberately NOT _mdInline: inside a code span a backslash is literal, so
 * escaping would SHOW the backslashes -- `src\_host` instead of `src_host`.
 * A code span makes its content literal already, so the only real hazards
 * are a backtick (which would close the span early) and a newline (which
 * would end the list item).
 *
 * A newline collapses to a space, which loses nothing a reader needs. A
 * BACKTICK is not simply deleted: this renders allowlist paths, and stripping
 * one would REPORT A DIFFERENT PATH from the one being approved. Misstating a
 * security-relevant value is worse than rendering an ugly one. Such a value
 * falls back to an escaped inline run, which shows the real characters, and
 * says why -- so the difference is visible rather than silent.
 */
function _mdCode(text: string): string {
  /*
   * Only a NEWLINE is collapsed, and it is reported when it happens.
   *
   * This collapsed all whitespace, so an approved path `src/a\tb` was
   * REPORTED as `src/a b` -- a different path, silently. That is the same
   * defect the backtick rule above exists to prevent, and applying the rule
   * to one character class and not the other was inconsistent rather than
   * principled. A newline genuinely must go (it would end the list item);
   * a tab or a run of spaces is safe inside a span and is part of the value.
   */
  const hadNewline = /[\r\n]/.test(text);
  const clean = text.replace(/[\r\n]+/g, " ").trim();
  if (clean === "") return "";
  const note = [
    clean.includes("`") ? "a backtick" : null,
    hadNewline ? "a newline" : null,
  ].filter((part): part is string => part !== null);
  const suffix = note.length === 0 ? "" : ` (contains ${note.join(" and ")})`;
  if (clean.includes("`")) return `${_mdInline(clean)}${suffix}`;
  return "`" + clean + "`" + suffix;
}

/**
 * The head of every digest line: the ticket reference and its title.
 *
 * One shape for every line so the digest reads as a table rather than as a
 * paragraph -- the id is what a reader scans for, so it leads and is bold;
 * the title is emphasised so it reads as a name rather than as prose.
 */
function _mdTicketHead(ticketId: number | string, title: string): string {
  const name = _mdInline(title);
  return `**#${ticketId}** *${name}*`;
}

/**
 * Whether one write should be reported to the agent (#106).
 *
 * DENY BY DEFAULT: only a `user` action is reported. Every site tested
 * `actor !== "agent"`, which reads as the same rule and is not -- `Actor` has
 * a third member, `system`, and plan import attaches with it. The result was
 * the feedback loop the guard exists to prevent: an agent importing its OWN
 * plan was told about it, one digest line per imported ticket.
 *
 * Named rather than inlined because the rule was restated at seven sites and
 * was wrong at all seven. One predicate cannot be wrong at only some of them.
 */
function _isUserAction(actor: Actor): boolean {
  return actor === "user";
}

/**
 * One human's words as an indented blockquote continuation of a list item.
 *
 * `#` and `-` ARE structural here, and the comment on `_mdInline` claimed
 * they could not be: it argued they are only structural at the start of a
 * line and that nothing interpolated can be at the start of one. True for
 * every other site; false for this one, where the text lands immediately
 * after `\n  > ` -- the start of the blockquote's content line. A comment
 * beginning "# heading" rendered as an H1 inside the quote.
 *
 * Contained rather than catastrophic (the quote does not break the list
 * item), but the stated reasoning was wrong, and the test only exercised
 * `#`/`-` MID-LINE -- the one position where they are not structural.
 *
 * Escaping the leading marker only. Escaping every `#` would put backslashes
 * in front of ordinary text like "ticket #42".
 *
 * ROUND 2 widened this, and the miss was worse than the bug it fixed. The
 * first version handled `#`, `>`, `-` and `N.` and missed `+` and `~~~`:
 *
 *   "+ please update the README"  -> the "+" is DROPPED and it becomes a list
 *   "~~~ do not ship this ~~~"    -> <pre><code class="language-do"> </code>
 *                                    and "not ship this" IS SILENTLY LOST
 *
 * Losing a human's words at render is exactly the "the surface looks like it
 * worked" failure #106 exists to remove. Backtick fences need no rule --
 * `_mdInline` already escapes backticks.
 *
 * A block marker is escaped by making the FIRST CHARACTER not a marker,
 * because CommonMark decides block structure before it processes inline
 * escapes: the block parser sees `\` and reads a paragraph.
 *
 * An ordered list escapes its DELIMITER rather than its digit. `\1.` put a
 * VISIBLE backslash in the digest, because `\` before a digit is not a valid
 * escape -- a character the human never typed. `1\.` suppresses the list and
 * renders as `1.`.
 *
 * ROUND 3: the delimiter arm matched only `\.`, but CommonMark accepts BOTH
 * `.` and `)` as ordered-list delimiters -- so a note beginning "1) first"
 * rendered as a list and the `1)` was erased, the same defect `+` got round
 * 2. `1\)` is a valid escape just like `1\.`; verified through `marked`.
 *
 * Verified by rendering the real digest through `marked`, not by reasoning:
 * the first probe I wrote re-implemented this escaping instead of calling
 * it, and disagreed with the real path on four of ten cases.
 */
function _mdQuote(text: string): string {
  const escaped = _mdInline(text)
    .replace(/^(\s*)(\d+)([.)])/, "$1$2\\$3")
    .replace(/^(\s*)([#>+*-]|~{3,})/, "$1\\$2");
  return `\n  > ${escaped}`;
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

/**
 * The most bullets one digest carries, and the longest one bullet may be.
 *
 * These bound the digest as a WHOLE, which `DIGEST_TEXT_CAP` never did: it
 * caps one interpolated note, while a line may interpolate an unbounded path
 * array and a flush may carry unbounded lines. A reviewer measured 11KB in a
 * single allowlist line and 20KB across twenty capped comments.
 *
 * Line cap sits well above a realistic burst (the largest real digest so far
 * was 24 changes) so it truncates a runaway rather than ordinary work.
 */
export const DIGEST_LINE_CAP = 40;
export const DIGEST_LINE_LENGTH_CAP = 2000;

function _ellipsize(text: string): string {
  return text.length > DIGEST_TEXT_CAP ? `${text.slice(0, DIGEST_TEXT_CAP)}…` : text;
}

/**
 * Bound one assembled digest line.
 *
 * Truncation happens at the very end, after every escape, so it can never
 * split a Markdown construct in a way that changes the rest of the document
 * -- cutting inside `**` would otherwise leave an unbalanced emphasis run
 * that swallows the following bullets.
 */
function _capDigestLine(line: string): string {
  return line.length > DIGEST_LINE_LENGTH_CAP
    ? `${line.slice(0, DIGEST_LINE_LENGTH_CAP)}… (truncated)`
    : line;
}

function _evidenceDigestSuffix(kind: string, payload: Record<string, unknown>): string {
  // #106 follow-up: the suffix carries free-form note/verdict text straight
  // into a Markdown list item, so it needs the same inline escaping and
  // newline collapse the rest of the line gets.
  const ellipsize = (text: string): string => _mdInline(_ellipsize(text));
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    // A note is the human's own words: quoted on its own indented line,
    // like the comment digest, so it reads as speech rather than a field.
    return _mdQuote(_ellipsize(payload.note.trim()));
  }
  if (Array.isArray(payload.paths)) {
    const paths = payload.paths.filter((p): p is string => typeof p === "string");
    if (paths.length > 0) {
      return ` — ${paths.map(_mdCode).join(" ")}`;
    }
  }
  // #68: a commit-carrying row names the commit and subject so the digest
  // reader knows WHAT was attached without opening the viewer.
  if (typeof payload.commit === "string" && payload.commit.trim() !== "") {
    const hash = payload.commit.trim().slice(0, 12);
    const subject = typeof payload.subject === "string" ? " " + payload.subject.trim() : "";
    return ` — commit ${_mdCode(hash)}${subject === "" ? "" : " *" + ellipsize(subject) + "*"}`;
  }
  /*
   * There was a `builtin:imported_state` branch here. It is GONE because the
   * deny-by-default actor guard made it unreachable, and unreachable code
   * that looks live is what F1 was: a message nobody could ever read, with a
   * test that appeared to cover it.
   *
   * The only caller of this function sits behind `_isUserAction`, and
   * `imported_state` has `allowedAuthors: ["system"]` -- a user attach is
   * refused at runtime -- so no `imported_state` row can reach here. Keeping
   * the branch would leave the next reader believing an import is reported.
   * If a user-driven import ever exists, this comes back with a test that
   * can fail.
   */
  if (kind === "builtin:review_pass" || kind === "builtin:user_verified" || kind === "builtin:automated_check") {
    // A verdict row with no note still says what was asserted, from the
    // payload's first string field when there is one.
    for (const value of Object.values(payload)) {
      if (typeof value === "string" && value.trim() !== "") {
        return _mdQuote(_ellipsize(value.trim()));
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
 * #160: the ticket state each nominatable action APPLIES TO.
 *
 * A nomination is spent the moment its ticket leaves that state — signing
 * off moves a ticket out of `open`, so the signoff ask is answered. This is
 * how a fulfilled nomination is recognised without new bookkeeping: the
 * board already knows, and asking it is cheaper and more honest than
 * recording an "answered" flag that can itself drift.
 *
 * Kept in step with ACTION_STATE in src/client/human-queue.ts, which draws
 * the same conclusion for the DISPLAY side. That the two agreed while the
 * store did not is exactly the bug: the queue dropped fulfilled asks from
 * the list while the cap kept counting them.
 */
const NOMINATION_ACTION_STATE: Record<string, string> = {
  signoff: "open",
  verify: "awaiting_verification",
  "mark-done": "awaiting_verification",
};

/**
 * #203: which cap family a nomination action counts against. The families
 * are the queue's own tabs (queueTabOf in src/client/human-queue.ts):
 * signoff is permission to start; verify and mark-done are both checks on
 * finished work. The allowlist family has no nomination action today —
 * allowlist asks ride pending approvals, capped at requestAllowlist — but
 * the bucket exists so the mapping stays TOTAL: an actionId nobody has
 * invented yet lands in verify, exactly where the queue would show it,
 * rather than falling through uncapped, and no action is ever counted
 * twice.
 */
type NominationCategory = "signoff" | "verify" | "allowlist";
const NOMINATION_CATEGORY_CAP = 10;
const NOMINATION_CATEGORY_OF: Record<string, NominationCategory> = {
  signoff: "signoff",
  verify: "verify",
  "mark-done": "verify",
};
function nominationCategoryOf(actionId: string): NominationCategory {
  return NOMINATION_CATEGORY_OF[actionId] ?? "verify";
}

/**
 * Lifecycle order, so PAST can be told from NOT YET.
 *
 * #160 nearly shipped without this distinction and a test caught it: a
 * `verify` nomination on an OPEN ticket is not spent, it is early. The
 * ticket has not reached awaiting_verification yet, and when it does the
 * nomination becomes live and useful — deleting it would throw away a
 * forward-looking ask the agent deliberately made.
 *
 * Only a ticket that has moved PAST the action's state has answered it.
 * `unmatchedNominations` in src/client/human-queue.ts draws the same line
 * for the display side, calling the two cases "fulfilled" and
 * "unavailable"; this is the store finally agreeing with it.
 */
const NOMINATION_STATE_SEQUENCE = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
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
      /**
       * #138: only tickets carrying any of these tags. Absent or empty
       * means all tickets — the same rule the FilterPanel applies, so the
       * get_tickets tool and the panel agree (#49 parity).
       */
      tags?: readonly string[];
      sortKey?: TicketSortKey;
      descending?: boolean;
      /**
       * #108: absent (the default) hides retired tickets — the agent's board
       * read ignores them. Nothing in the tool surface offers this today;
       * it exists so a deliberate reader CAN sweep retired rows without
       * bypassing the projection, and so the default is the hiding, not the
       * exception.
       */
      includeRetired?: boolean;
    },
  ): TicketView[] {
    // #146: a subagent reads the board that dispatched it, not its own
    // (empty) session log.
    const reader = this._boardAgent(agent);
    const cache = this._cache(reader.session);
    this._sync(reader.session, cache);
    let projectId: ProjectId;
    if (opts?.projectId !== undefined) {
      projectId = opts.projectId;
      if (!cache.state.projects.has(projectId)) {
        throw new UnknownProject(projectId);
      }
    } else {
      projectId = this._ensureProject(reader).projectId;
    }
    const views = ticketsProjection(cache.state, this._resolvedConfig);
    const scoped = [...views.values()].filter((view) => view.projectId === projectId);
    /*
     * #108: retired tickets are absent from the agent's board read. The
     * agent must still be able to READ one deliberately — get_ticket on a
     * retired id resolves — or it could not help un-retire; the hiding is
     * of the board sweep, not of the ticket's existence.
     */
    const live = opts?.includeRetired === true
      ? scoped
      : scoped.filter((view) => !this._isRetired(cache.state, view.id));
    // FilterPanel-parity filtering (#49): server-side, no default narrowing.
    return filterTicketViews(live, {
      stateIds: opts?.stateIds,
      projectIds: opts?.projectIds,
      search: opts?.search,
      tags: opts?.tags,
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
    // #146: hop to the dispatching board FIRST, then apply composite
    // `sessionId:id` routing on top of it.
    const routed = this._routedAgent(this._boardAgent(agent), args.ticketId);
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
      /*
       * #108: a retired ticket contributes no state to the mask. The tier
       * mask keys off which states exist on the board; a hidden ticket must
       * not keep the tools of a state it is hidden in.
       */
      if (this._isRetired(cache.state, snapshot.id)) continue;
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
  bashContext(agent: Agent): {
    profile: string;
    scratchDir: string;
    workspaceRoot: string;
    /**
     * #74: the union of the in-progress tickets' allowlists — the write
     * boundary, published so bash-guard can gate write TARGETS.
     *
     * The fs tools have been gated by this union since #9; bash never was.
     * `echo x >> README.md` succeeds today even when README.md is outside
     * every in-progress allowlist, so the boundary the board enforces on
     * `write` and `edit` is one shell redirect away from irrelevant. The
     * guard lives in dotfiles-ai and cannot import aidos, so the union has
     * to travel on the context bash-guard already reads.
     *
     * ALWAYS PRESENT, including empty. An absent field would be
     * indistinguishable from "this build predates #74" and a guard that
     * cannot tell those apart has to fail open, which is how the fs guard
     * failed open before #9. Empty means exactly what it says: nothing in
     * the workspace may be written, because no ticket is in progress.
     *
     * Deny-by-default is preserved: the three early returns above hand back
     * an empty union along with profile "none", so an agent that cannot
     * prove it composes the aidos preset gets no writable paths either.
     */
    allowlist: string[];
  } {
    const presets = this.ctx.get("agentPresets") as
      | { composedPreset: (agentCtx: unknown) => string | undefined }
      | undefined;
    // Deny by default (A5): an agent that cannot prove it composes the aidos
    // preset gets no bash profile at all — same contract as isAidosAgent.
    const denied = { profile: "none", scratchDir: "", workspaceRoot: "", allowlist: [] };
    if (presets === undefined) {
      return denied;
    }
    let composed: string | undefined;
    try {
      composed = presets.composedPreset(agent.ctx);
    } catch {
      return denied;
    }
    if (composed !== "aidos") {
      return denied;
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
    /*
     * #74: the same union the fs write boundary uses, from the same method,
     * so bash and the fs tools cannot disagree about what is writable.
     * Computing it a second way here would be the drift #91 just removed
     * from the filters.
     *
     * A failure yields an EMPTY union rather than a missing field: the
     * write boundary's own rule is that an unknown union denies, and a
     * guard reading this must inherit that rather than guess.
     */
    let allowlist: string[];
    try {
      allowlist = this.allowlistUnion(agent);
    } catch (error) {
      this.ctx.logger?.warn?.(
        `aidos: allowlistUnion failed in bashContext: ${error instanceof Error ? error.message : String(error)}`,
      );
      allowlist = [];
    }
    return { profile, scratchDir, workspaceRoot, allowlist };
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
    /*
     * #157: read the DISPATCHING board, the same hop #146 gave the read
     * tools.
     *
     * This resolved against `agent.session` — for a subagent, its own
     * session, which holds no tickets. The union was therefore EMPTY for
     * every dispatched front, so every workspace write failed no matter
     * whose allowlist covered it, and the refusal named an arbitrary
     * ticket (the first in-progress row of the parent's board) because
     * getTickets DOES route. That mismatch is the bug: #146 routed the
     * reads and left this write path on the child.
     *
     * Consequence, stated plainly and accepted on the ticket: a subagent
     * inherits the orchestrator's whole union, so a front dispatched for
     * one ticket can write another in-progress ticket's paths. That is the
     * latitude the orchestrator already has, #101 still forbids the shared
     * tree, and a per-dispatch binding is the tighter design to build when
     * a dispatch can actually carry its ticket (see #136).
     */
    const reader = this._boardAgent(agent);
    /*
     * #157 review (2026-09-08): the union read ONE session's cache — the
     * dispatching board's — while workspaceTickets merges every live
     * session on the workspace. A sibling front's in-progress ticket was
     * invisible to the write boundary, so its allowlisted paths refused
     * for exactly the agent working on them. Collect from the dispatching
     * board AND the live workspace sessions; `seen` dedupes where they
     * overlap (they always do for a depth-0 writer).
     */
    const union: string[] = [];
    const seen = new Set<string>();
    for (const session of [reader.session, ...this._liveWorkspaceSessions(agent)]) {
      const cache = this._cache(session);
      this._sync(session, cache);
      for (const snapshot of cache.state.tickets.values()) {
        if (snapshot.state !== "in_progress") continue;
        /*
         * #108: a retired ticket grants nothing. Its allowlist would
         * otherwise keep feeding the write boundary while the ticket is
         * hidden — the union must match what the board shows.
         */
        if (this._isRetired(cache.state, snapshot.id)) continue;
        for (const entry of snapshot.allowlist) {
          if (!seen.has(entry)) {
            seen.add(entry);
            union.push(entry);
          }
        }
      }
    }
    return union;
  }

  /** Serialize one project's plan as markdown. */
  plan(agent: Agent, opts?: { projectId?: number }): string {
    // #146: a subagent serializes the dispatching board's plan.
    const reader = this._boardAgent(agent);
    const cache = this._cache(reader.session);
    this._sync(reader.session, cache);
    const projectId = opts?.projectId ?? this._ensureProject(reader).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const meta = this._planMetaOf(projectId, cache.state);
    /*
     * #108: a retired ticket does not render into the plan document. The
     * plan is the export the plan_import round trip feeds on; a retired
     * ticket must not re-enter a fresh project through it.
     */
    const planTickets = this._ticketsFor(projectId, cache.state).filter(
      (row) => !this._isRetired(cache.state, row.id),
    );
    const tickets: PlanTicket[] = planTickets.map((row): PlanTicket => ({
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
    // #146: same reader rule as plan().
    const reader = this._boardAgent(agent);
    const cache = this._cache(reader.session);
    this._sync(reader.session, cache);
    const projectId = opts?.projectId ?? this._ensureProject(reader).projectId;
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
      /*
       * #108: retired tickets are not search hits. The dependency picker is
       * a write surface — adding a retired ticket as a dependency would
       * silently recreate the dangling reference the retire gate refuses.
       */
      const evidenceSnap = snap.values["aidos.evidence"] as
        | Record<string, EvidenceRow[]>
        | undefined;
      for (const [id, ticket] of Object.entries(tickets)) {
        if (!ticket.title.toLowerCase().includes(query)) continue;
        if (isRetired(evidenceSnap?.[id])) continue;
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
    /*
     * #108: a cold board read hides retired tickets, exactly as the live
     * merge does — the two surfaces must not disagree about what a board
     * holds.
     */
    const evidenceSnap = snap.values["aidos.evidence"] as
      | Record<string, EvidenceRow[]>
      | undefined;
    let rows = Object.values(tickets).filter(
      (ticket) => !isRetired(evidenceSnap?.[String(ticket.id)]),
    );
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
  async workspaceTickets(agent: Agent, args?: { includeRetired?: boolean }): Promise<{
    tickets: BoardTicketView[];
    evidence: Record<string, EvidenceRow[]>;
    comments: Record<string, CommentRecord[]>;
    /**
     * #139: workspace key -> that workspace's real directory name.
     *
     * The key CANNOT be inverted. `workspaceKeyFromPath` is dsh's own
     * `projectKey` transform: `/` becomes `-`, and a literal `-` in a
     * directory name passes through unchanged (src/kernel/slug.ts:40 keeps
     * `-` in the safe set). So `/home/sid/repos/dotfiles-ai` and a
     * hypothetical `/home/sid/repos/dotfiles/ai` encode identically, and
     * the client's split-on-dash rendered the workspace as "ai".
     *
     * The host is the only side holding the answer, because it holds every
     * session's cwd. Derived at READ time from the sessions in this merge,
     * so nothing stored has to be migrated and an old ticket gets a correct
     * label as soon as its session is visible.
     */
    workspaceLabels: Record<string, string>;
  }> {
    /*
     * #108: retired tickets are HIDDEN from the merge by default and the
     * Retired panel asks for them by name (`includeRetired: true`, via the
     * retiredTickets Remote). Every row dropped here also drops its
     * evidence and comment entries, so the maps never orphan a key.
     */
    const includeRetired = args?.includeRetired === true;
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    /*
     * #139: the label map, filled as each session is visited below. A
     * session whose cwd we cannot see contributes nothing, and the client
     * falls back to its guess for that key rather than showing a blank.
     */
    const workspaceLabels: Record<string, string> = {};
    const learnLabel = (sessionLike: { header?: { cwd?: string } }): void => {
      const cwd = sessionLike.header?.cwd;
      if (typeof cwd !== "string" || cwd === "") return;
      const label = basename(cwd);
      if (label === "") return;
      workspaceLabels[workspaceKeyFromPath(cwd)] = label;
    };
    learnLabel(agent.session as unknown as { header?: { cwd?: string } });
    const ownViews = ticketsProjection(cache.state, this._resolvedConfig);
    const ownSort = (a: TicketView, b: TicketView) =>
      a.phase - b.phase || a.order - b.order || a.id - b.id;

    const tickets: BoardTicketView[] = [];
    const evidence: Record<string, EvidenceRow[]> = {};
    const comments: Record<string, CommentRecord[]> = {};

    for (const view of [...ownViews.values()].sort(ownSort)) {
      if (!includeRetired && this._isRetired(cache.state, view.id)) continue;
      tickets.push({ ...view, sourceSessionId: agent.session.id, foreign: false });
      const key = String(view.id);
      evidence[key] = [...(cache.state.evidence.get(view.id) ?? [])];
      comments[key] = [...(cache.state.comments.get(view.id) ?? [])];
    }

    const liveSessions = this._liveWorkspaceSessions(agent);
    const liveIds = new Set<string>();
    for (const session of liveSessions) {
      liveIds.add(session.id);
      learnLabel(session as unknown as { header?: { cwd?: string } });
      const state = this._cache(session).state;
      this._sync(session, this._caches.get(session)!);
      const views = ticketsProjection(state, this._resolvedConfig);
      for (const view of [...views.values()].sort(ownSort)) {
        if (!includeRetired && this._isRetired(state, view.id)) continue;
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
    /*
     * USER-REPORTED 2026-09-10: opening a tool-card action timed out after
     * 15s. The check behind it calls this merge, and this loop re-inspected
     * AND re-folded every closed session log on every call — measured at 225
     * persisted sessions in this workspace, the largest a 62M log. The parse
     * and fold of hundreds of megabytes, sequentially, is the timeout.
     *
     * A closed log cannot grow while its session stays dead: no live agent
     * holds it, so no one appends to it. Its fold is therefore cached by
     * session id. Two invalidations keep the cache exact:
     *  - a session that is live now is folded live below AND its entry is
     *    dropped, so a reopen-close cycle with new events re-inspects;
     *  - a TTL backstops the one case this process cannot see — ANOTHER
     *    process appending to a session this one considers closed — bounding
     *    that staleness to the TTL rather than eliminating it.
     * Only the derived views are cached, never the full fold: a 62M log is
     * mostly tool-call payloads, while its ticket views are kilobytes, so
     * pinning 225 folds would trade a timeout for a memory leak.
     */
    const now = Date.now();
    for (const liveId of liveIds) this._closedFolds.delete(liveId);
    for (const id of closedIds) {
      const hit = this._closedFolds.get(id);
      let views: TicketView[];
      let stateEvidence: Map<number, EvidenceRow[]>;
      let stateComments: Map<number, CommentRecord[]>;
      let retired: Set<number>;
      if (hit !== undefined && now - hit.at < CLOSED_FOLD_CACHE_TTL_MS) {
        ({ views, evidence: stateEvidence, comments: stateComments, retired } = hit);
      } else {
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
        views = [...ticketsProjection(state, this._resolvedConfig).values()];
        stateEvidence = state.evidence;
        stateComments = state.comments;
        // The retire check needs the full fold, which is NOT cached — so the
        // retired ids are resolved here, once per inspect, and the entry
        // carries the answer rather than the state that produced it.
        retired = new Set<number>();
        for (const view of views) {
          if (this._isRetired(state, view.id)) retired.add(view.id);
        }
        this._closedFolds.set(id, {
          at: now,
          views,
          evidence: stateEvidence,
          comments: stateComments,
          retired,
        });
        // Entries for sessions that vanished or went quiet are dropped as
        // they age out, so the map tracks the workspace rather than growing
        // without bound across reopen cycles.
        for (const [cachedId, entry] of this._closedFolds) {
          if (now - entry.at >= CLOSED_FOLD_CACHE_TTL_MS) this._closedFolds.delete(cachedId);
        }
      }
      for (const view of [...views].sort(ownSort)) {
        if (!includeRetired && retired.has(view.id)) continue;
        const key = id + ":" + view.id;
        tickets.push({
          ...view,
          id: view.id,
          sourceSessionId: id,
          foreign: true,
        } as BoardTicketView);
        evidence[key] = [...(stateEvidence.get(view.id) ?? [])];
        comments[key] = [...(stateComments.get(view.id) ?? [])];
      }
    }

    /*
     * #83: collapse copies of the same ticket to one row.
     *
     * Everything above pushes three groups with no dedupe between them, so a
     * forked session's log multiplied the board -- measured live at 110 own
     * and 164 foreign rows on a 274-row board.
     *
     * Evidence and comments are keyed by BOARD KEY in the same payload, so
     * they must be rewritten with the winners or the result is worse than
     * the duplication: a losing row's keys would be orphaned, and a winner
     * could show another copy's evidence. All three move together or the
     * dedupe is not done.
     */
    const deduped = dedupeBoardRows(tickets);
    if (deduped.reports.length > 0) {
      /*
       * ONE rule, imported. This was an inline copy of the client's
       * boardKeyOf, so the two planes agreed by coincidence: the host
       * writes the evidence and comment maps under this key and the client
       * reads them back, and a divergence would orphan a row's evidence
       * while the board went on rendering it. See kernel/board-key.ts —
       * the bare id is a DISPLAY form for a local single-workspace
       * context, never an address.
       */
      const keyOf = (row: BoardTicketView): string => boardKeyText(row);
      const keptEvidence: Record<string, EvidenceRow[]> = {};
      const keptComments: Record<string, CommentRecord[]> = {};
      for (const row of deduped.rows) {
        const key = keyOf(row);
        if (evidence[key] !== undefined) keptEvidence[key] = evidence[key];
        if (comments[key] !== undefined) keptComments[key] = comments[key];
      }
      for (const report of deduped.reports) {
        this.ctx.logger?.info?.(
          `aidos: #83 dedupe ${report.identity} -> session ${report.winner.sessionId} (updated ${report.winner.updatedAt}); superseded ` +
            report.losers.map((l) => `${l.sessionId}@${l.updatedAt}`).join(", "),
        );
      }
      this.ctx.logger?.info?.(
        `aidos: #83 workspace merge ${tickets.length} rows -> ${deduped.rows.length} after dedupe`,
      );
      const out = deduped.rows;
      out.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
      return { tickets: out, evidence: keptEvidence, comments: keptComments, workspaceLabels };
    }

    tickets.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    return { tickets, evidence, comments, workspaceLabels };
  }

  /**
   * #108: the Retired panel's read. The ONLY surface that returns retired
   * tickets, so the panel is the special place the owner asked for: it lists
   * each retired ticket with its reason, its retirement time and author, and
   * its supersede targets as resolvable references, and the panel offers
   * un-retire through userUnretireTicket.
   *
   * Reuses the workspace merge rather than re-deriving it: the same dedupe
   * rules apply (one row per ticket identity, newest wins), and the evidence
   * maps come back keyed by board key exactly as the board reads them.
   */
  @Remote("retiredTickets")
  async retiredTickets(agent: Agent, args?: Record<string, never>): Promise<{
    tickets: RetiredTicketRow[];
  }> {
    void args;
    const merged = await this.workspaceTickets(agent, { includeRetired: true });
    // Identity -> row, for resolving supersede references and chains.
    const byIdentity = new Map<string, BoardTicketView>();
    for (const row of merged.tickets) {
      byIdentity.set(row.workspaceKey + ":" + row.id, row);
    }
    const evidenceOf = (row: BoardTicketView): EvidenceRow[] =>
      merged.evidence[boardKeyText(row)] ?? [];
    const lookup = (ref: string): { retired: boolean; supersededBy: string[] } | null => {
      const row = byIdentity.get(ref);
      if (row === undefined) return null;
      const retirement = retirementOf(evidenceOf(row));
      return {
        retired: retirement !== null,
        supersededBy: retirement?.supersededBy ?? [],
      };
    };
    const out: RetiredTicketRow[] = [];
    for (const row of merged.tickets) {
      const retirement = retirementOf(evidenceOf(row));
      if (retirement === null) continue;
      const supersededByTickets: SupersedeTarget[] = retirement.supersededBy.map((ref) => {
        const target = byIdentity.get(ref);
        return {
          ref,
          id: target?.id ?? Number.NaN,
          title: target?.title ?? "",
          state: target?.state ?? "",
          workspaceKey: target?.workspaceKey ?? "",
          sourceSessionId: target?.sourceSessionId ?? "",
          known: target !== undefined,
        };
      });
      const chains = followSupersedeChain(retirement.supersededBy, lookup);
      out.push({
        ...row,
        retirement: {
          at: retirement.at,
          author: retirement.author,
          reason: retirement.reason,
          supersededBy: retirement.supersededBy,
          supersededByTickets,
          chainTerminals: [...new Set(chains.flatMap((chain) => chain.terminals))],
          chainCycle: chains.some((chain) => chain.cycle),
        },
      });
    }
    out.sort((a, b) => b.retirement.at - a.retirement.at);
    return { tickets: out };
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

  /**
   * #146: the session whose BOARD a caller reads.
   *
   * A subagent has its own session, and that session holds no aidos events
   * — so unblocking its reads without this would hand a reviewer an EMPTY
   * board, which is worse than a refusal because it looks like an answer.
   * The board it must read is the orchestrator's: the session that
   * dispatched it. `header.parentSession` is the durable direct parent, so
   * this walks up until it reaches a session that is not itself a subagent
   * (depth 2 -> 1 -> 0 for a nested child).
   *
   * The walk is gated on the DELEGATION markers (`origin: "subagent"` /
   * `delegationDepth`), never on `parentSession` alone: a FORKED top-level
   * session also carries a parent, and routing a fork's board to its
   * ancestor would hide the fork's own tickets (#83 is the standing proof
   * that fork lineage and board ownership are different questions).
   *
   * A parent that is no longer live stops the walk: the caller keeps its
   * own session, which is honest rather than throwing at a reviewer.
   */
  private _boardAgent(agent: Agent): Agent {
    let session: Session = agent.session;
    const seen = new Set<string>([session.id]);
    for (;;) {
      const header = session.header as {
        origin?: string;
        delegationDepth?: number;
        parentSession?: string;
      };
      const isChild = header.origin === "subagent" || (header.delegationDepth ?? 0) > 0;
      if (!isChild) break;
      const parentId = header.parentSession;
      if (parentId === undefined || seen.has(parentId)) break;
      let parent: Session | undefined;
      for (const candidate of this.ctx.agents.list()) {
        if (candidate.session.id === parentId) parent = candidate.session;
      }
      if (parent === undefined) break;
      seen.add(parentId);
      session = parent;
    }
    if (session === agent.session) return agent;
    return { ...agent, session } as unknown as Agent;
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
   * Closed-session folds for the workspace merge, keyed by session id.
   * Populated and read in `workspaceTickets`; see the loop there for the
   * exactness argument (invalidate-on-live plus TTL).
   */
  private readonly _closedFolds = new Map<
    string,
    {
      at: number;
      views: TicketView[];
      evidence: Map<number, EvidenceRow[]>;
      comments: Map<number, CommentRecord[]>;
      retired: Set<number>;
    }
  >;

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
    /*
     * #108: a retired ticket takes no allowlist requests. The queue hides
     * retired rows, so an approval card for one could never be answered —
     * the agent would wait forever on a card the human cannot see.
     */
    if (this._isRetired(this._cache(agent.session).state, args.ticketId as TicketId)) {
      throw new Error(
        `ticket ${args.ticketId} is retired; it takes no allowlist requests until it is un-retired`,
      );
    }
    // A per-session cap bounds a looping agent (finding 6). #203: 10, in
    // step with the per-category nomination caps.
    const sessionId = String(agent.session.id);
    const mine = [...this._pendingApprovals.values()].filter((row) => row.sessionId === sessionId);
    if (mine.length >= 10) {
      throw new Error("too many pending allowlist requests (10); resolve some on the board first");
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
    // #180: a tag proposal is resolved by its own kind, never by the
    // allowlist path below — the tag write is user-authored by this click,
    // and runs through the same _applyTags one-flow as a direct human edit.
    if (pending.kind === "tag-delete" || pending.kind === "tag-migrate") {
      const tag = pending.payload.tag as string;
      if (!args.approved) {
        this._queueInjection(
          agent.session,
          `Tag ${pending.kind === "tag-delete" ? "deletion" : "migration"} proposal for ${_mdCode(tag)} was rejected on the board — do not re-propose it without new grounds`,
        );
        return { resolved: "rejected" };
      }
      if (pending.kind === "tag-delete") {
        const result = this.userDeleteTag(agent, { tag });
        return { resolved: `approved: deleted ${tag} from ${result.tickets.length} ticket(s)` };
      }
      const result = this.userMigrateTag(agent, {
        from: tag,
        to: pending.payload.to as string,
      });
      return { resolved: `approved: migrated ${tag} to ${result.to} on ${result.tickets.length} ticket(s)` };
    }
    if (!args.approved) {
      this._queueInjection(
        agent.session,
        `Allowlist request for #${pending.ticketId} was rejected on the board — do not write; re-propose if still needed`,
      );
      return { resolved: "rejected" };
    }
    // The click is the user authorship: the grant lands through
    // userGrantAllowlist -- the ONE allowlist path (#170) -- so an approval
    // grant is indistinguishable on the board from a signoff-carried or
    // editor grant: same user-authored row, same coverage filter, same merge.
    // Re-validate the edited paths (finding 3): the card sends whatever is
    // in the textarea, so approve-time is when containment + existence are
    // re-checked — propose-time validation alone is not the gate.
    // userGrantAllowlist re-validates against the OWNING session's cwd, which
    // is this session (the resolver must be the requesting session, checked
    // above), so the second validation agrees by construction.
    const rawPaths = args.paths ?? (pending.payload.paths as string[]);
    const cwd = agent.session?.header?.cwd ?? "";
    const revalidated = validateAllowlistPaths(cwd, rawPaths);
    if (!revalidated.ok) {
      const detail = revalidated.bad.map((b) => `${b.path} (${b.reason})`).join("; ");
      /*
       * #106: the ELEVENTH interpolation site, and the one that was missed.
       *
       * `b.path` is verbatim textarea content from the approval card, so an
       * unescaped path here injects live Markdown into the digest -- a
       * reviewer confirmed `[click](http://evil.example)` rendering as a real
       * hyperlink in the agent's own context.
       *
       * The earlier commit claimed "applied at all ten interpolation sites";
       * that was a count of the sites it CHANGED, not of the sites that
       * exist. The path is code-spanned and the reason escaped, so each is
       * treated as what it is.
       */
      const safeDetail = revalidated.bad
        .map((b) => `${_mdCode(b.path)} (${_mdInline(b.reason)})`)
        .join("; ");
      this._queueInjection(
        agent.session,
        `Allowlist approval for #${pending.ticketId} was refused: ${safeDetail} — the agent should re-propose`,
      );
      return { resolved: `refused: ${detail}` };
    }
    const paths = this.userGrantAllowlist(agent, {
      ticketId: pending.ticketId,
      paths: revalidated.paths,
    }).granted;
    return { resolved: `approved: ${paths.join(", ")}` };
  }

  /**
   * Attach an approved allowlist and merge it into the ticket's field.
   *
   * The single writer behind userGrantAllowlist (#170): every grant --
   * approval card, signoff-carried paths, ticket editor, evidence form --
   * funnels through it, and it performs only the two writes and the merge,
   * so a granted allowlist is indistinguishable on the board whichever entry
   * point the human used. Extracted from resolveApproval for #98 (signoff
   * and allowlist are ONE decision); resolveApproval now calls
   * userGrantAllowlist, which calls this. A second copy of this merge is
   * how #112 happened. The caller has already validated: this method
   * performs only the two writes and the merge.
   */
  private _grantAllowlistPaths(
    agent: Agent,
    ticketId: TicketId | number,
    paths: string[],
  ): string[] {
    this.userAttachEvidence(agent, {
      ticketId,
      kind: "builtin:file_allowlist",
      payload: { paths },
    });
    /*
     * #112: an approval is ADDITIVE by its own contract -- request_allowlist
     * is framed throughout (its tool description, #9, #51) as the agent
     * PROPOSING paths, never as replacing a grant. `_editTicket`'s general
     * allowlist field is a REPLACE (the per-ticket editor, #14, needs that:
     * a human shrinking the list on purpose). This call site is different:
     * it must union the newly-approved batch into whatever the ticket
     * already had, or a second approval round silently revokes the first --
     * even though that earlier `builtin:file_allowlist` evidence row is
     * still sitting there, satisfied, granting nothing once the field is
     * overwritten.
     */
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    /*
     * ROUND 2 (independent review, 2026-09-05): the merge must keep only
     * paths that are STILL GRANTED, not every path the field happens to
     * hold. Round 1 merged the field wholesale and deadlocked the ticket
     * permanently.
     *
     * THE SEQUENCE THAT BROKE IT, reproduced by the reviewer: the detail
     * panel renders a delete X on EVERY evidence row with no kind filter,
     * and `_detachEvidence` removes the row WITHOUT clearing the allowlist
     * field. So after a human deletes a grant row, the field still names a
     * path that nothing covers. Round 1 then fed that stale path back into
     * `userSetTicket`, where the coverage gate refused the whole write --
     * AFTER the pending card had already been deleted and AFTER the new
     * evidence row had been attached. One click destroyed the card, left a
     * grant row that granted nothing, and never updated the field; every
     * later approval threw identically. Permanent, and strictly worse than
     * the bug round 1 set out to fix.
     *
     * Filtering by live coverage is "keep everything still granted" -- the
     * actual intent -- and it SELF-HEALS: a detached grant simply stops
     * being carried forward instead of jamming the ticket forever.
     *
     * The evidence read happens after `userAttachEvidence` above, so this
     * ticket's brand-new row is already folded in and its paths are covered.
     *
     * No `new Set` here: `_editTicket` already dedupes the field it is
     * given (round 1 wrapped this in a Set and the review proved it inert --
     * removing it left the suite green). Dedup has ONE owner.
     */
    const covered = this._coveredAllowlistPaths(cache.state.evidence, ticketId as TicketId);
    const stillGranted = (cache.state.tickets.get(ticketId)?.allowlist ?? []).filter(
      (path) => covered.has(path),
    );
    const merged = [...stillGranted, ...paths];
    this.userSetTicket(agent, { ticketId, allowlist: merged });
    return paths;
  }

  /**
   * #98: the BOARD surface for granting an allowlist without an approval
   * card — the signoff run's second step.
   *
   * Observed live: five signoffs meant five separate allowlist cards, ten
   * interactions for five decisions, because signoff alone grants write
   * access to NOTHING (the union is empty until a file_allowlist row
   * exists) so the agent's first act after every signoff was to ask again.
   *
   * An EMPTY list is legal and writes nothing: a human may sign off now and
   * scope the files later, which is exactly today's behaviour. The point is
   * to remove the forced second round-trip, not to make the allowlist
   * mandatory.
   */
  @Remote("userGrantAllowlist")
  userGrantAllowlist(
    agent: Agent,
    args: { ticketId: TicketId | number | string; paths: string[] },
  ): { granted: string[] } {
    /*
     * Routed exactly as every other user write is: a composite
     * `sourceSessionId:id` sends the writes to the OWNING session, and a
     * bare number stays here. #93's finding — a plain number made the
     * router return the caller unchanged, so signing off foreign #12 wrote
     * to own #12 — is why this goes through the same helper rather than
     * resolving the id itself.
     */
    const routed = this._routedAgent(agent, args.ticketId);
    const ticketId = this._resolveTicketId(routed, args.ticketId);
    const raw = Array.isArray(args.paths) ? args.paths : [];
    if (raw.length === 0) return { granted: [] };
    /*
     * Validated HERE as well as at the approval card: this entry point
     * takes paths straight from a textarea, so containment and existence
     * are re-checked at grant time. The refusal names every bad path, the
     * way #51's does.
     */
    /*
     * The OWNING session's cwd, not the caller's: containment is judged
     * against the workspace the ticket lives in, or a foreign grant is
     * validated against the wrong root.
     */
    const cwd = routed.session?.header?.cwd ?? "";
    const validated = validateAllowlistPaths(cwd, raw);
    if (!validated.ok) {
      throw new Error(
        "allowlist refused: " +
          validated.bad.map((b) => `${b.path} (${b.reason})`).join("; "),
      );
    }
    return { granted: this._grantAllowlistPaths(routed, ticketId, validated.paths) };
  }

  /**
   * #175: recent board changes, folded from the durable log.
   *
   * Reads `session.events` -- the append-only log the board itself is folded
   * from -- so a restart loses nothing and this can never disagree with the
   * board. A buffer of emitted digests would have done neither.
   *
   * Resolved through `_boardAgent`, like every other read (#157): a subagent
   * asking what it missed sees the history of the board it was DISPATCHED
   * against, not of its own empty session.
   *
   * Each row carries its next step (#174), so recovering a missed digest
   * recovers the guidance and not merely the fact.
   */
  recentChanges(
    agent: Agent,
    args: { limit?: number; since?: number; ticketId?: number } = {},
  ): { changes: Array<BoardChange & { nextStep?: string }>; omitted: number; covers: string } {
    const reader = this._boardAgent(agent);
    const session = reader.session;
    const folded = recentBoardChanges((session?.events ?? []) as readonly unknown[], args);
    return {
      changes: folded.changes.map((change) => {
        const step = this.nextStepFor(reader, change.ticketId);
        return step === undefined ? change : { ...change, nextStep: step };
      }),
      omitted: folded.omitted,
      /*
       * THE BOUNDARY, said out loud. Worktree reports, refused approvals and
       * injection failures are digest lines with no log row, so no fold can
       * return them. An agent that believes it has seen everything is worse
       * off than one told what it is missing.
       */
      covers:
        "board changes only — tickets, evidence and comments. Notices with no " +
        "board event behind them (worktree preparation reports, refused " +
        "approvals, injection failures) are NOT recoverable here.",
    };
  }

  /**
   * #174: the digest's half of the next step.
   *
   * A suffix rather than a separate line, and it rides the INSTRUCTION side
   * of the separator deliberately: two tickets that received the same
   * evidence AND need the same thing next coalesce into one line, while two
   * that now need different things stay apart. That is the honest grouping
   * -- the guidance is what the reader acts on, so lines that differ in it
   * are genuinely different lines.
   *
   * Empty string when the ticket needs nothing, so an ordinary edit does not
   * grow a trailing marker.
   */
  private _nextStepSuffix(agent: Agent, ticketId: number | string): string {
    const step = this.nextStepFor(agent, ticketId);
    return step === undefined ? "" : ` \u2014 next: ${step}`;
  }

  /**
   * #174: what this ticket needs next — THE single derivation.
   *
   * Lives on the service rather than in the tool layer because it has two
   * consumers: every board tool result, and the digest lines about gate or
   * evidence changes. Two copies of a rule drift, and this one drifting
   * means the board telling the agent to attach evidence its own gate no
   * longer wants — which teaches the agent to ignore the field, and then
   * the channel is spent.
   *
   * Never throws: a ticket that cannot be read has no next step, and a piece
   * of guidance must never be the reason a tool call or a digest fails.
   */
  nextStepFor(agent: Agent, ticketId: number | string): string | undefined {
    try {
      const read = this.getTicket(this._routedAgent(agent, ticketId), { ticketId });
      const attached = new Set(read.evidence.map((row) => row.kind));
      return nextStep(this._resolvedConfig, read.ticket, attached);
    } catch {
      return undefined;
    }
  }

  /**
   * #178: the AGENT's commit-evidence entry. Same resolution, same refusal.
   */
  attachCommit(
    agent: Agent,
    args: { ticketId: number | string; hash: string; note?: string },
  ): Promise<{ ticketId: number; payload: Record<string, unknown> }> {
    return this._attachCommitEvidence(
      this._routedAgent(agent, args.ticketId),
      args as { ticketId: number; hash: string; note?: string },
      "agent",
    );
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
     *
     * Counted PER CATEGORY (#203): each family gets its own 10, so a burst
     * of verify asks can never starve signoff asks.
     */
    /*
     * #160: count only the nominations still ASKING for something. This
     * used to count every row in the store, including asks the human had
     * already acted on — so in a long session the cap filled with answered
     * work and the agent could not nominate anything, while the refusal
     * told it that acting on one would make room. It would not have.
     *
     * Same function the queue reads, so the count and the list cannot
     * drift apart again. Split by family (#203): a fulfilled signoff frees
     * a signoff slot and nothing else.
     */
    const mine = this._liveNominations(agent);
    const existingByCategory = new Map<NominationCategory, Set<string>>();
    for (const nomination of mine) {
      const category = nominationCategoryOf(nomination.actionId);
      let pairs = existingByCategory.get(category);
      if (pairs === undefined) {
        pairs = new Set();
        existingByCategory.set(category, pairs);
      }
      pairs.add(`${nomination.ticketId}|${nomination.actionId}`);
    }
    const incomingByCategory = new Map<NominationCategory, Set<string>>();
    for (const suggestion of suggestions) {
      const pair = `${Number(suggestion.ticketId)}|${suggestion.actionId}`;
      const category = nominationCategoryOf(suggestion.actionId);
      if (existingByCategory.get(category)?.has(pair) === true) continue;
      let incoming = incomingByCategory.get(category);
      if (incoming === undefined) {
        incoming = new Set();
        incomingByCategory.set(category, incoming);
      }
      incoming.add(pair);
    }
    for (const [category, incoming] of incomingByCategory) {
      const existing = existingByCategory.get(category)?.size ?? 0;
      if (existing + incoming.size > NOMINATION_CATEGORY_CAP) {
        throw new Error(
          `too many nominations (${category} cap ${NOMINATION_CATEGORY_CAP}); the human dismisses or acts on them to make room`,
        );
      }
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
      /*
       * #108: a retired ticket takes no nominations. The queue hides retired
       * rows, so a nomination naming one could never show a button — the
       * exact "ask the human cannot act on" the gate-checked validation
       * exists to prevent.
       */
      if (this._isRetired(state, ticketId as TicketId)) {
        throw new Error(
          `ticket ${ticketId} is retired; it takes no nominations until it is un-retired`,
        );
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
    return this._liveNominations(agent).sort((a, b) => a.at - b.at);
  }

  /**
   * #160: one session's nominations that are STILL ASKING for something,
   * pruning the spent ones as it goes.
   *
   * **The bug this exists to end.** A nomination was removed on exactly two
   * paths — the human dismissed it, or the agent re-nominated the same
   * (ticket, action) pair and replaced it. Nothing removed one when its
   * action was actually PERFORMED. Sign off a nominated ticket and the
   * nomination lived on forever.
   *
   * It vanished from the QUEUE anyway, because the display derives asks
   * from board state and a fulfilled ask no longer has an entry — so the
   * two halves disagreed: invisible in the list, still counted by the cap.
   * The user hit the consequence: "the ask stays in the queue even when
   * it's been addressed and counts towards the number of open nominations",
   * and the refusal's own advice ("the human dismisses or acts on them to
   * make room") was false for the acting half.
   *
   * The cure is that the READ and the CAP now call this one function, so
   * they cannot disagree again by construction. Pruning on read is a side
   * effect in a read path, chosen deliberately: it is self-healing (any
   * caller repairs the store), it needs no event wiring to keep in step
   * with the lifecycle, and leaving spent rows in memory is what broke the
   * cap in the first place.
   */
  private _liveNominations(agent: Agent): ActionNomination[] {
    const sessionId = String(agent.session.id);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const live: ActionNomination[] = [];
    for (const [id, nomination] of [...this._nominations]) {
      if (nomination.sessionId !== sessionId) continue;
      const snapshot = cache.state.tickets.get(Number(nomination.ticketId) as TicketId);
      /*
       * A ticket that no longer exists cannot be acted on, so its
       * nomination is dead weight in the cap. Same for an action whose
       * state has moved on.
       */
      const wanted = NOMINATION_ACTION_STATE[nomination.actionId];
      let spent = snapshot === undefined;
      /*
       * #108: a retired ticket takes no nominations. The human queue derives
       * its entries from the board the client sees — which hides retired
       * rows — so a nomination naming one could never be answered; pruning
       * it here keeps the cap and the list telling the same story.
       */
      if (
        !spent &&
        snapshot !== undefined &&
        this._isRetired(cache.state, Number(nomination.ticketId) as TicketId)
      ) {
        spent = true;
      }
      if (!spent && snapshot !== undefined && wanted !== undefined) {
        const wantedAt = NOMINATION_STATE_SEQUENCE.indexOf(wanted);
        const actualAt = NOMINATION_STATE_SEQUENCE.indexOf(snapshot.state);
        /*
         * PAST only. A ticket that has not reached the action's state yet
         * keeps its nomination — a verify asked for while the work is still
         * open becomes live the moment it lands in awaiting_verification,
         * and deleting it would discard an ask the agent made on purpose.
         * An unknown state (-1 on either side) is left alone rather than
         * guessed at: silently dropping a queue row is the worse error.
         */
        spent = wantedAt >= 0 && actualAt >= 0 && actualAt > wantedAt;
      }
      if (spent) {
        this._nominations.delete(id);
        continue;
      }
      live.push(nomination);
    }
    return live;
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
   * #136: what chain each review row ran on, for the BOARD ONLY.
   *
   * A Remote and deliberately not a tool. The contract is explicit that
   * provenance must never reach model context — no tool, no prompt section,
   * no tool-result text — and that a human who needs to see it sees it on
   * the board or in the UI. A Remote is exactly that: the client calls it,
   * the model cannot.
   *
   * PROGRESSIVE DEGRADATION, which is the whole shape of this feature. The
   * harness services do not exist yet, so today every row answers
   * `unverified` and the UI shows nothing at all. Rows created once
   * stamping lands answer `verified` and gain the check. NOTHING happens to
   * rows that already exist: an unstamped legacy `review_pass` judges as
   * `unverified`, keeps satisfying the gate exactly as it does today, and
   * is never marked, downgraded or migrated. That was decided in writing —
   * no migration, no backfill, no grandfather flag — and the accepted risk
   * (an old self-reviewed pass stays valid forever) is stated there rather
   * than quietly re-litigated here.
   *
   * Only `invalidated` is a finding, and it needs positive evidence: the
   * harness saying a model outside the declared chain served the run.
   */
  @Remote("reviewStandings")
  reviewStandings(
    agent: Agent,
    args: { ticketId: number | string },
  ): {
    chain: string;
    rows: Array<{ at: number; kind: string; standing: string; reason: string }>;
  } {
    const chain = reviewChainOf(this._resolvedConfig);
    const lookup = reviewProvenanceReader(this.ctx);
    let evidence: readonly EvidenceRow[] = [];
    try {
      evidence = this.getTicket(this._routedAgent(agent, args.ticketId), {
        ticketId: args.ticketId,
      }).evidence;
    } catch {
      /*
       * A ticket that cannot be read is not a provenance finding. The board
       * asks this for decoration; it must never be the reason a panel
       * fails to render.
       */
      return { chain, rows: [] };
    }
    const rows = evidence
      .filter((row) => row.kind === "builtin:review_pass" || row.kind === "builtin:review_fail")
      .map((row) => {
        const judgement = judgeReviewRow(row, chain, lookup);
        return {
          at: row.at,
          kind: row.kind,
          standing: judgement.standing,
          reason: judgement.reason,
        };
      });
    return { chain, rows };
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

  // ---- tags (#180): one flow, attach-only agents, human-only removal -----

  /**
   * Clean one tag batch. Trims, refuses empties and non-strings, dedupes
   * keeping first order. One implementation: the agent path, the human
   * path, and the approval executor all clean through here.
   */
  private _cleanTagNames(raw: unknown): string[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadPayloadError("at least one tag name is required");
    }
    const clean: string[] = [];
    const seen = new Set<string>();
    for (const entry of raw) {
      if (typeof entry !== "string" || entry.trim() === "") {
        throw new BadPayloadError("tag names must be non-empty strings");
      }
      const name = entry.trim();
      if (!seen.has(name)) {
        seen.add(name);
        clean.push(name);
      }
    }
    return clean;
  }

  /**
   * THE tag write path: the ONLY method that commits `tags/attached` or
   * `tags/detached` (#170 one-flow rule). The agent path calls it with
   * `remove: []` and is refused anything else; the human surface calls it
   * with whatever the human approved; the approval executor calls it with
   * the approved proposal. Two commits never grow here a second way.
   */
  private _applyTags(
    agent: Agent,
    ticketId: TicketId,
    delta: { add: string[]; remove: string[] },
    actor: Actor,
  ): { ticketId: TicketId; added: string[]; removed: string[] } {
    const snapshot = this._cache(agent.session).state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    if (
      actor === "agent" &&
      (delta.remove.length > 0 || this._isRetired(this._cache(agent.session).state, ticketId))
    ) {
      if (delta.remove.length > 0) {
        throw new TagDetachRefused(actor);
      }
      throw new RetiredTicketWriteRefused(ticketId);
    }
    const added: string[] = [];
    const removed: string[] = [];
    if (delta.add.length > 0) {
      const at = this._atFor(agent.session, ticketId);
      this._commit(agent, {
        kind: "tags/attached",
        version: 1,
        ticketId,
        names: delta.add,
        at,
      });
      added.push(...delta.add.filter((name) => !(snapshot.tags ?? []).includes(name)));
    }
    const afterAttach = this._cache(agent.session).state.tickets.get(ticketId);
    if (delta.remove.length > 0) {
      const present = delta.remove.filter((name) => (afterAttach?.tags ?? []).includes(name));
      if (present.length === 0) {
        throw new BadPayloadError(
          `ticket ${ticketId} carries none of: ${delta.remove.join(", ")}`,
        );
      }
      this._commit(agent, {
        kind: "tags/detached",
        version: 1,
        ticketId,
        names: present,
        at: this._atFor(agent.session, ticketId),
      });
      removed.push(...present);
    }
    if (added.length > 0 && _isUserAction(actor)) {
      const title = this._cache(agent.session).state.tickets.get(ticketId)?.title ?? `#${ticketId}`;
      this._queueInjection(
        agent.session,
        `${_mdTicketHead(ticketId, title)} — tagged by ${actor}: ${added.map(_mdCode).join(" ")}`,
      );
    }
    return { ticketId, added, removed };
  }

  /**
   * The AGENT tag surface: attach only, freeform. A name no workspace
   * ticket carries yet is CREATED by the attach (no registry, no
   * pre-declaration), and the result reports it — "agent created N tags"
   * with the names — so a new tag never appears silently.
   */
  agentAttachTags(
    agent: Agent,
    args: { ticketId: number | string; tags: string[] },
  ): {
    ok: true;
    ticketId: number;
    attached: string[];
    createdTags: string[];
    createdCount: number;
    message: string;
  } {
    const routed = this._routedAgent(agent, args.ticketId);
    const ticketId = this._resolveTicketId(routed, args.ticketId);
    const names = this._cleanTagNames(args.tags);
    // Creation is measured against the workspace BEFORE the commit, so the
    // report names names that are new to the workspace, not names the
    // ticket merely lacked.
    const before = this._workspaceTagSet(routed);
    this._applyTags(routed, ticketId, { add: names, remove: [] }, "agent");
    const created = names.filter((name) => !before.has(name));
    const summary =
      created.length === 0
        ? "agent created 0 tags"
        : `agent created ${created.length} tag${created.length === 1 ? "" : "s"}: ${created.join(", ")}`;
    return {
      ok: true,
      ticketId,
      attached: names,
      createdTags: created,
      createdCount: created.length,
      message: summary,
    };
  }

  /**
   * The BOARD surface: the human detaches tags from one ticket. The only
   * detach path that exists; the agent's attach flow cannot reach it.
   */
  @Remote("userDetachTags")
  userDetachTags(
    agent: Agent,
    args: { ticketId: number | string; tags: string[] },
  ): { ticketId: number; detached: string[] } {
    const routed = this._routedAgent(agent, args.ticketId);
    const ticketId = this._resolveTicketId(routed, args.ticketId);
    const names = this._cleanTagNames(args.tags);
    const result = this._applyTags(routed, ticketId, { add: [], remove: names }, "user");
    return { ticketId: result.ticketId, detached: result.removed };
  }

  /**
   * #138: the BOARD surface for ATTACHING tags to one ticket — the path the
   * create-ticket modal uses after userSetTicket creates the ticket.
   *
   * Runs through `_applyTags`, the one tag-write flow (#170): the commit is
   * still a `tags/attached` DELTA, never a whole-list replace, so the #180
   * merge rule holds for board writes too. User-actor, like every other
   * user* Remote here; unlike the agent path it reports no "created N tags"
   * line, because the human sees the tags they just typed.
   */
  @Remote("userAttachTags")
  userAttachTags(
    agent: Agent,
    args: { ticketId: number | string; tags: string[] },
  ): { ticketId: number; attached: string[] } {
    const routed = this._routedAgent(agent, args.ticketId);
    const ticketId = this._resolveTicketId(routed, args.ticketId);
    const names = this._cleanTagNames(args.tags);
    const result = this._applyTags(routed, ticketId, { add: names, remove: [] }, "user");
    return { ticketId: result.ticketId, attached: names };
  }

  /**
   * The BOARD surface: bulk migration, per approved proposal. Every ticket
   * in the caller's own session log carrying `from` gets `to` instead —
   * the detach half and the attach half each run through `_applyTags`.
   */
  @Remote("userMigrateTag")
  userMigrateTag(
    agent: Agent,
    args: { from: string; to: string },
  ): { from: string; to: string; tickets: number[] } {
    const from = this._cleanTagNames([args.from])[0];
    const to = this._cleanTagNames([args.to])[0];
    if (from === to) {
      throw new BadPayloadError("migration needs two different tag names");
    }
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const affected: number[] = [];
    for (const snapshot of cache.state.tickets.values()) {
      if ((snapshot.tags ?? []).includes(from)) {
        this._applyTags(agent, snapshot.id, { add: [to], remove: [from] }, "user");
        affected.push(snapshot.id);
      }
    }
    if (affected.length === 0) {
      throw new BadPayloadError(`no ticket carries the tag ${from}`);
    }
    this._queueInjection(
      agent.session,
      `Tag migrated by user: ${_mdCode(from)} → ${_mdCode(to)} on ${affected.length} ticket(s)`,
    );
    return { from, to, tickets: affected };
  }

  /**
   * The BOARD surface: delete one tag, per approved proposal. Removes it
   * from every ticket in the caller's log that carries it.
   */
  @Remote("userDeleteTag")
  userDeleteTag(agent: Agent, args: { tag: string }): { tag: string; tickets: number[] } {
    const name = this._cleanTagNames([args.tag])[0];
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const affected: number[] = [];
    for (const snapshot of cache.state.tickets.values()) {
      if ((snapshot.tags ?? []).includes(name)) {
        this._applyTags(agent, snapshot.id, { add: [], remove: [name] }, "user");
        affected.push(snapshot.id);
      }
    }
    if (affected.length === 0) {
      throw new BadPayloadError(`no ticket carries the tag ${name}`);
    }
    this._queueInjection(
      agent.session,
      `Tag deleted by user: ${_mdCode(name)} from ${affected.length} ticket(s)`,
    );
    return { tag: name, tickets: affected };
  }

  /**
   * Every tag name the caller's workspace carries right now.
   * Read over the caller's own log; the workspace merge's union comes from
   * the `workspaceTags` Remote below.
   */
  private _workspaceTagSet(agent: Agent): Set<string> {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const out = new Set<string>();
    for (const snapshot of cache.state.tickets.values()) {
      for (const tag of snapshot.tags ?? []) out.add(tag);
    }
    return out;
  }

  /**
   * The BOARD surface: every tag in the workspace with counts, newest
   * activity order. Aggregated from the SAME merge the board reads
   * (workspaceTickets), so the browser cannot disagree with the board.
   */
  @Remote("workspaceTags")
  async workspaceTags(agent: Agent): Promise<{
    tags: Array<{ tag: string; count: number; tickets: Array<{ boardKey: string; id: number; title: string; state: string; slug: string; workspaceKey: string }> }>;
  }> {
    const merged = await this.workspaceTickets(agent);
    const counts = new Map<string, { count: number; tickets: Array<{ boardKey: string; id: number; title: string; state: string; slug: string; workspaceKey: string }> }>();
    for (const row of merged.tickets) {
      for (const tag of row.tags ?? []) {
        let entry = counts.get(tag);
        if (entry === undefined) {
          entry = { count: 0, tickets: [] };
          counts.set(tag, entry);
        }
        entry.count += 1;
        entry.tickets.push({
          boardKey: boardKeyText(row),
          id: row.id,
          title: row.title,
          state: row.state,
          slug: row.slug,
          workspaceKey: row.workspaceKey,
        });
      }
    }
    const tags = [...counts.entries()]
      .map(([tag, entry]) => ({ tag, count: entry.count, tickets: entry.tickets }))
      .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
    return { tags };
  }

  /**
   * The AGENT surface: propose a tag for DELETION, or a bulk MIGRATION
   * (`from` -> `to` across every ticket carrying `from`). Queues ONE
   * approval card and returns at once. The proposal executes only when the
   * human approves it, per proposal — a standing grant is exactly how the
   * gate stops being a gate.
   */
  requestTagChange(
    agent: Agent,
    args: { action: "delete" | "migrate"; tag: string; to?: string; reason: string },
  ): { ok: true; status: "pending"; requestId: string; action: string; tag: string; to: string | null } {
    const action = args.action;
    if (action !== "delete" && action !== "migrate") {
      throw new Error(`unknown tag action ${String(action)}; expected delete or migrate`);
    }
    const tag = this._cleanTagNames([args.tag])[0];
    const reason = (args.reason ?? "").trim();
    if (reason === "") {
      throw new Error("a tag proposal needs a reason");
    }
    let to: string | null = null;
    if (action === "migrate") {
      to = this._cleanTagNames([args.to ?? ""])[0];
      if (to === tag) {
        throw new Error("migration needs two different tag names");
      }
    }
    // The tag must exist now — a proposal for a tag nobody carries queues a
    // card no action can ever satisfy.
    if (!this._workspaceTagSet(agent).has(tag)) {
      throw new Error(`no ticket carries the tag ${tag}`);
    }
    const sessionId = String(agent.session.id);
    const mine = [...this._pendingApprovals.values()].filter((row) => row.sessionId === sessionId);
    if (mine.length >= 5) {
      throw new Error("too many pending requests (5); resolve some on the board first");
    }
    this._approvalSeq += 1;
    const id = `req-${Date.now()}-${this._approvalSeq}`;
    const pending: PendingApproval = {
      id,
      sessionId,
      ticketId: 0,
      kind: action === "delete" ? "tag-delete" : "tag-migrate",
      prompt:
        action === "delete"
          ? `Delete the tag "${tag}" from every ticket carrying it?`
          : `Replace the tag "${tag}" with "${to}" on every ticket carrying it?`,
      payload: { tag, ...(to === null ? {} : { to }), reason },
      at: this._now(),
    };
    this._pendingApprovals.set(id, pending);
    return { ok: true, status: "pending", requestId: id, action, tag, to };
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

  /** Import one plan file into an empty project.
   *
   * #120 owns the file's lifecycle: a successful import deletes the plan
   * file. Before importing, when the file sits inside a git repo, the
   * import refuses while the working tree is dirty (paths named) or the
   * plan file itself is uncommitted (untracked or modified) — deletion
   * must never destroy uncommitted work or ride alongside unrelated
   * changes. Outside a git repo the import proceeds without the checks.
   * A refusal throws BEFORE any event is committed, so it imports nothing
   * and deletes nothing. A deletion failure after a successful import is
   * reported in the result, never rolled back.
   */
  async planImport(agent: Agent, args: PlanImportArgs): Promise<{
    tickets: number[];
    deleted: boolean;
    deletionError: string | null;
  }> {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = args.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const target = this._planFileTarget(agent, args.file);

    // The file read, then parse first: a parse error imports nothing.
    const text = this._readPlanFileAt(target, args.file);
    const document = parsePlan(text);

    // An import loads a whole plan into an empty project; it never merges.
    if (this._ticketsFor(projectId, cache.state).length > 0) {
      throw new ProjectNotEmptyError(projectId);
    }

    // The lifecycle gate, before any commit: refuses on dirty or
    // uncommitted git state, passes through outside a git repo.
    await this._checkPlanImportGitClean(target);

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

    // The imported plan is disposable: remove it. A deletion failure is
    // reported in the result — the tickets stay landed, never rolled back.
    let deleted = true;
    let deletionError: string | null = null;
    try {
      unlinkSync(target);
    } catch (error) {
      deleted = false;
      deletionError = error instanceof Error ? error.message : String(error);
    }
    return { tickets: ticketIds, deleted, deletionError };
  }

  /**
   * #120: the lifecycle gate for a plan import. The file's OWN repo
   * governs — a plan file can live in a different repo than the
   * workspace, and the workspace may not be a repo at all — so no
   * workspace path enters here. Outside a git repo (rev-parse fails)
   * there are no checks. Inside one, the plan file's own fate is named
   * first: when it is the only uncommitted thing, the tree check would
   * otherwise misreport it as tree dirt.
   *
   * A status command that fails INSIDE a repo throws (failing closed):
   * the gate cannot verify, so it refuses rather than deleting blindly.
   */
  private async _checkPlanImportGitClean(target: string): Promise<void> {
    const dir = dirname(target);
    let repoRoot: string;
    try {
      repoRoot = (await this._gitRawIn(dir, ["rev-parse", "--show-toplevel"])).trim();
    } catch {
      return;
    }
    if (repoRoot === "") {
      return;
    }
    const raw = await this._gitIn(dir, [
      "-c",
      "core.quotePath=false",
      "-C",
      repoRoot,
      "status",
      "--porcelain=v1",
      "-z",
    ]);
    const fileRel = relative(repoRoot, target).replace(/\\/g, "/");
    let fileStatus: "clean" | "untracked" | "modified" = "clean";
    const dirtyPaths: string[] = [];
    for (const segment of raw.split("\0")) {
      // A rename's source arrives as a bare path segment with no status
      // prefix; so does the trailing empty segment. Skip both.
      if (segment.length < 4 || segment[2] !== " ") {
        continue;
      }
      const code = segment.slice(0, 2);
      const entryPath = segment.slice(3);
      if (entryPath === fileRel) {
        fileStatus = code === "??" ? "untracked" : "modified";
        continue;
      }
      dirtyPaths.push(entryPath);
    }
    if (fileStatus === "untracked") {
      throw new PlanImportFileUncommittedError(
        fileRel,
        "untracked",
        `cannot import the plan file ${fileRel}: it is untracked in the git repo — commit it first`,
      );
    }
    if (fileStatus === "modified") {
      throw new PlanImportFileUncommittedError(
        fileRel,
        "modified",
        `cannot import the plan file ${fileRel}: it has uncommitted changes in the git repo — commit them first`,
      );
    }
    if (dirtyPaths.length > 0) {
      const shown = dirtyPaths.slice(0, 6).join(", ");
      const rest = dirtyPaths.length > 6 ? `, and ${dirtyPaths.length - 6} more` : "";
      throw new PlanImportDirtyTreeError(
        dirtyPaths,
        `cannot import the plan file: the git working tree is dirty (${shown}${rest}) — commit or stash first`,
      );
    }
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
    if (_isUserAction(actor)) {
      const blocks = (["frontmatter", "preamble", "contextSections"] as const)
        .filter((field) => args[field] !== undefined);
      if (blocks.length > 0) {
        this._queueInjection(
          agent.session,
          `**Plan** \u2014 edited by ${actor} (project ${projectId}): ${blocks.map(_mdCode).join(" ")}`,
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
      /*
       * The digest is structured Markdown (#106 follow-up, user's ask): a
       * bold header, then one bullet per change. Each line leads with the
       * bold ticket id because that is what a reader scans for, names the
       * ticket in italics, and puts kinds, states and paths in code spans.
       * A human's own words -- a comment, a review note -- become an
       * indented blockquote so they read as speech rather than as another
       * field in a status line.
       *
       * A BLANK LINE separates the header from the list. A bullet list may
       * interrupt a paragraph in CommonMark, so the unseparated form mostly
       * rendered -- but "mostly" depends on the renderer, and a lazy
       * continuation can fold the first item back into the header.
       *
       * A single change keeps the same bullet shape rather than collapsing
       * to a sentence: one format means a reader learns it once, and the
       * blockquote continuation would have no list item to attach to.
       */
      /*
       * TOTAL bounds, not just a per-note cap.
       *
       * `DIGEST_TEXT_CAP` bounds one interpolated NOTE. It never bounded a
       * line -- an allowlist row maps over an unbounded path array, so one
       * line reached 11KB in a reviewer's probe -- and nothing bounded the
       * digest as a whole: twenty capped comments assembled to 20KB. Raising
       * the note cap from 160 to 1000 (so a human's question was not cut
       * mid-sentence) removed the accident that had kept this safe.
       *
       * The digest is a NOTICE. Its job is to say what changed and let the
       * agent read the board for detail, so a bound that truncates is
       * correct here in a way it would not be for the board itself. Both
       * bounds name what they dropped rather than trailing off, because a
       * silent truncation is indistinguishable from nothing having happened.
       */
      /*
       * NOT bold. The digest is delivered as a `notice`-form context message
       * (agent.steer), and every context node's text renders through the
       * shell's `ModelFacingContent` -- a literal `<pre>` tag, confirmed by
       * reading dsh-client-ui-conversation's bundled source. No markdown
       * parser reaches it (the shell's own `MarkdownText` is wired only to
       * the compaction card and to real assistant messages). `**...**`
       * rendered as four literal asterisks around the header, which is the
       * user-reported bug this fixes.
       *
       * The REST of this file's digest lines still carry markdown syntax
       * (`_mdCode`, `_mdInline`, `_mdTicketHead`'s bold/italic, `_mdQuote`'s
       * `>`) with the same problem, plus backslash-escaping that is actively
       * wrong now -- a title containing `_` renders with a visible backslash
       * that was never in the real title. That is a bigger, deliberately
       * DEFERRED change (touches ~15 call sites and their tests); this
       * header is fixed now because it is what was reported.
       */
      /*
       * Repeated instructions are said ONCE (user, 2026-09-08: "board
       * digest should not repeat the exact same worktree instruction like
       * 50 times"). The header still counts real CHANGES, not rendered
       * lines: four signoffs are four changes however few lines they take,
       * and a count that shrank because the text was tidier would be a
       * digest lying about what happened.
       */
      const merged = coalesceDigestLines(lines);
      const header = `aidos board update — ${lines.length} change${lines.length === 1 ? "" : "s"}`;
      const shown = merged.slice(0, DIGEST_LINE_CAP).map(_capDigestLine);
      if (merged.length > DIGEST_LINE_CAP) {
        shown.push(`…and ${merged.length - DIGEST_LINE_CAP} more change(s); read the board for the rest`);
      }
      const text = `${header}\n\n- ${shown.join("\n- ")}`;
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
    // #166: never store serialized call markup in a text field.
    _assertTicketTextClean(args);
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
    if (_isUserAction(actor)) {
      this._queueInjection(
        agent.session,
        `${_mdTicketHead(ticketId, snapshot.title)} \u2014 **created** by ${actor}`,
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
    // #166: never store serialized call markup in a text field. Checked
    // before any other field logic, so a malformed payload refuses no matter
    // which ticket it names — and names the field, not the ticket.
    _assertTicketTextClean(args);
    /*
     * #108: a retired ticket takes no agent edits. Same rule as the attach
     * funnel: the human hid the ticket, so the agent must not keep writing
     * it from a stale read. User edits stay open (the human may want to
     * correct something before un-retiring).
     */
    if (actor === "agent" && this._isRetired(cache.state, ticketId)) {
      throw new RetiredTicketWriteRefused(ticketId);
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
    if (_isUserAction(actor)) {
      /*
       * `phase`, `order` and `slug` were missing from this list, so
       * re-phasing, re-ordering or re-slugging a ticket was completely
       * silent -- and each of those changes the board the agent works from.
       * A slug is worse still: it is half of the durable id (#35), so the
       * agent's own reference to the ticket stops resolving.
       *
       * The list is now every field _editTicket accepts. `allowlist` has its
       * own line below because it grants write access, which deserves to be
       * named rather than folded into "edited".
       */
      const changed = (
        ["title", "description", "criteria", "body", "dependsOn", "phase", "order", "slug"] as const
      ).filter((field) => args[field] !== undefined);
      if (changed.length > 0) {
        this._queueInjection(
          agent.session,
          `${_mdTicketHead(ticketId, snapshot.title)} \u2014 edited by ${actor}: ${changed.map(_mdCode).join(" ")}`,
        );
      }
    }
    if (_isUserAction(actor) && allowlist !== undefined) {
      this._queueInjection(
        agent.session,
        `${_mdTicketHead(ticketId, snapshot.title)} \u2014 allowlist: ${allowlist.map(_mdCode).join(" ")}`,
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
    /*
     * #178: a commit row is a VERIFIED FACT, not a composed claim, so it
     * never enters through the generic path -- for either actor. The only
     * producer is _attachCommitEvidence (the attach_commit tool for the
     * agent, the commit picker for the human), which resolves the hash
     * through git show and refuses what it cannot find. Allowing a composed
     * payload here would let the commit requirement be satisfied by a
     * confident sentence, which is exactly what the requirement exists to
     * reject -- and would make this required kind weaker than the check it
     * sits beside, not stronger.
     */
    if (def.id === "builtin:user_commit") {
      throw new BadPayloadError(
        "builtin:user_commit must be attached through the commit flow (the attach_commit tool or the " +
          "commit picker) so the hash is resolved by git show; a composed payload is refused",
      );
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
      `${_mdTicketHead(ticketId, title)} \u2014 evidence ${_mdCode(args.rowKind)} **detached** by user`,
    );
    return { ticketId, removed: 1 };
  }

  /**
   * #78: run one git command in the workspace root. execFile (no
   * shell), a bounded timeout, and a fixed argument list — the hash a caller
   * passes never reaches a shell and never splits into new arguments.
   *
   * #101 widened this from READ-ONLY: `worktree add` and `worktree remove`
   * write. Called out because "read-only" was load-bearing in the original
   * reasoning about safety, and it is no longer true. What still holds is
   * the part that mattered: no shell, and a fixed argument list, so nothing
   * a caller supplies can become a new argument.
   *
   * The timeout is a parameter because a worktree checkout is not a 5-second
   * operation on a large repository.
   */
  private _gitInWorkspace(
    agent: Agent,
    args: string[],
    timeoutMs = 5000,
  ): Promise<string> {
    const workspace = this._workspacePath(agent);
    return this._gitIn(workspace, args, timeoutMs);
  }

  /**
   * #120: run one git command in an arbitrary directory. Same contract as
   * `_gitInWorkspace` (execFile, no shell, fixed argument list) but the
   * caller names the cwd — the plan-import lifecycle checks follow the
   * plan FILE's repo, which need not be the workspace's.
   */
  private _gitIn(cwd: string, args: string[], timeoutMs = 5000): Promise<string> {
    return this._gitRawIn(cwd, args, timeoutMs).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      throw new BadPayloadError("git " + args[0] + " failed: " + detail.split("\n")[0]);
    });
  }

  /**
   * #120: the raw probe behind `_gitIn`. Rejects with git's own error so
   * callers can distinguish "not a repo" (checks do not apply) from a
   * command that failed inside a repo (failing closed).
   */
  private _gitRawIn(cwd: string, args: string[], timeoutMs = 5000): Promise<string> {
    return new Promise((resolvePromise, rejectPromise) => {
      execFile(
        "git",
        args,
        { cwd, timeout: timeoutMs },
        (error, stdout) => {
          if (error) {
            rejectPromise(error);
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

  /**
   * #78: attach one commit as evidence, resolved in the workspace.
   *
   * ONE resolution path for both actors (#178). The agent reaches it through
   * the `attach_commit` tool and the human through the commit picker, and
   * both land here -- so an agent-authored commit row is resolved by the
   * same `git show` and refused on the same unresolvable hash. That is what
   * makes the kind safe to require at the verification gate: the evidence
   * is a fact the host checked, not a claim either actor made.
   */
  private async _attachCommitEvidence(
    agent: Agent,
    args: { ticketId: number; hash: string; note?: string },
    actor: Actor = "user",
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
    const attached = this._attachEvidenceInternal(agent, ticketId, "builtin:user_commit", payload, actor);
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
      /*
       * #106: UNLINKING is reported too.
       *
       * This branch committed and returned here, before the injection below
       * -- the exact shape of the bug this ticket exists to fix. The message
       * further down even had an "unlinked from its criterion" case, which
       * could never run: the only path that reaches it had already returned.
       *
       * Unlinking REMOVES the criterion a row was said to keep, so the
       * agent's own coverage silently changes. That is more worth reporting
       * than the link, not less.
       */
      this._queueLinkDigest(agent, ticketId, cache, args.rowKind, false);
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
    this._queueLinkDigest(agent, ticketId, cache, args.rowKind, true);
    return { ticketId, linked: true };
  }

  /**
   * One digest line for a criterion link or unlink.
   *
   * Extracted because the two callers are the link branch and the unlink
   * branch, and the unlink branch previously returned before reaching the
   * shared line -- so its message was dead code that read as covered. One
   * function with two callers cannot drift that way.
   */
  private _queueLinkDigest(
    agent: Agent,
    ticketId: number,
    cache: { state: { tickets: Map<number, { title: string }> } },
    rowKind: string,
    linked: boolean,
  ): void {
    const title = cache.state.tickets.get(ticketId)?.title ?? `#${ticketId}`;
    const what = linked ? "linked to a criterion" : "unlinked from its criterion";
    this._queueInjection(
      agent.session,
      `${_mdTicketHead(ticketId, title)} \u2014 evidence ${_mdCode(rowKind)} ${what} by user` +
        this._nextStepSuffix(agent, ticketId),
    );
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
    /*
     * #108: a retired ticket takes no agent moves. The refusal rides the
     * same log-only aidos/refusal record the gate refusals append, so the
     * history answers "why did nothing happen".
     */
    if (actor === "agent" && this._isRetired(cache.state, ticketId)) {
      const message = new RetiredTicketWriteRefused(ticketId).message;
      this._appendRefusal(agent, ticketId, fromState, toState, actor, message);
      throw new RetiredTicketWriteRefused(ticketId);
    }

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
    if (_isUserAction(actor)) {
      this._queueInjection(
        agent.session,
        `${_mdTicketHead(ticketId, ticket.title)} \u2014 moved ${_mdCode(fromState)} \u2192 ${_mdCode(toState)} by ${actor}` +
          this._nextStepSuffix(agent, ticketId),
      );
    }
    /*
     * #101: the ticket's worktree follows its state.
     *
     * DELIBERATELY NOT AWAITED. A worktree is an affordance for reviewers,
     * not part of the gate, so a git failure -- a full disk, a /tmp that is
     * read-only, a repository mid-rebase -- must never refuse a legitimate
     * state change. The move has already been committed above; this either
     * succeeds quietly or logs.
     *
     * A worktree checkout is also not instant, and blocking every signoff on
     * one would make the board feel broken for a benefit the human moving
     * the ticket does not need.
     */
    if (toState === "in_progress") {
      void this._ensureWorktree(agent, ticketId);
    } else if (toState === "done") {
      // Torn down at DONE, not on leaving in_progress (user, 2026-09-04): a
      // review still running when the ticket reaches awaiting_verification
      // must not have its checkout pulled out from under it.
      void this._removeWorktree(agent, ticketId);
    }
    return { ticketId, fromState, toState };
  }

  /**
   * #101/#158: make the ticket's worktree EXIST AND BE USABLE, best effort.
   *
   * Every failure is logged and swallowed rather than thrown. This is called
   * from a move that has already been committed, so throwing here would
   * report a failed move that in fact succeeded -- strictly worse than no
   * worktree.
   *
   * #158 is what "usable" had to grow into. A worktree an agent cannot build
   * in is not a working front: the agent discovers that the tree is broken,
   * repairs it in whatever way occurs to it, and spends its opening minutes
   * on setup instead of the ticket -- or, if it does not think of the repair,
   * reports a build error that belongs to no ticket at all. Preparation is
   * the one place that can be solved once, so it now covers all four steps
   * an agent was doing by hand:
   *
   *   1. create OR REFRESH the checkout (an existing stale one used to fail
   *      the add and be silently left behind);
   *   2. link node_modules for every package, not only the root;
   *   3. run whatever the workspace DECLARED it needs pre-built;
   *   4. say so, loudly, at preparation time when any of that failed.
   *
   * Step 4 is the difference between this and the old behaviour. Swallowing
   * to a host log line meant the failure surfaced as the agent's mid-task
   * build error -- terminal at the most expensive possible moment, the same
   * shape as #157. The problems collected here go to the session as well as
   * the log, so the orchestrator learns the tree is unusable BEFORE it
   * dispatches into it.
   */
  private async _ensureWorktree(agent: Agent, ticketId: number): Promise<void> {
    const workspace = this._workspacePath(agent);
    const workspaceKey = workspaceKeyFromPath(workspace);
    const path = worktreePathFor(workspaceKey, ticketId);
    const problems: string[] = [];
    /*
     * A tree that did not exist a moment ago is definitely unprepared, and
     * this is the moment the orchestrator is about to dispatch into it. A
     * refreshed tree stays quiet unless something went wrong: it was
     * reported when it was created.
     */
    let created = false;
    try {
      mkdirSync(dirname(path), { recursive: true });
      /*
       * An EXISTING worktree is refreshed rather than re-added. `worktree
       * add` on a live path fails, and #101's catch turned that into a log
       * line -- so a tree cut ten commits ago was handed to the next agent
       * unchanged, with nothing anywhere saying it was old. Both aidos
       * worktrees in the session that found this ticket were stale that way.
       */
      if (existsSync(join(path, ".git"))) {
        await this._refreshWorktree(agent, ticketId, path, problems);
      } else {
        created = true;
        for (const args of worktreeAddArgs(path)) {
          await this._gitInWorkspace(agent, args, WORKTREE_TIMEOUT_MS);
        }
      }
      this._linkNodeModules(workspace, path, problems);
    } catch (error) {
      /*
       * #101: fail LOUDLY, and tell the truth about the consequence. The
       * old message said subagents "fall back to the shared tree" — they
       * cannot: the write boundary blocks subagents from the shared tree,
       * so a failed creation leaves a dispatched subagent unable to write
       * any repository path. Saying otherwise steered the orchestrator
       * toward a remedy that does not exist. Creation is retried on the
       * next move to in_progress (prune-before-add makes that
       * self-healing).
       */
      problems.push(
        `the checkout itself could not be created: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    this._reportWorktreePreparation(agent, ticketId, path, problems, created);
  }

  /**
   * #158: what the orchestrator has RECORDED about preparing this workspace.
   *
   * Reads only. The host does not run preparation -- see the header of
   * `parseWorktreePrepareConfig` for why that inverted: a host-executed,
   * workspace-declared recipe had a no-op default that reported success over
   * a worktree which still could not build.
   *
   * An unreadable scratch root is the same answer as an absent file: nothing
   * is recorded yet. That is a REPORTABLE state, not a silent success.
   */
  private _recordedPreparation(agent: Agent): {
    configPath: string | null;
    spec: WorktreePrepareSpec;
  } {
    let configPath: string | null = null;
    try {
      configPath = worktreePrepareConfigPath(scratchRootForAgent(agent));
    } catch {
      return {
        configPath: null,
        spec: { declared: false, commands: [], notes: [], problems: [] },
      };
    }
    let text: string | undefined;
    try {
      text = readFileSync(configPath, "utf8");
    } catch {
      text = undefined;
    }
    return { configPath, spec: parseWorktreePrepareConfig(text) };
  }

  /**
   * #158: one report per preparation, to the session and not only the log.
   *
   * "Failure to prepare is loud at preparation time, not at the agent's
   * first build" is a criterion, and a `logger.warn` does not satisfy it.
   *
   * That is MEASURED, not assumed. #158's prior investigation ended by
   * handing forward one open question -- whether thursday's worktree failed
   * because of the monorepo shape or because `worktree add`/the symlink
   * threw and was swallowed -- and said the two were distinguishable from
   * the host log. They are not. There is NO host log: no `.log` file exists
   * anywhere under the dsh home, and the string `aidos: worktree` appears in
   * ZERO persisted session records across every thursday session. A
   * `logger.warn` here goes to the host process's console and is gone.
   *
   * So the swallowed warning was never merely "hard to find" -- the evidence
   * was never recorded at all, which is why that question can no longer be
   * answered for the tree that prompted this ticket. Meanwhile 4 of the 9
   * thursday worktrees on this machine have no root node_modules whatever,
   * so the swallowed-failure path is not rare and not hypothetical.
   *
   * The injection queue is the channel the orchestrator actually reads, so a
   * failed preparation lands there and stays in the session record.
   *
   * Success stays quiet (info only). A line in the session for every
   * successful move to in_progress would be noise, and noise is how a
   * channel stops being read -- which would cost exactly the failures this
   * is here to surface.
   */
  private _reportWorktreePreparation(
    agent: Agent,
    ticketId: number,
    path: string,
    problems: string[],
    created: boolean,
  ): void {
    /*
     * A NEWLY CREATED tree is announced even when nothing went wrong, and
     * that is the correction of 2026-09-08: the host no longer runs
     * preparation, so "the checkout exists" is NOT "the checkout builds".
     * Staying quiet here would reproduce the rejected design's worst
     * property -- reporting success over a tree that cannot build -- with
     * the orchestrator never told it has a job to do before it dispatches.
     *
     * A refreshed tree stays quiet unless something went wrong: it was
     * announced when it was created, and repeating it every move is how a
     * channel becomes noise and stops being read.
     */
    if (problems.length === 0 && !created) {
      this.ctx.logger?.info?.(`aidos: worktree ready for ticket ${ticketId} at ${path}`);
      return;
    }
    if (problems.length === 0) {
      const { configPath, spec } = this._recordedPreparation(agent);
      for (const problem of spec.problems) {
        problems.push(`the recorded preparation recipe is unusable: ${problem}`);
      }
      if (problems.length === 0) {
        /*
         * SUBJECT carries what differs, INSTRUCTION carries what does not.
         *
         * That split is what lets four signoffs produce one paragraph
         * instead of four (see coalesceDigestLines). The ticket and its
         * worktree path are per-ticket and belong in the subject; the
         * recipe is a property of the WORKSPACE, identical for every
         * ticket in the flush, and repeating it once per ticket is what
         * the user reported. Keep every interpolation on the left of the
         * separator, or the lines stop collapsing silently.
         */
        const recipe =
          configPath ?? WORKTREE_PREPARE_CONFIG;
        const instruction = spec.declared
          ? `bare checkouts with ${_mdCode("node_modules")} linked. The recipe at ` +
            `${_mdCode(recipe)} applies` +
            (spec.commands.length > 0
              ? `: run its ${spec.commands.length} command(s) in the worktree before dispatching into it.`
              : `: nothing to run.`) +
            (spec.notes.length > 0
              ? `\n${spec.notes.map((note) => `  - ${note}`).join("\n")}`
              : "")
          : `bare checkouts with ${_mdCode("node_modules")} linked, and NOT prepared. No recipe is ` +
            `recorded for this workspace yet: work out what makes it build in one of them, confirm ` +
            `it, then record it at ${_mdCode(recipe)} so later worktrees are configured automatically.`;
        this._queueInjection(
          agent.session,
          `worktree for #${ticketId} at ${_mdCode(path)}${DIGEST_SEPARATOR}${instruction}`,
        );
        return;
      }
    }
    const detail = problems.map((problem) => `- ${problem}`).join("\n");
    this.ctx.logger?.warn?.(
      `aidos: worktree preparation FAILED for ticket ${ticketId} at ${path} — a subagent ` +
        `dispatched for it may be unable to build or write repository paths; retried on the ` +
        `next move to in_progress:\n${detail}`,
    );
    this._queueInjection(
      agent.session,
      `${_mdTicketHead(ticketId, this._cache(agent.session).state.tickets.get(ticketId)?.title ?? `#${ticketId}`)} — ` +
        `**worktree preparation failed** at ${_mdCode(path)}. A subagent dispatched for this ` +
        `ticket may not be able to build or test there. Retried on the next move to ` +
        `in_progress.\n${detail}`,
    );
  }

  /**
   * #158: bring an existing worktree onto the workspace's current commit.
   *
   * The verdict itself is a pure function in the kernel (`stalenessVerdict`)
   * because the interesting part is the RULE -- refresh a clean tree,
   * never touch a dirty one -- and a rule that can only be exercised by
   * creating real worktrees is a rule nobody tests.
   */
  private async _refreshWorktree(
    agent: Agent,
    ticketId: number,
    path: string,
    problems: string[],
  ): Promise<void> {
    let workspaceHead: string;
    let worktreeHead: string;
    let dirty: boolean;
    try {
      workspaceHead = (await this._gitInWorkspace(agent, ["rev-parse", "HEAD"])).trim();
      worktreeHead = (await this._gitIn(path, ["rev-parse", "HEAD"])).trim();
      dirty = (await this._gitIn(path, ["status", "--porcelain"])).trim() !== "";
    } catch (error) {
      problems.push(
        `the existing worktree could not be inspected, so whether it is stale is unknown: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    const verdict = stalenessVerdict(workspaceHead, worktreeHead, dirty);
    if (verdict.kind === "current") return;
    if (verdict.kind === "stranded") {
      /*
       * Reported, not repaired -- and reported PLAINLY, which the criterion
       * asks for by name: it must not present as "unprepared" and send the
       * next agent down the same repair path. So the message says it is
       * stale, by how much, why it was left alone, and what to run.
       */
      problems.push(
        `it is STALE: checked out at ${verdict.from.slice(0, 8)} while the workspace is at ` +
          `${verdict.to.slice(0, 8)}, and ${verdict.note}. Either finish with those changes ` +
          `or run: git -C ${path} checkout --detach ${verdict.to.slice(0, 8)}`,
      );
      return;
    }
    try {
      for (const args of worktreeRefreshArgs(verdict.to)) {
        await this._gitIn(path, args, WORKTREE_TIMEOUT_MS);
      }
      this.ctx.logger?.info?.(
        `aidos: worktree for ticket ${ticketId} refreshed ${verdict.from.slice(0, 8)} → ${verdict.to.slice(0, 8)}`,
      );
    } catch (error) {
      problems.push(
        `it is stale at ${verdict.from.slice(0, 8)} (workspace is at ${verdict.to.slice(0, 8)}) ` +
          `and the refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * #158: every directory in the main checkout that has a node_modules,
   * repo-relative, `""` for the root.
   *
   * A pnpm workspace gives each package its own node_modules symlink farm,
   * so linking only the root leaves `packages/*` unresolvable and the tree
   * still does not build -- which is half of what this ticket was filed for.
   * Discovered by walking rather than declared, because a declaration would
   * make every workspace repeat what is already visible on disk, and
   * hardcoding `packages/*` would bake one repository's layout into aidos.
   *
   * The walk is bounded: it never descends into a node_modules or a dotted
   * directory, and stops at depth 3. That covers `packages/<name>`,
   * `apps/<name>` layouts and their one-deeper variants; an unbounded walk
   * of a large monorepo on every move to in_progress would be a real cost
   * for a vanishing case.
   */
  private _dirsWithNodeModules(root: string): string[] {
    return discoverNodeModulesDirs({
      hasNodeModules: (prefix) => existsSync(join(root, prefix, "node_modules")),
      childDirectories: (prefix) => {
        try {
          return readdirSync(join(root, prefix), { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        } catch {
          // An unreadable directory is skipped rather than fatal: one
          // permission problem three levels down must not cost the whole
          // preparation.
          return [];
        }
      },
    });
  }

  /**
   * #158: mirror the main checkout's node_modules into the worktree.
   *
   * SYMLINK, NOT INSTALL. The decision and its cross-contamination cost are
   * recorded in kernel/worktree.ts rather than repeated here; the short of
   * it is that an install per ticket costs minutes and gigabytes for a
   * dependency set that is identical by construction, and the price is that
   * node_modules becomes shared mutable state between the worktree and the
   * main checkout.
   *
   * A link that already exists is left alone: re-linking would be pointless,
   * and REPLACING one would be actively wrong if a workspace had chosen to
   * install into its worktree for real.
   */
  private _linkNodeModules(workspace: string, path: string, problems: string[]): void {
    const plan = nodeModulesLinkPlan(workspace, path, this._dirsWithNodeModules(workspace));
    for (const link of plan) {
      try {
        if (!existsSync(link.from) || existsSync(link.to)) continue;
        mkdirSync(dirname(link.to), { recursive: true });
        symlinkSync(link.from, link.to, "dir");
      } catch (error) {
        problems.push(
          `node_modules could not be linked at ${link.to}, so that package will not resolve ` +
            `its dependencies: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /** #101: remove the ticket's worktree, best effort. */
  private async _removeWorktree(agent: Agent, ticketId: number): Promise<void> {
    const workspaceKey = workspaceKeyFromPath(this._workspacePath(agent));
    const path = worktreePathFor(workspaceKey, ticketId);
    if (!existsSync(path)) return;
    try {
      for (const args of worktreeRemoveArgs(path)) {
        await this._gitInWorkspace(agent, args, WORKTREE_TIMEOUT_MS);
      }
      this.ctx.logger?.info?.(`aidos: worktree removed for ticket ${ticketId}`);
    } catch (error) {
      this.ctx.logger?.warn?.(
        `aidos: could not remove the worktree for ticket ${ticketId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
    /*
     * #108: a retired ticket takes no agent comments. Comments are how the
     * agent talks to the human ABOUT a ticket; on a retired ticket they are
     * writes to something the human chose not to look at.
     */
    if (actor === "agent" && this._isRetired(cache.state, ticketId)) {
      throw new RetiredTicketWriteRefused(ticketId);
    }
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
    if (_isUserAction(actor)) {
      this._queueInjection(
        agent.session,
        /*
         * A comment becomes a BLOCKQUOTE on its own continuation line, so
         * the human's words read as speech rather than as another field in
         * a status line. The two-space indent keeps the quote INSIDE the
         * list item -- an unindented ">" would end the list and restructure
         * everything after it.
         *
         * The text is still collapsed to one line first, so a multi-line
         * comment cannot break out of the quote.
         */
        `${_mdTicketHead(ticketId, snapshot.title)} \u2014 comment by ${actor}${_mdQuote(_ellipsize(args.text.trim()))}`,
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
    const approved = this._coveredAllowlistPaths(evidence, ticketId);
    return [...new Set(proposed)].filter((path) => !approved.has(path));
  }

  /**
   * Every path that some SURVIVING `builtin:file_allowlist` row on this
   * ticket still grants.
   *
   * Extracted from `_uncoveredAllowlistPaths` for #112's second round, and
   * the extraction is the point rather than tidiness: the approval path now
   * needs to ask "is this path still granted?", and a SECOND hand-rolled
   * copy of that loop is exactly how the first #112 fix went wrong. One
   * definition of "covered", used by the gate that refuses and by the merge
   * that decides what to keep, so the two cannot disagree.
   */
  private _coveredAllowlistPaths(
    evidence: ReadonlyMap<TicketId, EvidenceRow[]> | undefined,
    ticketId: TicketId,
  ): Set<string> {
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
    return approved;
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
      // #180: a new ticket starts untagged; tags arrive only as deltas.
      tags: [],
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
    /*
     * #108: a retired ticket takes NO agent writes. The agent's board reads
     * hide retired tickets, but an agent working from a read taken before
     * the retirement could otherwise keep writing to a ticket the human hid.
     * This is the ONE funnel every agent attach path goes through
     * (agentAttachEvidence, attachCommit, plan import), so one guard covers
     * them all. User paths stay open: the human owns the ticket and may edit
     * it before un-retiring.
     */
    if (
      actor === "agent" &&
      snapshot !== undefined &&
      this._isRetired(cache.state, ticketId)
    ) {
      throw new RetiredTicketWriteRefused(ticketId);
    }
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
    if (_isUserAction(actor)) {
      const title = cache.state.tickets.get(ticketId)?.title ?? `#${ticketId}`;
      this._queueInjection(
        agent.session,
        `${_mdTicketHead(ticketId, title)} \u2014 evidence ${_mdCode(kind)} by ${actor}` + _evidenceDigestSuffix(kind, payload),
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
   * #108: the live retirement of one ticket, or null. THE ONE LOOKUP: every
   * consumer in this service reads retirement through it, so there is one
   * definition of "retired" and it lives in the kernel module.
   */
  private _retirementOf(state: AidosState, ticketId: TicketId): RetirementInfo | null {
    return retirementOf(state.evidence.get(ticketId));
  }

  /** #108: whether the ticket is retired right now. */
  private _isRetired(state: AidosState, ticketId: TicketId): boolean {
    return isRetired(state.evidence.get(ticketId));
  }

  /**
   * #108: the tickets whose `dependsOn` names one of the given workspace
   * references, are NOT retired themselves, and are not done. A DONE
   * dependent does not block a retirement (its reference is history, not an
   * outstanding need); a retired dependent cannot block anything, since it
   * is hidden itself.
   */
  private _liveDependents(
    state: AidosState,
    targetRefs: readonly string[],
  ): Array<{ id: TicketId; title: string; state: TicketState }> {
    const wanted = new Set(targetRefs);
    const out: Array<{ id: TicketId; title: string; state: TicketState }> = [];
    for (const snapshot of state.tickets.values()) {
      if (snapshot.state === "done") continue;
      if (this._isRetired(state, snapshot.id)) continue;
      for (const ref of snapshot.dependsOn) {
        if (wanted.has(ref)) {
          out.push({ id: snapshot.id, title: snapshot.title, state: snapshot.state });
          break;
        }
      }
    }
    out.sort((a, b) => a.id - b.id);
    return out;
  }

  /**
   * #108: resolve a supersede reference the way `dependsOn` references are
   * resolved — `workspaceKey:id`, `workspaceKey:slug`, or a legacy bare
   * number against this workspace — against the given state, and validate
   * it. Returns the normalized `workspaceKey:id` list.
   *
   * The reference uses the SAME format as dependsOn and is validated the
   * same way (the D1 rule): a reference to a ticket that does not exist is
   * refused, because a supersede pointing at nothing is worse than none. A
   * target that is ITSELF retired is refused too — following a chain must
   * land on a live ticket, and a chain into a retired ticket stops there.
   * A self-reference is refused for the same reason the D1 invariant
   * refuses a self-dependency.
   */
  private _validatedSupersedeRefs(
    state: AidosState,
    ticket: TicketSnapshot,
    refs: readonly string[],
  ): string[] {
    const ownWorkspace = ticket.workspaceKey;
    const normalized: string[] = [];
    for (const ref of refs) {
      let target: TicketSnapshot | undefined;
      let key: string;
      const colon = ref.indexOf(":");
      if (colon >= 0) {
        key = ref.slice(0, colon);
        const tail = ref.slice(colon + 1);
        if (/^\d+$/.test(tail)) {
          const numeric = Number(tail);
          target = state.tickets.get(numeric as TicketId);
          if (
            target !== undefined &&
            target.workspaceKey !== key
          ) {
            target = undefined;
          }
        } else {
          for (const snapshot of state.tickets.values()) {
            if (snapshot.workspaceKey === key && snapshot.slug === tail) {
              target = snapshot;
              break;
            }
          }
        }
      } else {
        // A legacy bare number (or bare slug) resolves against the retiring
        // ticket's own workspace, the same courtesy dependsOn resolution
        // applies to pre-D1 references.
        key = ownWorkspace;
        if (/^\d+$/.test(ref)) {
          target = state.tickets.get(Number(ref) as TicketId);
          if (target !== undefined && target.workspaceKey !== key) {
            target = undefined;
          }
        } else {
          for (const snapshot of state.tickets.values()) {
            if (snapshot.workspaceKey === key && snapshot.slug === ref) {
              target = snapshot;
              break;
            }
          }
        }
      }
      if (target === undefined) {
        throw new BadPayloadError(
          `supersededBy reference ${JSON.stringify(ref)} names no ticket in this state; ` +
            `the reference format is <workspaceKey>:<ticketId> (or <workspaceKey>:<slug>), ` +
            `the same format as dependsOn`,
        );
      }
      if (target.id === ticket.id) {
        throw new BadPayloadError(
          `supersededBy reference ${JSON.stringify(ref)} names the ticket being retired`,
        );
      }
      if (this._isRetired(state, target.id)) {
        throw new BadPayloadError(
          `supersededBy reference ${JSON.stringify(ref)} names ticket #${target.id}, which is itself retired; ` +
            `following a supersede chain must land on a live ticket`,
        );
      }
      normalized.push(`${target.workspaceKey}:${target.id}`);
    }
    return normalized;
  }

  /**
   * #108: the retire and un-retire writes. ONE implementation, and the
   * panels/queues may offer the act from several surfaces only by reaching
   * this method (the u98 rule, extended to retirement by this change).
   *
   * Retire attaches a `builtin:retired` row; un-retire DETACHES the newest
   * one by its stamped `at` — the same mechanism the evidence panel's
   * delete uses, so the append-only log keeps both directions as history
   * and nothing is ever removed.
   *
   * The agent can reach neither path: `userRetireTicket` and
   * `userUnretireTicket` are Remote surfaces with no tool twin, and the
   * attach tool's kind list never offers `builtin:retired`.
   */
  @Remote("userRetireTicket")
  userRetireTicket(
    agent: Agent,
    args: { ticketId: number | string; reason?: string; supersededBy?: string[] },
  ): { ticketId: number; retired: true; payload: Record<string, unknown> } {
    const routed = this._routedAgent(agent, args.ticketId);
    const ticketId = this._resolveTicketId(routed, args.ticketId);
    const cache = this._cache(routed.session);
    this._sync(routed.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(routed, snapshot);
    if (this._isRetired(cache.state, ticketId)) {
      throw new BadPayloadError(`ticket #${ticketId} is already retired`);
    }
    const parsed = parseRetirementPayload({
      ...(args.reason !== undefined ? { reason: args.reason } : {}),
      ...(args.supersededBy !== undefined ? { supersededBy: args.supersededBy } : {}),
    });
    const supersededBy = this._validatedSupersedeRefs(cache.state, snapshot, parsed.supersededBy);
    // The dependency gate, AFTER the references are normalized, so the
    // refusal names the live dependents of the ticket being retired —
    // whatever their reference format.
    const dependents = this._liveDependents(cache.state, [
      `${snapshot.workspaceKey}:${snapshot.id}`,
      `${snapshot.workspaceKey}:${snapshot.slug}`,
      String(snapshot.id),
    ]);
    if (dependents.length > 0) {
      throw new RetireRefused(ticketId, dependents);
    }
    const payload: Record<string, unknown> = {};
    if (parsed.reason !== null) payload.reason = parsed.reason;
    if (supersededBy.length > 0) payload.supersededBy = supersededBy;
    this._attachEvidenceInternal(routed, ticketId, RETIRED_KIND, payload, "user");
    return { ticketId, retired: true, payload };
  }

  @Remote("userUnretireTicket")
  userUnretireTicket(
    agent: Agent,
    args: { ticketId: number | string },
  ): { ticketId: number; retired: false; at: number } {
    const routed = this._routedAgent(agent, args.ticketId);
    const ticketId = this._resolveTicketId(routed, args.ticketId);
    const cache = this._cache(routed.session);
    this._sync(routed.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(routed, snapshot);
    const rows = cache.state.evidence.get(ticketId) ?? [];
    const retirement = retirementOf(rows);
    if (retirement === null) {
      throw new BadPayloadError(`ticket #${ticketId} is not retired`);
    }
    this._detachEvidence(routed, { ticketId, at: retirement.at, rowKind: RETIRED_KIND });
    return { ticketId, retired: false, at: retirement.at };
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
   * Resolve one plan file to its absolute path. Absolute paths are taken
   * verbatim (tool contract: "relative to the session's workspace or
   * absolute") — only relative paths are confined to the workspace so `../`
   * cannot escape. See the `plan_import` file param.
   */
  private _planFileTarget(agent: Agent, file: string): string {
    if (isAbsolute(file)) {
      return file;
    }
    const workspace = this._workspacePath(agent);
    const target = resolve(workspace, file);
    const rel = relative(workspace, target);
    const normRel = rel.replace(/\\/g, "/");
    if (rel !== "" && (normRel.startsWith("../") || normRel === ".." || isAbsolute(rel))) {
      throw new FileNotReadError(file, `cannot read the plan file ${file}: it escapes the workspace root`);
    }
    return target;
  }

  /**
   * Read one plan file, resolved under the session's workspace root.
   * Absolute paths are taken verbatim (tool contract: "relative to the
   * workspace or absolute") — only relative paths are confined to the
   * workspace so `../` cannot escape. See the `plan_import` file param.
   */
  private _readPlanFile(agent: Agent, file: string): string {
    const target = this._planFileTarget(agent, file);
    return this._readPlanFileAt(target, file);
  }

  /** Read one plan file at an already-resolved absolute path. */
  private _readPlanFileAt(target: string, file: string): string {
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
        tags: [...(snapshot.tags ?? [])],
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
