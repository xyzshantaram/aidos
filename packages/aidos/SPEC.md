# B0 kernel specification

This file is the contract for build B0. The stub files in `src/` are the
compiled form of this contract. SPEC.md wins over a stub. If a stub must
change, change the stub and this file together, and report the change.

## 1. Purpose

B0 ports the Phase-1 prototype (`prototype/aidos_proto/store.py`, `plan.py`)
to a pure TypeScript kernel. There is no dsh import, no UI, no tool, no
database. The session log, the settings namespace, the Remote endpoints, and
the tools arrive in B1 and later.

This build is Ticket C2 plus C3 and the P-series pins, in the form the
PLAN.md design gives them.

The dsh-native event vocabulary replaces the prototype's SQL log. Config
moves out of the log. The behavior stays: replay, deny by default, the gate
refusals, the author stamps, the advisory score, the plan round trip.

## 2. Sources of truth

- `PLAN.md`: "The ticket domain", "Event vocabulary", "Strict replay and
  invariant", "Kinds, weights, gates: registry as settings", "The write
  boundary", "The gate engine", "Projection units", "The plan skill and
  import".
- `prototype/aidos_proto/store.py`: the Store API and its behavior.
- `prototype/aidos_proto/plan.py`: the plan document parser and renderer.
- `prototype/tests/`: the 32 test modules that this build ports.

## 3. Decisions (locked for B0)

1. **Config is not log.** Kinds, weights, and gates live in an
   `AidosConfig` value injected at store construction. The log never carries
   a config event. Replay never depends on config. The settings namespace
   (`ctx.settings.register("aidos", ...)`) arrives in B1 as the write path
   that produces config values. This preserves test_12 (loosening a gate
   needs no migration), test_18 (registry survives reopen), and the spirit
   of test_19 (registry changes audited: the settings seam is versioned at
   B1; at B0 the pin becomes "the log carries no config mutation").
