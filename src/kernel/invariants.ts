/**
 * The strict replay validation, separated from the fold so the dsh
 * `aidos/invariant` companion can mount it at B1. SPEC.md section 8
 * lists every rule. `validateAidosEvent` throws InvariantError (code
 * "INVARIANT") on the first violation.
 *
 * Note on "legacy" handling: tickets created before D1 had no `dependsOn`
 * field. No real ticket has been created yet, but tests/d1-depends-on.test.ts
 * synthesizes those old records to prove an old log still replays.
 * normalizeTicketSnapshot() in slug.ts fills that gap so replay is not
 * treated as corrupt. See src/kernel/slug.ts for the full explanation.
 * Slug and workspaceKey are required with no fallback.
 */

import type { AidosEvent } from "./events";
import type { AidosState } from "./fold";
import { PLAN_CONTEXT_LIMIT } from "./constants";
import { isLegalTransition } from "./gates";
import { InvariantError } from "./types";
import { normalizeTicketSnapshot, workspaceKeyFromPath } from "./slug";
import { STATE_ORDER } from "./types";
import type { PlanValue, TicketId, TicketState } from "./types";

// ---- exact field sets (rule 1) ----

const TICKET_CHANGE_KEYS = ["kind", "version", "operation", "ticket", "at"];
const SNAPSHOT_KEYS = [
  "id",
  "projectId",
  "title",
  "description",
  "body",
  "criteria",
  "phase",
  "order",
  "state",
  "allowlist",
  "slug",
  "workspaceKey",
  "revision",
  "createdAt",
  "updatedAt",
  "dependsOn",
];
const EVIDENCE_KEYS = ["kind", "version", "ticketId", "row"];
const EVIDENCE_DETACHED_KEYS = ["kind", "version", "ticketId", "at", "rowKind"];
const EVIDENCE_LINKED_KEYS = ["kind", "version", "ticketId", "at", "rowKind", "criterion"];
const EVIDENCE_ROW_KEYS = ["kind", "author", "at", "payload"];
const PLAN_CHANGE_KEYS = ["kind", "version", "projectId", "plan", "at"];
const PLAN_KEYS = ["frontmatter", "context", "rules"];
const PLAN_CONTEXT_KEYS = ["preamble", "contextSections"];
const PLAN_SECTION_KEYS = ["heading", "text", "index"];
const COMMENT_KEYS = ["kind", "version", "ticketId", "text", "author", "at"];
const REFUSAL_KEYS = [
  "kind",
  "version",
  "ticketId",
  "fromState",
  "toState",
  "actor",
  "reason",
  "at",
];
const PROJECT_CREATED_KEYS = ["kind", "version", "projectId", "absPath", "name", "at"];
const PROJECT_MOVED_KEYS = ["kind", "version", "projectId", "absPath", "name", "at"];
const PHASE_SET_KEYS = ["kind", "version", "projectId", "number", "title", "state", "at"];

// ---- checks ----

function invariant(message: string): never {
  throw new InvariantError(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Require exactly the given keys: no unknown, no missing. */
function expectKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  what: string,
): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      invariant(`${what} has an unknown key ${key}`);
    }
  }
  for (const key of keys) {
    if (!(key in value)) {
      invariant(`${what} is missing key ${key}`);
    }
  }
}

function expectString(value: unknown, what: string): void {
  if (typeof value !== "string") {
    invariant(`${what} must be a string`);
  }
}

function expectNumber(value: unknown, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invariant(`${what} must be a finite number`);
  }
}

/** A whole number at or above the given floor. */
function expectInt(value: unknown, what: string, min: number): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    invariant(`${what} must be an integer of at least ${min}`);
  }
}

function expectActor(value: unknown, what: string): void {
  if (value !== "agent" && value !== "user" && value !== "system") {
    invariant(`${what} must be one of agent, user, system`);
  }
}

function expectState(value: unknown, what: string): void {
  if (!(STATE_ORDER as readonly string[]).includes(value as string)) {
    invariant(`${what} must be one of ${STATE_ORDER.join(", ")}`);
  }
}

/** The line count of one text block. An empty block has zero lines. */
function countLines(text: string): number {
  if (text === "") {
    return 0;
  }
  return text.split("\n").length;
}

/**
 * The context line count of one plan value: the preamble plus every
 * section's heading and text lines. The frontmatter and the rules are
 * not part of the context (SPEC decision 10).
 */
export function planContextLineCount(plan: PlanValue): number {
  let total = countLines(plan.context.preamble);
  for (const section of plan.context.contextSections) {
    total += countLines(section.heading) + countLines(section.text);
  }
  return total;
}

