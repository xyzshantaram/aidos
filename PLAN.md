# aidos implementation plan

This file is a bootstrap artifact with a scheduled death. It is the single
working document for the aidos-on-dsh build. It holds the design (merged
from the former DSH.md) and the tickets in one place. When the aidos board
can import this file completely, this file is deleted. That is Ticket P6.

How the work is split: you own the architecture and the verification, and
the agent writes the implementation. The thinking happens up front, in long
design sessions, so that the agent can keep working between checkpoints
instead of stopping for every small decision. Gates carry the review in
between.

Every user-facing document follows ASD-STE100 Simplified Technical English
as closely as the subject allows. That covers the README, the help text,
error messages, and anything the agent writes for a person to read.

**Evaluation criteria below are a first draft.** None has your signoff yet.
Under aidos's own rules a ticket cannot leave `open` without one, so treat
every criterion here as a proposal to argue with, not a settled contract.

---

## Vision

aidos is a coding-agent harness that makes it hard to ignore the code, the
scope, and the features. You open a session. The agent talks the work
through with you before it writes anything. Features become tickets in one
central database. A ticket moves between states only when the required proof
exists. You sign off at both ends.

The rules apply to both sides. The agent cannot mark its own work done, and
nothing reaches `done` without you, so you cannot drop out of the loop
either.

The implementation builds on DeepSeek Harness (dsh), not the from-scratch
Rust stack an earlier draft assumed (rig, poem, sqlx, Svelte, rquickjs). dsh
already provides the agent loop, the session log, the web UI, the tool
pipeline, subagents, jobs, skills, and the human loop. aidos adds the
ticket kernel, the board, and the plan skill. This plan describes that
build.

---

## Critical context

The sections below are the design. They are the merged former DSH.md. Every
claim was checked against the installed dsh packages
(`@deepseek-ai/dsh@0.1.0-rc.7` and its `@deepseek-ai/dsh-*` tree), by
reading the package READMEs and the compiled plugin sources.

### The headline

dsh already implements most of aidos's Phase 2 to 5 infrastructure. Its
design philosophy is the same one aidos was built around.

- **The session log is the append-only source of truth.** dsh sessions are
  event-sourced (`session.append(type, data)`), sequence-ordered, replayable,
  persistable (JSONL), forkable, and resumable. aidos's "append-only event log
  is authoritative, current state derives from it" is dsh's default model,
  not a design goal.
- **Derived reads are projections, not queries.** `ctx.sessionProjections`
  drives pure `init/apply/view` functions eagerly over the log. This is
  Ticket P7's "SQL views own every derived read", including its load-bearing
  rules: `seq` is the ordering authority, state-carrying events carry whole
  values, and the projection rebuilds from the log with no in-memory copy to
  resync.
- **A gate is a monotonic tool guard.** dsh's tool pipeline has an
  allow/deny/ask pre-execute gate and a monotonic `ctx.tools.guard()` after
  it. aidos's "a gate is a rule the agent cannot talk its way past" is a
  native seam.
- **The human loop is a first-class seam.** `ctx.userQuestions` and the web
  client render human decisions. Plan mode (`/plan`, `exit_plan_mode`)
  already implements "talk the work through before writing anything".
- **Subagents are isolated by construction.** Delegated children carry a
  monotone `delegationDepth`. The seam exports `delegationDepthOf(agent)`.
  Delegation tools support `toolFilter`. "A subagent has no access to the
  ticket board" is one guard check, not a policy.
- **Detached jobs exist.** `ctx.jobs` and the `job_output`/`job_list`/
  `job_kill` tools are Ticket A6 (long-running jobs that outlive the parent
  turn, listed per session, killable, terminal-state reports). The Phase-1
  pain that created Ticket A6 is the exact problem `ctx.jobs` solves.
- **Skills exist.** `ctx.skills` and a filesystem provider scan `SKILL.md`
  bundles (including `<project>/.dsh/skills` and `$DSH_HOME/skills`). This is
  Ticket T4. The plan-skill structure (Ticket P11) is a skill definition.
- **Provider profiles exist.** `ctx.credentials` and per-session model
  selection is Ticket A2's profile story.

What is net-new is small. It is exactly the part of aidos that is aidos:

1. The **ticket/evidence/gate kernel** as a dsh session domain (a service,
   strict replay fold, invariant, projection units, Remote endpoints, and
   model-facing tools). It is a direct port of the Phase-1 prototype,
   following the dsh-goal domain's pattern.
2. The **board** as a dsh web client plugin (React, not the Svelte 5 the
   from-scratch plan chose). It replaces the tkinter board. It consumes the
   projection and calls the Remote endpoints.
3. The **plan skill** and the `plan` import and serialize tools.
4. Small glue: subagent job reports as evidence rows, the human-review queue
   surface, and (optionally) a tool-directory loader and config-from-git.

The from-scratch stack's hard parts all dissolve. There is no Rust kernel
(the domain is TypeScript, like every dsh plugin). There is no HTTP or
WebSocket layer (dsh's webserver, API gateway, and browser transport cover
it). There is no `ts-rs` (the typert protocol generates the client bindings
from the host types). There is no rquickjs (tool scripts are JS plugins).
There is no SQLite (the session log is the store).

### Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Board scope | A Tickets tab next to Chat and Trajectory, plus a global Tickets entry near New Session. Both ship in v1. | The Tickets tab shows the current workspace's board. The global entry opens the cross-workspace board through cold projection reads. |
| Preset placement | aidos sits alongside standard. Picking the aidos preset opts into the ticket flow. | A quick task uses a standard session with zero ticket machinery. A standard session has no ticket events. |
| Kinds and gates | Settings namespace | Gates are config. Versioned writes give the audit. Replay stays config-independent. |
| Subagent board access | Depth check plus toolFilter | Structural exclusion |
| T2 tool loader | Defer. Use the existing plugin system. | The loader was a greenfield artifact. Presets and packages cover the need. |
| Config from git | Defer. Use a sync script. | dsh hot-reloads patches and re-discovers presets and skills live. |
| MCP servers | nostrbook, gitlab, swiggy-food, swiggy-instamart | web_search and web_fetch are native dsh tools. |
| Delivery | Two bundles | aidos is unopinionated and distributable. Personal config lives in dotfiles-ai and syncs to the harness. |
| Scratch rule | Per-project scratch outside the repo | Agent output never lands in the project repo. It lives in the scratch dir or the ticket board. |
| Node-tree renderer | Paused. tkinter now, nostr-canvas later | Throwaway dashboards stay tkinter for now. |
| Model profiles | A Profile submenu replaces the model seat | Work and personal set providers, show a badge, and allow a per-session override. |
| Tab title | A title-rewriter client plugin | The renderer hardcodes "— DeepSeek Harness" in the tab title. |

### How dsh is put together

The parts below are the ones this design leans on.

- **Profiles.** `$DSH_HOME/profiles/<name>` holds a `package.json` declaring
  `dsh.profile.bundles` (an ordered list of bundle packages) plus the user's
  `cordis.patch.yml`. `dsh --profile web` (alias `dsh web`) composes the
  `dsh-base` bundle, then `dsh-web-app`, then the user patch layers. `dsh
  plugin --profile web add <package>` installs a bundle dependency.
- **Bundles and patches.** A bundle is an npm package whose manifest declares
  `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`. A patch is a YAML
  list of plugin rows: `- id: <row>, name: <package>, config: {...}`. The
  `insert:` key adds rows. An id-targeted entry replaces a row's whole
  `config`. A row's `name` resolves from the host composition (bare package
  names) or from the file's own directory (relative paths).
- **Two planes.** The *host plane* is process-wide. It holds the registries
  (`tools`, `goals`, `skills`, `jobs`, `subagents`, `sessions`,
  `sessionProjections`, `userQuestions`, `credentials`, `settings`,
  `attachments`, `workspaceRegistry`), the sandbox and approval stack,
  persistence, and the API gateway. The *agent plane* is per-agent. Agent
  presets compose it. A preset is a directory holding `agent.cordis.yml` (a
  list of plugin rows, groups with `isolate` realms, relative-path plugin
  files, and skill directories that travel with the preset) and an optional
  `preset.yml` (display name and description). Presets live in
  `$DSH_HOME/.agent-presets` (user) or configured roots.
- **Sessions.** `ctx.sessions` owns the event-sourced `Session`.
  `session.append` snapshots and freezes durable data. `session.seq` is the
  ordering authority. `session.header.cwd` carries the working directory.
  `SessionEventMap` is merge-extensible, so a plugin declares its own event
  types. The dsh-goal domain (`goal/change` events, strict replay, invariant,
  projection unit) is the reference pattern this design copies.
- **Browser roster.** Web client plugins are dual-face packages declaring
  `"dsh": { "client": { "platform": "web" } }` and exporting a prebuilt
  `./client` bundle. The `dsh-client-modules` host half resolves each
  `dsh.client` row by package name (`require.resolve`), validates the
  manifest, and serves the bundle at `/plugins/<id>/client.js`. The shell
  kernel composes `window.__DSH_BOOT__` from the same rows. A new client
  plugin package can join the roster without forking dsh, provided a loader
  entry with the same id exists in the composed config and the package
  resolves from the profile.