2. **States are a fixed enum.** `STATE_ORDER` is
   `["open", "in_progress", "awaiting_verification", "done"]` as a const
   array. `TicketState` is its element type. Adding a state fails to compile
   until every arm of the transition function handles it (TypeScript
   exhaustiveness, Ticket C3's evaluate).
3. **Legal transitions.** A ticket moves along a forward step of
   `STATE_ORDER`, the send-back edge `awaiting_verification ->
   in_progress`, or a self-transition (`state -> the same state`). Any
   other pair refuses even when a gate exists for it. The prototype
   allowed arbitrary state strings; the port pins the enum instead.
   The self-transition is legal because test_15 pins that a configured
   gate on an exact pair governs the move, and a self-pair is an exact
   pair. PLAN.md's "every other transition rejects" targets arbitrary
   non-walk pairs like `open -> review`. Gates may still be *configured*
   for any pair (that is settings); only moves are validated. This is why
   test_31's custom `review` state must be adapted (see the port map).
4. **Ids are numbers.** Project ids and ticket ids auto-increment from 1,
   like the prototype. The dsh layer may switch to string ids at B1; the
   kernel keeps numbers so the ported tests hold.
5. **Kind namespace is a convention, not a replay rule.** Replay checks
   that a kind id is a non-empty string. The write boundary checks
   registration. `builtin:` and `plugin:` prefixes are documentation; the
   prototype tests use bare ids like `kind_a`, and replay must not crash on
   them (test_29, P29).
6. **`builtin:after_shot` weight is 1.0.** The store-level tests (test_31,
   test_32) use 1.0. The CLI spec's 0.5 loses; the constant table is one
   table and the port follows it. B1's tool tests read the same table.
7. **Clock is injectable.** `Store` takes `now: () => number` returning
   seconds as a float. The default is `Date.now() / 1000`. `at` must not
   fall as seq rises; ties are legal (test_31).
8. **`setTicket` on an unknown ticket throws.** The prototype appends
   blindly and the CLI discovers the error on read. Whole-value snapshots
   make blind append corrupt the fold, so the kernel refuses up front
   (`UnknownTicket`). No ported store test depends on the blind append.
9. **Illegal transitions refuse as `GateRefused` with `noGate: true`.**
   The refusal vocabulary stays one type. The message names the pair.
10. **The context cap is a replay check and a write-boundary check.**
    `plan/change` context (preamble plus every section text and heading)
    may not exceed 500 lines. `setPlanMeta` refuses with a
    `ContextTooLongError` naming the overage (C4's evaluate). The fold
    rejects a violating event as corrupt (PLAN.md "plan/change context
    length" is a replay rule). The bootstrap import may raise the cap at
    B4; the kernel keeps 500.

## 4. Package layout

```
packages/aidos/
  SPEC.md
  package.json, tsconfig.json, tsconfig.tests.json, vitest.config.ts
  src/
    kernel/
      types.ts        shared types, error classes
      constants.ts    STATE_ORDER, BUILTIN_KINDS, DEFAULT_GATES
      events.ts       the AidosEvent union and payload types
      fold.ts         createInitialState, foldAidosEvents
      invariants.ts   validateAidosEvent (the strict replay checks)
      gates.ts        checkGate, GateRefused
      projections.ts  tickets, evidence, plan, comments views
      store.ts        the Store service (the prototype's Store port)
    plan/
      plan.ts         parsePlan, renderPlan, PlanParseError
      plan-io.ts      importPlan, exportPlan
  tests/
    PORT-MAP.md       test_NN -> TS file, and every adaptation
    ...               one vitest file per prototype test module
```

## 5. Types (`src/kernel/types.ts`)

All in the `aidos` kernel namespace (plain module exports, no barrel).

```ts
export const STATE_ORDER = ["open", "in_progress", "awaiting_verification", "done"] as const;
export type TicketState = (typeof STATE_ORDER)[number];
export type Actor = "agent" | "user" | "system";
export type TicketOperation = "create" | "set" | "move";
export type TicketId = number;
export type ProjectId = number;

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
  allowlist: string[];       // per-ticket file allowlist; enforced from B1
  revision: number;          // 1 on create, +1 on every set and move
  createdAt: number;         // at of the create event
  updatedAt: number;         // at of the last change, monotone
}

export interface EvidenceRow {
  kind: string;              // namespaced id; registered at the write boundary
  author: Actor;
  at: number;
  payload: Record<string, unknown>;
}

export interface ContextSection {
  heading: string;           // keeps the "##" prefix
  text: string;              // keeps every inner line, ends trimmed of blanks
  index: number;             // phases before this section
}

export interface PlanContext {
  preamble: string;
  contextSections: ContextSection[];
}

export interface PlanValue {
  frontmatter: string;
  context: PlanContext;
  rules: string;             // the project rules section; B4 round-trips it
}

export interface PhaseRecord {
  projectId: ProjectId;
  number: number;
  title: string;
  state: string;             // a label, never gated on
}

export interface CommentRecord {
  ticketId: TicketId;
  text: string;
  author: Actor;
  at: number;
}

export interface KindDef {
  id: string;
  label: string;
  description: string;
  weight: number;
  allowedAuthors: Actor[];
}

export interface GateDef {
  fromState: TicketState;
  toState: TicketState;
  requiredKinds: string[];
  allowedActors: Actor[];
}

export interface AidosConfig {
  kinds: KindDef[];
  gates: GateDef[];
}

// The view rows the Store returns. The prototype's dict shapes, camelCased.
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

export interface TicketPageRow extends TicketRow {
  score: number;             // confidence score, advisory
  gateFraction: number | null; // forward gate only; null for done or no gate
}

export interface ProjectView { id: ProjectId; absPath: string; name: string; }
export interface PhaseView { projectId: ProjectId; number: number; title: string; state: string; }
export interface PlanMetaView { frontmatter: string; preamble: string; contextSections: ContextSection[]; }
export interface EvidenceViewRow { kind: string; payload: Record<string, unknown>; author: Actor; createdAt: number; }

export type SortKey = "id" | "title" | "phase" | "score" | "gate_fraction";

export interface TicketPage {
  page: TicketPageRow[];
  total: number;
}
```

Error classes, all `extends Error`:

```ts
export class GateRefused extends Error {
  readonly missingKinds: string[];
  readonly allowedActors: string[];
  readonly fromState: TicketState | null;
  readonly toState: TicketState | null;
  readonly actor: Actor | null;
  readonly noGate: boolean;
  // constructor(options: {
  //   missingKinds?: string[]; allowedActors?: string[];
  //   fromState?: TicketState | null; toState?: TicketState | null;
  //   actor?: Actor | null; noGate?: boolean;
  // })
  // message, ported from the prototype's __str__:
  //   "Gate refused for <from> -> <to> by actor <actor>: <detail>"
  //   detail with noGate: "no gate configured for this transition"
  //   else: "missing evidence kinds: a, b" plus "allowed actors: u" or
  //         "this gate permits no actor" when both lists are empty.
}

export class UnknownKind extends Error { readonly kind: string; }
export class EvidenceAuthorRefused extends Error { readonly kind: string; readonly author: Actor; }
export class UnknownTicket extends Error { readonly ticketId: TicketId; }
export class UnknownProject extends Error { readonly projectId: ProjectId; }
export class PlanParseError extends Error { readonly line: number; readonly message: string; }
export class ProjectNotEmptyError extends Error { readonly projectId: ProjectId; }
export class ContextTooLongError extends Error { readonly overage: number; }
export class InvariantError extends Error { readonly code: "INVARIANT"; }
```

## 6. Constants (`src/kernel/constants.ts`)

`STATE_ORDER` lives here (imported by types.ts users; types.ts re-exports
it or constants.ts re-exports the type — pick one owner: types.ts owns the
const, constants.ts re-exports it).

`BUILTIN_KINDS`: the one constant table. Exactly this content:

| id | label | description | weight | allowedAuthors |
|---|---|---|---|---|
| builtin:user_signoff | User signoff | The human confirms the work. | 1.0 | user |
| builtin:user_verified | User verified | The human checked the finished work. | 1.0 | user |
| builtin:eval_criteria | Evaluation criteria | The criteria to judge the work. | 1.0 | user, agent |
| builtin:file_allowlist | File allowlist | The files the change may touch. | 1.0 | user, agent |
| builtin:agent_report | Agent report | The agent describes the work. | 1.0 | user, agent |
| builtin:automated_check | Automated check | A machine check ran and reported a result. | 1.0 | agent, user |
| builtin:test_run | Test run | A test run and its result. | 1.0 | agent, user |
| builtin:review_pass | Review pass | A reviewer read the change and reported findings. | 1.0 | agent, user |
| builtin:review_note | Review note | A remark from a review. | 0.5 | agent, user |
| builtin:after_shot | After shot | The state after the work. | 1.0 | user, agent |
| builtin:comment | Comment | A remark on the ticket. | 0.5 | user, agent |
| builtin:imported_state | Imported state | The state that a plan document claimed at import time. | 0.0 | system |

Only `builtin:user_signoff` and `builtin:user_verified` are human-only,
and `builtin:imported_state` is system-only. Every other kind accepts
both user and agent authors, because the ported prototype pins attach
them as either actor (test_15 attaches every default kind as the user;
test_10 attaches `builtin:review_pass` as the user). The agent-side
restriction to the four agent kinds is a B1 tool rule, not a kernel
rule.

`DEFAULT_GATES`: the default gate config, ported from the CLI spec:

| from | to | requiredKinds | allowedActors |
|---|---|---|---|
| open | in_progress | builtin:user_signoff | user, agent |
| in_progress | awaiting_verification | builtin:automated_check, builtin:review_pass | user, agent |
| awaiting_verification | done | builtin:user_verified | user |
| awaiting_verification | in_progress | (none) | user |

`PLAN_CONTEXT_LIMIT` is `500`. It is the plan/change context cap that both
the write boundary (`setPlanMeta`) and the replay fold enforce (decision
10). The overage of a refused meta is the count minus 500.

## 7. Events (`src/kernel/events.ts`)

One discriminated union on `kind`:

```ts
export type AidosEvent =
  | TicketChangeEvent | EvidenceAttachedEvent | PlanChangeEvent
  | CommentAddedEvent | RefusalEvent
  | ProjectCreatedEvent | ProjectMovedEvent | PhaseSetEvent;

export interface TicketChangeEvent {
  kind: "ticket/change";
  version: 1;
  operation: TicketOperation;
  ticket: TicketSnapshot;
  at: number;
}
export interface EvidenceAttachedEvent {
  kind: "evidence/attached";
  version: 1;
  ticketId: TicketId;
  row: EvidenceRow;
}
export interface PlanChangeEvent {
  kind: "plan/change";
  version: 1;
  projectId: ProjectId;
  plan: PlanValue;
  at: number;
}
export interface CommentAddedEvent {
  kind: "comment/added";
  version: 1;
  ticketId: TicketId;
  text: string;
  author: Actor;
  at: number;
}
export interface RefusalEvent {
  kind: "aidos/refusal";
  version: 1;
  ticketId: TicketId;
  fromState: TicketState | null;
  toState: TicketState | null;
  actor: Actor | null;
  reason: string;
  at: number;
}
export interface ProjectCreatedEvent {
  kind: "project/created";
  version: 1;
  projectId: ProjectId;
  absPath: string;
  name: string;
  at: number;
}
export interface ProjectMovedEvent {
  kind: "project/moved";
  version: 1;
  projectId: ProjectId;
  absPath: string;
  name: string;
  at: number;
}
export interface PhaseSetEvent {
  kind: "phase/set";
  version: 1;
  projectId: ProjectId;
  number: number;
  title: string;
  state: string;
  at: number;
}
```

The project and phase events are whole-value like the rest of the
vocabulary. `project/moved` carries the name unchanged, so one record is
the whole new project. `phase/set` carries the whole phase record, so a
phase needs no separate create record. These three events exist because
the Store API is log-backed: projects, phases, and plan meta must survive
a replay (section 10).

The refusal record is log-only. Replay validates it and changes no state
(the prototype's `ticket.move_refused`, PLAN.md's `aidos/refusal`).

## 8. Fold and invariant (`src/kernel/fold.ts`, `src/kernel/invariants.ts`)

`fold.ts` exports:

```ts
export interface AidosState {
  projects: Map<ProjectId, { absPath: string; name: string }>;
  phases: Map<ProjectId, Map<number, { title: string; state: string }>>;
  tickets: Map<TicketId, TicketSnapshot>;
  evidence: Map<TicketId, EvidenceRow[]>;
  plans: Map<ProjectId, PlanValue>;
  comments: Map<TicketId, CommentRecord[]>;
  lastAt: Map<TicketId, number>;      // per-ticket non-decreasing at
  lastRevision: Map<TicketId, number>;
}
export function createInitialState(): AidosState;
export function foldAidosEvents(state: AidosState, event: AidosEvent): AidosState;
```

`foldAidosEvents` validates the event against the current state, then
applies it. A violation throws `InvariantError` (code `"INVARIANT"`) before
any mutation. `invariants.ts` exports the validation as
`validateAidosEvent(state, event): void` (throws `InvariantError`), which
`foldAidosEvents` calls first. The dsh `aidos/invariant` companion
registration (under `ctx.invariants`) is B1; the pure function is this one.

Validation rules, in order (PLAN.md "Strict replay and invariant"):

1. **Exact field sets.** Every event and every operation carries exactly
   its schema fields. Unknown keys reject. Missing keys reject. `version`
   must be 1.
2. **Ticket snapshot shape.** `ticket/change` carries a full snapshot:
   id, projectId, title, description, body, criteria, phase, order, state,
   allowlist, revision, createdAt, updatedAt. `state` is a `TicketState`
   (exhaustive). `revision` is a positive integer.
3. **Revision continuity.** For `create`, `revision === 1`. For `set` and
   `move`, `revision === lastRevision.get(id) + 1`.
4. **Create rules.** A `create` for an id that exists rejects. The
   snapshot's state must be `"open"` (an import is not a transition; the
   store enforces this too).
5. **Transition legality.** A `move` event's `fromState -> toState` (read
   from the previous snapshot and the new one) must be a forward step of
   `STATE_ORDER`, the send-back edge, or a self-transition. Anything else
   rejects (decision 3: a skipped state refuses even when a gate exists
   for the pair).
6. **`at` and `updatedAt`.** `at` must not fall for the ticket
   (`at >= lastAt`; ties legal). `updatedAt` must not fall. For `create`,
   `createdAt === at`.
7. **Evidence rows.** `evidence/attached` carries `{ kind, author, at,
   payload }` exactly. `author` is an `Actor`. `kind` is a non-empty
   string. `at` must not fall for that ticket.
8. **Plan events.** `plan/change` carries the whole `PlanValue`. The
   context (preamble plus each section's text and heading lines) is at most
   500 lines. `frontmatter` and `rules` are strings. A `plan/change` needs
   no prior project event: replay validates structure, the write boundary
   validates membership (`setPlanMeta` refuses an unknown project).
9. **Comment events.** `comment/added` carries `{ text, author, at }`
   exactly. `author` is an `Actor`.
10. **Refusals.** `aidos/refusal` carries the documented fields and changes
    no state.
11. **Seq order is the caller's promise.** The kernel folds events in the
    order the log gives; the dsh layer guarantees `seq` order at B1.
12. **Projects.** `project/created` carries `{ projectId, absPath, name,
    at }` exactly; a project id that already exists rejects. `project/moved`
    carries the same four; the project must exist.
13. **Phases.** `phase/set` carries `{ projectId, number, title, state, at
    }` exactly; the project must exist. `number` is a whole number.

Replay does not check kind registration or gate membership (PLAN.md "What
replay does not check, deliberately"). The write boundary does.

## 9. Gate engine (`src/kernel/gates.ts`)

```ts
export function checkGate(
  config: AidosConfig,
  ticket: TicketSnapshot,
  evidence: readonly EvidenceRow[],
  toState: TicketState,
  actor: Actor,
): void;  // throws GateRefused on refusal
```

Semantics (PLAN.md "The gate engine", prototype `move_ticket`):

1. The transition `ticket.state -> toState` must be legal (forward step,
   send-back edge, or self-transition). An illegal transition refuses
   with `GateRefused` `noGate: true` naming the pair. (The store checks
   this before calling checkGate; checkGate re-checks for callers that
   skip the store.)
2. No gate configured for the pair: refuse with `noGate: true`.
3. `actor` not in the gate's `allowedActors`: refuse.
4. A required kind with no attached row on the ticket: refuse. `missingKinds`
   lists the absent kinds, in gate order. `allowedActors` carries the gate's
   actors, so the refusal names who may write the missing kind (the board
   surfaces `str(GateRefused)` verbatim).
5. All required kinds present and `actor` allowed: return.

A ticket in the last state has no forward gate and no fraction (test_32).

## 10. Store (`src/kernel/store.ts`)

The `Store` class ports `prototype/aidos_proto/store.py`. It owns a log
(append-only, in memory) and derives every read by folding.

```ts
export interface StoreOptions {
  log?: AidosEvent[];       // replay an existing log
  now?: () => number;       // seconds float; default Date.now() / 1000
}

export class Store {
  constructor(config: AidosConfig, options?: StoreOptions);
  readonly config: AidosConfig;
  events(): readonly AidosEvent[];          // a frozen copy, oldest first
  replay(): void;                            // fold options.log at construction
}
```

Construction folds `options.log` (default `[]`) with strict validation:
a corrupt record throws `InvariantError` and the store is unusable.

Methods, all ported from the prototype with camelCase names. Every mutation
appends exactly one event, validates the write boundary first, and throws
on refusal *before* the log changes. Projects, phases, plan meta, and
tickets are all log-backed: `createProject` appends `project/created`,
`moveProject` appends `project/moved`, `setPhase` appends `phase/set`, and
the plan methods append `plan/change` (section 7). Every project-scoped
write (`moveProject`, `setPhase`, `setPlanMeta`, `setRules`,
`createTicket`) refuses an unknown project with `UnknownProject`; every
project-scoped read (`getProject`, `getPhase`, `getPlanMeta`) does the
same. This mirrors decision 8: a whole-value log makes a blind append
corrupt the fold, so the kernel refuses up front.

Registry (config, no methods): the store exposes `config.kinds` and
`config.gates` read-only. There is no `registerKind`, `setKindWeight`, or
`setGate` on the store. The ported tests build configs (see the port map).

Projects:
```ts
createProject(absPath: string, name: string): ProjectId;
moveProject(projectId: ProjectId, absPath: string): void;   // UnknownProject
getProject(projectId: ProjectId): ProjectView;      // UnknownProject
projects(): ProjectView[];                           // sorted by id
findProject(absPath: string): ProjectId | null;
```

Phases:
```ts
setPhase(projectId: ProjectId, number: number, opts?: { title?: string; state?: string; actor?: Actor }): void;  // UnknownProject
getPhase(projectId: ProjectId, number: number): PhaseView;   // UnknownProject; defaults title "", state "open"
phasesFor(projectId: ProjectId): PhaseView[];                // sorted by number
```

Plan meta:
```ts
setPlanMeta(projectId: ProjectId, opts: { frontmatter?: string; preamble?: string; contextSections?: ContextSection[]; rules?: string; actor?: Actor }): void;  // UnknownProject
setRules(projectId: ProjectId, rules: string, actor?: Actor): void;  // UnknownProject
getPlanMeta(projectId: ProjectId): PlanMetaView & { rules: string };  // UnknownProject; defaults "", "", [], ""
```
`setPlanMeta` enforces the 500-line context cap (`ContextTooLongError` with
`overage`). `setRules` keeps the current context and frontmatter and
replaces rules (one `plan/change` event).

Tickets:
```ts
createTicket(projectId: ProjectId, title: string, description: string,
  opts?: { actor?: Actor; body?: string; criteria?: string; phase?: number; order?: number; allowlist?: string[] }): TicketId;  // UnknownProject
setTicket(ticketId: TicketId, opts: { actor?: Actor; title?: string; description?: string; body?: string;
  criteria?: string; phase?: number; order?: number; allowlist?: string[] }): void;  // UnknownTicket
getTicket(ticketId: TicketId): TicketRow;           // UnknownTicket; legacy defaults filled
ticketsFor(projectId: ProjectId): TicketRow[];       // phase, order, id order
ticketsPage(opts?: { projectId?: ProjectId; sort?: SortKey; descending?: boolean; limit?: number; offset?: number }): TicketPage;
```
- `createTicket` default `actor: "user"`, `body: ""`, `criteria: ""`,
  `phase: 1`, `order: next free position in the phase counted from 1`,
  `allowlist: []`. `state` is `"open"`, `revision` 1.
- `setTicket` builds the next whole snapshot: revision +1, `updatedAt` =
  now, `state` and `createdAt` unchanged. Only the named fields change.
- Legacy defaults: a snapshot folded without body/criteria/phase/order
  (older log records) reads as `""`, `""`, `1`, next-free-order — the same
  values the single read and the paged read report (one code path,
  prototype `_fill_ticket_defaults`).
  The dsh snapshot is whole-value, so a record with missing fields cannot
  exist: strict replay rejects it as corrupt (exact field sets). The
  prototype's legacy-record replay pins (test_28 `OldRecordReplayTest`,
  test_31 `LegacyTicketDefaultsTest`, test_32's legacy sort) therefore port
  as write-boundary pins: `createTicket` writes the full snapshot with the
  defaults, and the sort orders by the filled values. The port map
  documents this.
- `ticketsPage` row = TicketRow + `score` + `gateFraction`. Sort keys:
  `id`, `title`, `phase`, `score`, `gate_fraction`. The `phase` sort uses
  the filled defaults (COALESCE(phase,1), null order last in its phase
  group, then order, then id). Unknown sort key throws `Error` naming the
  key. `limit` defaults 20, `offset` 0. `total` counts matching tickets
  before limit and offset.

Evidence:
```ts
attachEvidence(ticketId: TicketId, kind: string, payload: Record<string, unknown>, actor: Actor): void;
evidenceFor(ticketId: TicketId): EvidenceViewRow[];   // oldest first, payloads as attached
confidenceScore(ticketId: TicketId): number;          // advisory
addComment(ticketId: TicketId, text: string, author: Actor): void;
```
- `attachEvidence`: kind must be registered (`UnknownKind` carries the
  kind); `actor` must be in the kind's `allowedAuthors`
  (`EvidenceAuthorRefused`); then append. The author is the parameter, not
  anything in the payload (test_02, P2: the agent cannot write a row that
  names you). There is no ticket-existence check: the prototype appended
  blindly, and the SPEC annotates `UnknownTicket` only on `setTicket`,
  `getTicket`, and `moveTicket`.
- `confidenceScore`: sum each kind's weight once per distinct
  `(kind, author)` pair (test_11). A kind the config does not hold
  contributes nothing. Advisory: nothing gates on it.
- `addComment`: appends one `comment/added` record. There is no
  ticket-existence check and no read method: comments are a projection
  (section 11), read from B1.

Transitions:
```ts
moveTicket(ticketId: TicketId, toState: TicketState, actor: Actor): void;
```
Order of checks: ticket exists (`UnknownTicket`) -> transition legal ->
`checkGate` -> append `ticket/change` `move` with `state: toState`,
revision +1, `updatedAt` now.

A refusal — an illegal pair or a gate refusal — appends one `aidos/refusal`
event *before* throwing `GateRefused`; the log keeps the audit record, the
projection ignores it. An illegal pair refuses with `noGate: true` and the
reason `"no gate configured for this transition"`; a gate refusal carries
the prototype's `_refusal_reason` string (`"missing evidence kinds: ..."`
and/or `"allowed actors: ..."`) as the reason. The prototype's
`move_refused` reason string ports into the refusal event's `reason`.

## 11. Projections (`src/kernel/projections.ts`)

Pure functions over a folded `AidosState`. The dsh `sessionProjections`
registration (init/apply/view, `stateVersion`, `restore`) is B1; these are
the apply/view bodies:

```ts
export interface TicketView extends TicketRow {
  confidenceScore: number;
  gateFraction: number | null;
}
export function ticketsProjection(state: AidosState, config: AidosConfig): Map<TicketId, TicketView>;
export function evidenceProjection(state: AidosState): Map<TicketId, EvidenceRow[]>;
export function planProjection(state: AidosState): Map<ProjectId, PlanValue>;
export function commentsProjection(state: AidosState): Map<TicketId, CommentRecord[]>;
```

`ticketsProjection` takes the config as well as the state: the score reads
the kind weights and the fraction reads the forward gate, and both live in
the config, never in the log (the stub's state-only signature could not
compute either). At B1 the session projection registration supplies the
config when it builds the view body.

- `gateFraction`: the forward gate only (`state` -> its successor in
  `STATE_ORDER`; the last state has none). No gate for the forward pair:
  `null`. Empty required kinds: 1.0. Else present / required.
- `confidenceScore` matches `Store.confidenceScore` exactly (test_32's
  score-oracle pin).

## 12. Plan module (`src/plan/plan.ts`)

A verbatim port of `prototype/aidos_proto/plan.py`. Pure functions, no
store knowledge.

```ts
export const MARK_STATES: Record<string, TicketState>; // " " open, "~" in_progress, "?" awaiting_verification, "x" done
export const STATE_MARKS: Record<TicketState, string>; // reverse
export class PlanParseError extends Error { readonly line: number; readonly message: string; }

export interface PlanTicket { id: string; title: string; body: string; criteria: string; claimedState: TicketState; order: number; }
export interface PlanPhase { number: number; title: string; state: string; tickets: PlanTicket[]; }
export interface PlanDocument {
  frontmatter: string;         // keeps both fence lines, verbatim
  preamble: string;            // verbatim, ends trimmed of blank lines
  phases: PlanPhase[];
  contextSections: ContextSection[];  // { heading, text, index }
}

export function parsePlan(text: string): PlanDocument;   // PlanParseError, 1-based line
export function renderPlan(doc: PlanDocument): string;
```

Document rules (prototype docstring, unchanged):
- Frontmatter optional, fenced by lines that hold only `---`. Kept verbatim.
- The text before the first `##` heading is the preamble, kept verbatim
  (ends trimmed of blank lines).
- Phase heading: `## Phase N: Title — \`state\`` (em dash). N is a whole
  number, title is free text, state is free text in backticks.
- Ticket line: `- [mark] **Ticket ID: Title.** body **Evaluate:** criteria`.
  Marks: `[ ]` open, `[~]` in_progress, `[?]` awaiting_verification,
  `[x]` done. The title never ends with a period (the renderer adds it).
  `**Evaluate:**` is required and may sit on a continuation line.
- Continuation lines start with two spaces and extend the body of the
  ticket above.
- Inside a phase, only blank, ticket, and continuation lines are legal.
  Any other line raises `PlanParseError` naming its 1-based number
  (test_26: the message contains the number; nothing imports).
- Any other `##` heading opens a context section. The heading keeps its
  `##` prefix; the text keeps every inner line, ends trimmed of blanks;
  the index counts the phases before it.
- `renderPlan(parsePlan(text))` parses back to identical data. Two renders
  of the same data give identical bytes. The renderer sorts nothing.
- A phase with no tickets renders its heading only; a phase with tickets
  renders a blank line after the heading.

## 13. Import and export (`src/plan/plan-io.ts`)

```ts
export interface ImportResult { phases: PlanPhase[]; tickets: TicketId[]; }
export function importPlan(store: Store, projectId: ProjectId, text: string, source: string): ImportResult;
export function exportPlan(store: Store, projectId: ProjectId): string;
```

`importPlan` (CLI spec "plan import", test_26, test_22):
1. `parsePlan(text)`. A parse error propagates `PlanParseError` (the B1
   tool renders it as `plan_parse_error` with the line).
2. The project must hold no ticket (`ProjectNotEmptyError`; the CLI error
   value `project_not_empty`). An import loads a whole plan into an empty
   project; it never merges.
3. Every ticket lands in `open` whatever mark the document carries. An
   import is never a transition.
4. Each imported ticket gets one `builtin:imported_state` row, author
   `system`, payload `{ claimed_state, source }` (the state the mark
   named; the `--file` path).
5. Phases come from the document (`setPhase`, state as a label). Ticket
   `phase` and `order` come from the document. Ids come from the store's
   counter; the document's ticket ids are labels only.
6. The plan meta (frontmatter, preamble, context sections) stores
   verbatim; `rules` stays `""` (the B0 parser has no rules section).

`exportPlan`:
1. Phases from the store, sorted by number; tickets within a phase by
   order then id (`ticketsFor` ordering).
2. Each ticket renders with the mark of its real state (`STATE_MARKS`).
3. Context sections placed by their stored index; a section with no index
   goes after the last phase (the kernel always stores the index).
4. Frontmatter and preamble verbatim from plan meta.
5. Two exports of the same store give identical bytes (test_26).

## 14. Port map (`tests/PORT-MAP.md`)

One vitest file per prototype test module: `tests/test-NN-<name>.test.ts`.
`PORT-MAP.md` lists every module, the TS file, and the adaptation. The
rules:

1. **Behavior, not text.** Each prototype assertion becomes a TS assertion
   of the same claim. Key renames: `ticket_id` -> `id`,
   `project_id` -> `projectId`, `kind_id` -> `kind`, `created_at` ->
   `createdAt`, `actor` -> `actor`, `abs_path` -> `absPath`,
   `context_sections` -> `contextSections`. Expectation helpers:
   `expect(...).toEqual(...)`.
2. **Config, not setup calls.** `make_store(kinds)` and
   `store.set_gate(...)` become an `AidosConfig` value passed to the
   constructor. `tests/helpers.ts` provides `makeConfig`,
   `makeStore(config?)`, and `storeFromLog(log, config?)` (reopen
   equivalent: build a new store from the old store's log and compare
   views).
3. **Reopen becomes replay.** test_01/17/18 build a second store from the
   first store's log and compare `getTicket`, `evidenceFor`,
   `confidenceScore`, and `events()`.
4. **test_31's custom states adapt.** The fixture's `review` state is not
   in the enum. Replace the custom gates with enum pairs: gate
   `(open, in_progress)` requiring `[kind_a, kind_b]` actors `[user,
   agent]`, gate `(in_progress, awaiting_verification)` requiring
   `[kind_a]` actors `[user]`; drive the first ticket to
   `awaiting_verification`. The v_kinds, v_gates, v_projects, v_phases,
   v_plan_meta, v_tickets, v_evidence literals become projection
   literals with camelCase keys and the adapted states. The `at`
   non-falling pin survives. The refused-move "changes no view" pin
   survives via the `aidos/refusal` event.
5. **test_32's `open -> review` gate** (a gate that is not the forward
   gate) becomes a gate on a non-forward enum pair, for example
   `(done, open)`; the fraction stays null.
6. **CLI tests (test_20 to 25) port to the kernel surface.** The CLI's
   actor rule ports as "the author is the actor parameter, never the
   payload" (test_02 already pins it). The human-only refusal ports as
   `EvidenceAuthorRefused` (test_21). The refusal JSON shape ports as
   `GateRefused` field checks (test_23). `init` idempotency ports as
   "the default config is deterministic" (test_24). "Every subcommand
   prints JSON" is a B1 tool test; the B0 file keeps one comment and no
   assertion. JSON rendering itself is B1.
7. **test_22** ports fully: no agent path to done from any state, the
   refusal names the missing kind or the allowed actors, the ticket stays
   put, and a plan import cannot produce a done ticket (the import lands
   in open and keeps the claim as `builtin:imported_state` evidence only).
8. **The mirror pin.** One test restates `STATE_ORDER`, `BUILTIN_KINDS`,
   and `DEFAULT_GATES` verbatim and asserts deep equality. Drift fails the
   suite (PLAN.md "The test suite's mirror restates them on purpose").
9. **The audit pin.** One test asserts the log never carries a config
   mutation: after any sequence of store calls, no event has a
   `kind.registered`, `kind.weight_set`, or `gate.set` type (test_19's
   port; the settings seam itself is B1).
10. **test_26 ports with its fixture verbatim** (frontmatter, preamble,
    two phases, done and open tickets, a three-line body, one context
    section). The byte-identical export pin and the parse-error pins
    (line number, nothing imported) port directly. `ROUND_TRIP_TICKET_KEYS`
    becomes `id, title, body, criteria, phase, order`.
11. **test_27, test_30, test_09, test_10, test_11, test_15, test_16**
    port directly with the config adaptation. test_16 asserts the refused
    move appended one log record (the `aidos/refusal` event) and changed
    no state.
12. **Unknown kind and sort key errors** carry their payloads: test_04/29
    assert `UnknownKind.kind`; test_32 asserts the sort-key error message.
13. No ported test loosens a claim to fit an implementation. If a claim
    cannot port, the port map says so and names the B-series ticket that
    carries it.

## 15. Definition of done

- `npm run typecheck` and `npm run typecheck:tests` pass.
- `npm test` (vitest) is green: every ported test plus the mirror and
  audit pins.
- `tests/PORT-MAP.md` lists every one of the 32 modules and its file.
- Every prototype behavior has an equivalent test, walked one by one
  (Ticket U5's checklist, applied to the kernel slice).
- Zero dsh imports in `src/`.
- The plan round trip is byte for byte (test_26).
- The kernel reads no author from any payload.

## 16. Working rules for this build

- Pure TypeScript, `strict`. No `any` leaks.
- STE prose in comments, error messages, and this file. Code and
  identifiers are exempt.
- SPEC.md is normative. A stub change updates SPEC.md in the same edit.
- Tests and kernel are separate dispatches. The kernel dispatch never
  touches `tests/`. The test dispatch never implements kernel logic.
- The commit that closes B0 updates PLAN.md's build-order row and the
  benchmarking table.