// ---- per-kind validators ----

function validateTicketChange(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, TICKET_CHANGE_KEYS, "ticket/change");
  if (raw.version !== 1) {
    invariant("ticket/change version must be 1");
  }
  const operation = raw.operation;
  if (operation !== "create" && operation !== "set" && operation !== "move") {
    invariant("ticket/change operation must be create, set, or move");
  }
  expectNumber(raw.at, "ticket/change at");
  const rawTicket = raw.ticket;
  if (!isPlainObject(rawTicket)) {
    invariant("ticket/change ticket must be an object");
  }
  // Replay normalization: old logs (pre-D1) may lack dependsOn.
  // normalizeTicketSnapshot fills that gap so replay is not treated
  // as corrupt. See slug.ts. Slug and workspaceKey are required fields
  // with no fallback; their absence is a hard invariant violation
  // (checked by expectString calls below).
  const ticket = normalizeTicketSnapshot(rawTicket);
  expectKeys(ticket, SNAPSHOT_KEYS, "ticket snapshot");
  expectInt(ticket.id, "ticket id", 1);
  expectInt(ticket.projectId, "project id", 1);
  expectString(ticket.title, "ticket title");
  expectString(ticket.description, "ticket description");
  expectString(ticket.body, "ticket body");
  expectString(ticket.criteria, "ticket criteria");
  expectInt(ticket.phase, "ticket phase", 0);
  expectInt(ticket.order, "ticket order", 0);
  expectState(ticket.state, "ticket state");
  if (
    !Array.isArray(ticket.allowlist) ||
    ticket.allowlist.some((entry) => typeof entry !== "string")
  ) {
    invariant("ticket allowlist must be an array of strings");
  }
  if (
    "dependsOn" in rawTicket &&
    (!Array.isArray(rawTicket.dependsOn) ||
      rawTicket.dependsOn.some((entry) => typeof entry !== "string"))
  ) {
    invariant("ticket dependsOn must be an array of strings");
  }
  expectInt(ticket.revision, "ticket revision", 1);
  expectNumber(ticket.createdAt, "ticket createdAt");
  expectNumber(ticket.updatedAt, "ticket updatedAt");
  expectString(ticket.slug, "ticket slug");
  expectString(ticket.workspaceKey, "ticket workspaceKey");
  if ((ticket.slug as string).length === 0) {
    invariant("ticket slug must not be empty");
  }
  if ((ticket.workspaceKey as string).length === 0) {
    invariant("ticket workspaceKey must not be empty");
  }
  const id = ticket.id as TicketId;
  const snapshot = ticket as unknown as Record<string, unknown>;
  const at = raw.at as number;
  const prev = state.tickets.get(id);
  const lastAt = state.lastAt.get(id);
  const lastRevision = state.lastRevision.get(id);

  // The workspace key must match the project's key when the project exists.
  const project = state.projects.get(ticket.projectId as number);
  if (project !== undefined && (ticket.workspaceKey as string) !== workspaceKeyFromPath(project.absPath)) {
    invariant(`ticket ${id} workspaceKey must match its project's path`);
  }

  // Slug uniqueness within one workspace. A different ticket with the same
  // workspaceKey and slug is the one hard failure.
  for (const other of state.tickets.values()) {
    if (
      other.id !== id &&
      other.workspaceKey === (ticket.workspaceKey as string) &&
      other.slug === (ticket.slug as string)
    ) {
      invariant(`ticket slug ${ticket.slug as string} is already used in workspace ${ticket.workspaceKey as string}`);
    }
  }

  // D1: a ticket must not depend on itself. The reference names the same
  // workspace and the same ticket number.
  const selfRef = (ticket.dependsOn as string[]).find((ref) => {
    const colon = ref.lastIndexOf(":");
    if (colon < 0) return false;
    const refWorkspace = ref.slice(0, colon);
    const refId = Number(ref.slice(colon + 1));
    return refWorkspace === (ticket.workspaceKey as string) && refId === id;
  });
  if (selfRef !== undefined) {
    invariant(`ticket ${id} cannot depend on itself (${selfRef})`);
  }

  // D1: the dependency graph must stay acyclic. The nodes are the folded
  // tickets plus the incoming snapshot; an unresolvable reference is a leaf
  // and cannot close a cycle. One DFS pass, three colors per node.
  {
    const refOf = (workspaceKey: string, ticketId: number): string =>
      `${workspaceKey}:${ticketId}`;
    const incomingRef = refOf(ticket.workspaceKey as string, id);
    const nodes = new Set<string>([incomingRef]);
    for (const other of state.tickets.values()) {
      nodes.add(refOf(other.workspaceKey, other.id));
    }
    const resolve = (ref: string): string | null => {
      const colon = ref.lastIndexOf(":");
      if (colon < 0) return null;
      const key = ref.slice(0, colon);
      const ticketId = Number(ref.slice(colon + 1));
      if (!Number.isInteger(ticketId) || ticketId < 1) return null;
      const target = refOf(key, ticketId);
      return nodes.has(target) ? target : null;
    };
    const adjacency = new Map<string, string[]>();
    for (const other of state.tickets.values()) {
      if (other.id === id) continue;
      adjacency.set(
        refOf(other.workspaceKey, other.id),
        (other.dependsOn ?? []).map(resolve).filter((entry): entry is string => entry !== null),
      );
    }
    adjacency.set(
      incomingRef,
      (ticket.dependsOn as string[]).map(resolve).filter((entry): entry is string => entry !== null),
    );

    // 0 = unvisited, 1 = on the current path, 2 = done.
    const color = new Map<string, number>();
    for (const node of nodes) color.set(node, 0);
    const path: string[] = [];

    const visit = (node: string): void => {
      color.set(node, 1);
      path.push(node);
      for (const next of adjacency.get(node) ?? []) {
        const nextColor = color.get(next);
        if (nextColor === 2) continue;
        if (nextColor === 1) {
          // A cycle runs from the first path occurrence of next onward.
          const start = path.indexOf(next);
          // M1: keep full workspace:ticket ref when cycle spans workspaces; ticket id alone hides collisions.
          const cycle = path.slice(start);
          const allSameWorkspace = cycle.every((ref) => ref.slice(0, ref.lastIndexOf(":")) === cycle[0].slice(0, cycle[0].lastIndexOf(":")));
          const display = allSameWorkspace
            ? cycle.map((ref) => ref.slice(ref.lastIndexOf(":") + 1))
            : cycle;
          let message = `ticket ${display[0]} depends on`;
          for (let index = 1; index < display.length; index += 1) {
            message += ` ticket ${display[index]}`;
            if (index < cycle.length - 1) message += " which depends on";
          }
          invariant(`${message} which depends on ticket ${display[0]}`);
        }
        visit(next);
      }
      path.pop();
      color.set(node, 2);
    };

    for (const node of nodes) {
      if (color.get(node) === 0) visit(node);
    }
  }

  // Rule 3: revision continuity. Rule 4: create rules.
  if (operation === "create") {
    if (prev !== undefined) {
      invariant(`ticket ${id} already exists`);
    }
    if (ticket.state !== "open") {
      invariant("a created ticket must be in state open");
    }
    if (ticket.revision !== 1) {
      invariant("a created ticket must have revision 1");
    }
    if (ticket.createdAt !== at) {
      invariant("a created ticket must have createdAt equal to at");
    }
  } else {
    if (prev === undefined) {
      invariant(`ticket ${id} does not exist`);
    }
    if (lastRevision === undefined || ticket.revision !== lastRevision + 1) {
      invariant(`ticket ${id} revision must continue from ${lastRevision}`);
    }
  }

  // Rule 6: at and updatedAt must not fall.
  if (lastAt !== undefined && at < lastAt) {
    invariant(`ticket ${id} at must not fall below ${lastAt}`);
  }
  if (prev !== undefined && (snapshot.updatedAt as number) < prev.updatedAt) {
    invariant(`ticket ${id} updatedAt must not fall`);
  }

  // Rule 5: transition legality for moves.
  if (operation === "move") {
    if (prev === undefined) {
      invariant(`ticket ${id} does not exist`);
    }
    if (
      !isLegalTransition(
        prev.state,
        snapshot.state as TicketState,
      )
    ) {
      invariant(`illegal transition ${prev.state} -> ${snapshot.state}`);
    }
  }
}