- **Remotes.** A host service can extend `TypertRemoteService`. Methods
  decorated `@Remote("name")` become endpoints the browser can call through
  the API gateway. The typert descriptors generate the client bindings. This
  is dsh's answer to `ts-rs`: the wire protocol cannot drift.

### Concept map

| aidos concept | dsh mechanism | Status |
|---|---|---|
| Append-only event log, replay, audit | Session log (`session.append`), strict replay folds, invariant companions | Built |
| Current state derives from log | Session projections (`ctx.sessionProjections`) | Built |
| `seq` is the ordering authority, `at` is display metadata | `session.seq`; projections fold in seq order | Built |
| Project keyed by absolute path; `move` repoints | `session.header.cwd` plus `ctx.workspaceRegistry` (realpath-canonical paths, session accounting) | Built |
| Tickets, states, lifecycle | New `aidos` session domain (`ticket/change` whole-value events), states as an exhaustive enum | **New** |
| Evidence rows, kind registry, weights | New domain rows plus kind definitions (builtin constants plus settings namespace), authors stamped at the write boundary | **New** |
| Gates (data, deny-by-default, named refusals) | New pure gate function in the service plus monotonic `ctx.tools.guard()` | **New** (seam built) |
| Confidence score, gate fraction (advisory) | Projection unit columns, rendered by the board | New (mechanics built) |
| Plan: tickets plus context (under 500 lines) plus rules | `plan/change` session event plus `plan` skill plus `plan`/`plan_import` tools | New (format exists in prototype) |
| Agent CLI (`set_ticket`, `attach_evidence`, `move_ticket`, `plan`) | Model-facing tools registered via `ctx.tools.register` (JSON results) | **New** |
| Human signoff, send-back, done | Board buttons to Remote endpoints (author `user`). `userQuestions` for prompts | New (seams built) |
| Reviewer dispatched on check pass | Orchestrator attaches `builtin:review_pass`. Subagent reports attach as evidence (A6 provenance) | New (jobs built) |
| Shell tool allow/deny/ask | `dsh-tool-bash` plus sandbox plus approval seam (ask-by-default is the shipped posture) | Built |
| File allowlist on read and edit tools | `ctx.fs` sandbox and observation policy plus a tool guard on read and edit | Mostly built |
| Provider profiles | `ctx.credentials` plus per-session model selection | Built |
| HTTP and WebSocket agent-to-client protocol | dsh webserver plus API gateway plus browser transport (SSE) | Built |
| Web UI (board, evidence, screenshots) | New client plugin(s) plus `ctx.attachments` for images | New (client surface built) |
| Node-tree renderer, throwaway dashboards | Paused. The prototype's tkinter dashboards stay. nostr-canvas comes later. | Deferred |
| Subagent definitions (markdown plus frontmatter) | Agent presets (`agent.cordis.yml` plus relative plugin files); subagent spawn and fork with `toolFilter` | Built |
| Subagents cannot touch the board | `delegationDepthOf(agent) > 0` makes board tools refuse; `toolFilter: { deny: [board tools] }` at spawn | Built seam |
| Detached subagent jobs | `ctx.jobs` plus `job_output`/`job_list`/`job_kill` | Built |
| Skills, small always-on core | `ctx.skills` plus filesystem provider plus `skill` tool plus preset tool groups | Built |
| Script engine (rquickjs) with caps | Tools are JS plugins; cooperative `AbortSignal` cancellation, `timeoutMs`, worker-thread code runtime | Built (different model, see below) |
| Scratch workspaces | `$DSH_HOME/aidos/scratch/<workspace-key>`: a durable per-workspace directory outside the repo | **New** (see "Scratch, not the repo") |
| Config from a git URL | Not shipped. Small plugin or skip | Optional glue |
| One human identity, no login | The browser session is the human. Remote calls stamp `user`, tool calls stamp `agent` | Built model |

Provider profiles map to dsh's `LlmConfigurableProvider` directory. Each
provider route (an official DeepSeek route, an opencode-go subscription
route, a gateway route) registers its own settings-namespace profile object
plus a `credential-ref` API-key field. `ctx.credentials` resolves the key per
request (env, then `$DSH_HOME/.credentials.yaml`, then project and home
`.env`). The models page writes keys through the credentials service.
"Multiple profiles per provider" means multiple configurable-provider
entries, each with its own profile object and credential ref.

### The ticket domain (the one real new kernel)

#### Placement

The aidos domain is a host-plane service, exactly like `GoalService`.

- It is a Cordis service (`ctx.aidos`) extending `TypertRemoteService`, so
  the board can call it through the gateway and the tools can call it
  in-process.
- It is keyed per session. A session is a project. Its `cwd` is the project
  path. `ctx.workspaceRegistry` provides the durable path-to-session
  mapping. "You open a session" and "A plan belongs to a project" are the
  same object.
- It is durable only through session events. Every mutation appends, then
  folds the local cache, then notifies (`aidos/changed`). This mirrors
  `GoalService.commit()`.

The one structural difference from goals: goals hold one current objective
per session. aidos holds many tickets per session. The strict fold keeps a
map of ticket snapshots plus an append-only evidence list. Revisions are per
ticket.

#### Event vocabulary

All events are whole-value and versioned.

