# B1 specification

This file is the contract for build B1. It consumes the B0 kernel
(`src/kernel/`, `src/plan/`; SPEC.md is the kernel contract and dies when
B1 lands). The dsh surfaces in the "dsh call shapes" blocks come from
`docs/b1-tool-seams.md`; fill them from that document before dispatch.
SPEC-B1.md wins over a stub. A change updates SPEC-B1.md in the same edit.

## 1. Purpose

B1 ships the dsh-side wiring and the six agent tools. No UI, no Remote
endpoints (B2), no board (B3). What lands:

- The **aidos-core** service: a log-backed ticket service over the session
  log, the four projection units, and the invariant companion.
- The **aidos-tools** agent plugin: `get_tickets`, `set_ticket`,
  `attach_evidence`, `move_ticket`, `plan`, `plan_import`.
- The **guard** and the **delegation-depth check** on every board tool.
- The **state-gated tool tiers**: `ctx.tools.restrict` masks keyed on the
  union of ticket states, re-applied at session start and on every
  `ticket/change` event.
- The **bash-ask listener**: a `tools/pre-execute` listener that returns
  `ask` for the bash tool while any ticket awaits verification.
- The **per-ticket allowlist guard**: the write boundary enforces the
  union of in-progress allowlists, and subagents get the same path
  predicate as a child-scope guard.
- The **`aidos` settings namespace** for kind and gate config.
- The **`tool:aidos`** system-prompt section.
- The P3 CLI tests (test_20 to 25) ported as tool tests, the P8 pins, and
  the guard, mask, and allowlist tests.

## 2. Sources of truth

- PLAN.md: "The write boundary", "The gate engine", "The monotonic tool
  guard", "State-gated tool access", "Model-facing tools", "Projection
  units", "Subagents and detached jobs", "The plan skill and import".
- `prototype/aidos_proto/cli.py` and `prototype/tests/cli_helpers.py`: the
  CLI behavior this build ports to the tool layer.
- `docs/b1-tool-seams.md`: the verified dsh surfaces.
- The B0 kernel: `src/kernel/` and `src/plan/` (SPEC.md sections 5 to 13).

## 3. Decisions (locked for B1)

1. **Tools execute as the agent.** The service stamps `actor: "agent"`
   from the entry point (`exec.agent`), never from the payload. A payload
   key named `author` or `actor` is data, not an instruction (test_20,
   P2).
2. **Every tool result is JSON**, on success and on failure. Refusals are
   structured JSON errors, never tracebacks (test_25, P29). `plan` is the
   one exception: its result is the plan markdown.
3. **`attach_evidence` offers only the agent-allowed kinds.**
   `automated_check`, `review_pass`, `review_note`, `agent_report`. A
   human-only kind (`user_signoff`, `user_verified`) refuses with
   `human_only_kind`; an unregistered kind refuses with `unknown_kind`
   naming the kind (P29). The kernel's `allowedAuthors` check backs the
   refusal structurally.
