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
  writeFileSync,
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
 * #42: how long the board version stays fresh for the `sinceVersion` gate
 * (formerly the closed-fold cache TTL — the cold scan it bounded is gone;
 * the store answers closed sessions now). The gate keeps the same window
 * for the same cross-process reason: another dsh process can append to a
 * session this one considers closed, and this process cannot see it.
 */
const CLOSED_FOLD_CACHE_TTL_MS = 60000;

/**
 * #42: how many closed-session logs the ONE-TIME backfill inspects at once.
 * Still bounded, for the same reason #198 bounded the old merge pool: each
 * inspect parses megabytes, and forty concurrent parses would storm the
 * event loop. Unlike the old pool this runs ONCE per workspace — the marker
 * in the store means no board read ever reaches here again.
 */
const CLOSED_INSPECT_CONCURRENCY = 4;

/**
 * #221: how many closed-session logs one backfill batch holds in memory at
 * once. THE bound criterion 1 asks for: `_ensureWorkspaceBackfill` inspects
 * a batch, hands it to `Store.backfillSessionLogs`, releases it, and only
 * then moves to the next batch — so peak retained memory is a function of
 * this number, never of the workspace's session count.
 *
 * Sized against memory, not convenience (a crash re-runs the whole batch,
 * so the bound is load-bearing both ways):
 * - the measured killer workspace is 456 sessions / ~1.00 GB decompressed,
 *   ~2.2 MB per session on average; parsed JS objects expand ~4x over the
 *   JSON text, so a 10-log batch retains on the order of 90 MB — more than
 *   an order of magnitude under the 5.5 GB peak that OOMed the host;
 * - even if every log in a batch is a 10x outlier, the batch stays
 *   survivable on the machine that died;
 * - a crash re-runs at most 10 sessions (per-call resumption), and the
 *   456-session workspace lands its marker in 46 small transactions rather
 *   than one workspace-sized one.
 * What the count bound does NOT cover: a SINGLE session log larger than
 * memory still OOMs inside one `inspect` — the persistence API only offers
 * whole-log inspection, so no host-side batching can bound that. It is
 * recorded here so a future giant-session death is not misread as a
 * regression of this bound.
 */
const BACKFILL_BATCH_SESSIONS = 10;

/**
 * #221, review finding (i): the retained log-TEXT one backfill batch holds
 * at once, alongside the count bound. The count bound alone does not cover
 * the packed batch: the measured workspace's largest sessions run
 * 27/24/20 MB compressed (~68 MB decompressed max), and three large
 * neighbours in one count-10 window would retain ~190 MB of text — ~750 MB
 * parsed — survivable but uncomfortably close to the caps that killed the
 * old driver. The byte term caps the COMMON tail: small-log batches still
 * run full-count (64 MB dwarfs 10 × 2.2 MB average, so throughput is
 * untouched), while a window of giants cuts early.
 *
 * Measured as `JSON.stringify(events).length` per resolved inspect — an
 * honest proxy for the decompressed text the parse came from, one pass,
 * backfill-path only. Overshoot bound, stated precisely: workers take the
 * next id only while the retained total is under budget, but takes happen
 * before sizes are known, so at most the in-flight parses (bounded by
 * CLOSED_INSPECT_CONCURRENCY) land past the budget. The irreducible
 * worst case is therefore BUDGET + 4 × largest-log — ~336 MB text,
 * ~1.3 GB parsed, against a machine that died at 5.5 GB — and no
 * host-side scheme can do better without serialising inspects (killing
 * import speed) or pre-fetch size metadata the headers do not carry.
 */
const BACKFILL_BATCH_BYTES = 64 * 1024 * 1024;

import { createInitialState } from "../kernel/fold";
import type { AidosState } from "../kernel/fold";
import { reviewChainOf } from "../kernel/gates";
import { judgeReviewRow } from "../kernel/review-provenance";
import { evidenceStamp, reviewProvenanceReader } from "./partner-review";
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
// #42: the workspace store the board reads.
import { Store } from "../kernel/store";
import type {
  BackfillReport,
  BoardMigrationComment,
  BoardMigrationDocument,
  BoardMigrationEvidence,
  BoardMigrationLoadResult,
  BoardMigrationTicket,
} from "../kernel/store";
import type { BackfillSessionLog } from "../kernel/backfill";
// #44 shares this import: the workspace store's FTS index backs the
// dependency search, and storePathForWorkspace is how a search checks for a
// store WITHOUT creating one. Merged into one statement when #42 and #44
// landed together -- both fronts added their own copy, which is a duplicate
// identifier, not two different symbols.
import { openSqliteStorage, openWorkspaceStorage, storePathForWorkspace } from "./storage-sqlite";
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
  EvidenceStamp,
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
 * One board row in the workspace merge. #45: ids are workspace-unique, so
 * `sourceSessionId` is PROVENANCE (the session whose log or store origin
 * owns the row) and `foreign` is false for every row the merge produces —
 * the field survives only because the client's row types still read it.
 */
