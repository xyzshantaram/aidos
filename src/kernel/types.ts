/**
 * Shared types for the aidos kernel. Pure TypeScript, no dsh imports.
 *
 * This file is part of the B0 contract (SPEC.md). The types here are
 * normative.
 */

/** The four ticket states, in order. The last state has no successor. */
export const STATE_ORDER = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
] as const;

/** One ticket state. Exhaustive: adding a state fails to compile here. */
export type TicketState = (typeof STATE_ORDER)[number];

/** Who performed an action. The service stamps it; the payload never does. */
export type Actor = "agent" | "user" | "system";

/** What a ticket/change event did. */
export type TicketOperation = "create" | "set" | "move";

export type TicketId = number;
export type ProjectId = number;

/** One whole-value ticket snapshot. */
export interface TicketSnapshot {
  id: TicketId;
  projectId: ProjectId;
  title: string;
  description: string;
  body: string;
  criteria: string;
  phase: number;
  order: number;
  state: TicketState;
  /** Per-ticket file allowlist. The write boundary enforces it from B1. */
  allowlist: string[];
  /** A durable, per-workspace-unique alias for this ticket. */
  slug: string;
  /** The workspace this ticket belongs to. The raw global id is `<workspaceKey>:<slug>`. */
  workspaceKey: string;
  /** 1 on create, +1 on every set and move. */
  revision: number;
  /** at of the create event. */
  createdAt: number;
  /** at of the last change. Never falls. */
  updatedAt: number;
}

/** One evidence row. The author is stamped, never read from the payload. */
export interface EvidenceRow {
  kind: string;
  author: Actor;
  at: number;
  payload: Record<string, unknown>;
}

/** One plan context section. The heading keeps its "##" prefix. */
export interface ContextSection {
  heading: string;
  text: string;
  /** The number of phases that come before this section. */
  index: number;
}

/** The context part of a plan: preamble plus sections. */
export interface PlanContext {
  preamble: string;
  contextSections: ContextSection[];
}

/** One whole-value plan. */
export interface PlanValue {
  frontmatter: string;
  context: PlanContext;
  /** The project rules section. B4 round-trips it. */
  rules: string;
}

/** One phase record. The state is a label, never gated on. */
export interface PhaseRecord {
  projectId: ProjectId;
  number: number;
  title: string;
  state: string;
}

/** One comment on a ticket. */
export interface CommentRecord {
  ticketId: TicketId;
  text: string;
  author: Actor;
  at: number;
}

/** One registered evidence kind. */
export interface KindDef {
  id: string;
  label: string;
  description: string;
  weight: number;
  allowedAuthors: Actor[];
}

/** One configured gate for one exact transition. */
export interface GateDef {
  fromState: TicketState;
  toState: TicketState;
  requiredKinds: string[];
  allowedActors: Actor[];
}

/** The full kind and gate config. Injected, never part of the log. */
export interface AidosConfig {
  kinds: KindDef[];
  gates: GateDef[];
}

/** One ticket as the Store returns it. The prototype's dict, camelCased. */
export interface TicketRow {
  id: TicketId;
  projectId: ProjectId;
  title: string;
  description: string;
  body: string;
  criteria: string;
  phase: number;
  order: number;
  state: TicketState;
}

/** One paged ticket row: the ticket fields plus the derived pair. */
export interface TicketPageRow extends TicketRow {
  /** Confidence score. Advisory: it never unlocks anything. */
  score: number;
  /** Forward gate only. Null for done and for a missing forward gate. */
  gateFraction: number | null;
}

export interface ProjectView {
  id: ProjectId;
  absPath: string;
  name: string;
}

export interface PhaseView {
  projectId: ProjectId;
  number: number;
  title: string;
  state: string;
}

export interface PlanMetaView {
  frontmatter: string;
  preamble: string;
  contextSections: ContextSection[];
}

export interface EvidenceViewRow {
  kind: string;
  payload: Record<string, unknown>;
  author: Actor;
  createdAt: number;
}

/** The sort keys of ticketsPage. */
export type SortKey = "id" | "title" | "phase" | "score" | "gate_fraction";

/** One page of tickets plus the total count of matching tickets. */
export interface TicketPage {
  page: TicketPageRow[];
  total: number;
}

// ---- error classes ----

/** A transition refused by its gate. Ported from the prototype's GateRefused. */
export class GateRefused extends Error {
  readonly missingKinds: string[];
  readonly allowedActors: string[];
  readonly fromState: TicketState | null;
  readonly toState: TicketState | null;
  readonly actor: Actor | null;
  readonly noGate: boolean;