4. **`set_ticket` creates or edits.** With no `ticketId` it creates a
   ticket in `open` (the CLI's `create-ticket`); with one it edits the
   named fields (the CLI's `set-ticket`). It creates the phase when the
   phase is absent, with the title "Untitled phase" and state `open` (the
   CLI's `create_ticket` helper).
5. **`move_ticket` refuses `awaiting_verification -> done` for any agent.**
   The gate's `allowedActors` is `["user"]`; the refusal names the missing
   kind or the allowed actors (test_22, P22). The kernel enforces it; the
   tool renders it.
6. **`plan_import` reads the file** through the sandboxed fs (source = the
   file path). It parses first (a parse error imports nothing), refuses a
   non-empty project with `project_not_empty`, lands every ticket in
   `open`, and attaches one `builtin:imported_state` row per ticket with
   `{ claimed_state, source }` (test_22, test_26, P3's import rule).
7. **`get_tickets` reads the `aidos.tickets` projection.** The rows carry
   the ticket fields plus `confidenceScore` and `gateFraction` (the
   board's read model; the board itself is B3).
8. **The guard is the belt.** Every board tool wraps its body in
   `ctx.tools.guard(...)` (TBD: exact guard call from the seams doc). The
   guard re-checks at call time, so a mid-turn move cannot unlock a call
   that already started. It is monotonic: a denial cannot turn back into
   permission.
9. **The depth check is structural.** `delegationDepthOf(exec.agent) === 0`
   is required for every board tool. A subagent that calls any board tool
   is refused, and the refusal says the orchestrator is the only actor
   that may do it. This holds even when a `toolFilter` is misconfigured.
10. **The mask follows the union of ticket states.** `ctx.tools.restrict`
    masks the agent scope per the tier table below. The mask is
    re-applied at session start and on every `ticket/change` event. The
    mask decides which tools exist; the allowlists decide which paths the
    implementation tools may touch. The score stays advisory: the tiers
    key on ticket state, never on the score.
11. **Bash asks while any ticket awaits verification.** A state-aware
    `tools/pre-execute` listener returns `ask` for the bash tool while any
    ticket sits in `awaiting_verification`. Approval outcomes are
    one-shot, so each call asks again. A concurrent in-progress ticket
    pays the same ask (review item, B1).
12. **The write union is the allowlist boundary.** The write boundary
    enforces the union of the in-progress tickets' allowlists. A write
    outside the union is refused and names the in-progress ticket whose
    allowlist would need to cover it. You extend an allowlist on the board
    (B3); at B1 the tool refuses with the naming text.
13. **Subagents get the same path predicate as a child-scope guard.** A
    path guard registered through the child's `agent.ctx` enforces a dir
    or file allowlist on `read`/`write`/`edit` for that child only. The
    predicate is the tier predicate, parameterized per scope. A refusal
    names the allowed root. `toolFilter` removes whole tools; the shared
    sandbox confines bash to the workspace root.
14. **The `aidos` settings namespace holds the config.** Kinds and gates
    live there (the B0 decision: config is not log). Defaults ship in the
    plugin config (`DEFAULT_CONFIG` from the kernel constants). The agent
    cannot write settings (user-plane). A gate referencing an
    unregistered kind fails at config load, not at gate time (C3's
    evaluate).
15. **The active ticket is board focus only.** The mask does not depend on
    it. B1 does not need it; B3 uses it.

## 4. The tier table

| State | Tools the agent may see |
|---|---|
| open | conversation, questions, `plan`/`plan_import`, ticket tools, skills, `read`/`read_image`, web search and fetch |
| in-progress | the above plus `write`, `edit`, `bash`, subagents, jobs, and the MCP tools |
| awaiting-verification | read, bash (each call asks), evidence tools, subagents and jobs for the review pass. No write or edit |
| done | conversation, read, `get_tickets` |

The session mask is the union: implementation tools exist while at least
one ticket is in-progress. Bash stays visible while a ticket awaits
verification, because the check must run. While any ticket awaits, every
bash call asks. A ticket in awaiting-verification contributes no write or
edit access: its files are frozen until you send it back or mark it done.

The tier table names tool groups; the mask concretizes them to the
deployment's tool names. The tool-name universe of the mask (the names the
tier table covers) is: `read`, `read_image`, `write`, `edit`, `bash`,
`web_search`, `web_fetch`, `skill`, `ask_user_question`, `subagent`,
`subagent_fork`, `job_output`, `job_kill`, `job_list`, and the six board
tools (`get_tickets`, `set_ticket`, `attach_evidence`, `move_ticket`,
`plan`, `plan_import`). Per state:

- `open` contributes the read/research/skill/question tools, the board
  tools, and the plan tools.
- `in_progress` contributes everything.
- `awaiting_verification` contributes `read`, `bash` (each call asks),
  `get_tickets`, `attach_evidence`, `move_ticket` (the send-back), and the
  delegation/job tools. It contributes no `write`, no `edit`, and no
  `set_ticket`: the files and the fields are frozen in review.
- `done` contributes `read` and `get_tickets` only.

The session mask is the union over the distinct states: a tool stays
visible while ANY present state allows it, and the deny list names only
tools the registry actually holds (the mask never names an unknown or
scope-local tool, so `restrict` cannot fail on a misconfigured
composition). A session that holds no tickets yet sees the `open` tier:
the agent still has to plan and create the first ticket. The mask is
re-applied at session start and on every `ticket/change` event; tools
outside the universe (for example `todo_write` or MCP tools) are not the
mask's to hide.

## 4b. Module layout

The stub files in `src/` are the compiled contract. Tests import exactly
these names. A stub change updates SPEC-B1.md in the same edit.

- `src/host/aidos-core.ts` — `export class AidosService extends Service`
  (the goal pattern; static `inject`, static `Config`, session-log backed,
  constructor registers the projections and the invariant; B2 adds the
  typert Remote layer). Methods, each keyed by the calling agent:
  `getTickets(agent, opts?)`, `setTicket(agent, args)`,
  `attachEvidence(agent, args)`, `moveTicket(agent, args)`,
  `plan(agent, opts?)`, `planImport(agent, args)`, `ticketStates(agent)`,
  `allowlistUnion(agent)`. Plus
  `export function registerAidosService(ctx, config?): () => void` — it
  constructs the service directly, so `ctx.aidos` is available
  synchronously after the call; the constructor's registrations ride the
  calling fiber and unload with it, and the returned disposer lifts the
  service off the context.
  The file also exports the service-level structured refusals the tools
  map to tool codes: `BadPayloadError` (renders `bad_payload`),
  `FileNotReadError` (renders `file_not_read`), the `aidos` settings
  schema `AIDOS_SETTINGS_SCHEMA`, the projection apply bodies
  (`applyTicketsProjection`, `applyEvidenceProjection`,
  `applyPlanProjection`, `applyCommentsProjection`) and their state type
  `TicketsProjectionState`, and the `AIDOS_EVENT_TYPES` set. The
  `AidosService` also registers `ctx.aidos` and the four projection units
  (`aidos.tickets`, `aidos.evidence`, `aidos.plan`, `aidos.comments`)
  under `ctx.sessionProjections`.
- `src/host/aidos-plugin.ts` — the host-plane plugin entry: a Cordis
  plugin (`name`, `inject`, `Config`, `apply`) whose `apply` mounts the
  AidosService via `registerAidosService`. The bundle patch mounts this
  module as the `aidos-core` row on the host plane.
- `src/host/invariant.ts` — `export function registerAidosInvariant(ctx):
  () => void` (the `ctx.invariants.register("aidos", ...)` installer), plus
  the `AIDOS_EVENT_TYPES` set and the `foldSessionEvent` fold helper the
  service reuses. The session event envelope type of every aidos event
  equals its kernel kind (`ticket/change`, `evidence/attached`,
  `plan/change`, `comment/added`, `aidos/refusal`, `project/created`,
  `project/moved`, `phase/set`); the plugin extends `SessionEventMap`
  accordingly.
- `src/tools/aidos-tools.ts` — the Cordis plugin: `export const name =
  "aidos-tools"`, `export const inject: string[]`, `export const Config`,
  `export function apply(ctx, config): void` (registers the six tools and
  the `tool:aidos` prompt section; installs the guard, the mask, the
  bash-ask listener, and the allowlist guard).
- `src/tools/guard.ts` — `export function installAidosGuard(ctx):
  () => void` (the `delegationDepthOf` guard on every board tool), plus
  `BOARD_TOOLS` (the six board tool names) and `ORCHESTRATOR_ONLY_MESSAGE`
  (the refusal text), shared with the tool bodies' call-time re-check.
- `src/tools/mask.ts` — `export function installAidosMask(ctx):
  () => void` (the `ctx.tools.restrict` masks keyed on the union of
  ticket states, re-applied at session start and on `ticket/change`).
- `src/tools/bash-ask.ts` — `export function installBashAskListener(ctx):
  () => void` (the `tools/pre-execute` listener returning `ask` for bash
  while any ticket awaits verification), plus `BASH_ASK_REASON`.
- `src/tools/allowlist.ts` — `export function installAllowlistGuard(ctx):
  () => void` (the write-union boundary on the fs write path) and
  `export function childPathScope(allowed: string[]): ToolGuard` (the
  subagent path guard, parameterized per scope).
- `src/host/node-builtins.d.ts` — the ambient declarations for the small
  `fs`/`path` surface the service uses (no `@types/node` in this package);
  delete it when `@types/node` lands.
- `presets/aidos/agent.cordis.yml` + `presets/aidos/preset.yml` — the
  aidos preset, a directory named by its preset id under the preset root,
  mounting `./aidos-tools.js` by relative name (the preset loader's row
  shape; the aidos-tools plugin registers the rest). The preset directory
  carries the bundled `aidos-tools.js` so it is self-contained.

## 5. dsh call shapes

Verified directly from the installed dsh packages
(`.../node_modules/@deepseek-ai/`, dsh 0.1.0-rc.7 tree, workspace
packages 0.1.0-rc.8). Reference: `dsh-tool-goal/lib/index.js` (the pattern
plugin), `dsh-tools/lib/types/index.d.ts` (the registry), `dsh-goal/
lib/index.js` (the service), `dsh-invariants/lib/types/index.d.ts`,
`dsh-agent-presets/lib/index.js` (the preset loader), `dsh-workspace`.

- **Plugin entry** (aidos-tools): a Cordis plugin file exporting `name`,
  `inject`, `Config` (schemastery `z.object`), and `apply(ctx, config)` —
  the dsh-tool-goal shape. `name = "aidos-tools"`; `inject` names the
  services the tools use: `["aidos", "tools", "systemPrompt", "agents"]`
  (plus `sessionProjections`/`invariants`/`settings`/`approval` where the
  wiring needs them). The preset mounts the file by relative path (see
  Preset rows).
- **defineTool** (from `@deepseek-ai/dsh-tools`):
  `defineTool({ name, description, parameters, output, execute,
  presentCall? })`. `parameters` is an object keyed by parameter name with
  `{ type, required?, description? }` (dsh-tool-goal:272-281).
  `output = { schema: <JSON Schema>, render(args, value) -> ContentBlock[] }`
  (dsh-tool-goal:234-240). `execute(args, exec: ToolRunContext) ->
  Promise<JsonValue>`; throw `HarnessError(message, code)` from
  `@deepseek-ai/dsh-llm` for a structured refusal (the no-traceback path).
  `presentCall?(args) -> { card, title, kind, rawInput? }`
  (dsh-tool-goal:242-249).
- **The execute context**: `ToolRunContext extends ToolExecution` with
  `exec.agent` (the calling `Agent`: `.id`, `.status`, `.session`,
  `.ctx`), `exec.deferContext(UserMessage)`, `exec.concludeTurn()`
  (dsh-tools index.d.ts:283-300). The tool reads the session from
  `exec.agent.session` and reaches the service through the injected
  `ctx.aidos`.
- **Tool registration**: `ctx.tools.register(definition)` returns a
  disposer (dsh-tools index.d.ts:603). The plugin calls it inside `apply`.
- **The guard**: `ctx.tools.guard((execution) => string | undefined)`
  returns a disposer (index.d.ts:622). A returned string denies. A
  plain-context guard applies globally; one registered through
  `agent.ctx` applies only to that agent (index.d.ts:613-621). Monotonic:
  no guard can force-allow (index.d.ts:483-484).
- **The depth check**: `delegationDepthOf(agent): number` from
  `@deepseek-ai/dsh-subagent` (`lib/types/depth.d.ts:25`). The guard
  refuses when it is not 0.
- **The mask**: `ctx.tools.restrict({ allow?, deny? }): () => void`
  (index.d.ts:611) — "Restrict global tools for the calling agent scope.
  Empty filters, unknown names, scope-local names, and reserved transport
  names fail. Restrictions intersect; scoped registrations remain
  visible." The aidos plugin calls it from the agent's scope (per-session,
  keyed by the union of ticket states) and re-applies on every
  `ticket/change` event.
- **The pre-execute listener**: `ctx.on("tools/pre-execute", (exec, next)
  => Promise<PreToolDecision>, { prepend?: true })` — the dsh-tool-jobs
  pattern (`dsh-tool-jobs/lib/index.js:179-183`). `PreToolDecision =
  { kind: 'allow' } | { kind: 'deny', reason } | { kind: 'ask', reason? }`
  (index.d.ts:418-426). Scope-filtered dispatch: a listener registered on
  an agent scope receives only that agent's calls (index.d.ts:34). `ask`
  resolves through the approval seam via `ctx.get('approval')`:
  `allowed-once` proceeds, the non-grants deny, no approval service
  degrades to deny (index.d.ts:784-794). The bash-ask listener returns
  `{ kind: 'ask', reason }` for `exec.name === "bash"` while any ticket
  awaits verification.
- **Session append**: `agent.session.append("goal/change", change)`
  (dsh-goal/lib/index.js:782). The aidos event types extend `SessionEventMap`
  via `declare module` in the plugin's types (dsh-goal/lib/types/domain.d.ts:47).
- **Projection registration**:
  `ctx.inject(["sessionProjections"], (c) => c.sessionProjections.register({
  key, schema, init, apply, view, stateVersion }))` (dsh-goal/lib/index.js:522-523).
- **Invariant companion**:
  `ctx.invariants.register(packageName, (invCtx, fail) => void | Promise<void>)`
  (dsh-invariants/lib/types/index.d.ts:44-63). The installer runs in a
  child fiber; `fail(message)` throws `InvariantError` (code `"INVARIANT"`,
  package-attributed). The aidos installer folds the session stream and
  fails on the first corrupt record. The plugin injects `"invariants"`.
- **Settings**: `ctx.settings.register(namespace, schema, options)` for the
  `aidos` namespace (kind + gate config); `expectedRevision` CAS on writes;
  the agent cannot write settings (user-plane).
- **The prompt section**: `ctx.systemPrompt.section({ name: "tool:goal",
  order: 114, text })` (dsh-tool-goal/lib/index.js:253-257). The aidos
  section names `"tool:aidos"` and carries the lifecycle rules.
- **The service path**: the aidos-core is a Cordis `Service` (the goal
  pattern: `class GoalService extends Service`, `static inject`,
  `static Config`, session-log backed; dsh-goal/lib/index.js:430). It
  mounts as `ctx.aidos`; the tools' plugin injects `"aidos"` and calls
  `ctx.aidos.<method>(...)`.
- **Workspace binding**: `ctx.workspaceRegistry` (dsh-workspace) holds
  durable workspace records with a canonical-cwd header index and session
  membership. The aidos-core service resolves the session's workspace to
  its project record (C1).
- **Preset rows** (the aidos preset, agent plane): a preset directory with
  `agent.cordis.yml` — a top-level list of `{ name, group?, config? }`
  rows — plus an optional `preset.yml` (display text only; id = directory
  name). A relative `name` resolves from the preset's own directory, so
  the aidos-tools plugin file and skill dirs travel with the preset
  (dsh-agent-presets/lib/index.js:175-178, README:67).

## 6. The aidos-core service

A log-backed ticket service. It wraps the B0 kernel over the session log:

- **Append path:** the service validates (the invariant companion), then
  appends the aidos event to the session log (`session.append`), then
  folds. The invariant runs before an append commits; a violation throws
  `InvariantError` (code `"INVARIANT"`) and the log does not change.
- **Read path:** the service reads the folded state and the projections.
  The Store's in-memory reads (B0) become reads of the folded session
  state. The four projection units register under their keys; `restore`
  gives cold reads for other sessions (the global board, B3).
- **Config:** the `aidos` settings namespace. The service resolves kind
  and gate config from it. Defaults ship in the plugin config.
- **The workspace project:** the session binds to its workspace (C1); the
  service holds the project record for the session's workspace path.
- **Author stamping:** the service methods take the actor as a parameter
  the tool body does not control. Tool bodies pass the agent-derived
  actor; the Remote (B2) passes `"user"`; import glue passes `"system"`.

The service is plain TypeScript over a session port, so the harness tests
it without a running harness: a fake session that captures appends and
serves a folded state.

## 7. The six tools

Every tool follows dsh-tool-goal's shape (the seams doc section 1).
Parameters, output, and semantics port the CLI (cli.py) with the decision
rules above.

### get_tickets

- Parameters: `{ projectId?: number }` (the session's workspace project
  when absent).
- Output: JSON. `{ ok: true, tickets: TicketView[] }` where TicketView is
  the projection row: `id`, `projectId`, `title`, `description`, `body`,
  `criteria`, `phase`, `order`, `state`, `confidenceScore`,
  `gateFraction`. Sorted by phase and order (the projection order).
- Refusals: `unknown_project` for a project id the service does not hold.

### set_ticket

- Parameters: `{ ticketId?: number, projectId?: number, title?: string,
  description?: string, body?: string, criteria?: string, phase?: number,
  phaseTitle?: string, order?: number }`.
- With no `ticketId`: create. `title` required. Creates the phase when
  absent (title `phaseTitle` or "Untitled phase", state `open`). Lands in
  `open`. Defaults: body `""`, criteria `""`, phase 1, order next free.
- With a `ticketId`: edit the named fields. An absent field leaves its
  value.
- Output: JSON. `{ ok: true, ticket: {...} }` — the ticket fields.
- Refusals: `unknown_ticket`, `unknown_project`, `bad_payload` where
  applicable.

### attach_evidence

- Parameters: `{ ticketId: number, kind: string, payload?: object }`.
  Payload defaults to `{}`.
- Only the agent-allowed kinds are offered (decision 3). The tool takes
  the short kind names (`automated_check`, `review_pass`, `review_note`,
  `agent_report`); the service resolves a short name to its registered
  `builtin:` kind id, and a full id resolves exactly. The stored row
  carries the resolved id, so the gate's required kinds match; the result
  echoes the kind the caller passed. The service stamps `actor: "agent"`.
- Output: JSON. `{ ok: true, ticketId, kind, payload }`.
- Refusals: `human_only_kind` (names the kind, states that a human must
  supply it), `unknown_kind` (names the kind), `unknown_ticket`.

### move_ticket

- Parameters: `{ ticketId: number, to: TicketState }`.
- The service enforces the gate. The agent never reaches `done` (decision
  5).
- Output: JSON. `{ ok: true, ticketId, fromState, toState }`.
- Refusals: `gate_refused` with `fromState`, `toState`, `missingKinds`,
  `allowedActors`, `message` (the `str(GateRefused)` equivalent);
  `unknown_ticket`.

### plan

- Parameters: `{ projectId?: number }`.
- Output: the plan markdown (the one non-JSON result), rendered from the
  service state (phases, tickets with real state marks, context sections,
  frontmatter, preamble). Byte-identical for identical state (P11).
- Refusals: `unknown_project`.

### plan_import

- Parameters: `{ file: string, projectId?: number }`.
- Reads the file through the host-side sandboxed fs (source = the file
  path): the service reads synchronously — the service surface is
  synchronous — resolving a relative path under the session's workspace
  root, so reads stay inside the workspace. Parses first (a parse error
  imports nothing and names the line). Refuses a non-empty project
  (`project_not_empty`). Lands every ticket in `open` with phase and
  order from the document. Attaches one `builtin:imported_state` row per
  ticket: `{ claimed_state, source: file }`, author `system` (the import
  is a system entry point).
- Output: JSON. `{ ok: true, phases: number[], tickets: TicketId[] }`.
- Refusals: `plan_parse_error` (`line`, `message`), `project_not_empty`,
  `file_not_read`, `unknown_project`, `unknown_kind` when the
  `builtin:imported_state` kind is not registered (P29's pin). A plan
  whose context exceeds the 500-line cap refuses as `context_too_long`
  before anything imports.

## 8. The guard and the depth check

- Every board tool wraps its body: guard first, then depth check, then
  the service call.
- `delegationDepthOf(exec.agent) !== 0` refuses: the refusal says the
  orchestrator is the only actor that may use the board tools.
- The guard is monotonic (decision 8). The mask is the belt; the guard is
  the call-time re-check.

## 9. The test plan

The harness is a test double of the dsh ctx. It captures registrations
and appends and serves a folded state, so the tools run without a real
dsh instance. The seams doc pins the shapes the harness must match.

- **Ported P3 tool tests** (test_20 to 25 as tool tests):
  - test_20: the author is the agent, never the payload. Attach evidence
    with a payload holding `author`/`actor` keys; the stored row carries
    the stamped actor. Every tool result is JSON.
  - test_21: `user_signoff`/`user_verified` refuse with `human_only_kind`
    naming the kind and saying a human must supply it; the other builtin
    kinds attach.
  - test_22: no agent path to done. `move_ticket` to `done` refuses from
    every state; the refusal names the missing kind or the allowed
    actors; the ticket stays put. A plan import of an all-done document
    lands every ticket in `open` with the claim as evidence only.
  - test_23: the `gate_refused` JSON shape (`fromState`, `toState`,
    `missingKinds`, `allowedActors`, `message`); an unknown ticket gives
    JSON and no traceback.
  - test_24: the default config is deterministic (the B0 mirror); the
    service bootstrap creates one workspace project.
  - test_25: every tool renders JSON on success and on failure; `plan`
    renders markdown; a bad payload and a missing file refuse cleanly.
- **P8 pins:** a passing `automated_check` with no `review_pass` refuses
  `in_progress -> awaiting_verification` naming `review_pass`
  (test_30's pin, at the tool level).
- **Guard tests:** the depth check refuses a depth-1 agent; the guard
  re-checks at call time (a move that unlocks the tier mid-call does not
  unlock the call).
- **Mask tests:** the union semantics. A session with only open tickets
  lacks `write`/`edit`/`bash`; one in-progress ticket adds them; a ticket
  in awaiting-verification keeps bash visible and write/edit hidden; the
  mask re-applies on a `ticket/change` event; `done`-only sessions see
  `get_tickets` only.
- **Bash-ask tests:** while any ticket awaits verification, the
  pre-execute listener returns `ask` for bash calls and nothing for other
  tools; a second call asks again (one-shot).
- **Allowlist tests:** the write union. One in-progress ticket with
  allowlist `["src/"]`; a write to `src/` passes, a write to `docs/`
  refuses naming that ticket. Two in-progress tickets: the union covers
  both. The subagent path guard refuses a child read/write/edit outside
  the scope's allowed root, naming the root.
- **Service tests:** appends land in the log as the aidos event types;
  the invariant rejects a corrupt event before the log changes; the
  projections rebuild from the log identically (the C2 evaluate).

## 10. Definition of done

- `npm run typecheck` and `npm run typecheck:tests` pass.
- `npm test` is green: the ported tool tests, the P8 pins, the guard,
  mask, bash-ask, and allowlist tests, plus the B0 suite (the kernel
  tests stay green).
- The six tools register through the harness exactly as the seams doc
  specifies.
- No tool reads an author from the payload.
- SPEC.md is deleted in the B1 commit (its decisions live in this file,
  the kernel code, and PLAN.md).
- The commit updates PLAN.md's B1 row (done) and the benchmarking table.

## 11. Working rules

- STE prose in comments and this file.
- SPEC-B1.md is normative; a stub change updates it in the same edit.
- Tests and implementation are separate dispatches (the split
  discipline). The implementation dispatch never touches `tests/`; the
  test dispatch never implements tool logic.
- The dsh surfaces come from `docs/b1-tool-seams.md`; where the doc and
  this file disagree, the doc wins and this file is corrected.