| Event type | Payload (v1) | Fold effect |
|---|---|---|
| `ticket/change` | `{ kind: "ticket/change", version, operation: "create"\|"set"\|"move", ticket: <full snapshot>, at }` | Last-write-wins per ticket id, ordered by `seq` (Ticket P7's lesson: never order by `at`) |
| `evidence/attached` | `{ kind: "evidence/attached", version, ticketId, row: { kind, author, at, payload } }` | Append to the ticket's evidence list |
| `plan/change` | `{ kind: "plan/change", version, context, rules, frontmatter? }` | Whole-value replace (context capped at 500 lines at the write boundary) |
| `comment/added` | `{ kind: "comment/added", version, ticketId, text, author, at }` | Append (Ticket P4: comments get their own event type and view, so no gate can accept a comment as proof) |

A **ticket snapshot** carries the prototype's fields: `id`, `revision`,
`title`, `description`, `state` (`open | in-progress | awaiting-verification |
done`), `criteria` (freeform text. Ticket P9's criterion coverage is a
derived read over evidence payloads), `phase`/`order` (plan ordering),
`createdAt`, `updatedAt`. `state` is an exhaustive enum. Adding a state fails
to compile until every arm of the transition function is handled (Ticket C3's
evaluate criterion, now via TypeScript exhaustiveness).

The prototype's refusal-audit behavior survives. A refused move appends one
log-only audit record (`aidos/refusal`) that replay keeps but the projection
ignores. An attempted bypass is visible and cannot be mistaken for state.

#### Strict replay and invariant

`foldAidosEvents(state, event)` validates in `seq` order and stops at the
first corrupt record.

- Exact field sets per event and operation (unknown keys reject).
- Per-ticket revision continuity (`revision === previous + 1`).
- State transitions through an exhaustive `STATE_ORDER` walk
  (`open to in-progress to awaiting-verification to done`). Every other
  transition rejects.
- Non-decreasing `at` per ticket and monotone `updatedAt`.
- Evidence rows: shape-valid, `author` in `{ agent, user, system }`, kind is
  a namespaced string (`builtin:*`/`plugin:*`). See the registry decision
  below for what replay does not check.
- `plan/change` context length and whole-value replace semantics.

A separate `aidos/invariant` companion (like `dsh-goal/invariant`) folds the
same stream independently and registers under `ctx.invariants` where the
composition mounts it. The invariant runs before an append commits. Its
`fail()` throws `InvariantError` (code `"INVARIANT"`) synchronously through
the session dispatch, so `session.append` rejects before the log changes. A
violating stream cannot be written, not merely detected on read.

**What replay does not check, deliberately:** kind registration and gate
config. Kinds and gates are config, not log (prototype: "weight lives in the
registry", "gates live in config", "loosening a gate needs no migration").
Replay validates structure. The write boundary validates membership. This
keeps a log written under an older config replayable after a gate is loosened
(Ticket P12's pin). It keeps an unknown kind a service-level refusal that
names the kind (Ticket P29) instead of a replay crash.

#### Kinds, weights, gates: registry as settings

- **Builtin kinds** (`builtin:user_signoff`, `builtin:automated_check`,
  `builtin:review_pass`, `builtin:review_note`, `builtin:imported_state`,
  `builtin:comment`, ...) are one constant table in the aidos package (Ticket
  P10's single definition). The CLI and the tests read the same constants.
  The test suite's mirror restates them on purpose, so drift fails the suite.
  Each carries `{ label, description, weight, allowedAuthors }`.
- **Gate config** is a settings namespace (`ctx.settings.register("aidos",
  schema)`) so "strictness is a setting". Defaults ship in the plugin config.
  The human edits them in the settings UI. The agent cannot (settings writes
  are user-plane). A gate names one transition and its required kinds, plus
  the authors allowed to supply each kind. Deny-by-default: a transition with
  no configured gate is refused for every actor.
- **Audit:** kind and gate changes are not session events (they are config).
  The settings seam is versioned (`expectedRevision`, `settings/updated`).
  The board can render the config history. This preserves the spirit of
  "registry changes audited" (prototype test_19) without making replay depend
  on mutable config.

#### The write boundary (author stamping)

The prototype's hardest rule ("aidos never reads the author from the payload;
the agent cannot write a row that names you") is structural in dsh.

- **Agent entry point:** tool bodies receive `exec.agent`. The service
  methods the tools call take the `Agent` (or an `actor: "agent"` derived
  from it) as a parameter the tool body does not control. Payloads carry only
  `{ kind, payload }`. `row.author` is built by the service.
- **Human entry point:** board buttons call the Remote endpoints. The gateway
  resolves the session. The service stamps `author: "user"`. No wire field
  for an author exists anywhere.
- **System entry point:** internal glue (for example import claiming states)
  stamps `system`.

`attachEvidence(ticket, kind, payload, actor)` refuses when `actor` is not in
the kind's `allowedAuthors`. So `attach_evidence` cannot write a
`user`-authored row, and no agent path can attach `builtin:user_signoff`. It
refuses an unregistered kind with a refusal naming the kind.

#### The gate engine

`checkGate(gates, ticket, evidence, toState, actor)` is a pure function used
identically by the agent tool and the human Remote. The refusal shape is the
prototype's `GateRefused`.

- No gate for the transition: refuse (`no_gate`), naming that no gate is
  configured.
- Missing kinds: refuse, naming each missing kind and who must write it (the
  kind's allowed authors).
- No author may supply a required kind: refuse, naming the gate's actors.

The **monotonic tool guard** (`ctx.tools.guard`) layers the agent-facing
rules so no tool path can bypass the service. `move_ticket` to `done` refuses
for any agent regardless of evidence. `delegationDepthOf(exec.agent) === 0`
is required for every board tool, so subagents are excluded even if a tool
filter is misconfigured. A guard denial cannot turn back into permission by a
later waterfall listener. The "cannot talk its way past" property is the
seam's contract.

One `toolFilter` nuance matters for the delegation layer.
`ctx.tools.restrict` masks only what a child inherits. It never masks tools
the child's own scope registers. Board tools therefore live on the
agent-preset plane (which children join via `composeFrom`). A
`toolFilter: { deny: [...] }` at spawn can mask them. The depth check catches
everything else.

#### Projection units (Ticket P7's SQL views, ported)

Registered under `ctx.sessionProjections` with `stateVersion`, `init/apply/
view` and a zod schema each, exactly like the `goal` projection.

| Key | View |
|---|---|
| `aidos.tickets` | Map ticket id to snapshot plus derived `confidenceScore` (weights summed per kind per author once) and `gateFraction` (forward transition only; `done` shows none). Both are sortable columns. The board sorts without loading history. |
| `aidos.evidence` | Rows per ticket, grouped by the criterion text they address (Ticket P9's coverage read) |
| `aidos.plan` | Context, rules, and frontmatter as one whole value |
| `aidos.comments` | Comment list per ticket |

Client carriers already push `session/projection` frames, so the board
observes live changes. The projection cache plus `restore()` give cold reads
for other sessions. That is the multi-project global board's read path.

#### Model-facing tools (Ticket P3's CLI, ported)

Registered by an agent-preset row `aidos-tools` (a relative-path plugin file
in the preset directory, or a published package), following `dsh-tool-goal`'s
shape: `defineTool({ name, description, parameters, output: { schema, render
}, execute, presentCall })`. A `tool:aidos` system-prompt section carries the
lifecycle rules (the "set_ticket moves a ticket only when the required proof
exists, and signoff is yours" guidance).

- `get_tickets` reads the board state (projection view, JSON).
- `set_ticket` creates or edits ticket fields (title, description, criteria,
  phase, order).
- `attach_evidence` attaches agent-authored evidence for agent-allowed kinds
  (`automated_check`, `review_pass`, `review_note`, `subagent_report`).
- `move_ticket` moves `open to in-progress` (needs `builtin:user_signoff`),
  `in-progress to awaiting-verification` (needs `builtin:automated_check`
  plus `builtin:review_pass`), and refuses `awaiting-verification to done`
  for any agent (Ticket P22: no agent path to done, by construction, not by
  prompt).
- `plan` and `plan_import` serialize and parse the plan markdown (below).

Every tool result is JSON (the prototype's "every subcommand prints JSON"
pin). Unknown-kind and gate refusals render as structured JSON errors, never
tracebacks (Ticket P29).

#### The board (Tickets U2, U3, U4, ported)

A client plugin package (`@aidos/dsh-client-aidos-board`) declares
`dsh.client` and ships a prebuilt `./client` bundle. The aidos patch inserts
it into the browser roster. It is written in React against the published
client packages (`@deepseek-ai/dsh-client-ui-primitives`,
`@deepseek-ai/dsh-client-ui-slots`). The dsh frontend build emits its bundle
in the client module format (`window.__ModuleLoader__.load({ id, factory })`).
It mounts through the slot system (`ctx.slots.inject(...)`). The goal bar in
the input dock and the plan seat are the precedents. The board does the
following:

- It registers a **Tickets view tab** beside Chat and Trajectory. The tab
  shows the current workspace's board. It registers a **global Tickets
  entry** near New Session. The entry opens the cross-workspace board.
  Both ship in v1. The cross-workspace board reads every session's
  `aidos.tickets` projection through the cold read path.
- It reads the `aidos.tickets`, `aidos.evidence`, and `aidos.plan`
  projection values (`useProjection(...)` or
  `sessions.binding(id).session.projections.faceOf(key)`, the same read path
  the goal bar uses).
- It renders the ticket grid: title, state, confidence score prominently
  labeled advisory, gate fraction muted below it, project filter, sort by
  score or fraction, detail panel (side, not modal). The panel shows
  evidence grouped by criterion and highlights uncovered criteria (Ticket
  P9).
- It acts through the Remote endpoints (`ctx.remote.aidos.<method>(
  sessionId, ...)`, the generated client for the service's typert bindings):
  create and edit fields, attach evidence as `user` (including screenshots
  via `ctx.attachments`), move states, sign off (`builtin:user_signoff`),
  send back with comments, mark done.
- It surfaces gate refusals verbatim (`str(GateRefused)` equivalent).
- It re-reads on focus (the prototype's "no timer" rule). The projection
  cache and change frames make this trivial.

The agent-built throwaway dashboards (node-tree, Ticket U4) are **paused**.
The prototype's tkinter board and dashboards stay in use. Later work looks at
nostr-canvas for the declarative node tree. The aidos board client plugin is
unaffected: it is a real product surface, not a throwaway dashboard.

#### The plan skill and import (Tickets P11, P6, C4)

- Ship a `plan` skill (a `SKILL.md` bundle in the aidos preset, following the
  plan-skill structure: Vision, Checklist, Critical context, User preferences
  and special rules, Human review queue, optional Benchmarking). The skill
  guides the writer. The `plan` tool is the machine surface.
- `plan` serializes tickets, context, and rules to that markdown shape. The
  round trip is byte for byte (Ticket P11's evaluate).
- `plan_import` parses markdown (frontmatter plus headings) and lands every
  ticket in `open`. It records the document's claimed state as
  `builtin:imported_state` evidence. The prototype's fix that shut the last
  path that could reach `done` without a human (Ticket P3's import rule) is
  ported verbatim.
- Phase and order remain first-class ticket fields. The open P11 question
  (keep phases or treat them as ordinary sections) is settled by keeping
  them. The prototype already does, and the dogfooding tests depend on it.
- This file is the import target. Its design sections become plan context.
  The 500-line context cap (C4) is a criterion to revisit at import time:
  the design here is longer, and the importer must either raise the cap for
  the bootstrap import or fold the design into context and rules.

#### Subagents and detached jobs (Tickets A5, A6)

- **Definitions:** a subagent definition is a preset or a delegated tool call
  with `toolFilter`. The board tools' depth check is the authority. "A
  subagent that calls any board tool is refused, and the refusal says the
  orchestrator is the only actor that may do it" is exact.
- **Detached jobs:** the orchestrator spawns work with the subagent tool in
  `backgroundMode: continuable` (or plain jobs). Status comes via
  `job_output` and `job_list`. A finished report is fetched. The orchestrator
  attaches it as `builtin:subagent_report` evidence (author `agent`, payload
  carrying the job id, subagent name, start and end times). Ticket A6's
  provenance query by name and date reads the projection. Jobs outlive the
  parent turn and are listed per session natively.
- **Review pass (Ticket P8):** the orchestrator attaches `builtin:review_pass`
  (weight 1.0, "A reviewer read the change and reported findings") beside
  `builtin:automated_check` on the `in-progress to awaiting-verification`
  gate. A passing check with no review is refused. The refusal names
  `builtin:review_pass`. The prototype's recorded limit ("the agent writes
  this row itself, so the gate cannot tell a real review from an empty
  claim") survives unchanged.

### Scratch, not the repo

aidos never writes a file into a project directory. The README's rule is
load-bearing: "All state lives in aidos's own data directory." The repo must
not look like an agent touched it: no `CLAUDE.md` clones, no `PLAN.md`
copies, no design-doc copies. Agent output has exactly two homes: the
scratch dir and the ticket board.

**Design.** Each workspace (a dsh workspace, keyed by its canonical path)
gets a durable scratch directory:

```
$DSH_HOME/aidos/scratch/<workspace-key>/
```

- It is a plain directory on disk under the harness home. It survives
  reboots. It is not the spill seam, whose default root is process-tmp.
- The session context surfaces the scratch path to the agent. The `plan`
  context section can name it. Evidence rows can reference files in it by
  path (never by embedding file contents in the log).
- Clearing a workspace's scratch removes the directory and optionally writes
  an evidence row. The workspace registry's durable records stay untouched.
- The ticket board is the other home. Notes, decisions, and plans that have
  structure belong in tickets and evidence. Scratch holds the loose
  artifacts: working notes, fetched context, throwaway files.

**How the port uses it.** The former DSH.md design doc was consumed by this
file and deleted. PLAN.md is the sanctioned exception to the rule: it is the
bootstrap ticket source, and Ticket P6 deletes it when the board imports it.
The dotfiles-ai repo keeps only the user's own tracked content.

### The workstation port (dotfiles-ai)

This section ports the user's opencode workstation config
(`~/repos/dotfiles-ai`) into dsh. The port ships as the **personal bundle**,
separate from the aidos bundle. aidos stays unopinionated. Personal config
lives in dotfiles-ai and syncs to the harness.

| dotfiles-ai item | dsh port | Where it lives |
|---|---|---|
| Skills: grilling, plan, review, software-engineering, ste-writing, etu, caffeine, devtunnel, share-caddy-cert, expense-split | `SKILL.md` bundles. Frontmatter: `name`, `description`, `whenToUse`. Drop the `compatibility: opencode` key. The `question` tool reference becomes dsh's `ask_user_question`. Scripts and assets travel with the skill directory. | Personal bundle skill dir, synced to `$DSH_HOME/skills` |
| Agents: coder, tester, researcher, see | Subagent tool rows with `agentOptions: { provider, model }`, `toolFilter`, and `persona`. The `.md` bodies become the personas. coder, tester, and researcher pin OpenCode Go `deepseek-v4-flash`. `see` is a thin custom tool that resolves its model from the active profile (Claude Haiku on work, Qwen3.7 Plus on personal). | Personal preset's delegation group |
| Plugin: opencode-profile | Replaced by the Profile submenu (see "Model profiles"). A client plugin with the Profile submenu, the badge, and the see-model resolver. | Personal bundle client plugin |
| Plugin: session-hygiene | A small prompt-section plugin. It reads session age (`session.header.createdAt`) and compaction count (compaction events, the `sessionStats` projection) and injects a warning section when the session is old or heavily compacted. | Personal bundle host row |
| Tool: shell-command-long-running | `dsh-tool-bash` with `run_in_background` gives background jobs with `job_output`/`job_kill`. A thin tmux wrapper is optional via `dsh-tmux-context`. The opencode TUI "bash renderer" problem does not exist in dsh. | Personal preset tool row |
| Tab title | A title-rewriter client plugin. The renderer hardcodes `document.title = "<session title> — DeepSeek Harness"`. The plugin observes `document.title` and rewrites it to `dsh | <session title>`. The upstream fix is a configurable product title. | Personal bundle client plugin |
| Session cost | A `cost` projection unit sums per-model tokens (from `assistant/chunk` usage records) times the price from a price-table settings namespace. A small client component shows it near the stats strip. The strip itself is shipped client code. Our display is a companion. | Personal bundle |
| MCP servers | `dsh-mcp-client` rows: nostrbook, gitlab, swiggy-food, swiggy-instamart. Skip web_search and fetch: dsh's native `web_search` and `web_fetch` cover them. | Personal bundle patch |
| AGENTS.md rules | Copy into `$DSH_HOME/AGENTS.md` and the project's `AGENTS.md`. `dsh-agent-instructions` loads them natively. Translate opencode terms (Task tool becomes the subagent tool, `question` becomes `ask_user_question`, compaction stays dsh compaction). | `$DSH_HOME` plus project roots |
| opencode.json providers | Configurable provider routes in Settings to Models. The opencode-go subscription route (base URL `https://opencode.ai/zen/go/v1`, credential ref `OPENCODE_GO_API_KEY`, model ids `deepseek-v4-pro` and `deepseek-v4-flash`), the direct DeepSeek route, the meridian proxy route (for Claude Haiku), local llama-server and Lemonade routes. | Settings |
| LAN, systemd, Caddy | `dsh web` behind the same Caddy TLS plus mDNS (`potato.local`), as user systemd units. The opencode-web.service pattern ports directly. The dotfiles README describes the setup in a few lines. The configs stay in the deployed locations. | System config |
| OPENCODE_SETUP.md, PLAN.md | Port the docs into the personal bundle. PLAN.md's verification-gap analysis is what aidos itself addresses. | Personal bundle |

#### Model profiles

The work and personal split becomes a **Profile submenu** in the model
selector. dsh's model seat (`conversation.input.model`) and the `/model`
command come from the shipped `ui-model-selection` client plugin. The
personal bundle replaces that seat: its patch disables `ui-model-selection`,
and its own client plugin registers a model seat with a Profile submenu. The
slot system's shadowing machinery supports the replacement.

**Profiles** (the user's assignment):

| Profile | Orchestrator | coder, tester, researcher | see |
|---|---|---|---|
| Work | Meridian Claude proxy (localhost:9000) | OpenCode Go `deepseek-v4-flash` | Claude Haiku 4.5 (via meridian) |
| Personal | OpenCode Go `deepseek-v4-pro` | OpenCode Go `deepseek-v4-flash` | Qwen3.7 Plus (OpenCode Go) |

**Behavior:**

- Selecting a profile sets the session's provider and model through the
  session models RPC (`sessions.models(...)`), the same call the shipped
  selector uses. It changes providers only. It does not touch anything else.
- A badge shows in the model seat when the current session selection matches
  a profile. The comparison runs client-side against the profile config. A
  manual per-session override stays possible: the badge drops when the
  selection no longer matches a profile.
- coder, tester, and researcher pin `agentOptions: { provider, model }` in
  their tool rows. Both profiles use the same flash tier on the Go
  subscription, so the rows never change.
- `see` resolves its model from the active profile at call time. A thin
  custom see tool reads the profile settings and delegates with the right
  model (Claude Haiku on work, Qwen3.7 Plus on personal).

**Config location.** dsh settings can hold the profiles. A `profile`
settings namespace carries the definitions, schema-validated and
revision-gated (`expectedRevision`). A plain file the plugin reads also
works. Settings is the recommended home because the UI renders it and the
revision trail audits changes. The plugin reads the resolved value per
selection and per call.

**The meridian route.** Meridian (`rynfar/meridian`, port 9000) is the work
AI. The opencode config treats it as an Anthropic-compatible endpoint. dsh
ships no Anthropic adapter, so W0 must verify the protocol: if meridian
speaks Anthropic, the personal bundle needs a small LLM adapter plugin
(around a hundred lines). If meridian also exposes an OpenAI-compatible
mode, a configurable provider route covers it.

### Packaging and delivery

The implementation ships as two dsh bundle additions. No fork is needed.

#### The aidos bundle (unopinionated, distributable)

1. An npm package whose manifest declares
   `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`. Install it into
   the `web` profile with `dsh plugin --profile web add @aidos/dsh-bundle`.
   The `plugin` command initializes the profile, adds the dependency, and
   appends bundle-declared packages to `dsh.profile.bundles`. Its
   `cordis.patch.yml`:
   - inserts host rows: `aidos-core` (service, fold, invariant, projection
     units), `aidos-attachment-glue` if needed (evidence-to-attachment refs).
   - inserts the browser roster row: `aidos-board` to
     `@aidos/dsh-client-aidos-board`.
   - inserts the `aidos` settings namespace row for gate and kind config.
2. The **aidos preset** (agent plane): a directory with `agent.cordis.yml`
   (rows: `aidos-tools` via a relative path, the `tool:aidos` prompt section,
   skill filesystem roots, the `plan` skill, the delegation group that keeps
   board tools out of children) plus `preset.yml`. It sits alongside
   `standard` in the preset roster. Sessions pick it to opt into the ticket
   flow.
3. `@aidos/dsh-client-aidos-board`: the React board, built to a `client.js`
   bundle in the dsh client module format, with the `dsh.client` manifest and
   `./client` export.

Patch layers apply in order: bundle patches, then the profile's
`cordis.patch.yml`, then the home-level `$DSH_HOME/cordis.patch.yml` (home
wins). Patch files hot-reload (`watchUserPatches`). Bundle layers are static
per boot.

#### The personal bundle (dotfiles-ai)

A second bundle package (or a profile) whose patch mounts the workstation
port: the skills, the subagent tool rows, the session-hygiene row, the MCP
rows, the AGENTS.md copy, and the client plugins (the Profile model seat,
the title rewriter, the cost display). It lives in `~/repos/dotfiles-ai`
and syncs to `$DSH_HOME`. It depends on the aidos bundle only if a session
runs both.

#### Dev workflow

- The host, agent, and tool packages build as ordinary npm or tsc packages
  against the published dsh packages. They never need the dsh monorepo.
- Client-plugin development wants the dsh frontend build. The shipped
  bundles are emitted by the dsh build tooling in the
  `window.__ModuleLoader__.load(...)` format. A `pnpm run dev:web` watcher
  rebuilds client bundles and HMR-reloads without a page refresh. Add the
  board package to a dsh monorepo checkout (its `packages/client/` tree)
  during development. Publish the built bundle artifact so a profile can
  consume it without the monorepo.

### Build order

1. **A0, domain kernel plus tests.** Port the prototype's store and plan
   tests 1:1 as TypeScript unit tests against the fold, invariant,
   projection units, and the gate function. No UI, no tools. This is C2 plus
   C3 and the P-series pins.
2. **A1, tools.** `get_tickets`, `set_ticket`, `attach_evidence`,
   `move_ticket`, `plan`, `plan_import`, with the guard and the depth check.
   Port the P3 CLI tests (test_20 to 25) as tool tests. Port the P8 and P10
   pins.
3. **A2, human surface.** Remote endpoints plus `userQuestions`-backed
   flows. Port the lifecycle tests that need two actors (test_08, test_09,
   test_22, test_27).
4. **A3, board client plugin.** The Tickets tab, the global Tickets entry,
   the grid, detail, evidence, signoff, and send-back. Port the projection
   and view tests (test_26, test_31, test_32) against the client read model.
   U5's "every behavior has an equivalent test" checklist is the definition
   of done.
5. **A4, plan skill plus import dogfood.** Import this file into the board.
   Delete this file under a ticket (P6). Keep the benchmarking table alive.
6. **A5, subagent and job glue plus shell posture checks.** A6 provenance
   attachment. The A4 bypass suite against the shipped shell posture.
7. **W0, personal bundle scaffold.** The sync script (dotfiles-ai to
   `$DSH_HOME`), the preset directory, the provider routes in Settings to
   Models (OpenCode Go and the direct DeepSeek route), and the meridian
   protocol check (Anthropic adapter or OpenAI-compatible route).
8. **W1, skills port.** All ten skills as `SKILL.md` bundles, with the
   opencode-term translation.
9. **W2, subagent rows.** coder, tester, researcher, see. Pin the model
   tiers. Set the tool filters. Build the see model resolver against the
   profile settings.
10. **W3, MCP rows.** nostrbook, gitlab, swiggy-food, swiggy-instamart.
11. **W4, hygiene and long-running shell.** The session-hygiene prompt
    section. The long-running command tool.
12. **W5, AGENTS.md and LAN.** The rules copy. The Caddy, mDNS, and systemd
    units for `dsh web`. The dotfiles README describes the setup in a few
    lines; the configs stay in the deployed locations.
13. **W6, profiles client.** The Profile submenu in the model seat, the
    badge, the per-session override, the cost display, and the title
    rewriter.

A0 and W0 to W3 are independent. The personal bundle delivers immediate
value before the kernel finishes. The board (A3) is the milestone that
replaces the tkinter board.

### Risks

- **rquickjs embeds C, in-process versus child** is gone. There is no
  embedded engine.
- **rig ships no HTTP transport** is gone. dsh's transport is built.
- **Broad allow patterns reopen the shell bypass** is unchanged. The
  ask-by-default posture is shipped. Write the bypass suite first.
- **Providers are not uniformly OpenAI compatible** is handled by dsh's
  adapters. aidos adds nothing.
- **The board client plugin depends on the client-plugin surface.** The
  consumption path is verified (the `dsh.client` manifest, the `./client`
  bundle, the roster row). The dsh frontend build emits the bundle. Budget
  the monorepo setup in A3.
- **The Tickets tab seat names** need confirmation during A3. The trajectory
  view registers a `view.trajectory` label. The board registers its own view
  through the same mechanism. The exact seat and entry-point ids come from
  the client slot surface at build time.
- **Multi-session reads.** The global board reads cold projections. The
  "re-read on focus" rule has a latency budget for cold sessions. Fine for
  v1; keep the read path lazy.
- **Settings versus log for gates** is settled (settings namespace). If the
  audit pin later reads stricter, promote kind and gate changes to log-only
  events. Decide before A0 ships if that changes. It touches the fold.
- **The Go subscription route** is pinned: base URL `https://opencode.ai/zen/go/v1`
  (the adapter appends `/chat/completions`), model ids `deepseek-v4-pro` and
  `deepseek-v4-flash` (the docs list more, and
  `https://opencode.ai/zen/go/v1/models` serves the full catalog for
  auto-detection). The API key lives in `$DSH_HOME/.credentials.yaml` under
  `OPENCODE_GO_API_KEY` (or the env var, which wins). Configure the route in
  W0.
- **Meridian's protocol** is unverified. The opencode config treats it as
  Anthropic-compatible. dsh ships no Anthropic adapter. W0 must check
  whether meridian also speaks OpenAI-compatible, or a small adapter plugin
  is needed.
- **The Profile seat** replaces the shipped model seat. The slot shadowing
  must be confirmed in W6, together with the badge comparison against the
  live session selection.
- **The title rewriter** races the renderer's `DocumentTitle` effect. A
  `MutationObserver` on `document.title` wins in practice. The upstream fix
  (a configurable product title) is the clean end state.
- **The cost display seat** is a companion to the shipped stats strip. Its
  exact seat comes from the client slot surface at build time.

---

## Checklist

The tickets below are the contract. The Phase-1 prototype pins the behavior
its tests assert; the dsh port is checked against them one by one (Ticket
U5's rule). Phase and order are first-class ticket fields.

### Phase 1: Ticket prototype — `in_progress`

**Goal.** A throwaway board that pins the behavior of the ticket kernel before anyone writes
the real one, and that holds this plan so this file can be deleted.

**Constraints.** Python, tkinter, and `sqlite3`. Standard library only. Lives in `prototype/`
in this repository. It is a behavior specification, not a component. No line of it survives
into aidos. Throwaway code in a repository you keep does not stay throwaway unless someone
deletes it on purpose, so Ticket U5 exists to be that someone.

- [x] **Ticket P1: Schema and event log.** Tables for projects, tickets, the evidence kind
  registry, evidence rows, gate config, and an append-only event log. Current state derives from
  the log. Author and timestamp are stamped by the writer layer and are never read from caller
  input. Evidence kinds are namespaced strings, `builtin:*` and `plugin:*`.
  **Done.** 37 unittest cases pass. I verified three claims against the real artifact rather
  than trusting the report: a file-backed store reopens with identical state including the
  original evidence timestamps, the stored author comes from the actor and not from a payload
  that tries to set one, and a weight change moves every affected score with no row rewritten.
  Review found two further defects, both fixed: the store never rebuilt its projection on open,
  so nothing survived a restart, and registry changes were unlogged, so loosening a gate left no
  audit trace.
  **Superseded in part.** Ticket P7 replaced the in-memory projection described here with SQL
  views. Every behavior this ticket pins still holds. The mechanism that delivered it does not.

- [x] **Ticket P2: Gate engine.** A gate names one transition and the evidence kinds it
  requires. Gate config is data, not code. A refused transition returns the missing kind and the
  author who must supply it. Confidence score is computed and displayed, and never consulted by
  a gate.
  **Done.** Deny by default was absent from the first contract I wrote and is now the most
  important test in the suite: a transition with no configured gate is refused for every actor,
  and stays refused even when every registered evidence kind is attached. I ran that case
  myself. A refused move now appends one audit record that replay ignores, so an attempted
  bypass is visible rather than silent. Gate config is data, and loosening one needs no
  migration.
  **Superseded in part.** Ticket P7 moved the gate lookup into a SQL view. Deny by default and
  every refusal message this ticket pins are unchanged.

- [ ] **Ticket P3: Agent CLI.** Commands for `plan` (serialize the whole plan to markdown),
  `set_ticket`, `attach_evidence`, and `move_ticket`. Output is JSON on stdout. This is the
  surface a real agent would call, so it is stamped as the agent author.
  **Evaluate:** you drive one full ticket from creation to done using only the CLI for the
  agent's half and the board for yours. `attach_evidence` cannot write a row authored by you.
  The markdown from `plan` round-trips back through the importer without loss.
  **Built, awaiting your check.** 111 tests pass. The half of the criterion that needs the
  board cannot run until P4 exists, so this ticket stays open on purpose. I verified the rest
  by driving the real CLI: a payload naming an author changes nothing, every non-system actor
  in the log is `agent`, and both refusal paths print JSON rather than a traceback.
  Two design points moved during the work. `plan import` now lands every ticket in `open`
  whatever mark the document carries, and records the document's claim as
  `builtin:imported_state` evidence. Import was the last path that could reach `done` without
  a human, and it is now shut. The plan format also grew four state marks, because `[x]` and
  `[ ]` could only encode two of the four states.
  Reading the finished code found one defect the 108 tests missed: the unknown-kind refusal
  read the kind off the command flags, but `plan import` writes an evidence kind and has no
  such flag, so that path raised a second error inside the error handler and printed the
  traceback the contract forbids. Fixed, and `test_29` now fails without the fix.

- [ ] **Ticket P8: A review is its own evidence kind.** Register `builtin:review_pass`, labelled
  "Review pass", described as "A reviewer read the change and reported findings", weight 1.0.
  Add it to the gate from `in_progress` to `awaiting_verification`, beside
  `builtin:automated_check`. A passing test suite says nothing about dead code, a duplicated
  helper, or scope that grew. A review says nothing about whether the thing runs. Those are two
  claims, so they are two kinds.
  `builtin:review_note` stays as it is, weight 0.5, for a single remark. The new kind means the
  pass finished. The agent attaches it, so this adds no step for you. Under Ticket A5 the
  orchestrator attaches it and the subagent's report is the payload.
  A limit worth recording rather than hiding: the agent writes this row itself, so the gate
  cannot tell a real review from an empty claim. What it buys is that a missing review becomes a
  refusal naming a missing kind, instead of an absence nobody notices. That is the difference
  between a rule and a habit, and it is smaller than it sounds.
  **Evaluate:** a ticket with a passing check and no review is refused, and the refusal names
  `builtin:review_pass`. The same ticket moves once the review row exists. The number of gates a
  human must satisfy is unchanged, so the change costs you nothing at the keyboard.

- [ ] **Ticket P7: SQL views own every derived read.** Ordered before Ticket P4, and numbered
  after it so that no committed ticket id changes meaning. The in-memory projection goes away.
  Every derived read comes from a SQL view over `events`, one view per event kind for
  uniformity: tickets, projects, phases, plan meta, kinds, gates, and evidence. No view for
  comments. No comment event type exists, so Ticket P4 adds the type and its view together. A
  view over an event type that nothing writes is dead code. `seq` is the ordering authority for
  last-write-wins, and `at` becomes display metadata that no query orders by. Two events can
  share one `time.time()` value, so ordering by `at` picks an arbitrary winner. Standard
  library `sqlite3` cannot register a virtual table, because `Connection.create_module` does
  not exist, so a view is the reachable shape. `json_extract` and SQL window functions are both
  available and do the work.
  The store's read surface is explicit query methods, including a paged ticket read taking a
  project filter, a sort key, a limit, and an offset. That read computes the confidence score
  and the gate fraction as columns, so the board sorts on either without loading every row.
  Built in stages, against this ticket's first plan to rewrite everything at once. That plan
  accepted that nothing would guard the change, because the same hand would edit the queries and
  the assertions that check them. That was avoidable. The projection stays alive while the views
  are proven equal to it on a fixture, so the rewrite is checked against something it did not
  write. The projection dies last, once it has already done that job.
  Views, the read swap, the paged read, and Unit 4a are done. Unit 4a rewrote every assertion in
  `tests/test_31_views_match_projection.py` to a hand-derived expected value, while the projection
  still existed to confirm the two agree. That carries the proven equivalence forward instead of
  losing it, which is exactly the failure this ticket first walked into. `created_at` stayed
  non-literal, because `time.time()` is not reproducible; the test pins row order on `seq` and
  asserts only that `created_at` does not fall.
  **Built, awaiting your check.** Unit 4b deleted the projection attributes, `_apply_event` and
  `rebuild_projection`, and moved every call site. `cli.py` lost two helpers that had become pure
  delegation, and its three membership checks now catch `KeyError` from a read they already
  needed. Four store methods replaced the attributes: `kinds`, `gates`, `projects` and
  `tickets_for`, plus `find_project`, which pushes a path lookup into SQL. The five tests that
  called `rebuild_projection` to prove state derives from the log now close the store and reopen
  the file. Re-reading through a rebuilt projection was a real claim. Re-reading through a view is
  a value compared with itself, so only a reopen keeps the claim honest.
  Two defects came out of review, and the suite found neither. `tickets_for` sorted on the raw
  view columns while `_fill_ticket_defaults` supplied the defaults afterwards, so a legacy record
  with no phase and no order sorted ahead of every real row while reporting a filled order.
  `_SORT_COLUMNS` had the same fault under the `phase` key. Both are fixed, and a test pins the
  id order. Two smaller ones: the ticket dict was built in three places, and `helpers.reopen`
  returned an empty store when the store was in memory. 135 tests pass.
  Tickets P1 and P2 stay `done`. This ticket supersedes the mechanism they describe, and it is
  recorded as a rework event in the benchmarking table, because the first contract never
  anticipated paged reads.
  Why the churn is worth it: aidos's Rust side uses `sqlx` over SQLite, so this view SQL ports to
  Tickets C2 and C3 unchanged. The derivation gets written once and serves both implementations.
  (The dsh port supersedes this mechanism: derived reads are session projections, not SQL. The
  `seq`-over-`at` and whole-value lessons this ticket records are the parts that carry over.)
  **Evaluate:** the full suite passes with no in-memory projection left in the store. Reopening
  the database yields identical reads, because no projection exists to rebuild.
  A test proves last-write-wins follows `seq` and not `at`. The two events must carry
  *contradicting* `at` values, not merely equal ones. This ticket first asked for two events
  inside one clock tick, which does not discriminate: equal values leave SQLite free to break
  the tie either way, and a view deliberately switched to sort by `at` still passed. Inverting
  the fixture caught it at once.
  A page of twenty returns exactly twenty rows and the correct total count. Sorting by score and
  sorting by gate fraction produce different orders on a fixture built to separate them.

- [ ] **Ticket P10: Tests use the real builtin kinds.** Depends on Ticket P7, so the rename does
  not churn tests that Ticket P7 rewrites. `tests/helpers.py` registers its own kind list and
  calls the ids `builtin:`. That list is not the real registry. It is a second and contradicting
  claim about what the builtins are. `builtin:after_shot` carries weight 1.0 there and weight
  0.5 in `cli.py`, and weight drives `confidence_score`. `builtin:user_signoff` and
  `builtin:review_pass` disagree on their description. Four more ids exist only in the fixture:
  `builtin:agent_report`, `builtin:comment`, `builtin:eval_criteria`, `builtin:file_allowlist`.
  Nothing has broken yet, because store tests never load the CLI registry. That is luck, not
  design.
  The builtin registry becomes one definition that both the CLI and the tests read. It does not
  belong in `cli.py`, because the store sits below the CLI and must not import upward. Move it
  into the library beside the store.
  The mirror in `tests/cli_helpers.py` stays duplicated on purpose. It restates the registry so
  a test can catch an unintended change. A test that imported the constant would assert that a
  value equals itself.
  One complication to settle rather than paper over: four fixture ids have no real counterpart,
  so the tests that use them must move to real kinds. `builtin:comment` becomes real in Ticket
  P4, and criteria evidence is Ticket P9's subject, so some of these may be worth registering
  rather than deleting. Decide per id. Do not invent a kind to keep an old test compiling.
  **Evaluate:** no test registers a kind id that the real registry does not hold, and no id
  carries a label, description, or weight that differs from it. A test asserts that agreement,
  so later drift fails the suite instead of passing quietly. The full suite passes.

- [ ] **Ticket P4: Board.** Depends on Ticket P7. tkinter, split in two. `board_model.py`
  imports no tkinter and holds every decision: paging maths, the project filter, the sort order,
  what a card shows, which moves are offered, and the exact refusal text. `board.py` builds
  widgets and calls it. The model joins the unit suite. Widget smoke tests run under `xvfb-run`,
  which is installed and verified working, so both halves are checkable.
  Layout. A grid of ticket cards spanning every project, with a project filter. Twenty cards in
  4 by 5 with the detail panel closed, ten in 2 by 5 with it open. Opening the panel recomputes
  the offset so the selected ticket stays on screen. Detail is a side panel, not a modal. A card
  shows the title, the state, the confidence score prominently, and the gate fraction below it
  in muted smaller text. The fraction counts the forward transition only, along
  `open -> in_progress -> awaiting_verification -> done`, so `done` shows none. Both numbers
  sort.
  Behavior. The board creates tickets. Projects stay CLI-created. It edits fields, adds
  comments, moves states with gate enforcement, and attaches evidence of any registered kind as
  actor `user`. Comments get their own event type and their own view, so no gate can accept a
  comment as proof. The window re-queries when it regains focus, with no timer, so a repaint
  never lands mid-edit. A refusal prints `str(GateRefused)` verbatim, which already names the
  missing kinds and the allowed actors.
  Storage. The storage root is the directory holding the database. An attached image is copied
  to `<root>/blobs/<sha256>`, so the same image is stored once however often it is attached. The
  evidence payload carries the hash, the original file name, the byte length, and the media
  type. `--db` becomes optional and defaults to `$XDG_DATA_HOME/aidos-proto/aidos.db`. The
  prototype root is `aidos-proto` and never `aidos`, so it cannot collide with the data directory
  Ticket C1 defines. A backup is a copy of the root.
  **Evaluate:** you use it for a working session without dropping to SQL. Every refusal names
  what is missing. A screenshot attaches, persists, and displays after a restart. Opening the
  panel on a ticket in the second half of a page keeps that ticket on screen. A write made from
  the CLI appears after you click away and back, with no restart. Sorting by score and sorting
  by gate fraction produce different orders. The model suite passes with no display available,
  and the widget smoke tests pass under `xvfb-run`.

- [ ] **Ticket P5: Node-tree renderer.** Render a declarative node tree into tkinter widgets:
  `stack`, `row`, `text`, `markdown`, `image`, `form`, `input`, `checkbox`, `dropdown`,
  `button`. A form submit produces structured data that lands as an evidence row.
  **Evaluate:** a hand-written node tree renders, and its form submission appears as an evidence
  row on the right ticket with the right author. An unknown node kind renders an error node
  rather than crashing the board.

- [ ] **Ticket P9: Evidence names the criterion it covers.** Depends on Ticket P4. Criteria stay
  one freeform text field on the ticket. Nothing splits them into rows, because enumerating them
  would be a chore on every ticket. Instead an evidence payload may carry the text of the
  criterion it addresses, and the board groups the evidence list by criterion and shows which
  ones nothing covers yet.
  This is the half that makes work hard to miss. A gate asks whether a kind is present. It
  cannot ask whether the work is finished, because one `builtin:automated_check` row satisfies
  the gate whether it exercised six criteria or none.
  Advisory, like the confidence score. No gate reads coverage, and an uncovered criterion blocks
  nothing. The board makes it visible and you decide what it means.
  **Evaluate:** a ticket with three criteria and evidence naming two shows the third as
  uncovered. Evidence naming no criterion still attaches and still counts toward its gate. A
  criterion reworded after evidence was attached leaves that evidence visible as uncovered
  rather than dropping it silently.

- [ ] **Ticket P11: The plan format follows the plan-skill structure.** aidos adopts the section
  shape that the `plan` skill defines: Vision, Checklist, Critical context, User preferences and
  special rules, Human review queue, and an optional Benchmarking section. That shape is
  cleaner, and it guides the writer instead of leaving the layout open.
  This changes the tool, not the ticket format. The phase headings and the checklist shape
  carry into the board. The design sections above (Critical context) already follow the
  skill's shape around the ticket phases, and the import (P6) folds them into plan context.
  The open question is phases. `plan.py` special-cases `## Phase N` headings and gives each
  phase a number, a title, and a state. The skill has one flat checklist and no phases. Decide
  whether aidos keeps phases as a first-class field, or treats them as ordinary sections and
  lets ticket order carry the sequence. Settle this before Ticket P6 runs, because P6 imports
  into whichever shape wins.
  A related decision that is now settled: importing a ticket in a state other than `open` does
  not need to be exercised by this file. Test coverage of `claimed_state` is enough, so the
  choice of shape is not constrained by dogfooding.
  **Evaluate:** a document in the new shape round trips byte for byte. A document with no phase
  heading parses without error. The round-trip tests cover the new shape, not only the old one.

- [ ] **Ticket P6: Import this plan and delete this file.** Split PLAN.md into tickets by its
  YAML frontmatter and headings. Load the context and rules sections.
  **Evaluate:** every ticket in this file exists in the board with its criteria intact. You
  confirm the board is usable for daily planning. Only then is PLAN.md deleted, in a commit that
  also records why.

### Phase 2: aidos core — `pending`

**Goal.** The ticket kernel, on dsh. No board yet.

- [ ] **Ticket C1: Workspace and data directory.** On dsh: `ctx.workspaceRegistry` plus the
  session `cwd`. Config lives in the profile and the settings. `move` repoints the workspace
  path and the session `cwd` through a Remote endpoint, not a filesystem move. Config-from-git
  stays optional glue; the personal bundle ships a sync script instead.
  **Evaluate:** a first run creates the data directory and an empty database. `move` repoints a
  project and a later session opens in the new path. A config git URL clones, and a second run
  updates rather than re-clones.

- [ ] **Ticket C2: Event log and projection.** On dsh: the session log plus the strict replay
  fold, the invariant companion, and the projection units. The dsh-goal domain is the pattern.
  **Evaluate:** a test replays a log and reproduces state exactly. A test asserts no code path
  outside the write boundary can set an author. Deleting the projection and rebuilding from the
  log yields identical state.

- [ ] **Ticket C3: Ticket kernel.** On dsh: the `aidos` domain service (see the design's
  "The ticket domain"). States are a TypeScript exhaustive enum. Evidence rows reference
  registered kinds. Gate predicates run over rows. The kind registry and gate config live in the
  `aidos` settings namespace.
  **Evaluate:** the transition function is exhaustive, so adding a state fails to compile until
  every arm is handled. A gate referencing an unregistered kind fails at config load, not at
  gate time. The Phase 1 lifecycle tests are ported and pass against this kernel.

- [ ] **Ticket C4: Plan import and serialization.** On dsh: the `plan` and `plan_import` tools
  plus the `plan` skill. Markdown with YAML frontmatter in. Markdown out on demand. The context
  cap applies at the write boundary. This file's design sections are the first real import; the
  importer must handle a context longer than 500 lines (raise the cap for the bootstrap import
  or fold the design into context and rules).
  **Evaluate:** import, serialize, and re-import produces an identical plan. A context section
  over 500 lines is refused with a clear message naming the overage.

### Phase 3: HTTP and agent loop — `pending`

**Goal.** aidos talks to a model and to a browser. dsh provides the transport; the work is the
tools and the gate enforcement.

- [ ] **Ticket A1: HTTP and WebSocket.** Built by dsh: the webserver, the API gateway, and the
  browser transport. typert generates the client bindings, so the wire protocol cannot drift.
  **Evaluate:** generated TypeScript matches the Rust types, and a deliberate mismatch fails the
  build rather than reaching the browser. A second device on the LAN connects and receives live
  events. Without the token, a write is refused.

- [ ] **Ticket A2: Agent loop and profiles.** Built by dsh: the agent loop, `ctx.credentials`,
  and per-session model selection. The work and personal split becomes the Profile submenu (see
  the design's "Model profiles"). The opencode-go route: base URL `https://opencode.ai/zen/go/v1`,
  model ids `deepseek-v4-pro` and `deepseek-v4-flash`, key in `$DSH_HOME/.credentials.yaml`
  under `OPENCODE_GO_API_KEY`. The meridian route: protocol check at W0.
  **Evaluate:** two profiles against the same provider, with different keys, both work in one
  install. Model auto-detection lists models for each. A tool call and its result both appear on
  the WebSocket in order. Cancelling mid-stream leaves no orphaned task.

- [ ] **Ticket A3: Tool dispatch and gate enforcement.** Every state change goes through the
  kernel. `ctx.tools.register` provides the tools. `ctx.tools.guard` provides the monotonic
  gate. A tool call that would breach a gate is refused before it runs, with the missing kind
  named in the error the model reads.
  **Evaluate:** the agent cannot move a ticket to `done` by any tool path. The refusal text is
  specific enough that a model corrects itself rather than retrying blindly. The file allowlist
  is enforced on read and edit tools, not merely recorded.

- [ ] **Ticket A4: Shell tool.** dsh's `tool-bash` plus the sandbox and the approval seam. The
  shipped permission presets bundle the knobs: `workspace-write` is the workspace-write sandbox
  plus ask approval; `danger-full-access` is full access plus never. The bypass suite is a
  verification artifact of the aidos preset's configuration: each listed bypass attempt must ask
  or refuse.
  **Evaluate:** an unmatched command asks and does not run. `git push` is refused while its gate
  is unmet, and is not reachable through `git -C`, `sh -c`, an alias, or a script. A test suite
  of bypass attempts is written first and each one fails to bypass.

- [ ] **Ticket A5: Subagent definitions.** On dsh: agent presets plus the subagent tool rows with
  `toolFilter`. Board tools refuse `delegationDepthOf > 0`, so only the orchestrator touches the
  board. Identity stays flat: every subagent writes as the single author `agent`, and its name
  is metadata on a record rather than an actor of its own.
  **Evaluate:** a new definition file becomes a callable subagent with no code change. A
  malformed definition fails to load with a message naming the file and the problem, and does
  not stop the other definitions loading. A subagent that calls any board tool is refused, and
  the refusal says the orchestrator is the only actor that may do it. After a session that ran
  several subagents, the log holds no author other than `agent`, `user`, and `system`.

- [ ] **Ticket A6: Subagents run detached.** On dsh: `ctx.jobs` plus the `job_output`/`job_list`/
  `job_kill` tools. Jobs outlive the parent turn and are listed per session. The orchestrator
  attaches a finished report as `builtin:subagent_report` evidence with the job identifier, the
  subagent name, and the start and end times.
  **Evaluate:** the parent agent spawns a job and takes its next action in the same turn, before
  that job finishes. A status check names the job, its state, and how long it has run. A report
  fetch against a running job is refused with text that tells the parent to check the status
  again, and it does not block. A subagent that crashes or times out reports a terminal state
  with a reason, so no parent can poll forever. Killing a job stops its process and leaves no
  orphan. Two jobs run at once and neither report is attributed to the wrong job. A report
  attached as evidence carries `agent` as its author and the subagent name as metadata, survives
  a restart, and a query by subagent name and date returns it with its job identifier intact.

### Phase 4: Web UI — `pending`

**Goal.** The board you actually use, replacing the Phase 1 prototype.

- [ ] **Ticket U1: Scaffold and live client.** On dsh: the client-plugin surface plus the
  connection transport. Reconnect is built. Types come from typert, never hand-written.
  **Evaluate:** a dropped connection reconnects and the view is correct afterward with no
  refresh. No hand-written duplicate of a Rust type exists in the source.

- [ ] **Ticket U2: Board.** The aidos board client plugin: the Tickets tab next to Chat and
  Trajectory, the global Tickets entry near New Session, the ticket grid, detail, field
  editing, comments, and state moves. Gate refusals surface as readable text naming the missing
  kind.
  **Evaluate:** you run a full ticket lifecycle in the browser without touching the prototype.
  Every refusal is legible without reading logs.

- [ ] **Ticket U3: Evidence and screenshots.** `ctx.attachments` stores content-addressed
  images, hash-deduped. Evidence rows reference the attachment refs. Show the confidence score
  and label it advisory.
  **Evaluate:** a pasted screenshot attaches and survives a restart. The score is visibly marked
  as advisory and no control anywhere is enabled or disabled by it.

- [ ] **Ticket U4: Node-tree renderer.** Paused. The prototype's tkinter dashboards stay in use.
  Later work looks at nostr-canvas for the declarative node tree.
  **Evaluate:** the agent builds a throwaway review dashboard, you complete it, and the
  submissions appear as evidence on the right tickets. An unknown node kind renders an error
  node and does not break the page.

- [ ] **Ticket U5: Delete the prototype.** Remove `prototype/` once the web UI has replaced it.
  The prototype was always meant to die. This ticket is the only thing that makes that happen.
  **Evaluate:** you confirm you have run a full ticket lifecycle in the browser, including
  evidence attach and a rendered node tree, and that you no longer open the tkinter board. Every
  behavior the prototype's tests pin has an equivalent test in the Rust suite, checked one by
  one against the prototype's test list, not by eye. Only then is `prototype/` removed, in a
  commit that names the Rust tests that replaced it.

### Phase 5: Tools, scripting, and skills — `pending`

**Goal.** The extension surface.

- [ ] **Ticket T1: Script engine.** Moot. Tool scripts are JS plugins; there is no embedded
  engine to sandbox. The rquickjs spike dissolves. dsh's model is that a loaded plugin is
  trusted, and the agent's reach is bounded by tools, the sandbox, and approval. If a future
  untrusted-script mode is wanted, a worker-thread code runtime with `AbortSignal` and
  `timeoutMs` is the dsh-shaped answer.
  **Evaluate:** an infinite loop is stopped by the interrupt handler and does not hang the
  server. An allocation loop hits the memory cap and fails the one script without taking down
  the process. A script awaiting a database write does not block a tokio worker. A script cannot
  reach the filesystem, the network, a timer, or a process.

- [ ] **Ticket T2: Tool loader.** Deferred. Use the existing plugin system: tools ship as
  packages or as preset-relative plugin files. Revisit only if a third party wants
  directory-based tool distribution.
  **Evaluate:** a new directory becomes a callable tool. A malformed tool fails to load with a
  message naming the file and the problem, and does not stop other tools loading. Editor
  completion works against the shipped types.

- [ ] **Ticket T3: Script standard library.** The tool API is the stdlib: `exec` is the context,
  card render intents are the UI, output schemas are the util, service calls are the store. A
  `.d.ts` ships with the aidos tool packages for editor completion.
  **Evaluate:** a tool builds a node tree using only `ui` constructors and it renders. A script
  cannot reach a raw host binding directly. A typo on a global is an error with a line number,
  not a silent undefined.

- [ ] **Ticket T4: Skills.** On dsh: `ctx.skills` plus the filesystem provider plus the `skill`
  tool. The preset tool groups are the always-on core; a skill activates a further group.
  **Evaluate:** the always-on core is measurably small in tokens, and the number is recorded. A
  task needing an inactive group triggers activation and then completes.

- [ ] **Ticket T5: Scratch workspaces.** The scratch design in this plan's "Scratch, not the
  repo": `$DSH_HOME/aidos/scratch/<workspace-key>/`, durable on disk, surfaced to the agent,
  clearable.
  **Evaluate:** the agent creates a workspace, writes per-item subdirectories, builds a
  dashboard over them, and your comments and screenshots land as evidence. The workspace
  survives an aidos restart. Clearing removes it from disk and from the database.

---

## User preferences and special rules

- **STE for all user-facing prose.** ASD-STE100 Simplified Technical English, as close as the
  subject allows. Covers the README, help text, error messages, and anything the agent writes
  for a person to read.
- **Scratch, not the repo.** Agent output never lands in a project repo. It lives in the
  scratch dir or the ticket board. No `CLAUDE.md` clones, no plan copies, no design-doc copies.
- **Two-bundle delivery.** aidos ships unopinionated and distributable. Personal config lives
  in dotfiles-ai and syncs to the harness.
- **aidos is opt-in.** The aidos preset sits alongside `standard`. A quick task uses a standard
  session with zero ticket machinery.
- **Model profiles.** Work uses meridian for the orchestrator; personal uses OpenCode Go
  `deepseek-v4-pro`. Subagents always run OpenCode Go `deepseek-v4-flash`. See the design's
  "Model profiles".
- **Board scope.** The Tickets tab and the global Tickets entry both ship in v1.
- The AGENTS.md rules from dotfiles-ai port to `$DSH_HOME/AGENTS.md` (W5).

---

## Human review queue

- [ ] Phase 1 (whole prototype) — use it for one real working session and say whether the gate
  refusals help or annoy. That judgment cannot be made from tests.
- [ ] Ticket P8 — drive a ticket that has a passing check and no review, and say whether the
  refusal reads clearly at the terminal and names the right kind.
- [ ] Ticket P7 paged read — decide whether the gate fraction is the number the board should
  sort on, before Ticket P4 builds a card around it. It counts only the forward transition, so
  a ticket in `done` shows nothing at all.
- [ ] Ticket P7 legacy defaults — decide whether a ticket record that carries no order deserves a
  stable one. `_fill_ticket_defaults` computes the default at read time, so the value climbs as
  later tickets appear: a legacy row reported order 2, then order 3 once one more ticket existed.
  The old projection fixed the value when it replayed the record. Reproducing that in SQL needs a
  window function over earlier events. The path only matters for a log written before the plan
  fields existed, so the real question is whether such a log is worth supporting at all.
- [ ] Ticket P7 duplicate creation records — `v_projects` and `v_tickets` carry no `GROUP BY`,
  unlike the other five views. Two `ticket.created` records sharing one id would return the
  ticket twice, and the old projection collapsed them by last-write-wins. The store never writes
  a duplicate, so this needs a hand-written log. Decide whether the views should defend anyway.
- [ ] W0 — the meridian protocol check: Anthropic-only or also OpenAI-compatible. It decides
  whether a small adapter is needed.
- [ ] W6 — the Profile seat shadowing and the badge comparison against the live session
  selection.
- [ ] W6 — the title rewriter race against the renderer's `DocumentTitle` effect.
- [ ] W6 — the cost display seat next to the shipped stats strip.
- [ ] A3 — the global board's cold-read latency for the "re-read on focus" rule.

---

## Benchmarking

| Metric | Count / Value | Notes |
|---|---|---|
| Verification catch rate | 9 / 23 | independent checks that caught a real discrepancy, vs. total checks performed. The reopen check found two defects the 29 passing tests missed. Reading the implementation found two more. For P3, five checks found one defect, and the one that found it was reading the finished code. P7 units 1 to 3 added four catches from ten checks, and all four came from reading the diff or from breaking the code on purpose: a seq-versus-`at` test that could not discriminate, a `STATE_ORDER` constant that nothing read while the same ordering sat hardcoded three times in SQL, an untested `awaiting_verification` to `done` gate, and a legacy-default block duplicated across two methods. Re-running suites again caught nothing, in any ticket so far. Reading code and deliberately breaking it are the checks that pay. Unit 4b added two catches from four checks. One of them is the first dispatched review pass on this project, and it found a sort regression that the author missed and that a full read of the diff also missed. Reading the diff found three smaller faults of its own. The suite caught nothing again, and running the broken case by hand only confirmed what the review had already named. That is the case for Ticket P8 in one line: a review and a check are different claims, and here they disagreed. |
| Escaped defect rate | 0 / 2 | bugs found after a ticket was marked `done`, vs. tickets closed. Both P1 defects were caught before the ticket closed, not after. P3 is not closed yet, so it does not count here. |
| Rework/reopen rate | 5 rounds / 4 tickets | P1 and P2 each needed an extra test-and-fix round because my first contract omitted deny-by-default and said nothing about durability. P3 needed one because my contract told import to preserve a `done` mark and also told the agent it could never reach `done`. Those two rules cannot both hold. A subagent found the conflict by writing tests against the contract, before any code existed. Grilling found none of the three. The fourth round is Ticket P7, which discards P1's in-memory projection entirely: my contract never asked how the board would read twenty tickets at a time, so it specified a structure that cannot paginate. Grilling the UI found it, one question in. The fifth round is Ticket P7 rescoping itself while being built: its contract asked for a comments view over an event type that does not exist, and it accepted up front that nothing would guard the rewrite. Both were found by reading the contract against the code before dispatching, not by grilling. |
| Rough cost | 4 dispatches for P1+P2, 8 for P3, 11 for P7 | of P3's 8, three produced nothing: two `coder` dispatches returned empty without writing a file, and one `general` implementation dispatch timed out. The five that worked were a probe, a test-writing round, a contract revision, the plan parser, and the CLI. Splitting the implementation in two after the timeout is what got it finished. P7 spent 7: two `researcher` maps of the store and its call sites, and five `coder` runs. One `coder` run returned empty again, the same failure as P3, and splitting that unit into implementation and tests fixed it. Two research dispatches up front were worth it: they kept 550 lines of store code out of the main session while still yielding the exact call-site counts the ticket needed. Unit 4b spent the other four: implementation, tests, a review pass, and one fix round. Splitting implementation from tests before dispatching avoided the empty return that hit both P3 and an earlier P7 unit. |
| Contract defects found before code | 2 | the import versus `done` conflict, and Ticket P7 asking for a comments view over an event type nothing writes. Writing tests against a contract, and reading a contract against the code it describes, are the only steps so far that have caught a contradiction rather than a bug. Both happened before any code was dispatched. |