export interface BoardTicketView extends TicketView {
  /** The session whose log owns this row's authoritative state. */
  sourceSessionId: string;
  /** Always false since #45; the composite-address era's flag. */
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

/**
 * #222: the newest-copy-first ordering behind both #83's dedupe and the
 * merged-board migration export.
 *
 * One rule, two call sites: `dedupeBoardRows` sorts wire rows with it, and
 * the migration export sorts its source-carrying pairs with it, so the
 * export's winners carry exactly the field values the board shows. The most
 * recently updated copy wins (a fork's copy is a snapshot that stopped
 * moving, so the newest updatedAt is the live one); ties break
 * deterministically — the caller's own copy first, then the lowest session
 * id — so two reads of an unchanged board agree.
 */
export function compareBoardCopiesNewestFirst(
  callerSessionId: string | undefined,
): (a: { updatedAt: number; sourceSessionId: string }, b: { updatedAt: number; sourceSessionId: string }) => number {
  return (a, b) => {
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    // The caller's own copy wins ties: it is the log they can actually
    // write to. (#45: the old `foreign` flag is false on every row now,
    // so the tie-break reads provenance instead.)
    const aOwn = a.sourceSessionId === callerSessionId ? 0 : 1;
    const bOwn = b.sourceSessionId === callerSessionId ? 0 : 1;
    if (aOwn !== bOwn) return aOwn - bOwn;
    return a.sourceSessionId < b.sourceSessionId ? -1 : a.sourceSessionId > b.sourceSessionId ? 1 : 0;
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
export function dedupeBoardRows(
  rows: readonly BoardTicketView[],
  callerSessionId?: string,
): {
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
    const ranked = [...group].sort(compareBoardCopiesNewestFirst(callerSessionId));
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

/**
 * #222: how many board rows the message samples before it truncates.
 *
 * A bare number is nearly useless six months from now, so the divergence
 * log names rows — but it must not print 138 titles. The QUERYABLE result
 * (`StoreCoverage.missing`) carries the full list; only the human-facing
 * log line is capped, with an explicit "…and N more" tail.
 */
export const STORE_COVERAGE_SAMPLE_CAP = 10;

/** One board row with no store row: enough identity to start looking. */
export interface StoreCoverageMissing {
  id: number;
  title: string;
}

/**
 * #222: what the board-vs-store comparison found.
 *
 * `checked` is false only when no workspace store is open — nothing was
 * compared. A zero divergence reads `checked: true, missingCount: 0,
 * lossless: true`, never silence: in the spirit of #211, "the check ran
 * and found nothing" must be distinguishable from "the check never ran".
 * `backfillVerified` is false while the one-time import is still in
 * flight, so a mid-import divergence reads transient, never settled.
 * `reason` names why nothing was compared; null whenever checked.
 */
export interface StoreCoverage {
  checked: boolean;
  backfillVerified: boolean;
  boardRows: number;
  storeRows: number;
  missingCount: number;
  missing: StoreCoverageMissing[];
  lossless: boolean;
  reason: string | null;
}

/**
 * #222: the board rows with no store row, by DEDUPE identity.
 *
 * Identity is `workspaceKey:slug` — the same durable id #83 dedupes on,
 * stable across a fork because a copy keeps both parts. Deliberately NOT
 * the numeric id: a live session's local counter and the store's port
 * counter mint in different spaces, so two unrelated tickets routinely
 * share a numeric id, and matching on it would call a store-unknown row
 * "covered" whenever any store row happens to hold its number.
 *
 * Pure, and separate from the Remote, so it is testable: logic trapped
 * inside a Remote is logic no test can reach. The full missing list is
 * returned in id order; the caller caps what it PRINTS.
 */
export function boardStoreDivergence(
  board: readonly { id: number; title: string; workspaceKey: string; slug: string }[],
  storeIdentities: ReadonlySet<string>,
): { missingCount: number; missing: StoreCoverageMissing[] } {
  const missing: StoreCoverageMissing[] = [];
  for (const row of board) {
    if (!storeIdentities.has(row.workspaceKey + ":" + row.slug)) {
      missing.push({ id: row.id, title: row.title });
    }
  }
  missing.sort((a, b) => a.id - b.id);
  return { missingCount: missing.length, missing };
}

/**
 * #222: the merged-board migration EXPORT, pure half.
 *
 * The board merge already computes the forward-ported truth (newest-wins
 * per `workspaceKey:slug`), so the migration exports the MERGED board into
 * a JSON document instead of diffing folds against the store — every
 * problematic update becomes a plain insert into a fresh store. The Remote
 * further down walks the three merge sources with provenance attached and
 * feeds that walk here; tests feed hand-built copies. What this layer owns:
 *
 * - winner selection per identity with the SAME comparator #83 dedupes
 *   with, so exported field values equal what the board shows;
 * - dropping `builtin:imported_state` evidence (import bookkeeping, 45 rows
 *   in the wild — not evidence);
 * - the refined duplicate rule (never a bare suffix guess): identity is
 *   the stem pair plus an identical `createdAt` (durable identity;
 *   `updatedAt` is recency and never gates), resolution keeps the NEWER
 *   `updatedAt` on either side — the #83 newest-wins applied where the
 *   merge cannot see. Legitimately-suffixed tickets survive on `createdAt`.
 *   Every non-trivial resolution (state or title differed) is named in
 *   the report with both sides and the reason;
 * - resolving every `workspaceKey:NN` reference through the export's own
 *   index while the source folds are still available. `NN` is
 *   session-local addressing: it resolves against the DEPENDING ticket's
 *   own source, never globally. A ref to a dropped twin resolves to the
 *   surviving twin's slug; anything else unresolvable resolves to null and
 *   the loader carries it verbatim and reports it by name.
 *
 * Floats (`createdAt`, `updatedAt`, evidence `at`) cross JSON exactly —
 * shortest-round-trip doubles — and payloads are cloned key-for-key: 100+
 * ad-hoc keys, no schema. `criteria` is always a string; `tags` stays
 * absent when the row carries none.
 */
export const MIGRATION_DOCUMENT_VERSION = 1;

/** Import bookkeeping, not evidence: dropped at export, counted. */
export const MIGRATION_DROPPED_EVIDENCE_KIND = "builtin:imported_state";

/** One merge copy with its provenance, before winner selection. */
export interface MigrationExportRow {
  title: string;
  description: string;
  body: string;
  criteria: string;
  phase: number;
  order: number;
  state: TicketState;
  allowlist: string[];
  dependsOn: string[];
  tags: string[];
  slug: string;
  workspaceKey: string;
  createdAt: number;
  updatedAt: number;
  oldId: number;
  /** The owning session id, or "store" for a store-resident row. */
  oldSource: string;
}

/** One evidence row with its provenance, payload verbatim. */
export interface MigrationExportEvidence {
  oldSource: string;
  oldId: number;
  kind: string;
  author: Actor;
  at: number;
  payload: Record<string, unknown>;
  stamp?: EvidenceStamp;
}

/** One comment with its provenance. */
export interface MigrationExportComment {
  oldSource: string;
  oldId: number;
  text: string;
  author: Actor;
  at: number;
}

/** One candidate row for duplicate detection: identity plus the tie-break. */
export interface BoardMigrationDuplicateCandidate {
  slug: string;
  workspaceKey: string;
  title: string;
  state: string;
  createdAt: number;
  updatedAt: number;
  /** The winning copy's source, for the #83 tie-break. */
  oldSource: string;
}

/** One resolved duplicate pair: the dropped side, and why it lost. */
export interface BoardMigrationDuplicatePair {
  workspaceKey: string;
  keptSlug: string;
  droppedSlug: string;
  createdAt: number;
  keptUpdatedAt: number;
  droppedUpdatedAt: number;
  keptTitle: string;
  droppedTitle: string;
  keptState: string;
  droppedState: string;
  /** How the winner was chosen; the load-bearing record. */
  reason: string;
  /** True when state or title differed — decided by machine, read by human. */
  nontrivial: boolean;
}

/**
 * #222: the duplicate rule, refined. IDENTITY is the base/suffixed slug
 * pair plus an identical `createdAt` — creation time is the durable
 * identity (the backfill preserves it; fork-versus-store measured equal on
 * all 82 pairs), while `updatedAt` is recency and must not gate the match:
 * on the merged board the bare row carries the live fork's newer state,
 * which the old both-timestamps rule mistook for ambiguity. RESOLUTION
 * keeps the NEWER `updatedAt` — the #83 newest-wins semantics applied to a
 * pair the merge cannot see (different slugs) — so a twin that moved
 * further (68/150: the `-2` row is newer) wins over the bare row, and no
 * cutover regresses a ticket to an older snapshot. Exact ties keep the
 * bare row by convention (identical timestamps mean identical content: any
 * set bumps updatedAt). The base slug must still exist — a suffixed slug
 * with no base is a legitimate ticket, never a pair. Chains (S-3 whose
 * base S-2 is itself dropped) resolve to the surviving root.
 */
export function findBoardMigrationDuplicates(
  tickets: readonly BoardMigrationDuplicateCandidate[],
  callerSessionId?: string,
): { pairs: BoardMigrationDuplicatePair[]; droppedSlugs: Set<string> } {
  const byIdentity = new Map<string, BoardMigrationDuplicateCandidate>();
  for (const ticket of tickets) {
    byIdentity.set(ticket.workspaceKey + ":" + ticket.slug, ticket);
  }
  // Pass 1: every suffixed ticket whose base exists with equal createdAt.
  const twinToBase = new Map<string, string>();
  for (const ticket of tickets) {
    const cut = ticket.slug.lastIndexOf("-");
    if (cut <= 0) continue;
    if (!/^\d+$/.test(ticket.slug.slice(cut + 1))) continue;
    const base = ticket.workspaceKey + ":" + ticket.slug.slice(0, cut);
    const baseRow = byIdentity.get(base);
    if (baseRow === undefined) continue;
    if (baseRow.createdAt !== ticket.createdAt) continue;
    twinToBase.set(ticket.workspaceKey + ":" + ticket.slug, base);
  }
  // Pass 2: follow chains to the surviving root (a base that is itself a
  // dropped twin resolves through its keeper; transitive createdAt holds).
  const rootOf = (key: string): string => {
    let current = key;
    const seen = new Set<string>([current]);
    while (twinToBase.has(current)) {
      const next = twinToBase.get(current)!;
      if (seen.has(next)) break;
      seen.add(next);
      current = next;
    }
    return current;
  };
  const groups = new Map<string, BoardMigrationDuplicateCandidate[]>();
  for (const ticket of tickets) {
    const key = ticket.workspaceKey + ":" + ticket.slug;
    const root = twinToBase.has(key) ? rootOf(key) : key;
    const group = groups.get(root);
    if (group === undefined) {
      groups.set(root, [ticket]);
    } else {
      group.push(ticket);
    }
  }
  const ordering = compareBoardCopiesNewestFirst(callerSessionId);
  const pairs: BoardMigrationDuplicatePair[] = [];
  const droppedSlugs = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ranked = [...group].sort((a, b) => {
      const order = ordering(
        { updatedAt: a.updatedAt, sourceSessionId: a.oldSource },
        { updatedAt: b.updatedAt, sourceSessionId: b.oldSource },
      );
      // A true tie (same recency, same source class) keeps the bare row:
      // identical timestamps mean identical content, so the slug is the
      // only thing left to prefer, and the bare form is the stable one.
      if (order !== 0) return order;
      const aSuffixed = /-\d+$/.test(a.slug) ? 1 : 0;
      const bSuffixed = /-\d+$/.test(b.slug) ? 1 : 0;
      return aSuffixed - bSuffixed;
    });
    const winner = ranked[0]!;
    for (const loser of ranked.slice(1)) {
      const key = loser.workspaceKey + ":" + loser.slug;
      if (droppedSlugs.has(key)) continue;
      droppedSlugs.add(key);
      const tied = winner.updatedAt === loser.updatedAt;
      pairs.push({
        workspaceKey: loser.workspaceKey,
        keptSlug: winner.slug,
        droppedSlug: loser.slug,
        createdAt: loser.createdAt,
        keptUpdatedAt: winner.updatedAt,
        droppedUpdatedAt: loser.updatedAt,
        keptTitle: winner.title,
        droppedTitle: loser.title,
        keptState: winner.state,
        droppedState: loser.state,
        reason: tied
          ? `tied updatedAt ${winner.updatedAt}; #83 order prefers ${winner.oldSource}, bare by convention`
          : `newer updatedAt wins: kept ${winner.updatedAt} > dropped ${loser.updatedAt}`,
        nontrivial: winner.state !== loser.state || winner.title !== loser.title,
      });
    }
  }
  pairs.sort((a, b) => (a.droppedSlug < b.droppedSlug ? -1 : a.droppedSlug > b.droppedSlug ? 1 : 0));
  return { pairs, droppedSlugs };
}

/** Everything the export builder consumes. Copies, not winners. */
export interface BuildBoardMigrationInput {
  workspaceKey: string;
  absPath: string;
  projectName: string;
  exportedAt: number;
  callerSessionId: string;
  rows: MigrationExportRow[];
  evidence: MigrationExportEvidence[];
  comments: MigrationExportComment[];
  /** Live plan_meta (frontmatter, preamble, sections) plus live rules. */
  plan: PlanValue;
  phases: Array<{ number: number; title: string; state: string }>;
  /**
   * Retired identities skipped at the walk (`workspaceKey:slug`), censused
   * so the report is exact — and embedded in the file so the real run can
   * refuse an export that excluded any.
   */
  retiredIdentities: string[];
  /** Whether the source backfill had verified when the export ran. */
  backfillVerified: boolean;
}

/** The export report: every stage counted, nothing asserted. */
export interface BoardMigrationReport {
  boardInputRows: number;
  mergedRows: number;
  duplicatesMatched: number;
  duplicatesDropped: string[];
  /**
   * Every resolved pair with both sides' slugs, states, titles and the
   * reason the winner won. The load-bearing record: the owner triages
   * nothing by hand any more, so each non-trivial resolution
   * (state or title differed) is named here.
   */
  duplicateResolutions: BoardMigrationDuplicatePair[];
  /** Distinct tickets sharing a slug stem (createdAt differs): both KEPT, named for the human edit step. Expect ~0. */
  nearDuplicates: Array<{ workspaceKey: string; keptSlug: string; otherSlug: string }>;
  evidenceKept: number;
  evidenceDroppedImportedState: number;
  /** Non-winner rows the winner lacked, forwarded onto the survivor. */
  evidenceForwardedFromCopies: number;
  /** Same (kind, at) as a survivor row: the inherited prefix both sides hold. */
  evidenceDroppedDuplicate: number;
  commentsKept: number;
  commentsForwardedFromCopies: number;
  commentsDroppedDuplicate: number;
  depsTotal: number;
  depsResolved: number;
  depsUnresolved: number;
  refusals: string;
  retiredExcluded: number;
  plan: { frontmatterBytes: number; preambleBytes: number; sectionCount: number; totalBytes: number };
  phaseCount: number;
  ticketsExported: number;
}

function migrationCopyKey(source: string, id: number): string {
  return source + "\u0000" + String(id);
}

/** What a migration dry run returns: the JSON path plus the full report. */
export interface BoardMigrationDryRunResult {
  dryRun: true;
  jsonPath: string;
  /** The candidate path a real run would write (nothing written yet). */
  defaultStorePath: string;
  backfillVerified: boolean;
  report: BoardMigrationReport;
}

/** What a migration real run returns: the load plus its own proof. */
export interface BoardMigrationRunResult {
  dryRun: false;
  jsonPath: string;
  storePath: string;
  exportedTicketCount: number;
  load: BoardMigrationLoadResult;
  verification: {
    ticketCountMatches: boolean;
    storeTickets: number;
    /** Live board winners at real-run time — the side export loss is visible on. */
    boardRows: number;
    /**
     * Board rows predating the export and missing from the candidate.
     * Always empty on success (non-empty refuses); kept in the shape so
     * the check's execution is observable, not implied.
     */
    exportLoss: Array<{ slug: string; title: string }>;
    /** Born after the export and missing from the candidate: expected on a live board, named, never refused. */
    drift: Array<{ slug: string; title: string }>;
    /** In the export report but cut from the document by hand: acknowledged deletions, named, never refused. */
    humanRemoved: Array<{ slug: string; title: string }>;
    /** In the candidate but not on the board (hand-added or board-moved): informational only. */
    candidateExtra: Array<{ slug: string; title: string }>;
    /** Tickets whose updatedAt the load dragged forward (see the loader): named, never silent. */
    adjustedUpdatedAt: Array<{ slug: string; from: number; to: number }>;
    /**
     * STRICT board-completeness: true only when the candidate holds every
     * live-board row by slug identity — gates pass, counts match, and
     * exportLoss, drift and humanRemoved are all empty. Anything less is
     * false with the exact gap named above. It never answers a narrower
     * question than the one being asked.
     */
    lossless: boolean;
  };
  note: string;
}

/** UTF-8 byte length without node:Buffer (the host builtins shim has none). */
function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * #222: winner selection per identity, newest first — the #83 rule, so the
 * export carries the field values the board shows. Shared by the export
 * builder and the real run's live-board comparison, so both sides resolve
 * copies identically.
 */
export function selectMigrationWinners(
  rows: readonly MigrationExportRow[],
  callerSessionId: string,
): MigrationExportRow[] {
  const groups = new Map<string, MigrationExportRow[]>();
  const groupOrder: string[] = [];
  for (const row of rows) {
    const identity = row.workspaceKey + ":" + row.slug;
    const group = groups.get(identity);
    if (group === undefined) {
      groups.set(identity, [row]);
      groupOrder.push(identity);
    } else {
      group.push(row);
    }
  }
  const ordering = compareBoardCopiesNewestFirst(callerSessionId);
  const winners: MigrationExportRow[] = [];
  for (const identity of groupOrder) {
    const group = groups.get(identity)!;
    const ranked = [...group].sort((a, b) =>
      ordering({ updatedAt: a.updatedAt, sourceSessionId: a.oldSource }, { updatedAt: b.updatedAt, sourceSessionId: b.oldSource }),
    );
    winners.push(ranked[0]!);
  }
  return winners;
}

export function buildBoardMigrationDocument(input: BuildBoardMigrationInput): {
  doc: BoardMigrationDocument;
  report: BoardMigrationReport;
} {
  const winners = selectMigrationWinners(input.rows, input.callerSessionId);

  // The refined duplicate rule over the winners: identity by stem plus
  // createdAt, resolution by newest updatedAt — either side may survive
  // (the -2 twin wins when it moved further, as 68/150 proves). A dropped
  // row takes nothing with it that the survivor lacks: history triage
  // below forwards what is unique.
  const { pairs, droppedSlugs } = findBoardMigrationDuplicates(winners, input.callerSessionId);
  const survivors = winners.filter((row) => !droppedSlugs.has(row.workspaceKey + ":" + row.slug));

  /*
   * Near-duplicates: the genuinely ambiguous remainder. Same stem shape
   * with the base present, but a DIFFERENT createdAt — two distinct
   * tickets sharing a slug stem, not two copies of one ticket. Both are
   * kept; the report names them for the human EDIT step. Expect ~0: every
   * same-createdAt stem pair above already resolved into `pairs`.
   */
  const survivorKeys = new Set(survivors.map((row) => row.workspaceKey + ":" + row.slug));
  const nearDuplicates: BoardMigrationReport["nearDuplicates"] = [];
  for (const row of survivors) {
    const cut = row.slug.lastIndexOf("-");
    if (cut <= 0) continue;
    if (!/^\d+$/.test(row.slug.slice(cut + 1))) continue;
    const base = row.slug.slice(0, cut);
    const baseKey = row.workspaceKey + ":" + base;
    if (!survivorKeys.has(baseKey)) continue;
    const baseRow = survivors.find((candidate) => candidate.workspaceKey === row.workspaceKey && candidate.slug === base)!;
    if (baseRow.createdAt !== row.createdAt) {
      nearDuplicates.push({ workspaceKey: row.workspaceKey, keptSlug: base, otherSlug: row.slug });
    }
  }
  nearDuplicates.sort((a, b) => (a.otherSlug < b.otherSlug ? -1 : a.otherSlug > b.otherSlug ? 1 : 0));

  // Survivor index: every copy (winner, loser, dropped twin) resolves to
  // the slug that survives it, for dependency rewriting — plus the winning
  // row behind each copy, for history triage below.
  const keptByPair = new Map<string, string>();
  for (const pair of pairs) {
    keptByPair.set(pair.workspaceKey + ":" + pair.droppedSlug, pair.keptSlug);
  }
  const winnerOfIdentity = new Map<string, MigrationExportRow>();
  for (const row of survivors) {
    winnerOfIdentity.set(row.workspaceKey + ":" + row.slug, row);
  }
  const survivorOf = new Map<string, string>();
  const winnerByCopy = new Map<string, MigrationExportRow>();
  for (const row of input.rows) {
    const identity = row.workspaceKey + ":" + row.slug;
    const twinKept = keptByPair.get(identity);
    if (twinKept !== undefined) {
      const kept = survivors.find(
        (candidate) => candidate.workspaceKey === row.workspaceKey && candidate.slug === twinKept,
      )!;
      survivorOf.set(migrationCopyKey(row.oldSource, row.oldId), twinKept);
      winnerByCopy.set(migrationCopyKey(row.oldSource, row.oldId), kept);
      continue;
    }
    const winner = winnerOfIdentity.get(identity)!;
    survivorOf.set(migrationCopyKey(row.oldSource, row.oldId), winner.slug);
    winnerByCopy.set(migrationCopyKey(row.oldSource, row.oldId), winner);
  }

  /*
   * History triage, by row identity. The winner's own rows are kept whole.
   * A non-winner copy's row is FORWARDED onto the survivor when the winner
   * lacks that identity — post-fork work on store-resident tickets lives
   * exactly here — and dropped as a duplicate when the winner already holds
   * it (the same inherited prefix on both sides). Forwarded keys join the
   * winner's set, so two losers holding the same row forward it once.
   * Evidence identity is (kind, at); comments have no kind, so theirs is
   * (at, author, text).
   */
  const survivorSlugs = new Set(survivors.map((row) => row.slug));
  const evidenceSeen = new Map<string, Set<string>>();
  const commentsSeen = new Map<string, Set<string>>();
  for (const row of survivors) {
    evidenceSeen.set(row.slug, new Set<string>());
    commentsSeen.set(row.slug, new Set<string>());
  }
  for (const row of input.evidence) {
    if (row.kind === MIGRATION_DROPPED_EVIDENCE_KIND) continue;
    const copyKey = migrationCopyKey(row.oldSource, row.oldId);
    const winner = winnerByCopy.get(copyKey);
    if (winner === undefined) continue;
    if (winner.oldSource === row.oldSource && winner.oldId === row.oldId) {
      evidenceSeen.get(winner.slug)!.add(row.kind + ":" + String(row.at));
    }
  }
  for (const comment of input.comments) {
    const copyKey = migrationCopyKey(comment.oldSource, comment.oldId);
    const winner = winnerByCopy.get(copyKey);
    if (winner === undefined) continue;
    if (winner.oldSource === comment.oldSource && winner.oldId === comment.oldId) {
      commentsSeen.get(winner.slug)!.add(String(comment.at) + ":" + comment.author + ":" + comment.text);
    }
  }
  let evidenceDroppedImportedState = 0;
  let evidenceForwardedFromCopies = 0;
  let evidenceDroppedDuplicate = 0;
  const keptEvidence: BoardMigrationEvidence[] = [];
  for (const row of input.evidence) {
    if (row.kind === MIGRATION_DROPPED_EVIDENCE_KIND) {
      evidenceDroppedImportedState += 1;
      continue;
    }
    const copyKey = migrationCopyKey(row.oldSource, row.oldId);
    const slug = survivorOf.get(copyKey);
    const winner = winnerByCopy.get(copyKey);
    if (slug === undefined || winner === undefined || !survivorSlugs.has(slug)) {
      evidenceDroppedDuplicate += 1;
      continue;
    }
    const key = row.kind + ":" + String(row.at);
    const seen = evidenceSeen.get(winner.slug)!;
    if (winner.oldSource === row.oldSource && winner.oldId === row.oldId) {
      keptEvidence.push({
        ticketSlug: slug,
        kind: row.kind,
        author: row.author,
        at: row.at,
        payload: deepClone(row.payload) as Record<string, unknown>,
        ...(row.stamp === undefined ? {} : { stamp: deepClone(row.stamp) }),
      });
      continue;
    }
    if (seen.has(key)) {
      evidenceDroppedDuplicate += 1;
      continue;
    }
    seen.add(key);
    evidenceForwardedFromCopies += 1;
    keptEvidence.push({
      ticketSlug: slug,
      kind: row.kind,
      author: row.author,
      at: row.at,
      payload: deepClone(row.payload) as Record<string, unknown>,
      ...(row.stamp === undefined ? {} : { stamp: deepClone(row.stamp) }),
    });
  }
  let commentsForwardedFromCopies = 0;
  let commentsDroppedDuplicate = 0;
  const keptComments: BoardMigrationComment[] = [];
  for (const comment of input.comments) {
    const copyKey = migrationCopyKey(comment.oldSource, comment.oldId);
    const slug = survivorOf.get(copyKey);
    const winner = winnerByCopy.get(copyKey);
    if (slug === undefined || winner === undefined || !survivorSlugs.has(slug)) {
      commentsDroppedDuplicate += 1;
      continue;
    }
    const key = String(comment.at) + ":" + comment.author + ":" + comment.text;
    const seen = commentsSeen.get(winner.slug)!;
    if (winner.oldSource === comment.oldSource && winner.oldId === comment.oldId) {
      keptComments.push({ ticketSlug: slug, text: comment.text, author: comment.author, at: comment.at });
      continue;
    }
    if (seen.has(key)) {
      commentsDroppedDuplicate += 1;
      continue;
    }
    seen.add(key);
    commentsForwardedFromCopies += 1;
    keptComments.push({ ticketSlug: slug, text: comment.text, author: comment.author, at: comment.at });
  }

  // Dependency resolution, per depending ticket in ITS source's address
  // space. Anything unresolvable resolves to null; the loader carries the
  // original string and reports it by name.
  let depsResolved = 0;
  let depsUnresolved = 0;
  const docTickets: BoardMigrationTicket[] = survivors.map((row) => {
    const depTargets: Record<string, string | null> = {};
    for (const ref of row.dependsOn) {
      const colon = ref.lastIndexOf(":");
      let target: string | null = null;
      if (colon > 0) {
        const head = ref.slice(0, colon);
        const tail = Number(ref.slice(colon + 1));
        if (head === row.workspaceKey && Number.isInteger(tail) && tail >= 1) {
          target = survivorOf.get(migrationCopyKey(row.oldSource, tail)) ?? null;
        }
      }
      depTargets[ref] = target;
      if (target !== null) depsResolved += 1;
      else depsUnresolved += 1;
    }
    return {
      slug: row.slug,
      title: row.title,
      description: row.description,
      body: row.body,
      criteria: row.criteria,
      phase: row.phase,
      order: row.order,
      state: row.state,
      allowlist: [...row.allowlist],
      dependsOn: [...row.dependsOn],
      depTargets,
      ...(row.tags.length === 0 ? {} : { tags: [...row.tags] }),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      oldId: row.oldId,
      oldSource: row.oldSource,
    };
  });
  // Deterministic document order: the board's phase/order sort, slug last
  // (old numeric ids collide across sources, so they cannot order).
  docTickets.sort((a, b) => a.phase - b.phase || a.order - b.order || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const planJson = JSON.stringify(input.plan);
  // DISTINCT identities here too: the walk may hand the same identity
  // twice, and the gate reads this count — copies must never trip it.
  const retiredExcluded = new Set(input.retiredIdentities).size;
  const doc: BoardMigrationDocument = {
    version: MIGRATION_DOCUMENT_VERSION,
    exportedAt: input.exportedAt,
    workspaceKey: input.workspaceKey,
    absPath: input.absPath,
    projectName: input.projectName,
    tickets: docTickets,
    evidence: keptEvidence,
    comments: keptComments,
    plan: deepClone(input.plan),
    phases: input.phases.map((phase) => ({ ...phase })),
    exportReport: {
      retiredExcluded,
      backfillVerified: input.backfillVerified,
      exportedSlugs: docTickets.map((ticket) => ticket.slug),
    },
  };
  const report: BoardMigrationReport = {
    boardInputRows: input.rows.length,
    mergedRows: winners.length,
    duplicatesMatched: pairs.length,
    duplicatesDropped: pairs.map((pair) => pair.droppedSlug),
    duplicateResolutions: pairs,
    nearDuplicates,
    evidenceKept: keptEvidence.length,
    evidenceDroppedImportedState,
    evidenceForwardedFromCopies,
    evidenceDroppedDuplicate,
    commentsKept: keptComments.length,
    commentsForwardedFromCopies,
    commentsDroppedDuplicate,
    depsTotal: depsResolved + depsUnresolved,
    depsResolved,
    depsUnresolved,
    refusals: "not migrated, by owner decision: the 40 refusals die at cutover, no refusals table is built",
    retiredExcluded,
    plan: {
      frontmatterBytes: utf8ByteLength(input.plan.frontmatter),
      preambleBytes: utf8ByteLength(input.plan.context.preamble),
      sectionCount: input.plan.context.contextSections.length,
      totalBytes: utf8ByteLength(planJson),
    },
    phaseCount: input.phases.length,
    ticketsExported: docTickets.length,
  };
  return { doc, report };
}

/**
 * #217: a one-ticket read for a plain numeric id while the workspace's
 * one-time import has not completed yet. The ticket may simply not be
 * loaded — this is NOT the settled "no such ticket" fact, and it must
 * never read as one: an agent that hits it once must retry after a board
 * read (which kicks the same import) rather than conclude the ticket is
 * gone. The message keeps the "no such ticket" prefix so existing
 * refusal-shape matchers still hold, and says "yet" so it cannot be
 * mistaken for settled.
 */
export class TicketNotYetImported extends Error {
  readonly ticketId: number | string;
  constructor(ticketId: number | string) {
    super(
      `no such ticket yet: ${ticketId} — not loaded yet, the workspace import is still running; ` +
        `call get_tickets, then get_ticket again. A repeat refusal means the ticket does not exist.`,
    );
    this.ticketId = ticketId;
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

/*
 * #156: what a change just UNLOCKED.
 *
 * The satisfied-definition, stated once and taken from the board's own
 * semantics rather than invented here: a dependency reference is SATISFIED
 * when the ticket it resolves to is `done`. That is the rule the board
 * already applies in `_liveDependents` (#108), where a DONE dependent "does
 * not block: it has already been satisfied, so its reference is history,
 * not an outstanding need". A reference that resolves to nothing (dangling,
 * or pointing into a retired ticket, which the board hides) is NOT
 * satisfied — the same way such a reference blocks a retirement.
 *
 * The computation is a pure function over `dependsOn` plus the current
 * states: `unlockedTicketIds` names every live, not-done ticket whose every
 * dependency is satisfied. The digest plumbing computes that set before and
 * after one change and announces only the DIFFERENCE, so a ticket that was
 * already unblocked is never re-announced.
 */

/** One ticket as the unlock scan sees it: identity plus dependency state. */
export interface DependencyScanEntry {
  id: number;
  workspaceKey: string;
  slug: string;
  state: TicketState;
  dependsOn: readonly string[];
}

/**
 * Resolve one `dependsOn` reference to its canonical `workspaceKey:id`
 * form, exactly the way `_validatedSupersedeRefs` resolves supersede
 * references "the same way dependsOn references are resolved":
 * `workspaceKey:id`, `workspaceKey:slug`, or a legacy bare number/slug
 * against the depending ticket's own workspace. Returns undefined when the
 * reference names no ticket in the scan — an unsatisfied dependency, not an
 * error: a pure scan cannot throw.
 */
export function resolveDependencyRef(
  ref: string,
  entries: readonly DependencyScanEntry[],
  ownWorkspaceKey: string,
): string | undefined {
  const colon = ref.indexOf(":");
  const key = colon >= 0 ? ref.slice(0, colon) : ownWorkspaceKey;
  const tail = colon >= 0 ? ref.slice(colon + 1) : ref;
  for (const entry of entries) {
    if (entry.workspaceKey !== key) continue;
    if (/^\d+$/.test(tail)) {
      if (entry.id === Number(tail)) return `${entry.workspaceKey}:${entry.id}`;
    } else if (entry.slug === tail) {
      return `${entry.workspaceKey}:${entry.id}`;
    }
  }
  return undefined;
}

/**
 * The tickets that are CURRENTLY unblocked: live (not hidden as retired by
 * the caller — a retired ticket takes no writes, so unlocking it says
 * nothing), not done themselves, and every `dependsOn` reference resolved
 * and `done`. Sorted by id so a multi-unlock line reads deterministically.
 */
export function unlockedTicketIds(
  entries: readonly DependencyScanEntry[],
): number[] {
  const done = new Set(
    entries.filter((e) => e.state === "done").map((e) => `${e.workspaceKey}:${e.id}`),
  );
  const out: number[] = [];
  for (const entry of entries) {
    if (entry.state === "done") continue;
    if (entry.dependsOn.length === 0) continue;
    let all = true;
    for (const ref of entry.dependsOn) {
      const target = resolveDependencyRef(ref, entries, entry.workspaceKey);
      if (target === undefined || !done.has(target)) {
        all = false;
        break;
      }
    }
    if (all) out.push(entry.id);
  }
  out.sort((a, b) => a - b);
  return out;
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

  /**
   * The board rows of one agent's session. Sorted by phase and order.
   *
   * #207/#84: the agent read resolves against the WORKSPACE — the same
   * merged board the browser reads through `workspaceTickets` — not against
   * one session's fold. A fresh session with an empty own log sees the
   * workspace's tickets (live sessions fold from memory, closed sessions
   * from the workspace store) and never an ok:true empty list while the
   * workspace holds rows. There is ONE derivation, `_workspaceBoardMerge`;
   * this method and the browser remote are its two callers.
   *
   * Ids (#207 design decision, closed by #45): rows keep their NUMERIC id.
   * Store rows are already renumbered into the workspace id space (#41),
   * so they never collide; a live foreign row that collides with an own id
   * is the one accepted residual the phase documents. Every row carries
   * `sourceSessionId` provenance, `foreign` is false for all of them, and
   * every row is ADDRESSED by its plain id — the composite
   * `<sourceSessionId>:<id>` string the write path used to parse is deleted
   * outright by #45. A composite string in the `id` field itself would
   * break every numeric consumer (sorting, paging, tool schemas).
   *
   * Project scoping (#207 design decision): an ABSENT projectId means the
   * WORKSPACE — every row of the merged board, no per-session narrowing,
   * no minted empty project (#84). An explicit projectId filters the
   * merged rows and refuses UnknownProject only when NO source on the
   * workspace (own fold, live sessions, store) holds that id.
   *
   * This method stays SYNCHRONOUS deliberately: src/tools/allowlist.ts
   * reads it from the write-boundary path, which cannot await. The
   * one-time backfill therefore cannot be awaited here either — the merge
   * KICKS it off (shared through `_backfillRuns`, awaited by every
   * workspaceTickets caller), so imported closed-session rows are visible
   * from the next read on, while live sessions are visible on this one.
   */
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
    // (empty) session log — then the WORKSPACE merge on top of it.
    const reader = this._boardAgent(agent);
    const rows = this._workspaceBoardMerge(reader, opts?.includeRetired === true).tickets;
    let scoped: BoardTicketView[];
    if (opts?.projectId !== undefined) {
      const known = new Set(rows.map((row) => row.projectId));
      if (!known.has(opts.projectId as ProjectId)) {
        throw new UnknownProject(opts.projectId);
      }
      scoped = rows.filter((row) => row.projectId === opts.projectId);
    } else if (opts?.projectIds !== undefined) {
      scoped = rows.filter((row) => (opts.projectIds as readonly number[]).includes(row.projectId));
    } else {
      scoped = rows;
    }
    // FilterPanel-parity filtering (#49): server-side, no default narrowing.
    // Retired rows were already dropped by the merge (the same rule the
    // browser merge applies); includeRetired swept them back in above.
    return filterTicketViews(scoped, {
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
   * Accepts a plain id (number or decimal string) or a slug. A plain id the
   * caller's fold does not hold resolves through the workspace merge to
   * its owning session, so a foreign ticket resolves too (#45).
   */
  getTicket(
    agent: Agent,
    args: { ticketId: number | string },
  ): {
    ticket: TicketView;
    evidence: EvidenceRow[];
    comments: CommentRecord[];
  } {
    // #146: hop to the dispatching board FIRST, then apply plain-id owner
    // routing on top of it (#45).
    const reader = this._boardAgent(agent);
    try {
      const routed = this._routedAgent(reader, args.ticketId);
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
    } catch (error) {
      /*
       * #207: a ticket that lives in another session's log of this
       * workspace resolves here even when its owner is CLOSED — the owner
       * fold cannot answer (OwnerUnavailable: routing only reaches live
       * owners) and the own fold never held the row (UnknownTicket). The
       * workspace store can: the one-time backfill renumbered the row into
       * the workspace id space, so the plain numeric id resolves without
       * any live owner. A genuinely unknown id rethrows the original
       * error. (#45: the composite form is not accepted here either — a
       * colon ref refuses, it never resolves through its tail.)
       */
      if (!(error instanceof UnknownTicket) && !(error instanceof OwnerUnavailable)) {
        throw error;
      }
      const fromStore = this._ticketInWorkspaceStore(reader, args.ticketId);
      if (fromStore !== null) return fromStore;
      /*
       * #217: transient versus settled refusal. The store fallback above
       * already kicked the one-time import through `_workspaceStoreForRead`
       * (the same seam every other read uses), so when the import has still
       * not completed and the ref is a plain numeric id, the ticket may
       * simply not be loaded yet — refuse as "not loaded yet", never as the
       * settled "no such ticket" fact an agent could act on (retire it,
       * recreate it, or report it gone). Colon/composite and non-numeric
       * refs stay settled: no retry ever resolves them (#45). A completed
       * import also stays settled: the ticket genuinely does not exist.
       */
      const ref = args.ticketId;
      const plainNumeric = typeof ref === "number" || (typeof ref === "string" && /^\d+$/.test(ref));
      if (plainNumeric) {
        const entry = this._workspaceStoreForRead(reader);
        // #221: verified, not merely marked — a landed batch writes its
        // marker long before the last batch runs, and an id missing
        // mid-import is still "not loaded yet", never a settled absence.
        if (entry !== null && !this._isBackfillVerified(reader)) {
          throw new TicketNotYetImported(ref);
        }
      }
      throw error;
    }
  }

  /**
   * #207: resolve one ticket from the workspace store — the read-side
   * fallback that lets get_ticket/get_evidence reach a CLOSED session's
   * ticket. Returns null (never throws) when no store exists, the
   * reference is not a plain numeric id, or the id does not resolve to a
   * row of the workspace project. (#45: a colon ref returns null — the
   * composite form lost its routing branch everywhere, including here.)
   */
  private _ticketInWorkspaceStore(
    agent: Agent,
    ticketRef: number | string,
  ): { ticket: TicketView; evidence: EvidenceRow[]; comments: CommentRecord[] } | null {
    const entry = this._workspaceStoreForRead(agent);
    if (entry === null) return null;
    let id: number;
    if (typeof ticketRef === "number") {
      id = ticketRef;
    } else {
      if (ticketRef.includes(":")) return null;
      if (!/^\d+$/.test(ticketRef)) return null;
      id = Number(ticketRef);
    }
    const state = entry.store.state;
    const view = ticketsProjection(state, this._resolvedConfig).get(id as TicketId);
    if (view === undefined || view.projectId !== entry.projectId) return null;
    return {
      ticket: view,
      evidence: [...(state.evidence.get(id as TicketId) ?? [])],
      comments: [...(state.comments.get(id as TicketId) ?? [])],
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

  /**
   * #207: which state holds one project for the agent READ paths (plan,
   * plan_meta). An explicit id resolves in the reader's own fold first,
   * then in the workspace store, and refuses UnknownProject when no source
   * holds it. An ABSENT id means the workspace: the reader's own project
   * while it actually holds tickets (the working session's own rows are
   * the newest truth, and this preserves every session-local plan), else
   * the workspace store's project — where the one-time backfill put the
   * workspace's tickets — and only a workspace with no store and no own
   * tickets falls back to `_ensureProject`. A fresh session over a
   * backfilled workspace therefore plans the REAL project instead of
   * minting an empty one (#84).
   */
  private _planProjectSource(
    reader: Agent,
    explicit: number | undefined,
  ): { projectId: ProjectId; state: AidosState } {
    const cache = this._cache(reader.session);
    this._sync(reader.session, cache);
    if (explicit !== undefined) {
      if (cache.state.projects.has(explicit as ProjectId)) {
        return { projectId: explicit as ProjectId, state: cache.state };
      }
      const entry = this._workspaceStoreForRead(reader);
      if (entry !== null && entry.store.state.projects.has(explicit as ProjectId)) {
        return { projectId: explicit as ProjectId, state: entry.store.state };
      }
      throw new UnknownProject(explicit);
    }
    const foldProjectId = this._ensureProject(reader).projectId;
    if (this._ticketsFor(foldProjectId, cache.state).length > 0) {
      return { projectId: foldProjectId, state: cache.state };
    }
    const entry = this._workspaceStoreForRead(reader);
    if (
      entry !== null &&
      this._ticketsFor(entry.projectId, entry.store.state).length > 0
    ) {
      return { projectId: entry.projectId, state: entry.store.state };
    }
    return { projectId: foldProjectId, state: cache.state };
  }

  /** Serialize one project's plan as markdown. */
  plan(agent: Agent, opts?: { projectId?: number }): string {
    // #146: a subagent serializes the dispatching board's plan — resolved
    // against the workspace (#207) through the one project source above.
    const reader = this._boardAgent(agent);
    const { projectId, state } = this._planProjectSource(reader, opts?.projectId);
    const meta = this._planMetaOf(projectId, state);
    /*
     * #108: a retired ticket does not render into the plan document. The
     * plan is the export the plan_import round trip feeds on; a retired
     * ticket must not re-enter a fresh project through it.
     */
    const planTickets = this._ticketsFor(projectId, state).filter(
      (row) => !this._isRetired(state, row.id),
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
    // #146: same reader rule as plan(); #207: same workspace resolution.
    const reader = this._boardAgent(agent);
    const { projectId, state } = this._planProjectSource(reader, opts?.projectId);
    return this._planMetaOf(projectId, state);
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
   * surface. #44: the primary path queries the workspace store's FTS5
   * index (title, description, criteria, comment text) — so a ticket in a
   * CLOSED session is reachable, and a word from a DESCRIPTION matches,
   * neither of which the old live-session walk could do. The FTS match is
   * TOKEN-based with per-token prefix matching, not substring: "board"
   * finds "board" and "board refactor" but not "dashboard" (the old
   * substring behavior matched it; that was a false friend, and the
   * description coverage this ticket exists for is worth the change).
   *
   * The live-session walk below is a TRANSITIONAL BRIDGE (#42 retires it):
   * until the mirrored write path lands, tickets created after the #41
   * backfill exist only in their live session logs, and dropping the walk
   * now would blind search to them. Store hits win; a live hit whose
   * (workspaceKey, ticketId) the store already returned is skipped.
   *
   * Either path returns the stored reference fields the board needs to
   * render a dependency badge and to add a dependency. Retired tickets are
   * never hits (#108): the picker is a write surface.
   */
  @Remote("searchTickets")
  searchTickets(agent: Agent, args: { query: string }): TicketSearchResult[] {
    const query = (args.query ?? "").toLowerCase().trim();
    if (!query) return [];
    const results: TicketSearchResult[] = [];
    const seen = new Set<string>();

    // #44: the FTS index of this workspace's store — read-only, and only
    // when a store already exists on disk (a search must never CREATE a
    // store as a side effect; #42's first-open wiring owns creation).
    const cwd = agent.session?.header?.cwd;
    if (cwd) {
      try {
        if (existsSync(storePathForWorkspace(cwd))) {
          /*
           * #217: GUARDED kick — the store file exists, so reaching the
           * one-time import through `_workspaceStoreForRead` (the same seam
           * every other read uses) creates nothing new. The `existsSync`
           * guard above is what keeps #44's "a search never creates a
           * store" rule intact: with no file on disk this whole block is
           * skipped and no kick fires.
           */
          this._workspaceStoreForRead(agent);
          const storage = openWorkspaceStorage(cwd);
          for (const row of storage.searchTickets(query)) {
            seen.add(`${row.workspaceKey}:${row.ticketId}`);
            results.push({
              sessionId: row.sessionId ?? "",
              ticketId: row.ticketId,
              title: row.title,
              state: row.state,
              workspaceKey: row.workspaceKey,
              dependsOn: row.dependsOn,
            });
          }
        }
      } catch (error) {
        this.ctx.logger?.debug?.(
          `aidos: store search unavailable for ${cwd}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

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
        const ref = `${ticket.workspaceKey}:${id}`;
        if (seen.has(ref)) continue;
        seen.add(ref);
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
   * store and the aidos.tickets projection.
   *
   * #42: no longer limited to live sessions. The workspace STORE is queried
   * too — the rows the one-time backfill imported — so a closed session's
   * board comes from the store, and a session whose log is gone entirely
   * still resolves. The live session's fold (when it IS live) is
   * authoritative: a store row whose slug identity the live fold already
   * returned is skipped, never a stale store copy shadowing a live one.
   * A session that is not live and has no store rows still returns an empty
   * board (the client treats that as "session not open").
   */
  @Remote("coldTickets")
  coldTickets(agent: Agent, args: { sessionId: string; states?: string[] }): TicketView[] {
    const rows: TicketView[] = [];
    const liveIdentities = new Set<string>();
    const session = this.ctx.sessions.get(args.sessionId as any);
    if (session) {
      let snap;
      try {
        snap = this.ctx.sessionProjections.snapshot(session);
      } catch (error) {
        this.ctx.logger?.debug?.(`aidos: no projection snapshot for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`);
        snap = undefined;
      }
      if (snap) {
        const tickets = snap.values["aidos.tickets"];
        if (tickets) {
          /*
           * #108: a cold board read hides retired tickets, exactly as the
           * live merge does — the two surfaces must not disagree about what
           * a board holds.
           */
          const evidenceSnap = snap.values["aidos.evidence"] as
            | Record<string, EvidenceRow[]>
            | undefined;
          let live = Object.values(tickets).filter(
            (ticket) => !isRetired(evidenceSnap?.[String(ticket.id)]),
          );
          if (args.states && args.states.length > 0) {
            live = live.filter((ticket) => (args.states as string[]).includes(ticket.state));
          }
          for (const ticket of live) {
            liveIdentities.add(ticket.workspaceKey + ":" + ticket.slug);
            rows.push(ticket);
          }
        }
      }
    }
    // #42: the store query. No persistence access, no log scan — closed
    // sessions' rows are served from the workspace store the backfill
    // imported, so a deleted log changes nothing here. #217: through the
    // same `_workspaceStoreForRead` seam every other read uses, so a cold
    // host whose first board interaction is this surface still starts the
    // one-time import (a board read may create the store; only search may
    // not, per #44).
    const workspaceStore = this._workspaceStoreForRead(agent);
    if (workspaceStore !== null) {
      const storeState = workspaceStore.store.state;
      for (const view of ticketsProjection(storeState, this._resolvedConfig).values()) {
        if (view.projectId !== workspaceStore.projectId) continue;
        if (liveIdentities.has(view.workspaceKey + ":" + view.slug)) continue;
        if (this._isRetired(storeState, view.id)) continue;
        if (args.states && args.states.length > 0 && !args.states.includes(view.state)) continue;
        rows.push(view);
      }
    }
    return rows;
  }

  // ---- cross-session board (workspace merge) ----

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
   *
   * #42: null when the list itself failed — the caller must tell "no closed
   * sessions" from "could not ask", because an empty backfill would land the
   * completion marker and lose every closed log, while a failed list must
   * leave the marker absent so the next open retries.
   */
  private async _closedWorkspaceSessionIds(
    agent: Agent,
    exclude: Set<string>,
  ): Promise<SessionId[] | null> {
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
      return null;
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
   * from memory, closed sessions from the WORKSPACE STORE (#42: the one-time
   * backfill imports them on first open; no per-read log scan). #45: ids
   * are workspace-unique (the store's port counter, #39, with every
   * imported log renumbered into that space, #41), so every row carries
   * only its owning session id as PROVENANCE — `foreign` is false for
   * every row the merge produces, the evidence and comment maps are keyed
   * by the plain `String(id)` every reader derives, and the composite
   * `<sourceSessionId>:<id>` address is gone.
   *
   * #207: this is THE ONE DERIVATION. The browser remote (`workspaceTickets`
   * below) and the agent read path (`getTickets`, `getTicket`'s store
   * fallback, `plan`/`planMeta` through `_planProjectSource`) all consume it,
   * so the browser board and the agent board can never disagree about what
   * the workspace holds. It is SYNCHRONOUS on purpose: `getTickets` is read
   * from the write-boundary path in src/tools/allowlist.ts, which cannot
   * await. The one-time backfill is therefore KICKED off here (shared
   * through `_backfillRuns`) rather than awaited — `workspaceTickets` is
   * the caller that awaits it before merging.
   */
  private _workspaceBoardMerge(
    agent: Agent,
    includeRetired: boolean,
    opts?: { backfillAwaited?: boolean },
  ): {
    tickets: BoardTicketView[];
    evidence: Record<string, EvidenceRow[]>;
    comments: Record<string, CommentRecord[]>;
    workspaceLabels: Record<string, string>;
  } {
    // Fire-and-forget: a sync agent read cannot await the import, but it
    // shares the in-flight run, so the rows land for the next read. The kick
    // now lives in _workspaceStoreForRead so EVERY store-backed read starts
    // it, not just this one (see that method for what the asymmetry cost).
    const workspaceStore = this._workspaceStoreForRead(agent, opts);

    /*
     * #108: retired tickets are HIDDEN from the merge by default and the
     * Retired panel asks for them by name (`includeRetired: true`, via the
     * retiredTickets Remote). Every row dropped here also drops its
     * evidence and comment entries, so the maps never orphan a key.
     */
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
    for (const session of liveSessions) {
      learnLabel(session as unknown as { header?: { cwd?: string } });
      const state = this._cache(session).state;
      this._sync(session, this._caches.get(session)!);
      const views = ticketsProjection(state, this._resolvedConfig);
      for (const view of [...views.values()].sort(ownSort)) {
        if (!includeRetired && this._isRetired(state, view.id)) continue;
        // #45: provenance only — the key is the plain id now.
        const key = String(view.id);
        tickets.push({
          ...view,
          id: view.id,
          sourceSessionId: session.id,
          foreign: false,
        } as BoardTicketView);
        evidence[key] = [...(state.evidence.get(view.id) ?? [])];
        comments[key] = [...(state.comments.get(view.id) ?? [])];
      }
    }

    /*
     * #42: closed sessions are answered by the WORKSPACE STORE, not by a
     * scan of their logs. On the first board open the one-time backfill
     * imports every closed session log of this workspace into the store
     * (renumbered into the workspace id space, origin stamped); from then
     * on the marker in the store means a board read performs ZERO
     * persistence inspects — the 119-log stall this merge used to pay, and
     * the #198 stale-while-revalidate machinery that bounded it, are both
     * gone. The store is the source of truth for closed rows: a log deleted
     * after its import changes nothing, because nothing here ever reads
     * logs as a fallback.
     *
     * Live rows (the caller's own and other live sessions') stay fold-driven
     * above: a live session is still the writer to its log — and, since
     * #218, to the store as well. Every live create claims its id from
     * the store port (`_allocateTicketId`) and every lockstep ticket
     * write mirrors into the store under #40's bracket (`_mirrorTarget`
     * + `Store.commitHostMirror`), so the store holds the live rows too
     * and a session that closes after the backfill leaves nothing
     * behind: the once-only marker is no longer a trapdoor. Legacy
     * fold-counter tickets the store never saw stay session-only (not
     * renumbered, not refused), and #43 still routes only DEAD origins
     * to the store alone. Dedupe below collapses a store copy against
     * a live copy of the same identity — the newer updatedAt wins, so
     * a reopened session's live rows shadow their imported snapshots.
     */
    if (workspaceStore !== null) {
      const storeState = workspaceStore.store.state;
      const storeViews = ticketsProjection(storeState, this._resolvedConfig);
      for (const view of [...storeViews.values()].sort(ownSort)) {
        if (view.projectId !== workspaceStore.projectId) continue;
        if (!includeRetired && this._isRetired(storeState, view.id)) continue;
        const origin = workspaceStore.store.originSessionOf(view.id);
        const sourceSessionId = origin ?? agent.session.id;
        // #45: the composite address is gone; `foreign` is false for every
        // row this merge produces and the map key is the plain id the
        // kernel rule now derives for it.
        const row = {
          ...view,
          id: view.id,
          sourceSessionId,
          foreign: false,
        } as BoardTicketView;
        tickets.push(row);
        const key = boardKeyText(row);
        evidence[key] = [...(storeState.evidence.get(view.id) ?? [])];
        comments[key] = [...(storeState.comments.get(view.id) ?? [])];
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
    const deduped = dedupeBoardRows(tickets, agent.session.id);
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
      // #222: the merge already holds both sides — the board it just built
      // and the store it read — so the coverage check rides here, throttled.
      this._reportStoreCoverage(agent, out, workspaceStore, includeRetired);
      return {
        tickets: out,
        evidence: keptEvidence,
        comments: keptComments,
        workspaceLabels,
      };
    }

    tickets.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    // #222: same check as the deduped exit above — one hook per exit, so a
    // board without duplicates is still compared, not silently skipped.
    this._reportStoreCoverage(agent, tickets, workspaceStore, includeRetired);
    return { tickets, evidence, comments, workspaceLabels };
  }

  @Remote("workspaceTickets")
  async workspaceTickets(agent: Agent, args?: {
    includeRetired?: boolean;
    /**
     * #197: the board version the caller last saw. When it matches the
     * current version and that version is fresh (see the TTL below), the
     * board has not moved and the reply carries NO rows: the caller keeps
     * its merge. This is what stops every board change from dragging a
     * full world re-pull over this remote.
     */
    sinceVersion?: string;
  }): Promise<{
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
    /**
     * #197: the current board version, echoed on every full reply so the
     * next pull can gate on it. `unchanged` marks the gated empty reply.
     */
    version: string;
    unchanged?: true;
  }> {
    /*
     * #197 VERSION GATE. The caller's last-seen version matched and the
     * version is still fresh, so nothing observable has moved: reply with
     * no rows at all. The payload collapses from the whole merged board
     * (tickets + evidence + comments) to a handful of bytes, and the merge
     * body — every live fold and every closed-session inspect — never runs.
     *
     * The freshness window is the SAME TTL the closed-fold cache uses, and
     * for the same reason: another process can append to a session this one
     * considers closed, and this process cannot see the append. After the
     * TTL the gate opens (a full compute runs, which refreshes the fold
     * cache AND the timestamp), bounding cross-process staleness exactly
     * like the fold cache does instead of eliminating it.
     */
    const includeRetired = args?.includeRetired === true;
    const nowGate = Date.now();
    const versionFresh = nowGate - this._boardVersionAt < CLOSED_FOLD_CACHE_TTL_MS;
    /*
     * The CURRENT version is the live seq, not the last-stamped string: a
     * mutation bumps the seq without pulling, so a caller still holding the
     * stamped token must get a FULL reply, never a false `unchanged`.
     */
    const currentVersion = String(this._boardVersionSeq);
    if (
      !includeRetired &&
      typeof args?.sinceVersion === "string" &&
      args.sinceVersion === currentVersion &&
      versionFresh
    ) {
      return {
        tickets: [],
        evidence: {},
        comments: {},
        workspaceLabels: {},
        version: currentVersion,
        unchanged: true,
      };
    }

    // The browser read CAN await, so the first open imports before the
    // merge queries the store — the shared single-flight run below is the
    // same promise the sync agent reads kick off.
    const workspaceStore = this._workspaceStore(agent);
    if (workspaceStore !== null) {
      await this._backfillRun(agent, workspaceStore);
    }
    // ONE derivation, two callers (#207): the agent read path (getTickets
    // and the project resolvers) consumes this same merge, sync.
    const merge = this._workspaceBoardMerge(agent, includeRetired, { backfillAwaited: true });
    return {
      tickets: merge.tickets,
      evidence: merge.evidence,
      comments: merge.comments,
      workspaceLabels: merge.workspaceLabels,
      version: this._stampBoardVersion(nowGate),
    };
  }

  /**
   * #222: the board-vs-store divergence, queryable.
   *
   * The cutover (#219) turns the store into the board, so it must be able
   * to ASK "does the store hold everything the board shows" and refuse on
   * a bad answer — a log line cannot be consumed programmatically. This is
   * that question: the same computation the merge's automatic log is built
   * on, awaited to settlement first. The browser read awaits the one-time
   * import before merging (the shared single-flight run), so by the time
   * the rows are compared the import has either verified or refused; the
   * result still carries `backfillVerified` so a caller can tell a settled
   * zero from a transient one. Read-only: it opens the store and derives
   * views, and writes nothing.
   */
  @Remote("storeCoverage")
  async storeCoverage(agent: Agent, args?: { includeRetired?: boolean }): Promise<StoreCoverage> {
    const includeRetired = args?.includeRetired === true;
    const entry = this._workspaceStore(agent);
    if (entry === null) {
      return this._storeCoverageOf(agent, [], null, includeRetired);
    }
    await this._backfillRun(agent, entry);
    // The merge reports its own coverage through _reportStoreCoverage as a
    // side effect; the throttle map keeps that to one line per change, and
    // this return is the consumable answer regardless.
    const merge = this._workspaceBoardMerge(agent, includeRetired, { backfillAwaited: true });
    return this._storeCoverageOf(agent, merge.tickets, entry, includeRetired);
  }

  /**
   * #222: compare one merge's rows against the store alone.
   *
   * Both sides are scoped to the workspace's project and filtered by the
   * same retired rule the merge applied, so the counts reconcile: every
   * board row the store cannot reproduce is named, and a fully covered
   * board reads `missingCount: 0` with `lossless: true` rather than
   * silence. Synchronous on purpose — it reads the already-open store
   * fold, never the persistence layer — so the merge can call it on every
   * read while the IMPORT stays awaited only in the Remote above.
   */
  private _storeCoverageOf(
    agent: Agent,
    rows: readonly BoardTicketView[],
    entry: { store: Store; projectId: ProjectId } | null,
    includeRetired: boolean,
  ): StoreCoverage {
    if (entry === null) {
      return {
        checked: false,
        backfillVerified: false,
        boardRows: 0,
        storeRows: 0,
        missingCount: 0,
        missing: [],
        lossless: false,
        reason: "no workspace store is open for this workspace, so there is nothing to compare against",
      };
    }
    const storeState = entry.store.state;
    const storeIdentities = new Set<string>();
    for (const snapshot of storeState.tickets.values()) {
      if (snapshot.projectId !== entry.projectId) continue;
      if (!includeRetired && this._isRetired(storeState, snapshot.id)) continue;
      storeIdentities.add(snapshot.workspaceKey + ":" + snapshot.slug);
    }
    const scoped = rows.filter((row) => row.projectId === entry.projectId);
    const { missingCount, missing } = boardStoreDivergence(scoped, storeIdentities);
    const verified = this._isBackfillVerified(agent);
    return {
      checked: true,
      backfillVerified: verified,
      boardRows: scoped.length,
      storeRows: storeIdentities.size,
      missingCount,
      missing,
      lossless: verified && missingCount === 0,
      reason: null,
    };
  }

  /**
   * #222: log one merge's coverage, at most once per divergence.
   *
   * The merge runs on every board read — at least twice per boot — so an
   * unconditional log here would be a second #83: 166 info lines per merge
   * is the noise problem that drowned the journal during the OOM
   * diagnosis. Instead this logs only when the answer CHANGES per
   * workspace path (first verified read included, so a clean board still
   * leaves its one "complete" line and zero is distinguishable from
   * never-checked), and stays silent on every identical repeat. It never
   * runs mid-import: a divergence while batches are still landing is
   * expected transient, not signal, so unverified merges are skipped
   * without recording anything. It never throws: a coverage check must
   * not break the board read it rides on, so even its own failure is
   * throttled to one warning per message.
   */
  private readonly _lastCoverageSignature = new Map<string, string>();

  private _reportStoreCoverage(
    agent: Agent,
    rows: readonly BoardTicketView[],
    entry: { store: Store; projectId: ProjectId } | null,
    includeRetired: boolean,
  ): void {
    if (entry === null) return;
    let path: string;
    try {
      path = this._workspacePath(agent);
    } catch {
      return;
    }
    if (!this._isBackfillVerified(agent)) return;
    let coverage: StoreCoverage;
    try {
      coverage = this._storeCoverageOf(agent, rows, entry, includeRetired);
    } catch (error) {
      const failure = `error:${error instanceof Error ? error.message : String(error)}`;
      if (this._lastCoverageSignature.get(path) === failure) return;
      this._lastCoverageSignature.set(path, failure);
      this.ctx.logger?.warn?.(
        `aidos: #222 store coverage check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    const signature = `${coverage.boardRows}:${coverage.storeRows}:${coverage.missing.map((m) => m.id).join(",")}`;
    if (this._lastCoverageSignature.get(path) === signature) return;
    this._lastCoverageSignature.set(path, signature);
    if (coverage.missingCount > 0) {
      const sample = coverage.missing
        .slice(0, STORE_COVERAGE_SAMPLE_CAP)
        .map((m) => `#${m.id} ${JSON.stringify(m.title)}`)
        .join(", ");
      const rest =
        coverage.missingCount > STORE_COVERAGE_SAMPLE_CAP
          ? `, …and ${coverage.missingCount - STORE_COVERAGE_SAMPLE_CAP} more`
          : "";
      this.ctx.logger?.warn?.(
        `aidos: #222 store coverage DIVERGED: ${coverage.missingCount} of ${coverage.boardRows} board rows have no store row ` +
          `(store holds ${coverage.storeRows} rows); e.g. ${sample}${rest} — the #219 cutover must not run while this is non-zero`,
      );
    } else {
      this.ctx.logger?.info?.(
        `aidos: #222 store coverage complete: all ${coverage.boardRows} board rows have a store row (store holds ${coverage.storeRows} rows)`,
      );
    }
  }

  /**
   * #222: the merged-board migration operator. EXPLICIT INVOCATION ONLY —
   * no board read, no backfill, no mirror, nothing else in this file calls
   * it. It never runs automatically, and it never touches the live store:
   * the live `board.db` is read (when present) but the candidate is always
   * written to a NEW path, and a guard refuses a candidate path that
   * resolves to the live one.
   *
   * Two runs, one round-trip:
   * - dry run (`dryRun: true`, the default): walks the merged board's three
   *   sources with provenance attached, builds the JSON document, writes it
   *   to `jsonPath` for the human EDIT step, and returns the full report.
   *   It writes NO store and creates NO store file: the store side opens
   *   only when its file already exists (#44's existsSync rule), the plan
   *   source never reaches the first-open seam (`_migrationPlanSource`,
   *   not `_planProjectSource`), and it kicks no backfill (unlike every
   *   board read, which is exactly why this walk is separate from the
   *   merge). A dry run on an unverified backfill says so in its report
   *   rather than fixing it: verification belongs to board reads, and the
   *   real run refuses an unverified export.
   * - real run (`dryRun: false`): READS the JSON back (hand-edits apply)
   *   and certifies BOARD-completeness, not just loader fidelity. It
   *   refuses — throws, blessing nothing — when the export could not have
   *   been complete (retired rows excluded, unverified source backfill, or
   *   an over-cap plan the loader would skip), and it compares the LIVE
   *   board against the candidate so export loss is visible to it. Rows
   *   born after the export are reported as drift (expected on a live
   *   board, never refused); rows the owner cut by hand are reported as
   *   humanRemoved (acknowledged, never refused). `lossless: true` means
   *   the candidate holds every live-board row by slug identity — gates
   *   pass, counts match, and exportLoss, drift and humanRemoved are all
   *   empty — and it never answers a narrower question than that.
   *   Swapping the candidate over the live store is the owner's separate
   *   action, coordinated with #219 (which deletes the backfill path —
   *   without that, opening the candidate would re-import).
   */
  @Remote("migrateBoardToFreshStore")
  async migrateBoardToFreshStore(
    agent: Agent,
    args?: { dryRun?: boolean; jsonPath?: string; storePath?: string },
  ): Promise<BoardMigrationDryRunResult | BoardMigrationRunResult> {
    const dryRun = args?.dryRun !== false;
    const cwd = this._workspacePath(agent);
    const workspaceKey = workspaceKeyFromPath(cwd);
    const storageDir = dirname(storePathForWorkspace(cwd));
    const jsonPath = args?.jsonPath ?? join(storageDir, "board-migration.json");
    const defaultStorePath = join(storageDir, "board.migrated.db");

    if (dryRun) {
      const storeFileExists = existsSync(storePathForWorkspace(cwd));
      const copies = this._migrationExportCopies(agent, cwd, workspaceKey);
      // The plan source that creates nothing (see _migrationPlanSource):
      // with no store file the board is folds-only and the plan comes
      // from the fold project or defaults to empty.
      const storeEntryForPlan = storeFileExists ? this._workspaceStore(agent) : null;
      const planSource = this._migrationPlanSource(this._boardAgent(agent), cwd, storeEntryForPlan);
      let plan: PlanValue;
      if (planSource === null) {
        plan = { frontmatter: "", context: { preamble: "", contextSections: [] }, rules: "" };
      } else {
        const meta = this._planMetaOf(planSource.projectId, planSource.state);
        const planRow = planSource.state.plans.get(planSource.projectId);
        plan = {
          frontmatter: meta.frontmatter,
          context: {
            preamble: meta.preamble,
            contextSections: meta.contextSections.map((section) => ({ ...section })),
          },
          rules: planRow?.rules ?? "",
        };
      }
      const phaseRows = planSource === null ? undefined : planSource.state.phases.get(planSource.projectId);
      const phases = phaseRows === undefined
        ? []
        : [...phaseRows.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([number, phase]) => ({ number, title: phase.title, state: phase.state }));
      const backfillVerified = this._isBackfillVerified(agent);
      const { doc, report } = buildBoardMigrationDocument({
        workspaceKey,
        absPath: cwd,
        projectName: copies.projectName,
        exportedAt: Date.now() / 1000,
        callerSessionId: agent.session.id,
        rows: copies.rows,
        evidence: copies.evidence,
        comments: copies.comments,
        plan,
        phases,
        retiredIdentities: copies.retiredIdentities,
        backfillVerified,
      });
      mkdirSync(dirname(jsonPath), { recursive: true });
      writeFileSync(jsonPath, JSON.stringify(doc, null, 2) + "\n");
      return {
        dryRun: true as const,
        jsonPath,
        defaultStorePath,
        backfillVerified,
        report,
      };
    }

    // The real run is file-driven: the JSON the dry run produced, possibly
    // hand-edited since, is the whole input. A missing file is a refusal,
    // never a silent rebuild (which would discard the human's edits). The
    // certification below is BOARD-relative: the live board is compared
    // against the candidate, so export loss is visible to it — a
    // document-relative check would bless a lossy export as lossless.
    let doc: BoardMigrationDocument;
    try {
      doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    } catch (error) {
      throw new Error(
        `board migration: cannot read ${jsonPath} — run a dry run first, then edit the JSON by hand: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    // Unknown provenance cannot certify: the header is what the real run's
    // gates read, so a file without it is refused, never assumed complete.
    const exportReport = (doc as Partial<BoardMigrationDocument>).exportReport;
    if (
      exportReport === undefined ||
      typeof exportReport.retiredExcluded !== "number" ||
      typeof exportReport.backfillVerified !== "boolean" ||
      !Array.isArray(exportReport.exportedSlugs)
    ) {
      throw new Error(
        `board migration: ${jsonPath} carries no export report — run a dry run first (it embeds the export's certification prerequisites) and edit the tickets, not the header`,
      );
    }
    if (doc.workspaceKey !== workspaceKey) {
      throw new Error(
        `board migration: document workspace ${JSON.stringify(doc.workspaceKey)} does not match this workspace ${JSON.stringify(workspaceKey)}`,
      );
    }
    // Pre-load refusals, before the candidate is touched: a migration that
    // knows it might be incomplete must not produce a candidate at all,
    // let alone one that says lossless.
    if (exportReport.retiredExcluded > 0) {
      throw new Error(
        `board migration: refusing an incomplete export — the dry run excluded ${exportReport.retiredExcluded} retired ticket(s); retired rows are board-invisible but cutover-irreversible, so resolve them before migrating`,
      );
    }
    if (exportReport.backfillVerified !== true) {
      throw new Error(
        `board migration: refusing an unverified export — the source backfill had not verified when the dry run exported; re-run the dry run after it verifies`,
      );
    }
    if (planContextLineCount(doc.plan) > PLAN_CONTEXT_LIMIT) {
      throw new Error(
        `board migration: refusing — the plan is ${planContextLineCount(doc.plan)} lines, over the ${PLAN_CONTEXT_LIMIT}-line cap, and the loader would skip it and bless a plan-less candidate; trim the plan in the JSON and re-run`,
      );
    }
    const storePath = args?.storePath ?? defaultStorePath;
    if (resolve(storePath) === resolve(storePathForWorkspace(cwd))) {
      throw new Error(
        `board migration: refusing to write the candidate over the live store ${storePathForWorkspace(cwd)} — the candidate must be a NEW path`,
      );
    }
    // The live board side, through the same walk and the same winner
    // selection as the export, so both sides resolve copies identically.
    const live = this._migrationExportCopies(agent, cwd, workspaceKey);
    const liveWinners = selectMigrationWinners(live.rows, agent.session.id);
    const liveBySlug = new Map(liveWinners.map((winner) => [winner.slug, winner]));
    const named = (slug: string, title: string): { slug: string; title: string } => ({ slug, title });
    // What this run created it may also remove: a refused candidate stays
    // on disk unblessed, which is exactly the misuse this migration
    // exists to prevent. A pre-existing file is left alone and named.
    const candidateExisted = existsSync(storePath);
    const storage = openSqliteStorage(storePath);
    const fresh = new Store(this._resolvedConfig, { storage });
    const abandonCandidate = (): void => {
      try {
        fresh.close();
      } catch {
        // Already closed; the unlink below is what matters.
      }
      if (!candidateExisted) {
        for (const suffix of ["", "-wal", "-shm", "-journal"]) {
          try {
            unlinkSync(storePath + suffix);
          } catch {
            // Best-effort: the throw below already names the path.
          }
        }
      }
    };
    let load: BoardMigrationLoadResult;
    try {
      load = fresh.importBoardDocument(doc);
    } catch (error) {
      abandonCandidate();
      throw error;
    }
    if (load.skippedPlans.length > 0) {
      abandonCandidate();
      throw new Error(
        `board migration: refusing — the loader skipped the plan (${load.skippedPlans[0]!.reason}); fix the document and re-run`,
      );
    }
    const storeTickets = fresh.ticketsFor(load.projectId);
    const candidateSlugs = new Set<string>();
    for (const snapshot of fresh.state.tickets.values()) {
      if (snapshot.projectId !== load.projectId) continue;
      candidateSlugs.add(snapshot.slug);
    }
    const docSlugs = new Set(doc.tickets.map((ticket) => ticket.slug));
    const exportedSlugs = new Set(exportReport.exportedSlugs);
    // Owner-deleted rows (in the export, cut from the document by hand):
    // acknowledged deletions, named, never refused — but they gate
    // lossless, because the candidate does not hold the whole board.
    const humanRemoved = [...exportedSlugs]
      .filter((slug) => !docSlugs.has(slug))
      .map((slug) => named(slug, liveBySlug.get(slug)?.title ?? "(not on the live board)"));
    // Board rows the candidate lacks: unacknowledged loss when they predate
    // the export (refused), expected drift when born after it (reported).
    // A row the document lists but the candidate lacks is loader loss —
    // structurally impossible through the bracket, and refused all the same.
    const exportLoss: Array<{ slug: string; title: string }> = [];
    const drift: Array<{ slug: string; title: string }> = [];
    for (const winner of liveWinners) {
      if (candidateSlugs.has(winner.slug)) continue;
      if (docSlugs.has(winner.slug)) {
        // The document lists it but the candidate lacks it: loader loss,
        // structurally impossible through the bracket — refused all the same.
        exportLoss.push(named(winner.slug, winner.title));
        continue;
      }
      // In the export but cut from the document by hand: acknowledged above.
      if (exportedSlugs.has(winner.slug)) continue;
      if (winner.createdAt > doc.exportedAt) {
        drift.push(named(winner.slug, winner.title));
        continue;
      }
      exportLoss.push(named(winner.slug, winner.title));
    }
    const candidateExtra = [...candidateSlugs]
      .filter((slug) => !liveBySlug.has(slug))
      .map((slug) => named(slug, doc.tickets.find((ticket) => ticket.slug === slug)?.title ?? "(unknown)"));
    const ticketCountMatches = storeTickets.length === doc.tickets.length;
    if (exportLoss.length > 0) {
      abandonCandidate();
      const names = exportLoss.map((entry) => entry.slug).join(", ");
      throw new Error(
        `board migration: refusing — ${exportLoss.length} board row(s) predate the export but are missing from the candidate (${names}); the export lost them, so re-run the dry run rather than blessing this candidate`,
      );
    }
    fresh.close();
    return {
      dryRun: false as const,
      jsonPath,
      storePath,
      exportedTicketCount: doc.tickets.length,
      load,
      verification: {
        ticketCountMatches,
        storeTickets: storeTickets.length,
        boardRows: liveWinners.length,
        exportLoss,
        drift,
        humanRemoved,
        candidateExtra,
        adjustedUpdatedAt: load.adjustedUpdatedAt,
        lossless:
          ticketCountMatches &&
          exportLoss.length === 0 &&
          drift.length === 0 &&
          humanRemoved.length === 0,
      },
      note: "candidate verified board-complete; swapping it over the live store is the owner's separate action, coordinated with #219 (which deletes the backfill path first)",
    };
  }

  /**
   * #222: walk the merged board's three sources with provenance attached.
   * The merge (`_workspaceBoardMerge`) answers what the BOARD shows; the
   * export needs more per row — `createdAt`, the source fold for exact
   * evidence/comments attribution (the merge keys both maps by bare numeric
   * id, so colliding ids clobber), and the source session for
   * session-local dependency resolution. Same three groups, same retired
   * rule, winning values selected downstream by the shared #83 comparator.
   * Read-only throughout: folds are synced, never written; the store opens
   * only when its file already exists.
   */
  private _migrationExportCopies(
    agent: Agent,
    cwd: string,
    workspaceKey: string,
  ): {
    rows: MigrationExportRow[];
    evidence: MigrationExportEvidence[];
    comments: MigrationExportComment[];
    retiredIdentities: string[];
    projectName: string;
  } {
    const rows: MigrationExportRow[] = [];
    const evidence: MigrationExportEvidence[] = [];
    const comments: MigrationExportComment[] = [];
    // One entry per retired copy; the BUILDER counts distinct identities
    // (that count gates a refusal, so the exactness lives there, pinned by
    // its own test — a copy census here must never become the gate).
    const retiredIdentities: string[] = [];
    let projectName = basename(cwd);
    const pushState = (state: AidosState, oldSource: string): void => {
      for (const project of state.projects.values()) {
        if (project.absPath === cwd) {
          projectName = project.name;
          break;
        }
      }
      for (const snapshot of state.tickets.values()) {
        if (snapshot.workspaceKey !== workspaceKey) continue;
        if (this._isRetired(state, snapshot.id)) {
          retiredIdentities.push(snapshot.workspaceKey + ":" + snapshot.slug);
          continue;
        }
        rows.push({
          title: snapshot.title,
          description: snapshot.description,
          body: snapshot.body,
          criteria: snapshot.criteria,
          phase: snapshot.phase,
          order: snapshot.order,
          state: snapshot.state,
          allowlist: [...snapshot.allowlist],
          dependsOn: [...snapshot.dependsOn],
          tags: [...snapshot.tags],
          slug: snapshot.slug,
          workspaceKey: snapshot.workspaceKey,
          createdAt: snapshot.createdAt,
          updatedAt: snapshot.updatedAt,
          oldId: snapshot.id,
          oldSource,
        });
        for (const row of state.evidence.get(snapshot.id) ?? []) {
          evidence.push({
            oldSource,
            oldId: snapshot.id,
            kind: row.kind,
            author: row.author,
            at: row.at,
            payload: row.payload,
            ...(row.stamp === undefined ? {} : { stamp: row.stamp }),
          });
        }
        for (const comment of state.comments.get(snapshot.id) ?? []) {
          comments.push({
            oldSource,
            oldId: snapshot.id,
            text: comment.text,
            author: comment.author,
            at: comment.at,
          });
        }
      }
    };
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    pushState(cache.state, agent.session.id);
    for (const session of this._liveWorkspaceSessions(agent)) {
      const entry = this._cache(session);
      this._sync(session, entry);
      pushState(entry.state, session.id);
    }
    // #44's rule: a migration export must never CREATE a store as a side
    // effect. With no file on disk the board is folds-only.
    try {
      if (existsSync(storePathForWorkspace(cwd))) {
        const entry = this._workspaceStore(agent);
        if (entry !== null) {
          for (const project of entry.store.state.projects.values()) {
            if (project.absPath === cwd) {
              projectName = project.name;
              break;
            }
          }
          pushState(entry.store.state, "store");
        }
      }
    } catch {
      // The store side is best-effort here; the report carries what ran.
    }
    retiredIdentities.sort();
    return { rows, evidence, comments, retiredIdentities, projectName };
  }

  /**
   * #222: the migration's plan source — the same project resolution the
   * `planMeta` Remote reads (`_planProjectSource`), but creating NOTHING.
   * `_planProjectSource` reaches the store through the first-open seam,
   * which creates the store file (and its project row) when absent — the
   * exact side effect the review caught the dry run leaving behind. This
   * takes an already-opened store entry (or null when no file exists) and
   * never opens one itself; with no project anywhere it answers null and
   * the export carries an empty plan and no phases.
   */
  private _migrationPlanSource(
    reader: Agent,
    cwd: string,
    storeEntry: { store: Store; projectId: ProjectId } | null,
  ): { projectId: ProjectId; state: AidosState } | null {
    const cache = this._cache(reader.session);
    this._sync(reader.session, cache);
    let foldProjectId: ProjectId | null = null;
    for (const [id, project] of cache.state.projects) {
      if (project.absPath === cwd) {
        foldProjectId = id;
        break;
      }
    }
    if (foldProjectId !== null && this._ticketsFor(foldProjectId, cache.state).length > 0) {
      return { projectId: foldProjectId, state: cache.state };
    }
    if (
      storeEntry !== null &&
      this._ticketsFor(storeEntry.projectId, storeEntry.store.state).length > 0
    ) {
      return { projectId: storeEntry.projectId, state: storeEntry.store.state };
    }
    if (foldProjectId !== null) {
      return { projectId: foldProjectId, state: cache.state };
    }
    return null;
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
   * The agent the write should run against.
   *
   * #45: a bare numeric ticketId (number or decimal string — the only form
   * the board sends now) routes to the OWNING session when the caller's own
   * fold does not hold the id: own-first is the #93 rule, and a plain id
   * that survives it names exactly one workspace row, whose provenance the
   * merge carries. The owner route ends in the same place #43's orphan
   * writes land when the origin session is dead. A slug, or a
   * `<workspaceKey>:<slug>` reference, targets the caller's own session —
   * workspace-key references are cross-WORKSPACE reads, not owner routes.
   * The old `<sourceSessionId>:<ticketId>` routing is gone with the
   * composite address itself.
   */
  private _routedAgent(agent: Agent, ticketRef: number | string | undefined): Agent {
    if (ticketRef === undefined) return agent;
    const numeric =
      typeof ticketRef === "number"
        ? ticketRef
        : /^\d+$/.test(ticketRef)
          ? Number(ticketRef)
          : null;
    if (numeric === null) return agent;
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    if (cache.state.tickets.has(numeric)) return agent;
    const owner = this._workspaceOwnerOf(agent, numeric as TicketId);
    if (owner === null || owner === agent.session.id) return agent;
    return this._ownerAgent(agent, owner);
  }

  /**
   * Resolve the writer session that owns a ticket on the workspace board.
   * #45 routes by PROVENANCE: the merge row for the plain id names the
   * owning session, and this resolves it. A live source session returns
   * it.
   *
   * #43: a CLOSED or DELETED origin no longer refuses the write. When the
   * workspace store can be opened, the write routes to a synthetic
   * store-backed session (`_orphanSession`): the write methods run exactly
   * as they always have — same gate, same event shape — but the append
   * lands in the store alone, the only durable home the ticket has left.
   * A live origin still appends to its own session log; only the orphan
   * case changes. `OwnerUnavailable` survives for the case where no store
   * can serve the write either (the store will not open), so the caller
   * still gets a refusal rather than a silent drop.
   */
  private _ownerSession(agent: Agent, sourceSessionId: string): Session {
    if (sourceSessionId === agent.session.id) return agent.session;
    for (const candidate of this.ctx.agents.list()) {
      if (candidate.session.id === sourceSessionId) return candidate.session;
    }
    const orphan = this._orphanSession(agent, sourceSessionId);
    if (orphan !== null) return orphan;
    throw new OwnerUnavailable(sourceSessionId);
  }

  /**
   * #43: the synthetic store-backed session a closed origin's write runs
   * against. One per origin id per workspace store, memoized so the host's
   * per-session fold cache stays consistent across writes.
   *
   * `events` is derived from the store's log on EVERY access (never a
   * snapshot), so the fold the write methods compute against is the
   * store's own state — including the one-time backfill import and every
   * earlier orphan write. `append` is the #43 seam: it validates and
   * mirrors through `Store.commitHostEvent` (the #40 bracket), so a store
   * refusal throws out of the write and nothing is half-landed. The
   * header carries the CALLER's cwd, so workspace assertions and the
   * worktree affordances keep resolving to the same workspace.
   */
  private readonly _orphanSessions = new WeakMap<
    object,
    Map<string, Session>
  >();

  private _orphanSession(agent: Agent, sourceSessionId: string): Session | null {
    const entry = this._workspaceStore(agent);
    if (entry === null) return null;
    let memo = this._orphanSessions.get(entry);
    if (memo === undefined) {
      memo = new Map<string, Session>();
      this._orphanSessions.set(entry, memo);
    }
    const existing = memo.get(sourceSessionId);
    if (existing !== undefined) return existing;
    const store = entry.store;
    const envelope = (event: AidosEvent, seq: number): SessionEvent =>
      ({
        type: event.kind,
        seq,
        time: (event as { at?: number }).at ?? 0,
        data: event,
      }) as unknown as SessionEvent;
    const orphan = {
      id: sourceSessionId,
      header: {
        ...(agent.session.header as unknown as Record<string, unknown>),
        id: sourceSessionId,
      },
      // #218: the `_commit` mirror seam reads this brand. An orphan
      // session's append lands straight in the store (#43), so a host
      // write routed here must NOT mirror a second copy into it.
      __aidosStoreBacked: true,
      get events(): readonly SessionEvent[] {
        return store.events().map((event, seq) => envelope(event, seq));
      },
      append(type: string, data: unknown): SessionEvent {
        void type;
        // The store alone (#43): no session log exists to take this
        // append, so the mirrored store write IS the durable record.
        store.commitHostEvent(data as AidosEvent);
        return envelope(data as AidosEvent, store.events().length - 1);
      },
    } as unknown as Session;
    memo.set(sourceSessionId, orphan);
    return orphan;
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

  /*
   * #42: the workspace STORE replaces the closed-fold cache. The old
   * `_closedFolds` / `_closedFoldRefreshes` maps and their inspect helpers
   * are gone with the cold scan they served; `_workspaceStores` below holds
   * one opened Store per workspace path instead, and `_backfillRuns` makes
   * the one-time import single-flight.
   */

  /**
   * One opened workspace Store per workspace path, with the project row the
   * backfill and every store read key through. Open is lazy (the SQLite
   * handle is touched on first board read) and the map entry lives for the
   * process: `openWorkspaceStorage` hands back the shared per-path handle,
   * so two sessions of one workspace share one Store-port pair.
   */
  private readonly _workspaceStores = new Map<
    string,
    { store: Store; projectId: ProjectId }
  >();

  /**
   * The in-flight one-time backfill per workspace path, so concurrent board
   * reads share one import instead of racing two.
   */
  private readonly _backfillRuns = new Map<string, Promise<void>>();

  /**
   * #221: workspace paths whose backfill this process already drove to
   * completion — every closed session the store does not already account
   * for was handed over and flushed. Gates the kick (`_workspaceStoreForRead`
   * and `_backfillRun`) and the transient refusal below, so the steady
   * state performs no list and no inspect. In-memory only: a new process
   * re-verifies with one headers-only list, then resumes or goes silent.
   */
  private readonly _backfillVerified = new Set<string>();

  /**
   * #221: the process-wide backfill batch serializer (criterion 7). Every
   * batch — inspect plus flush — runs exclusive through this tail chain, so
   * N workspaces importing at once still retain at most ONE batch: no read
   * can ever stack N full-history imports again, whatever #176 names. The
   * tail never rejects (each link guards its predecessor), so a failed
   * batch delays the next one but never wedges the chain.
   */
  private _backfillBatchTail: Promise<void> = Promise.resolve();

  /**
   * #42: the workspace store for one agent's workspace, opened on first use
   * with its project row ensured. Returns null — never throws — when the
   * store cannot be opened or replayed: the board degrades to the live
   * folds (a warning is logged) rather than refusing every read because
   * durable storage is broken.
   */
  /**
   * The workspace store for an agent READ, with the one-time import KICKED.
   *
   * #42 review (2026-09-12), second round. The first fix kicked the backfill
   * inside `_workspaceBoardMerge` only, so `getTickets` was merely LATE on a
   * cold host — rows landed from the next read. But `getTicket`/`getEvidence`
   * (via `_ticketInWorkspaceStore`) and `plan`/`planMeta` (via
   * `_planProjectSource`) queried the store DIRECTLY and kicked nothing. On a
   * host whose first board interaction was one of those reads, the answer was
   * "no such ticket" — and it STAYED "no such ticket" on every later call,
   * because nothing ever started the import. That is a WRONG answer, not a
   * late one, and it is exactly the "reads once, concludes no such ticket"
   * mode the earlier review_fail demanded be hunted.
   *
   * So the kick belongs to READING THE STORE, not to one caller of it. Every
   * agent read path goes through here: `getTickets` via the merge,
   * `getTicket`/`get_evidence` via `_ticketInWorkspaceStore`, `plan`/
   * `planMeta` via `_planProjectSource`, `coldTickets` directly, and
   * `searchTickets` under its #44 `existsSync` guard (a search kicks only
   * when a store file already exists, never creating one); `backfillAwaited`
   * is for the browser remote, which awaits the same shared promise BEFORE
   * merging and must not start a stale second run that a later reader
   * would inherit.
   */
  private _workspaceStoreForRead(
    agent: Agent,
    opts?: { backfillAwaited?: boolean },
  ): { store: Store; projectId: ProjectId } | null {
    const entry = this._workspaceStore(agent);
    if (
      opts?.backfillAwaited !== true &&
      entry !== null &&
      !this._isBackfillVerified(agent)
    ) {
      void this._backfillRun(agent, entry).catch(() => undefined);
    }
    return entry;
  }

  /**
   * #221: whether this process already drove the workspace's backfill to
   * completion — the kick gate and the transient refusal below both read
   * this, never the marker alone. The marker means "some batch landed";
   * only this set means "no session is left unimported". No workspace path
   * (or an unreadable one) means no import could run, which reads as
   * settled, not transient.
   */
  private _isBackfillVerified(agent: Agent): boolean {
    let path: string;
    try {
      path = this._workspacePath(agent);
    } catch {
      return true;
    }
    return this._backfillVerified.has(path);
  }

  private _workspaceStore(
    agent: Agent,
  ): { store: Store; projectId: ProjectId } | null {
    let path: string;
    try {
      path = this._workspacePath(agent);
    } catch {
      return null;
    }
    const cached = this._workspaceStores.get(path);
    if (cached !== undefined) return cached;
    let storage;
    try {
      storage = openWorkspaceStorage(path);
    } catch (error) {
      this.ctx.logger?.warn?.(
        `aidos: cannot open the workspace store for ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
    try {
      const store = new Store(this._resolvedConfig, { storage });
      const projectId = store.findProject(path) ?? store.createProject(path, basename(path));
      const entry = { store, projectId };
      this._workspaceStores.set(path, entry);
      return entry;
    } catch (error) {
      this.ctx.logger?.warn?.(
        `aidos: cannot open the workspace store for ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      try {
        storage.close();
      } catch {
        // Already unusable; nothing further to release.
      }
      return null;
    }
  }

  /**
   * #42: the single-flight wrapper around the one-time backfill. Concurrent
   * board reads of the same workspace await ONE import; the store's own
   * `backfill/completed` marker makes every later call (and every later
   * process) skip the work entirely.
   */
  private _backfillRun(agent: Agent, entry: { store: Store; projectId: ProjectId }): Promise<void> {
    let path: string;
    try {
      path = this._workspacePath(agent);
    } catch {
      return Promise.resolve();
    }
    // #221: the steady state never builds a run at all — no list, no
    // inspect, no promise churn per board read.
    if (this._backfillVerified.has(path)) return Promise.resolve();
    const inFlight = this._backfillRuns.get(path);
    if (inFlight !== undefined) return inFlight;
    const run = this._ensureWorkspaceBackfill(agent, entry).finally(() => {
      this._backfillRuns.delete(path);
    });
    this._backfillRuns.set(path, run);
    return run;
  }

  /**
   * #42: THE first-open wiring #41's report left as this ticket's seam. If
   * the store has no `backfill/completed` marker, list every persisted
   * session of this workspace, inspect each closed log (the same
   * `sessionPersistence` API the old cold scan used — one last time, once),
   * and hand the logs to `Store.backfillSessionLogs`. THE STORE OWNS THE
   * WRITE: renumbering, dependency rewriting, origin stamping, the marker,
   * and the single transaction bracket are all #41's, unchanged.
   *
   * #221: the handoff is BATched, not whole-workspace. Each batch of at
   * most BACKFILL_BATCH_SESSIONS logs (and BACKFILL_BATCH_BYTES of retained
   * log text) is inspected, flushed with one `backfillSessionLogs` call,
   * and then released — peak retained memory is a function of the batch
   * bounds, never of the session count. #211's v3 marker is incremental and
   * cumulative, so each call lands durable progress (its sessions plus a
   * cumulative ticket map) and a crash re-runs at most one batch: the next
   * open hands only the sessions no marker yet accounts for and skips the
   * rest without inspecting them.
   *
   * Every call carries the FULL resume set as `expectedSessionIds` (#211
   * round 2, finding A): a reference naming a session handed in a LATER
   * batch becomes a pending edge and is repaired on arrival, instead of
   * being dropped terminally. Without the claim the batched import would be
   * silently lower fidelity than the monolithic one it replaces — drops are
   * terminal and nothing reclassifies them. Refs naming sessions the driver
   * deliberately skips (mirrored rows, see below) are NOT claimed and still
   * drop-and-record: the driver cannot promise their arrival.
   *
   * Failure handling, per piece:
   *  - no persistence service: skip, nothing verified — the next open retries;
   *  - the list itself fails: skip, nothing verified — running an empty
   *    backfill here would land the marker and LOSE every closed log;
   *  - one log's inspect fails: that log is skipped (warned) and the
   *    workspace stays UNVERIFIED, so the next open retries it — a log
   *    unreadable mid-import (another process mid-append is the real shape)
   *    is a transient read error, not a verdict, and must not be lost
   *    permanently. A log that NEVER becomes readable costs one failed
   *    inspect plus its warning per open: bounded, diagnosable, and a
   *    deliberate change from #42's skip-forever. The rest of its batch
   *    still imports and still lands its marker.
   *  - one batch's import refuses (StoreWriteRefused): warn NAMING the
   *    batch, keep going with the next batch (batches are independent —
   *    one poison batch must not hold the other 446 sessions hostage),
   *    and leave the workspace unverified so the NEXT open retries exactly
   *    the unlanded sessions. The board read never fails either way.
   *  - CROSS-BATCH dependency edges (#211 round 2, finding A): every call
   *    claims the full resume set, so a batch whose logs depend on LATER
   *    batches pends those edges and repairs them on arrival (the
   *    cross-batch test pins the wiring, not merely the absence of a
   *    miswire). A batch that genuinely cannot flush still refuses below,
   *    and the refusal path keeps the host alive and retries.
   * A failed backfill never fails the board read, and never kills the host:
   * every refusal is caught, logged, and retried — the OOM this replaces
   * was the only failure mode that escaped this method, because it struck
   * below the code, in the allocator.
   */
  private async _ensureWorkspaceBackfill(
    agent: Agent,
    entry: { store: Store; projectId: ProjectId },
  ): Promise<void> {
    let path: string;
    try {
      path = this._workspacePath(agent);
    } catch {
      return;
    }
    if (this._backfillVerified.has(path)) return;
    const persistence = this.ctx.get("sessionPersistence") as
      | {
          list: () => Promise<SessionHeader[]>;
          inspect: (id: SessionId) => Promise<{ meta: SessionHeader; events: readonly SessionEvent[] }>;
        }
      | undefined;
    if (persistence === undefined) return;
    const liveIds = new Set<string>([agent.session.id]);
    for (const session of this._liveWorkspaceSessions(agent)) liveIds.add(session.id);
    const closedIds = await this._closedWorkspaceSessionIds(agent, liveIds);
    // A failed list must NOT run an empty backfill: the marker would land
    // and every closed log would be lost. Leave the import for the next open.
    if (closedIds === null) return;
    const report = entry.store.backfillReport();
    const fresh = this._unimportedSessionIds(entry.store, report, closedIds);
    if (fresh.length === 0) {
      this._backfillVerified.add(path);
      return;
    }
    // Finding A: the full-horizon claim. Every call names the whole resume
    // set, so cross-batch references pend instead of dropping terminally.
    const expected = fresh.map(String);
    this.ctx.logger?.info?.(
      `aidos: backfill importing ${fresh.length} of ${closedIds.length} closed log(s) in batches of ${BACKFILL_BATCH_SESSIONS}`,
    );
    let refused = false;
    let cursor = 0;
    while (cursor < fresh.length) {
      const batch = fresh.slice(cursor, cursor + BACKFILL_BATCH_SESSIONS);
      const outcome = await this._exclusiveBackfillBatch(() =>
        this._importBackfillBatch(entry, batch, persistence, expected),
      );
      if (!outcome.ok) refused = true;
      // Taken, not landed: inspected-but-unreadable ids are warned and left
      // for the next open, never re-inspected in this run. At least one id
      // is always taken from a non-empty slice (the first take is
      // unconditional), so this loop terminates.
      cursor += outcome.taken;
    }
    // Only a fully flushed import verifies: a refused batch's sessions are
    // unmarked, so the next open re-lists and retries exactly them.
    if (!refused) this._backfillVerified.add(path);
  }

  /**
   * #221: the sessions of `closedIds` the store does not already account
   * for — the resume set. Two sources, both read without touching a log:
   *  - the marker's `sessionIds`: every batch that landed names its
   *    sessions, so a crashed import resumes after its last landed batch
   *    instead of restarting the workspace;
   *  - the store's origin index: on a RESUME (marker present) a session
   *    whose tickets the live mirror (#218) already owns is skipped, so a
   *    session that mirrored its rows and then closed is never re-imported
   *    as suffixed duplicates — EXCEPT v1-listed sessions, which are handed
   *    even though v1 stamped their origins: #211 round 2 completes v1
   *    history per handed-in batch (tickets scan-matched, never re-imported;
   *    plans, phases and refusals replayed), and withholding them would
   *    strand that history forever. On the FIRST import (no marker) the set
   *    is exactly `closedIds`, byte-for-byte #42's set: changing it would
   *    trade today's duplication corner for a silent plan-loss corner, and
   *    that trade is out of scope — it is recorded on BACKFILL_BATCH_SESSIONS.
   */
  private _unimportedSessionIds(
    store: Store,
    report: BackfillReport | null,
    closedIds: SessionId[],
  ): SessionId[] {
    if (report === null) return [...closedIds];
    const mirrored = this._storeOriginSessions(store);
    if (report.dropsUnknown) {
      // v1: hand every closed session except mirrored rows the v1 import
      // never saw. v1-listed sessions are handed DESPITE their origins so
      // round 2 can replay the history v1 skipped; the origin scan matches
      // their tickets, so nothing lands twice (F4, kernel-tested).
      const v1 = new Set<string>(report.sessionIds);
      return closedIds.filter((id) => v1.has(String(id)) || !mirrored.has(String(id)));
    }
    const imported = new Set<string>(report.sessionIds);
    return closedIds.filter(
      (id) => !imported.has(String(id)) && !mirrored.has(String(id)),
    );
  }

  /**
   * #221: every session id the store holds tickets for — the mirrored-rows
   * side of the resume set above. One in-memory pass over the workspace
   * fold, once per import, never per read.
   */
  private _storeOriginSessions(store: Store): Set<string> {
    const out = new Set<string>();
    for (const id of store.state.tickets.keys()) {
      const origin = store.originSessionOf(id);
      if (origin !== null) out.add(origin);
    }
    return out;
  }

  /**
   * #221: run one backfill batch exclusive process-wide (criterion 7). The
   * tail chain serializes batches across workspaces, so N simultaneous
   * imports retain one batch between them instead of N full histories.
   */
  private _exclusiveBackfillBatch<T>(task: () => Promise<T>): Promise<T> {
    const run = this._backfillBatchTail.then(task, task);
    this._backfillBatchTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * #221: inspect one bounded batch of closed logs and flush it with a
   * single `backfillSessionLogs` call. `expected` is the FULL resume set —
   * every call claims it, so references to later batches pend and repair
   * instead of dropping (finding A). Returns how many ids of the slice
   * were taken (inspected or warned-skipped) and whether the batch is fully
   * resolved: an unreadable log or a refused flush returns ok false,
   * leaving the workspace unverified so the next open retries exactly the
   * unlanded sessions. The `logs` array is released on return, so the next
   * batch starts from an empty retained set.
   */
  private async _importBackfillBatch(
    entry: { store: Store; projectId: ProjectId },
    batch: SessionId[],
    persistence: {
      inspect: (id: SessionId) => Promise<{ meta: SessionHeader; events: readonly SessionEvent[] }>;
    },
    expected: readonly string[],
  ): Promise<{ ok: boolean; taken: number }> {
    const logs: BackfillSessionLog[] = [];
    let taken = 0;
    let retainedBytes = 0;
    let inspectFailed = false;
    const worker = async (): Promise<void> => {
      while (taken < batch.length) {
        // The byte cut: stop taking once the retained batch is over budget.
        // Takes happen before sizes are known, so the first take is
        // unconditional (progress) and in-flight parses are the bounded
        // overshoot (see BACKFILL_BATCH_BYTES).
        if (taken > 0 && retainedBytes >= BACKFILL_BATCH_BYTES) return;
        const id = batch[taken++]!;
        try {
          const inspection = await persistence.inspect(id as SessionId);
          // No `.map()` copy: the inspection's own event array IS the
          // batch's retention. The old `.map()` kept a SECOND full copy of
          // every parsed event alive next to the inspection's own — half
          // the peak, for no reason (the fold only reads seq/type/data,
          // which the envelope already carries).
          logs.push({ sessionId: id, events: inspection.events });
          retainedBytes += JSON.stringify(inspection.events).length;
        } catch (error) {
          inspectFailed = true;
          this.ctx.logger?.warn?.(
            `aidos: backfill inspect failed for ${id}, skipping it (the next open retries it): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CLOSED_INSPECT_CONCURRENCY, batch.length) }, worker),
    );
    if (logs.length === 0) return { ok: !inspectFailed, taken };
    try {
      const result = entry.store.backfillSessionLogs(entry.projectId, logs, {
        expectedSessionIds: expected,
      });
      if (!result.alreadyRan) {
        this.ctx.logger?.info?.(
          `aidos: backfill batch imported ${result.tickets} ticket(s), ${result.evidence} evidence row(s), ${result.comments} comment(s) from ${result.sessionIds.length} log(s)`,
        );
      }
      return { ok: !inspectFailed, taken };
    } catch (error) {
      this.ctx.logger?.warn?.(
        `aidos: workspace backfill batch refused (the next open retries its ${logs.length} log(s): ${batch.map(String).join(", ")}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return { ok: false, taken };
    }
  }

  /**
   * #197: the board version, a monotonically growing string, plus the time
   * it was last CONFIRMED by a full merge compute.
   *
   * `_boardVersionSeq` increments in `_sync` whenever any session's fold
   * actually consumes new events (and in `_cache` when a brand-new session
   * seeds with events) — that is the one place every board mutation passes
   * through, so nothing else has to remember to invalidate. The string form
   * is the seq at last compute, NOT recomputed per pull, so concurrent
   * viewers that pulled the same world share one version and all gate.
   *
   * Over-invalidation is the safe direction: a change in ANY workspace
   * invalidates every gate in this process, costing one extra full pull —
   * never a missed change.
   */
  private _boardVersionSeq = 0;
  private _boardVersion = "0";
  private _boardVersionAt = 0;

  /** Record that a full merge compute confirmed the world at `at`. */
  private _stampBoardVersion(at: number): string {
    this._boardVersion = String(this._boardVersionSeq);
    this._boardVersionAt = at;
    return this._boardVersion;
  }

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
     * Routed exactly as every other user write is: a plain id the caller's
     * fold does not hold sends the write to the OWNING session, and an own
     * id stays here. #93's finding — a plain number made the router return
     * the caller unchanged, so signing off foreign #12 wrote to own #12 —
     * is why this goes through the same helper rather than resolving the
     * id itself.
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
   * in the live workspace carrying `from` gets `to` instead — the caller's
   * own log plus every live sibling session's log, so the write agrees with
   * the `workspaceTags` listing ("on every ticket carrying it"). Each ticket
   * is written through its owning session, keeping one authoritative log per
   * ticket; the detach half and the attach half each run through `_applyTags`.
   * Closed sessions have no live owner and are not reachable (the same
   * boundary `searchTickets` states). `tickets` holds numeric ids across
   * those logs, so one id may repeat when two sessions share it.
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
    const affected: number[] = [];
    for (const session of [agent.session, ...this._liveWorkspaceSessions(agent)]) {
      const owner = (session === agent.session ? agent : { ...agent, session }) as Agent;
      const cache = this._cache(session);
      this._sync(session, cache);
      for (const snapshot of cache.state.tickets.values()) {
        if ((snapshot.tags ?? []).includes(from)) {
          this._applyTags(owner, snapshot.id, { add: [to], remove: [from] }, "user");
          affected.push(snapshot.id);
        }
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
   * from every ticket in the live workspace that carries it — the caller's
   * own log plus every live sibling session's log, so the write agrees with
   * the `workspaceTags` listing ("from every ticket carrying it"). Each
   * ticket is written through its owning session. Closed sessions have no
   * live owner and are not reachable (the same boundary `searchTickets`
   * states). `tickets` holds numeric ids across those logs, so one id may
   * repeat when two sessions share it.
   */
  @Remote("userDeleteTag")
  userDeleteTag(agent: Agent, args: { tag: string }): { tag: string; tickets: number[] } {
    const name = this._cleanTagNames([args.tag])[0];
    const affected: number[] = [];
    for (const session of [agent.session, ...this._liveWorkspaceSessions(agent)]) {
      const owner = (session === agent.session ? agent : { ...agent, session }) as Agent;
      const cache = this._cache(session);
      this._sync(session, cache);
      for (const snapshot of cache.state.tickets.values()) {
        if ((snapshot.tags ?? []).includes(name)) {
          this._applyTags(owner, snapshot.id, { add: [], remove: [name] }, "user");
          affected.push(snapshot.id);
        }
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
   * Every tag name the live workspace carries right now: the caller's own
   * log plus every live sibling session's log. `agentAttachTags` measures
   * creation against this set and `requestTagChange` checks existence
   * against it, so both agree with the `workspaceTags` listing. Closed
   * sessions are not folded here (that merge is async); the `workspaceTags`
   * Remote below is the full merge.
   */
  private _workspaceTagSet(agent: Agent): Set<string> {
    const out = new Set<string>();
    for (const session of [agent.session, ...this._liveWorkspaceSessions(agent)]) {
      const cache = this._cache(session);
      this._sync(session, cache);
      for (const snapshot of cache.state.tickets.values()) {
        for (const tag of snapshot.tags ?? []) out.add(tag);
      }
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
    // #197: a brand-new session with events changes the board it joins —
    // its tickets become merge-visible — so the version must move.
    if (session.events.length > 0) this._boardVersionSeq += 1;
    return cache;
  }

  /** Fold the events appended since the last observation. */
  private _sync(session: Session, cache: SessionCache): void {
    const events = session.events;
    // #197: new events are the ONE funnel every board change passes
    // through (mutators fold after append), so this bump is the
    // invalidation for the workspaceTickets version gate.
    if (events.length > cache.observedSeq) this._boardVersionSeq += 1;
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
    // #41: the kernel event union now includes the "backfill/completed"
    // marker, which the host's own _commit never emits — the Store's
    // backfill writes it straight to the workspace store, never to a
    // session log. The casts only widen the envelope type and data.
    const sessionWrite = (): void => {
      session.append(
        event.kind as SessionEvent["type"],
        event as SessionEvent["data"],
      );
    };
    // #218: the live-write mirror. A ticket-scoped write whose ticket the
    // store holds in lockstep lands in BOTH homes inside one store
    // bracket (`Store.commitHostMirror`); anything else stays session-only
    // exactly as before. See `_mirrorTarget` for the eligibility rule.
    const mirror = this._mirrorTarget(agent, session, cache, event);
    if (mirror === null) {
      sessionWrite();
      this.ctx.logger?.info?.(`aidos: committed ${event.kind} for session ${session.id}`);
      this._sync(session, cache);
      return;
    }
    mirror.store.commitHostMirror(
      event,
      () => {
        sessionWrite();
      },
      mirror.origin,
    );
    this.ctx.logger?.info?.(`aidos: committed ${event.kind} for session ${session.id}`);
    this._sync(session, cache);
  }

  /**
   * #218: where one host write should land — the session log alone, or the
   * session log plus the workspace store.
   *
   * Returns null (session-only, today's behaviour) when:
   *  - the session is a #43 store-backed orphan: its append IS the store
   *    write, so mirroring here would land the event twice;
   *  - no workspace store can be opened: the host falls back to the fold
   *    counter and the session log, which is why every pre-store harness
   *    test still passes;
   *  - the event is not ticket-scoped (project/created, phase/set,
   *    plan/change): the store owns its own project rows and never
   *    imported plans or phases, so there is nothing to stay in lockstep
   *    with;
   *  - the event is a create: creates ALWAYS mirror (never null here).
   *    The id was claimed from the store port in `_createTicketInternal`,
   *    so it is fresh in the store fold, and the store's own validation
   *    is the backstop — a genuine collision refuses the whole create
   *    with the session log untouched, never a silent overwrite;
   *  - any other ticket write mirrors only in LOCKSTEP: the store holds
   *    the same id with the same slug at the same revision AND the same
   *    createdAt. A mirrored ticket stays in lockstep from its create
   *    (every later write mirrors), so this passes for exactly the
   *    tickets the mirror owns.
   *    A legacy fold-counter ticket the store never saw (or saw only as
   *    an unrelated imported id) fails it and stays session-only: it is
   *    not renumbered, not refused, and not folded over anyone — the
   *    migration rule. That is also what makes the ordering load-bearing:
   *    allocation was unified BEFORE any mirror ran, so a live create
   *    can never share an id with an unrelated store row.
   *
   * The lockstep check is structural, not heuristic-by-accident: slug,
   * revision AND createdAt must all agree. createdAt is the field that
   * closes #220: the backfill preserves it (store.ts create `at`, and the
   * squashing set carries it through its `...final` spread), while a live
   * mirror lands the SAME event object in both homes — so two rows that
   * are one ticket always agree here, and two tickets born at different
   * times never do. Without it, a legacy live ticket at exactly revision
   * 2 sharing a numeric id and slug with a backfilled row fused on the
   * first touch, and stayed fused because the two revisions then advanced
   * together. The remaining window is a genuine impossibility, not a
   * narrow one: the same id (refused by unified allocation), the same
   * slug (refused by workspace-unique slugs), the same revision, AND the
   * same birth instant.
   */
  private _mirrorTarget(
    agent: Agent,
    session: Session,
    cache: SessionCache,
    event: AidosEvent,
  ): { store: Store; origin?: { sessionId: string } } | null {
    if ((session as unknown as { __aidosStoreBacked?: boolean }).__aidosStoreBacked === true) {
      return null;
    }
    const ticketId =
      event.kind === "ticket/change"
        ? event.ticket.id
        : (event as unknown as { ticketId?: unknown }).ticketId;
    if (typeof ticketId !== "number") {
      return null;
    }
    const entry = this._workspaceStore(agent);
    if (entry === null) {
      return null;
    }
    if (event.kind === "ticket/change" && event.operation === "create") {
      // The creating session owns the row: the merge stamps the store
      // copy with this session (not with whoever happens to read first),
      // so the dedupe tie can never elect a reader as owner and route a
      // foreign write at the wrong log.
      return { store: entry.store, origin: { sessionId: String(session.id) } };
    }
    const id = ticketId as TicketId;
    const sessionTicket = cache.state.tickets.get(id);
    const storeTicket = entry.store.state.tickets.get(id);
    if (sessionTicket === undefined || storeTicket === undefined) {
      return null;
    }
    if (sessionTicket.slug !== storeTicket.slug) {
      return null;
    }
    // #220: createdAt is the fourth lockstep field. Two rows that are one
    // ticket always agree here — the backfill preserves it, and a live
    // mirror lands the same event in both homes — while two tickets born
    // at different times never do. createdAt is birth data: no write path
    // rewrites it (creates set it, every set spreads `...prev`), so the
    // refusal below cannot decay into a later fusion.
    if (sessionTicket.createdAt !== storeTicket.createdAt) {
      return null;
    }
    const sessionRev = cache.state.lastRevision.get(id) ?? sessionTicket.revision;
    const storeRev = entry.store.state.lastRevision.get(id) ?? storeTicket.revision;
    if (sessionRev !== storeRev) {
      return null;
    }
    return { store: entry.store };
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
          `${_mdTicketHead(ticketId, snapshot.title)} \u2014 edited by ${actor}: ${changed.map(_mdCode).join(" ")}` +
            // #156: re-pointing dependencies can clear the last one, so an
            // edit announces what it just unlocked, same as a move.
            this._unlockDigestSuffix(cache, prev),
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
   * #156: the digest suffix naming what one change just UNLOCKED.
   *
   * Computed as a DIFFERENCE of the pure scan (`unlockedTicketIds`) over
   * the board before and after the change, so it announces the TRANSITION
   * only: a ticket whose dependencies were already clear before this move
   * or edit appears in both sets and is never re-announced. No newly
   * unlocked ticket means an empty string — the digest line grows no text.
   */
  private _unlockDigestSuffix(
    cache: { state: AidosState },
    prev: TicketSnapshot,
  ): string {
    const scan = (changed: TicketSnapshot): DependencyScanEntry[] => {
      const entries: DependencyScanEntry[] = [];
      for (const snapshot of cache.state.tickets.values()) {
        const effective = snapshot.id === changed.id ? changed : snapshot;
        if (effective.id !== changed.id && this._isRetired(cache.state, effective.id)) continue;
        entries.push({
          id: effective.id,
          workspaceKey: effective.workspaceKey,
          slug: effective.slug,
          state: effective.state,
          dependsOn: effective.dependsOn ?? [],
        });
      }
      return entries;
    };
    const current = cache.state.tickets.get(prev.id);
    if (current === undefined) return "";
    const after = new Set(unlockedTicketIds(scan(current)));
    const before = new Set(unlockedTicketIds(scan(prev)));
    const fresh = [...after].filter((id) => !before.has(id));
    if (fresh.length === 0) return "";
    return ` — this unlocks ${fresh.map((id) => `#${id}`).join(", ")}`;
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
          // #156: name what this transition just unlocked, if anything.
          this._unlockDigestSuffix(cache, ticket) +
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
    const project = cache.state.projects.get(projectId);
    const workspaceKey = workspaceKeyFromPath(project?.absPath ?? this._workspacePath(agent));
    const base = opts?.slug?.trim() || slugFromTitle(title);
    // #218: a refused create consumes nothing (the port contract), so the
    // slug is validated BEFORE the id is claimed — against the session
    // fold AND the store fold. The session check alone cannot see a live
    // peer's same-titled ticket; without the store check that duplicate
    // would only fail inside the mirrored append, after the port id was
    // already consumed.
    if (base !== "" && this._slugTaken(cache.state, workspaceKey, base, null)) {
      throw new DuplicateSlug(base, workspaceKey);
    }
    const entry = this._workspaceStore(agent);
    if (entry !== null && base !== "" && entry.store.slugTaken(workspaceKey, base, null)) {
      throw new DuplicateSlug(base, workspaceKey);
    }
    // #218: the id is claimed from the store port, not minted from the
    // per-session fold counter. See `_allocateTicketId` for the fallback
    // and the floor rule that keeps legacy sessions fresh in both spaces.
    // (#186, inherited: an empty base falls back to `ticket-<id>` after
    // the claim, so its second refusal may still consume the id.)
    const ticketId = this._allocateTicketId(agent, cache.state, entry);
    const slug = base || `ticket-${ticketId}`;
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
    /*
     * #126: the provenance stamp is HOST-written, from harness session state.
     * A payload-crafted `stamp` key is a forgery attempt: it is dropped, and
     * the harness value (or its honest absence) is what lands on the row.
     * Other payload keys that merely LOOK like provenance (`model`, `chain`,
     * `sessionId`) are left as the data they are — they are never read for
     * stamping. The stamp itself lives on the row, never inside the payload,
     * so the tool surface (which returns payloads) cannot leak it into model
     * context; humans see it on the board/UI.
     */
    const stampable = deepClone(payload);
    delete stampable.stamp;
    const sessionId = agent.id;
    const row: EvidenceRow = {
      kind,
      author: actor,
      at: this._atFor(agent.session, ticketId),
      payload: stampable,
      stamp: evidenceStamp(this.ctx, sessionId, actor),
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
        `${_mdTicketHead(ticketId, title)} \u2014 evidence ${_mdCode(kind)} by ${actor}` +
          _evidenceDigestSuffix(kind, payload) +
          // #174: the same guidance the move and criterion-link lines carry —
          // what this ticket needs next, on the INSTRUCTION side so lines
          // needing the same thing still coalesce.
          this._nextStepSuffix(agent, ticketId),
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

  /**
   * #218: claim one workspace-unique ticket id for a host create.
   *
   * The store port owns allocation (#39): its counter is shared across
   * every session of the workspace in this process and atomic across
   * processes on SQLite, so two live sessions never receive the same
   * id. The public `Store.allocateTicketId` already floors the port
   * against the store fold; the host maxes once more against its own
   * session fold, so a session holding legacy fold-counter tickets
   * ahead of the port still mints an id that is fresh in BOTH spaces —
   * no refusal, no overwrite, no renumbering of anything already on
   * the board (the migration rule).
   *
   * No store (it will not open) falls back to the fold counter: the
   * pre-store harness world and every test written against it behave
   * exactly as before. A refused port allocation throws
   * StoreWriteRefused before any log append, so the failed create
   * leaves the session log untouched.
   *
   * DESIGN (why a public allocate, not routing creates through
   * `Store.createTicket`): the create's content — slug rule, phase
   * defaulting, order, workspace key, the plan-import shape — is host
   * logic computed against the SESSION fold (its project row, its
   * phases), while `Store.createTicket` computes the same fields
   * against the STORE fold (a different project row, no imported
   * phases). Routing through it would either duplicate that logic or
   * silently answer from the wrong fold. Allocation is the one piece
   * that must be shared, so the one shared piece is what moved.
   */
  private _allocateTicketId(
    agent: Agent,
    state: AidosState,
    entry: { store: Store; projectId: ProjectId } | null,
  ): TicketId {
    if (entry === null) {
      return this._nextTicketId(state);
    }
    return Math.max(entry.store.allocateTicketId(), state.nextTicketId);
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
   *
   * #45: the `<sourceSessionId>:<id>` composite is GONE. Ids are unique per
   * workspace — the store allocates them from one port counter (#39) and
   * renumbered every imported log into that space (#41) — so a bare number
   * IS the address, and a plain id the caller's own fold does not hold
   * resolves through the workspace merge to its owning session (or, for a
   * dead origin, to the store-backed orphan session #43 built). The old
   * session-headed branch is deleted: a colon ref with a numeric tail now
   * falls through to the slug lookup and refuses, which is the migration
   * contract for references written by the composite-addressing builds.
   */
  private _resolveTicketId(agent: Agent, ref: number | string): TicketId {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    if (typeof ref === "number") {
      return this._resolveNumericTicketId(agent, cache, ref);
    }

    // The board names an own row by `String(id)`, so a bare decimal string
    // is an id and not a slug. A slug is title-derived and never a bare
    // number, so no slug hides behind this branch.
    if (/^\d+$/.test(ref)) {
      return this._resolveNumericTicketId(agent, cache, Number(ref));
    }

    const current = workspaceKeyFromPath(this._workspacePath(agent));
    const colon = ref.indexOf(":");
    if (colon >= 0) {
      const head = ref.slice(0, colon);
      const tail = ref.slice(colon + 1);
      // #45: only a `<workspaceKey>:<slug>` reference crosses a boundary
      // now. The old `<sourceSessionId>:<ticketId>` form lost its routing
      // branch with the composite address itself; a numeric tail finds no
      // slug and refuses below.
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

  /**
   * #45: resolve a bare numeric reference (a number or a decimal string)
   * to a ticket id. The caller's own fold is tried first — an id the
   * caller's log holds is the caller's ticket, which is the #93 rule kept
   * verbatim. Only when the own fold lacks the id does the reference
   * resolve through the workspace merge: the merge row's `sourceSessionId`
   * names the owning session, and resolution reruns in THAT session's
   * fold — which for a dead origin is the store-backed orphan session
   * #43 built, so the store's renumbered workspace-unique id resolves
   * exactly like a live peer's local one.
   */
  private _resolveNumericTicketId(
    agent: Agent,
    cache: SessionCache,
    numeric: number,
  ): TicketId {
    if (cache.state.tickets.has(numeric)) {
      return numeric;
    }
    const owner = this._workspaceOwnerOf(agent, numeric);
    if (owner !== null) {
      const ownerSession = this._ownerSession(agent, owner);
      const ownerCache = this._cache(ownerSession);
      this._sync(ownerSession, ownerCache);
      if (ownerCache.state.tickets.has(numeric)) {
        return numeric;
      }
    }
    throw new UnknownTicket(numeric);
  }

  /**
   * #45: the session that owns `ticketId` on this workspace's merged
   * board, or null when no row carries the id. Provenance only — the
   * merge stamps every row's owning session, live or imported, and the
   * id space itself is the store's (#39/#41), so the row found here is
   * the one the plain id addresses.
   */
  private _workspaceOwnerOf(agent: Agent, ticketId: TicketId): string | null {
    const merged = this._workspaceBoardMerge(agent, true);
    const row = merged.tickets.find((candidate) => candidate.id === ticketId);
    const owner = row?.sourceSessionId;
    return typeof owner === "string" && owner !== "" ? owner : null;
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