function validateEvidence(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, EVIDENCE_KEYS, "evidence/attached");
  if (raw.version !== 1) {
    invariant("evidence/attached version must be 1");
  }
  expectInt(raw.ticketId, "ticket id", 1);
  const row = raw.row;
  if (!isPlainObject(row)) {
    invariant("evidence/attached row must be an object");
  }
  expectKeys(row, EVIDENCE_ROW_KEYS, "evidence row");
  expectString(row.kind, "evidence kind");
  if ((row.kind as string).length === 0) {
    invariant("evidence kind must not be empty");
  }
  expectActor(row.author, "evidence author");
  expectNumber(row.at, "evidence at");
  if (!isPlainObject(row.payload)) {
    invariant("evidence payload must be an object");
  }
  // Rule 7: at must not fall for that ticket. Ticket must exist.
  const ticketId = raw.ticketId as TicketId;
  if (!state.tickets.has(ticketId)) {
    invariant(`evidence references unknown ticket ${ticketId}`);
  }
  const lastAt = state.lastAt.get(ticketId);
  if (lastAt !== undefined && (row.at as number) < lastAt) {
    invariant(`evidence at for ticket ${ticketId} must not fall below ${lastAt}`);
  }
}

function validateEvidenceDetached(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, EVIDENCE_DETACHED_KEYS, "evidence/detached");
  if (raw.version !== 1) {
    invariant("evidence/detached version must be 1");
  }
  expectInt(raw.ticketId, "ticket id", 1);
  expectString(raw.rowKind, "evidence row kind");
  if ((raw.rowKind as string).length === 0) {
    invariant("evidence row kind must not be empty");
  }
  expectNumber(raw.at, "evidence at");
  // A detach targets an EXISTING row, so its `at` may predate later writes;
  // Rule 7 governs new timestamps, not references to old rows. Ticket
  // existence is the invariant here; row liveness is enforced by the fold
  // (only an exact at+kind match drops anything).
  const ticketId = raw.ticketId as TicketId;
  if (!state.tickets.has(ticketId)) {
    invariant(`evidence references unknown ticket ${ticketId}`);
  }
}