  constructor(options: {
    missingKinds?: string[];
    allowedActors?: string[];
    fromState?: TicketState | null;
    toState?: TicketState | null;
    actor?: Actor | null;
    noGate?: boolean;
  }) {
    const missingKinds = options.missingKinds ?? [];
    const allowedActors = options.allowedActors ?? [];
    const fromState = options.fromState ?? null;
    const toState = options.toState ?? null;
    const actor = options.actor ?? null;
    const noGate = options.noGate ?? false;
    let where = "";
    if (fromState !== null && toState !== null) {
      where = ` for ${fromState} -> ${toState}`;
    }
    let who = "";
    if (actor !== null) {
      who = ` by actor ${actor}`;
    }
    let detail: string;
    if (noGate) {
      detail = "no gate configured for this transition";
    } else {
      const parts: string[] = [];
      if (missingKinds.length > 0) {
        parts.push(`missing evidence kinds: ${missingKinds.join(", ")}`);
      }
      if (allowedActors.length > 0) {
        parts.push(`allowed actors: ${allowedActors.join(", ")}`);
      }
      detail = parts.join(" ") || "this gate permits no actor";
    }
    super(`Gate refused${where}${who}: ${detail}`);
    this.missingKinds = missingKinds;
    this.allowedActors = allowedActors;
    this.fromState = fromState;
    this.toState = toState;
    this.actor = actor;
    this.noGate = noGate;
  }
}

/** An evidence kind that is not registered. Carries the kind id. */
export class UnknownKind extends Error {
  readonly kind: string;
  constructor(kind: string) {
    super(`no such kind: ${kind}`);
    this.kind = kind;
  }
}

/** An actor who is not allowed to author one kind. */
export class EvidenceAuthorRefused extends Error {
  readonly kind: string;
  readonly author: Actor;
  constructor(kind: string, author: Actor) {
    super(`author ${author} cannot attach kind ${kind}`);
    this.kind = kind;
    this.author = author;
  }
}

export class UnknownTicket extends Error {
  readonly ticketId: TicketId | string;
  constructor(ticketId: TicketId | string) {
    super(`no such ticket: ${ticketId}`);
    this.ticketId = ticketId;
  }
}

export class UnknownProject extends Error {
  readonly projectId: ProjectId;
  constructor(projectId: ProjectId) {
    super(`no such project: ${projectId}`);
    this.projectId = projectId;
  }
}

/** One line of a plan document that the parser refuses. */
export class PlanParseError extends Error {
  readonly line: number;
  readonly message: string;
  constructor(line: number, message: string) {
    super(`line ${line}: ${message}`);
    this.line = line;
    this.message = message;
  }
}

/** An import into a project that already holds a ticket. */
export class ProjectNotEmptyError extends Error {
  readonly projectId: ProjectId;
  constructor(projectId: ProjectId) {
    super(`project ${projectId} already holds tickets`);
    this.projectId = projectId;
  }
}

/** A plan context that exceeds the 500-line cap. */
export class ContextTooLongError extends Error {
  readonly overage: number;
  constructor(overage: number) {
    super(`plan context exceeds 500 lines by ${overage}`);
    this.overage = overage;
  }
}

/** A log record that broke a strict replay rule. */
export class InvariantError extends Error {
  readonly code: "INVARIANT" = "INVARIANT";
  constructor(message: string) {
    super(message);
  }
}

/** A slug that one workspace already holds. The duplicate is the hard failure. */
export class DuplicateSlug extends Error {
  readonly slug: string;
  readonly workspaceKey: string;
  constructor(slug: string, workspaceKey: string) {
    super(`the slug ${slug} is already used in workspace ${workspaceKey}`);
    this.slug = slug;
    this.workspaceKey = workspaceKey;
  }
}

/** A write against a ticket in a different workspace. Names the workspace to open. */
export class ForeignWorkspace extends Error {
  readonly ticketWorkspaceKey: string;
  readonly currentWorkspaceKey: string;
  constructor(ticketWorkspaceKey: string, currentWorkspaceKey: string) {
    super(`this ticket belongs to workspace ${ticketWorkspaceKey}; open that workspace to write it`);
    this.ticketWorkspaceKey = ticketWorkspaceKey;
    this.currentWorkspaceKey = currentWorkspaceKey;
  }
}

/** A non-user actor that tried to set a ticket's allowlist. */
export class AllowlistActorRefused extends Error {
  readonly actor: Actor;
  constructor(actor: Actor) {
    super(`only the user may set a ticket's allowlist; actor ${actor} cannot`);
    this.actor = actor;
  }
}

/**
 * A proposed allowlist that no approved `builtin:file_allowlist` evidence
 * row on the ticket covers. Names the uncovered paths.
 */
export class AllowlistCoverageRefused extends Error {
  readonly ticketId: TicketId;
  readonly uncovered: string[];
  constructor(ticketId: TicketId, uncovered: string[]) {
    super(
      `allowlist for ticket ${ticketId} includes paths no builtin:file_allowlist evidence covers: ${uncovered.join(", ")}`,
    );
    this.ticketId = ticketId;
    this.uncovered = uncovered;
  }
}