function validateEvidenceLinked(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, EVIDENCE_LINKED_KEYS, "evidence/linked");
  if (raw.version !== 1) {
    invariant("evidence/linked version must be 1");
  }
  expectInt(raw.ticketId, "ticket id", 1);
  expectString(raw.rowKind, "evidence row kind");
  if ((raw.rowKind as string).length === 0) {
    invariant("evidence row kind must not be empty");
  }
  expectNumber(raw.at, "evidence at");
  expectString(raw.criterion, "evidence criterion");
  const isUnlink = (raw.criterion as string).trim().length === 0;
  // The row must exist AND, when linking, the criterion must be one of
  // the ticket's. Empty criterion = unlink sentinel, membership not
  // applicable.
  const ticketId = raw.ticketId as TicketId;
  const snapshot = state.tickets.get(ticketId);
  if (!snapshot) {
    invariant(`evidence references unknown ticket ${ticketId}`);
  }
  const rows = state.evidence.get(ticketId) ?? [];
  const found = rows.some((row) => row.at === raw.at && row.kind === raw.rowKind);
  if (!found) {
    invariant(`evidence/linked names no live row (at=${String(raw.at)}, kind=${String(raw.rowKind)})`);
  }
  if (snapshot && !isUnlink) {
    const valid = snapshot.criteria
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (!valid.includes((raw.criterion as string).trim())) {
      invariant(`evidence criterion ${JSON.stringify(raw.criterion)} is not one of the ticket's criteria`);
    }
  }
  // The link targets an EXISTING row, so its `at` legitimately predates
  // later writes on the ticket; the monotonicity rule (Rule 7) governs new
  // timestamps, not references to old ones. The row-liveness check above is
  // the real guard here.
}

function validatePlanChange(
  _state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, PLAN_CHANGE_KEYS, "plan/change");
  if (raw.version !== 1) {
    invariant("plan/change version must be 1");
  }
  expectInt(raw.projectId, "project id", 1);
  expectNumber(raw.at, "plan/change at");
  const plan = raw.plan;
  if (!isPlainObject(plan)) {
    invariant("plan/change plan must be an object");
  }
  expectKeys(plan, PLAN_KEYS, "plan value");
  expectString(plan.frontmatter, "plan frontmatter");
  expectString(plan.rules, "plan rules");
  const context = plan.context;
  if (!isPlainObject(context)) {
    invariant("plan context must be an object");
  }
  expectKeys(context, PLAN_CONTEXT_KEYS, "plan context");
  expectString(context.preamble, "plan preamble");
  const sections = context.contextSections;
  if (!Array.isArray(sections)) {
    invariant("plan contextSections must be an array");
  }
  for (const section of sections) {
    if (!isPlainObject(section)) {
      invariant("plan context section must be an object");
    }
    expectKeys(section, PLAN_SECTION_KEYS, "plan context section");
    expectString(section.heading, "plan section heading");
    expectString(section.text, "plan section text");
    const index = section.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
      invariant("plan section index must be a non-negative integer");
    }
  }
  // Rule 8: the context cap.
  if (planContextLineCount(plan as unknown as PlanValue) > PLAN_CONTEXT_LIMIT) {
    invariant(`plan context exceeds ${PLAN_CONTEXT_LIMIT} lines`);
  }
}

function validateComment(state: AidosState, raw: Record<string, unknown>): void {
  expectKeys(raw, COMMENT_KEYS, "comment/added");
  if (raw.version !== 1) {
    invariant("comment/added version must be 1");
  }
  expectInt(raw.ticketId, "ticket id", 1);
  expectString(raw.text, "comment text");
  expectActor(raw.author, "comment author");
  expectNumber(raw.at, "comment at");
  // A comment is a write to the ticket. Its at must not fall. Ticket must exist.
  const ticketId = raw.ticketId as TicketId;
  if (!state.tickets.has(ticketId)) {
    invariant(`comment references unknown ticket ${ticketId}`);
  }
  const lastAt = state.lastAt.get(ticketId);
  if (lastAt !== undefined && (raw.at as number) < lastAt) {
    invariant(`comment at for ticket ${ticketId} must not fall below ${lastAt}`);
  }
}

function validateRefusal(_state: AidosState, raw: Record<string, unknown>): void {
  expectKeys(raw, REFUSAL_KEYS, "aidos/refusal");
  if (raw.version !== 1) {
    invariant("aidos/refusal version must be 1");
  }
  expectInt(raw.ticketId, "ticket id", 1);
  if (raw.fromState !== null) {
    expectState(raw.fromState, "refusal fromState");
  }
  if (raw.toState !== null) {
    expectState(raw.toState, "refusal toState");
  }
  if (raw.actor !== null) {
    expectActor(raw.actor, "refusal actor");
  }
  expectString(raw.reason, "refusal reason");
  expectNumber(raw.at, "refusal at");
}

function validateProjectCreated(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, PROJECT_CREATED_KEYS, "project/created");
  if (raw.version !== 1) {
    invariant("project/created version must be 1");
  }
  expectInt(raw.projectId, "project id", 1);
  expectString(raw.absPath, "project absPath");
  expectString(raw.name, "project name");
  expectNumber(raw.at, "project/created at");
  if (state.projects.has(raw.projectId as number)) {
    invariant(`project ${raw.projectId} already exists`);
  }
}

function validateProjectMoved(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, PROJECT_MOVED_KEYS, "project/moved");
  if (raw.version !== 1) {
    invariant("project/moved version must be 1");
  }
  expectInt(raw.projectId, "project id", 1);
  expectString(raw.absPath, "project absPath");
  expectString(raw.name, "project name");
  expectNumber(raw.at, "project/moved at");
  if (!state.projects.has(raw.projectId as number)) {
    invariant(`project ${raw.projectId} does not exist`);
  }
}

function validatePhaseSet(
  state: AidosState,
  raw: Record<string, unknown>,
): void {
  expectKeys(raw, PHASE_SET_KEYS, "phase/set");
  if (raw.version !== 1) {
    invariant("phase/set version must be 1");
  }
  expectInt(raw.projectId, "project id", 1);
  expectInt(raw.number, "phase number", 0);
  expectString(raw.title, "phase title");
  expectString(raw.state, "phase state");
  expectNumber(raw.at, "phase/set at");
  if (!state.projects.has(raw.projectId as number)) {
    invariant(`project ${raw.projectId} does not exist`);
  }
}

/**
 * Validate one event against the current state.
 * Throws InvariantError on the first violation.
 */
export function validateAidosEvent(state: AidosState, event: AidosEvent): void {
  if (!isPlainObject(event)) {
    invariant("event must be an object");
  }
  const raw = event as unknown as Record<string, unknown>;
  const kind = raw.kind;
  if (typeof kind !== "string") {
    invariant("event kind must be a string");
  }
  switch (kind) {
    case "ticket/change":
      validateTicketChange(state, raw);
      return;
    case "evidence/attached":
      validateEvidence(state, raw);
      return;
    case "evidence/detached":
      validateEvidenceDetached(state, raw);
      return;
    case "evidence/linked":
      validateEvidenceLinked(state, raw);
      return;
    case "plan/change":
      validatePlanChange(state, raw);
      return;
    case "comment/added":
      validateComment(state, raw);
      return;
    case "aidos/refusal":
      validateRefusal(state, raw);
      return;
    case "project/created":
      validateProjectCreated(state, raw);
      return;
    case "project/moved":
      validateProjectMoved(state, raw);
      return;
    case "phase/set":
      validatePhaseSet(state, raw);
      return;
    default:
      invariant(`unknown event kind: ${String(kind)}`);
  }
}
