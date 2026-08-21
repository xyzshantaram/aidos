# aidos implementation plan

This file is a bootstrap artifact with a scheduled death. It is the single
working document for the aidos-on-dsh build. It holds the design (merged
from the former DSH.md) and the tickets in one place. When the aidos board
can import this file completely, this file is deleted. That is build order item B4.

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
(`@deepseek-ai/dsh-*` at `0.1.0-rc.8`), by reading the package READMEs and the
compiled plugin sources. The first pass read rc.7. A re-check against rc.8 ran
on 2026-08-21. The two claims that moved are recorded in build order item 3
(B2) and in Ticket A3.

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
  the rule set the Python prototype proved out, including its load-bearing
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
  selection cover the profile story.

What is net-new is small. It is exactly the part of aidos that is aidos:

1. The **ticket/evidence/gate kernel** as a dsh session domain (a service,
   strict replay fold, invariant, projection units, Remote endpoints, and
   model-facing tools). It is a direct port of the Python prototype,
   following the dsh-goal domain's pattern.
2. The **board** as a dsh web client plugin (React, not the Svelte 5 the
   from-scratch plan chose). It is the first board. It consumes the
   projection and calls the Remote endpoints.
3. The **plan skill** and the `plan` import and serialize tools.
4. Small glue: subagent job reports as evidence rows, the human-review queue
   surface, and (optionally) config-from-git.

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
| MCP servers | nostrbook, gitlab, swiggy-food, swiggy-instamart, git | web_search and web_fetch are native dsh tools. The git row is the model's only git surface. |
| Delivery | Two bundles | aidos is unopinionated and distributable. Personal config lives in dotfiles-ai and syncs to the harness. |
| Scratch rule | Per-project scratch outside the repo | Agent output never lands in the project repo. It lives in the scratch dir or the ticket board. |
| Node-tree renderer | Paused. nostr-canvas later | No renderer ships in v1. |
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
| Agent tool access follows ticket state | `ctx.tools.restrict` per agent scope, re-applied on `ticket/change`. Union over states; bash asks via `tools/pre-execute` while a ticket awaits verification; per-ticket allowlists and child path guards at the write boundary | **New** (seams built) |
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
| Node-tree renderer, throwaway dashboards | Paused. nostr-canvas comes later. The web board (B3) is the only board. | Deferred |
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
| `comment/added` | `{ kind: "comment/added", version, ticketId, text, author, at }` | Append (comments get their own event type and view, so no gate can accept a comment as proof) |

A **ticket snapshot** carries the prototype's fields: `id`, `revision`,
`title`, `description`, `state` (`open | in-progress | awaiting-verification |
done`), `criteria` (freeform text. Criterion coverage is a derived read
over evidence payloads, built in B3), `phase`/`order` (plan ordering),
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
  `builtin:comment`, ...) are one constant table in the aidos package. The
  CLI and the tests read the same constants.
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

#### State-gated tool access

The agent's tool surface follows the session's tickets. Before you sign
off, the agent can plan and read but cannot change anything. This is the
structural form of "talk the work through before it writes anything". The
score stays advisory: the tiers key on ticket state, never on the score.

The mask is per session and derives from the set of ticket states.
`ctx.tools.restrict({ deny: [...] })` removes the named global tools from
the agent scope. The mask is re-applied at session start and on every
`ticket/change` event. The monotonic guard re-checks the state at call
time, so a mid-turn move cannot unlock a call that already started. The
aidos preset owns the mask; standard sessions have no ticket machinery and
no mask.

| State | Tools the agent may see |
|---|---|
| open | conversation, questions, `plan`/`plan_import`, ticket tools, skills, `read`/`read_image`, web search and fetch |
| in-progress | the above plus `write`, `edit`, `bash`, subagents, jobs, and the MCP tools |
| awaiting-verification | read, bash (each call asks), evidence tools, subagents and jobs for the review pass. No write or edit |
| done | conversation, read, `get_tickets` |

The session mask is the union: implementation tools exist while at least
one ticket is in-progress. Bash also stays visible while a ticket is
awaiting-verification, because the check must run. While any ticket is
awaiting-verification, every bash call asks. A state-aware
`tools/pre-execute` listener returns `ask` for the bash tool, and the
approval outcome is one-shot, so each call asks again. A ticket in
awaiting-verification contributes no write or edit access: its files are
frozen until you send it back or mark it done.

**Allowlists are per ticket.** Each in-progress ticket carries its own
file allowlist (the prototype's `builtin:file_allowlist` idea). The write
boundary enforces the union of the in-progress allowlists. A write outside
the union is refused and names the in-progress ticket whose allowlist
would need to cover it. You extend an allowlist on the board. The tiers
decide which tools exist; the allowlists decide which paths the
implementation tools may touch.

**The active ticket stays a board focus.** It defaults to the one you last
moved to `in-progress`. It picks which ticket the detail panel shows,
where new evidence lands by default, and which ticket's check the agent
runs. The mask itself does not depend on it.

**Subagents can be confined to directories or files.** A path guard
registered through the child's `agent.ctx` enforces a dir or file
allowlist on `read`/`write`/`edit` for that child only. It is the same
path predicate the tiers use, parameterized per scope. A refusal names the
allowed root. `toolFilter` removes whole tools, and the shared sandbox
confines bash to the workspace root. The in-process child derives its cwd
from the parent session, so the sandbox root is the same workspace; the
deployment `cwd` override exists only for the out-of-process provider.

#### Projection units

Registered under `ctx.sessionProjections` with `stateVersion`, `init/apply/
view` and a zod schema each, exactly like the `goal` projection.

| Key | View |
|---|---|
| `aidos.tickets` | Map ticket id to snapshot plus derived `confidenceScore` (weights summed per kind per author once) and `gateFraction` (forward transition only; `done` shows none). Both are sortable columns. The board sorts without loading history. |
| `aidos.evidence` | Rows per ticket, grouped by the criterion text they address (criterion coverage, built in B3) |
| `aidos.plan` | Context, rules, and frontmatter as one whole value |
| `aidos.comments` | Comment list per ticket |

Client carriers already push `session/projection` frames, so the board
observes live changes. The projection cache plus `restore()` give cold reads
for other sessions. That is the multi-project global board's read path.

#### Model-facing tools

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
it into the browser roster. It is written in React against
`@deepseek-ai/dsh-client-ui-primitives` and
`@deepseek-ai/dsh-client-ui-slots`. Both are absent from the installed tree
(inlined into the shipped bundles, referenced by `.d.ts` only) and exist on
npm at `0.0.1-rc.1`; the board build depends on them explicitly (verified:
`dsh-client-runtime/lib/types/client/slots.d.ts:14-15`). The dsh frontend
build emits its bundle in the client module format
(`window.__ModuleLoader__.load({ id, factory })`). It mounts through the
slot system (`ctx.slots.inject(...)`). The goal bar in the input dock and
the plan seat are the precedents. The board package adds
`@deepseek-ai/dsh-client-ui-primitives` and
`@deepseek-ai/dsh-client-ui-slots` at `0.0.1-rc.1` as direct dependencies
(decided; both are absent from the installed tree, inlined into the
shipped bundles, referenced by `.d.ts` only — verified:
`dsh-client-runtime/lib/types/client/slots.d.ts:14-15`). The board does
the following:

- It registers a **Tickets view tab** beside Chat and Trajectory through the
  `conversation.view` list slot: `ctx.slots.inject("conversation.view", ...)`
  with id `tickets` and order 20, the trajectory precedent (verified:
  `dsh-client-ui-trajectory/lib/client.js:7341-7371`, slot declared at
  `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:107-111`).
  The tab shows the current workspace's board.
- It registers a **global Tickets entry** in the sidebar footer near
  settings, through the `sidebar.footer.action` slot. The New Session
  button is hardcoded shell chrome (`dsh-client-ui-sidebar/lib/
  client.js:204-217`), so the footer actions are the additive seat. The
  entry opens the cross-workspace board. Both ship in v1.
- The Tickets tab reads the live `aidos.tickets` projection of the open
  session (`useProjection`). The cross-workspace board reads every other
  session through one new aidos Remote, `aidos.coldTickets(sessionId,
  opts)`, that runs host-side: it resolves the session and cold-reads its
  `aidos.tickets` projection via `ctx.sessionProjectionCache.coldSnapshot`.
  The client itself reads projections only for open sessions
  (`dsh-client-runtime/lib/types/client/contract/sessions.d.ts:126`), and
  `coldSnapshot` is host-only (`dsh-session-projection-cache/lib/
  index.js:159-197`). The board fetches per session, lazily on focus, and
  caches the page.
- It reads the `aidos.tickets`, `aidos.evidence`, and `aidos.plan`
  projection values (`useProjection(...)` or
  `sessions.binding(id).session.projections.faceOf(key)`, the same read path
  the goal bar uses).
- It renders the ticket grid. The shape is settled (2026-08-21), carried over from the
  prototype board design that was never run: **square ticket tiles** in a **large grid**, not a
  dense table. Each tile shows the title, the state, the confidence score prominently labeled
  advisory, and the gate fraction muted below it. **Attached evidence renders as tags on the
  tile**, one per kind, so coverage is legible without opening the ticket. The grid carries a
  project filter and sorts by score or by gate fraction. The detail panel opens at the side,
  not as a modal, and shows evidence grouped by criterion with uncovered criteria highlighted.
- It acts through the Remote endpoints (`ctx.remote.aidos.<method>(
  sessionId, ...)`, the generated client for the service's typert bindings):
  create and edit fields, attach evidence as `user` (including screenshots
  via `ctx.attachments`), move states, sign off (`builtin:user_signoff`),
  send back with comments, mark done.
- It surfaces gate refusals verbatim (`str(GateRefused)` equivalent).
- It re-reads on focus (the prototype's "no timer" rule). The projection
  cache and change frames make this trivial.

The agent-built throwaway dashboards (a node-tree renderer) are **dropped from
v1** (2026-08-21). Later work looks at nostr-canvas. The prototype
never built a board; the web board (B3) is the first one. The aidos board
client plugin is unaffected: it is a real product surface, not a throwaway
dashboard.

#### The plan skill and import (Tickets P11, C4)

- Ship a `plan` skill (a `SKILL.md` bundle in the aidos preset, following the
  plan-skill structure: Vision, Checklist, Critical context, User preferences
  and special rules, Human review queue, optional Benchmarking). The skill
  guides the writer. The `plan` tool is the machine surface.
- `plan` serializes tickets, context, and rules to that markdown shape. The
  round trip is byte for byte (Ticket P11's evaluate).
- `plan_import` parses markdown (frontmatter plus headings) and lands every
  ticket in `open`. It records the document's claimed state as
  `builtin:imported_state` evidence. The prototype's fix that shut the last
  path that could reach `done` without a human is ported verbatim.
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
gets a durable scratch directory. The workspace key is the SAME canonical
cwd key dsh uses to name its session directories (`dsh-session-jsonl`
workspace dirs), so `--home-sid-repos-aidos--` for a repo at
`/home/sid/repos/aidos`:

```
$DSH_HOME/aidos/scratch/<workspace-key>/
```

- It is a plain directory on disk under the harness home. It survives
  reboots. It is not the spill seam, whose default root is process-tmp.
- It is ALWAYS accessible: the path is deterministic (constant, computed
  from the canonical cwd, no per-session randomness), so any agent can reach
  it without asking. The session context surfaces the scratch path to the
  agent; the `plan` context section can name it. Evidence rows can reference
  files in it by path (never by embedding file contents in the log).
- The agent writes here FREELY (decided 2026-08-21): no ticket allowlist, no
  approval, and no read-before-write gate. A scratch file is not a project file.
- Clearing a workspace's scratch removes the directory and optionally writes
  an evidence row. The workspace registry's durable records stay untouched.
- The ticket board is the other home. Notes, decisions, and plans that have
  structure belong in tickets and evidence. Scratch holds the loose
  artifacts: working notes, fetched context, throwaway files.

**How the port uses it.** The former DSH.md design doc was consumed by this
file and deleted. PLAN.md is the sanctioned exception to the rule: it is the
bootstrap ticket source, and B4 deletes it when the board imports it.
The dotfiles-ai repo keeps only the user's own tracked content. Once the
port is verified, the opencode items that moved out are deleted from the
repo. That cleanup is tracked in the dotfiles-ai plan.

**Archived sessions have no UI view or delete.** The web UI can archive a
session row (it disappears from every list surface), but there is no
unarchive or viewing surface and no delete action (dsh-client-ui-workspace
known limitations). View an archived session by decompressing its log:
`zstdcat "$DSH_HOME/sessions/<workspace-dir>/<session-id>/session.jsonl.zstd"`.
Delete one by removing its directory. Session logs are zstd-compressed
JSONL; each session is one directory under the workspace's sessions dir.

### Packaging and delivery

The implementation ships as a dsh bundle addition. No fork is needed. The
personal bundle is a separate package, tracked in the dotfiles-ai plan.

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

**Two cutover gotchas (2026-08-20), independent causes:**

1. **The preset did not mount until the bundle was installed.** The aidos tools mount against a host-plane `aidos-core` that comes only from the aidos BUNDLE patch. Adding the preset alone leaves it `waiting for aidos` (`dsh plugin --profile web add <aidos-path>`). `dotfiles-ai/dsh/sync.sh` step 8b does the bundle-add so a fresh sync converges.
2. **An unquoted colon-space broke preset.yml.** The description `agent: plan` read as nested YAML (`ScannerError`). Quote any description holding a colon. dsh still discovered the preset by directory name, so the tools and tier masks worked with zero display metadata.

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

**The container test harness.** B1 was verified in a podman container (scratch
dir `~/.dsh/aidos/scratch/--home-sid-repos-aidos--/podman-b1-test/`): node:24
plus the dsh CLI, `dsh web` on 127.0.0.1:3090, the aidos package mounted at
`/opt/aidos` and added to the web profile as a bundle. B2 retests the human walk
in the same container. Three gotchas, all paid in real time: SELinux needs `:Z`
on the bind mounts, because container_t cannot write user_home_t; preset
discovery skips symlinks, so the preset must be a real directory whose
`agent.cordis.yml` mounts a loader that re-exports the mounted bundle; and the
shipped web composition mounts no invariants service, so the aidos bundle patch
mounts `dsh-invariants` itself.

1. **B2, human surface.** Scope settled 2026-08-21 by grilling; every claim
   below was read out of the code or probed against a live host.
   **Method shape.** One implementation per operation, with the actor pinned
   at each entry point. Internal `_attachEvidence(agent, args, actor)` and
   `_moveTicket(agent, args, actor)` hold the logic. Four thin public
   wrappers call them: `agentAttachEvidence`, `userAttachEvidence`,
   `agentMoveTicket`, `userMoveTicket`. The `user` pair carries the `@Remote`
   decorators. No caller chooses the actor, so no tool path can reach a
   `user` stamp. The kernel needs no change for this: the gate engine and
   `_attachEvidenceInternal` already take an actor, and `planImport` already
   passes `system` through the same seam.
   **The Remote surface.** `userAttachEvidence` and `userMoveTicket` (the two
   the gates make human-only: `awaiting_verification -> done` needs
   `builtin:user_verified`, and the send-back edge needs no evidence but is
   `["user"]`), a comment writer, and `userSetTicket` for field and allowlist
   edits. The comment writer is net-new on the service: the kernel has
   `Store.addComment` (`store.ts:619`), the fold and the `aidos.comments`
   projection both handle the event, and `AidosService` has no path to it.
   `moveProject` was in scope and was dropped again on the same day (see C1).
   The allowlist half of `userSetTicket` is Ticket A7 and blocks on it.
   **One structural change.** `AidosService` extends plain `Service`
   (`aidos-core.ts:439`). It must extend `TypertRemoteService` and bind its
   namespace, following `GoalService`.
   **Verification is container HTTP, not hand review.** You review at B3. The
   RPC recipe is pinned by probes against the live host: `POST
   /api/<namespace>/<method>` with body `{"type":"client-request","rpcId":…,
   "method":"<namespace>/<method>","payload":{"args":{…}}}`. `payload` must
   carry exactly one plain-object `args` field. The agent scope rides as a
   session id (`dsh-agent` declares `TypertContext<SessionId>`), and the host
   resolves it to the live agent, so no author field crosses the wire. The
   gateway enforces that boundary, not our code.
   **Three gotchas for the harness.** The scope resolves to a LIVE agent, so
   a test must open a session first. Session creation is not on the typert
   bus — only seven services are — so that half uses the older dot-separated
   apiproxy grammar (`session.create`) rather than the slash-separated typert
   grammar. The Dockerfile skew is CLOSED (2026-08-21). The image installs
   `dsh@0.1.0-rc.8`, the stale store was dropped, and the container answers
   `HTTP 200` on 127.0.0.1:3090. Verified from inside the image, not from the
   CLI string: `dsh --version`, `dsh-api-gateway`, `dsh-typert-protocol`,
   `dsh-api-remotes`, and `dsh-typert-registry` all report `0.1.0-rc.8`. Check
   the image next time, not the CLI version. The rc.7 CLI on the host already
   carried rc.8 gateway internals, so the version string proves nothing.
   **The rc.8 re-check (2026-08-21).** Eight of ten design claims hold
   unchanged, including the RPC envelope above, the session-id scope, and the
   seven-service typert bus. Two moved. "Descriptors generate the client
   bindings, so the wire cannot drift" holds only for the strict path: SRC mode
   gives a host endpoint no client codec and no type projection, so an endpoint
   can exist with no generated binding. And `toolFilter` on a delegation start
   request needs the provider to declare the capability, and the out-of-process
   driver declares `false`.
   **The dependency B2 needs is installed.** `@deepseek-ai/dsh-typert-protocol`
   is now an exact-pinned `0.1.0-rc.8` devDependency of `packages/aidos`, and
   `TypertRemoteService` and `Remote` are real value exports there.
   `dsh-api-gateway` is NOT needed: `dsh-goal`, the pattern B2 copies, declares
   only the protocol package, and the only value import of the gateway is the
   client assembly.
   Port the lifecycle tests that need two actors (test_08, test_09, test_22,
   test_27) against the Remote layer, not only the service.
2. **B3, board client plugin.** The Tickets tab, the global Tickets entry,
   the grid, detail, evidence, signoff, send-back, the active-ticket focus
   control, and the per-ticket allowlist editor. Criterion coverage
   lands here. Port the projection and view tests
   (test_26, test_31, test_32) against the client read model. U5's "every
   behavior has an equivalent test" checklist is the definition of done.
   **Evaluate:** a dropped connection reconnects and the view is correct
   afterward with no refresh.
3. **B4, plan skill plus import dogfood.** Import this file into the board.
   Then delete this file in a commit that records why. Keep the
   benchmarking table alive.
4. **B5, subagent and job glue plus shell posture checks.** A6 provenance
   attachment. The shell bypass suite (Ticket A4) against the shipped shell
   posture.

The workstation port (the W-series) moved to `~/repos/dotfiles-ai/PLAN.md` on
2026-08-21. The board (B3) is the milestone that ships the first board.

### Settled rules

- **A guard refuses by THROWING, and `{ prepend: true }` is load-bearing.** The
  observation policy holds the single decision slot on the `fs/write-intent` and
  `fs/edit-intent` waterfalls and returns an intent without calling `next()`,
  which vetoes the rest of the chain, so a guard registered without `prepend` is
  dead code. Order between two prepended guards does not matter, because both
  refuse by throwing and only the refusal text changes.
- **The bash ask is scoped to `awaiting_verification` ALONE** (decided
  2026-08-21). A concurrent in-progress ticket suppresses it, because a bash call
  carries no ticket id, so the harness cannot bill the ask to the right ticket.
  NOT YET IMPLEMENTED: `bash-ask.ts` still tests
  `states.has("awaiting_verification")`. One condition plus its test, under A4.
- **Re-running a suite is not verification.** The suite is the agent's own
  artifact, so a second green run adds no independent signal. Reading the code,
  breaking it on purpose, and the container walk are the checks that pay.
- **The Python prototype is dissolved** (2026-08-21). It pinned the kernel behavior before the
  real kernel existed, and `packages/aidos` now carries 217 tests against the prototype's 135.
  Its two live decisions moved to Phase 2 as P8 and P11. The build log for the CLI and the SQL
  views is in `git log` and in `prototype/`.

### Risks

- **Broad allow patterns reopen the shell bypass** is unchanged. The
  ask-by-default posture is shipped. Write the bypass suite first.
- **The board client plugin depends on the client-plugin surface.** The
  consumption path is verified (the `dsh.client` manifest, the `./client`
  bundle, the roster row). `dsh-client-ui-primitives` and
  `dsh-client-ui-slots` are absent from the installed tree (inlined into
  the shipped bundles; npm `0.0.1-rc.1`). Decided: the board package adds
  both at `0.0.1-rc.1` as direct dependencies. Budget the monorepo setup
  in B3.
- **The Tickets tab seat is verified.** The board registers through the
  `conversation.view` list slot (`ctx.slots.inject("conversation.view", ...)`,
  id `tickets`, order 20), the trajectory precedent. **The global Tickets
  entry seat is settled:** the New Session button is hardcoded shell chrome
  (`dsh-client-ui-sidebar/lib/client.js:204-217`), so the entry mounts in
  `sidebar.footer.action`, near settings.
- **The cross-workspace board needs a new cold-read Remote.** The client
  reads projections only for open sessions; `coldSnapshot` is host-only
  (`dsh-session-projection-cache`). Decided: one aidos Remote,
  `aidos.coldTickets(sessionId, opts)`, runs the cold read on the host.
  The "re-read on focus" rule has a latency budget for cold sessions. Fine
  for v1; keep the read path lazy.
- **dsh-plan-mode is preset-plane.** The web surface ships
  `- id: plan-mode, disabled: true` (`dsh-web-app/cordis.patch.yml`), so
  the plan projection and the "Chat about it" review flow exist only when a
  preset mounts `dsh-plan-mode`. The aidos preset must mount it, or its own
  plan-review flow, for B2's review flows.
- **Settings versus log for gates** is settled (settings namespace). If the
  audit pin later reads stricter, promote kind and gate changes to log-only
  events. Decide before B0 ships if that changes. It touches the fold.
- **The markdown renderer lives in the prebuilt shell.** No slot in the
  conversation contract touches markdown or links, so `aidos://` deeplinking was
  dropped on 2026-08-21. The board reaches its rows through its own tab instead.
- **Multiple in-progress tickets union their allowlists** at the write
  boundary. A refusal names the ticket whose allowlist must grow. The
  union semantics and the refusal text need review.
- **Subagents inherit the mask.** A child spawned in open has no
  implementation tools. One spawned in-progress has them, scoped by the
  child's own path guard. Decided 2026-08-21: bash workdirs ARE confined in
  v1, clamped to the child's path scope (Ticket A5).

---

## Checklist

The tickets below are the contract. Phase and order are first-class ticket fields. The Python
prototype was dissolved on 2026-08-21: it had pinned the behavior it existed to pin, and the dsh
package is now larger and better tested than its specification.

### Phase 2: aidos core — `in_progress`

**Goal.** The ticket kernel, on dsh. No board yet.

- [ ] **Ticket C1: Workspace and data directory.** On dsh: `ctx.workspaceRegistry` plus the
  session `cwd`. Config lives in the profile and the settings. `move` repoints the workspace
  path and the session `cwd` through a Remote endpoint, not a filesystem move. Config-from-git
  stays optional glue. The personal bundle ships a sync script instead.
  **Status (B1): the bind is built, the move is not.** `AidosService._workspaceOf`
  reads `ctx.workspaceRegistry` and falls back to `session.header.cwd`, and
  `_ensureProject` runs on `agent/session-start` and for every agent already live
  when the service mounts. Config is the `aidos` settings namespace. The sync script
  ships and converges on a second run. The `move` half is missing: `Store.moveProject`
  exists in the kernel, but no endpoint calls it, so a project cannot be repointed
  from outside a test. **Deferred past B2, decided 2026-08-21.** A read found that
  the endpoint cannot be a one-line wrapper: `_ensureProject` resolves a session's
  project by matching `project.absPath` against the dsh workspace path
  (`aidos-core.ts:850-869`), and `project/moved` rewrites that path in the aidos log
  only. So after an aidos-side move the next session matches nothing and creates a
  SECOND project, orphaning every ticket on the first. A correct move either writes
  the dsh workspace registry too (a registry aidos only reads today) or stops binding
  by path. Both are larger than B2's lifecycle scope.
  **Evaluate:** a first run attaches the session to its workspace path. `move` repoints a
  project and a later session opens in the new path. The sync script copies dotfiles-ai to
  `$DSH_HOME`. A second run updates rather than duplicating.

- [ ] **Ticket C5: Globally distinct ticket ids.** A ticket id becomes unique across every
  workspace, so one id can never mean two tickets. The raw form is the dsh canonical workspace
  key, a colon, and an id unique inside that workspace:
  `--home-sid-repos-aidos--:distinct-ticket-ids`. The display form shortens the key to its last
  path segment: `aidos:distinct-ticket-ids`. Every ticket also carries a per-workspace number
  that only climbs and is never reassigned, so `aidos:#341` names the same ticket for good.
  **What exists today.** `TicketId` is a plain `number` (`types.ts:25`), and it is the map key
  for `state.tickets`, the reference in every evidence row, and part of the invariant key list.
  Two allocators compute it as `max + 1` over the live folded state (`store.ts:436`,
  `aidos-core.ts:1097`). No slug field exists anywhere. The event vocabulary carries no ticket
  delete and no project delete, so the counter climbs by accident rather than by design. A
  delete event added later would hand a number back and break every reference already written.
  **Shape to build.** Keep the numeric `TicketId` as the internal key and let it be the
  per-workspace number, so the existing log stays valid and no evidence row is rewritten. Add
  two durable fields to the ticket record, both stamped at creation: the slug and the workspace
  key. Hold the next number as a folded state field that `ticket/created` advances, not as a
  maximum recomputed from live keys, so no later delete can reissue it.
  **Settled 2026-08-21 by grilling.**
  - **The number is the source of truth.** Every stored reference holds the numeric id and
    nothing else: evidence rows, comments, the projection, the log. The slug is an alias layer
    resolved at read time, so a rename propagates everywhere for free and no written reference
    can rot.
  - **The agent names the slug at creation** and the tool refuses a duplicate inside the
    workspace. The user may rename it later, and a rename is cheap because nothing stored points
    at the slug.
  - **Either form resolves.** A tool argument takes the slug or the number.
  - **A bare `#341` or a bare slug always means the current workspace.** There is no global
    fallback, so a bare id can never reach another workspace by accident. A cross-workspace
    reference must carry the prefix.
  - **Cross-workspace is read-only.** Any agent or subagent may read any ticket whose id it
    knows. Every write happens in a session opened on that ticket's own workspace, so one
    session's guards never govern another workspace's records. Open sub-question for the write
    path: whether the agent may ask the user for a one-off cross-workspace write, and what
    record that grant leaves.
  - **Display is short and the badge carries the difference.** `aidos:#341` renders as a pill
    whose color is a hash of the FULL workspace key, with the full path on hover. Two workspaces
    ending in the same segment read alike but never look alike.
  **Evaluate:** creating a ticket with a slug the workspace already holds is refused. A rename
  leaves every existing reference resolving to the same ticket. A bare `#341` in a session on
  workspace A never resolves to a ticket in workspace B. A write against a foreign id is refused
  and names the workspace to open. Two workspaces whose paths end in the same segment render
  distinct badge colors.
- [ ] **Ticket C4: Plan import and serialization.** On dsh: the `plan` and `plan_import` tools
  plus the `plan` skill. Markdown with YAML frontmatter in. Markdown out on demand. The context
  cap applies at the write boundary. This file's design sections are the first real import; the
  importer must handle a context longer than 500 lines (raise the cap for the bootstrap import
  or fold the design into context and rules).
  **Status (B1): the machine half only.** `src/plan/plan-io.ts` exports `importPlan`
  and `exportPlan`, both tools are registered, `PLAN_CONTEXT_LIMIT` is 500, and the
  over-cap error names the overage. test-26 pins the round trip. Two parts stay open.
  There is no `SKILL.md` anywhere in the package, so the preset ships no skill
  directory and the writer gets no guidance. The bootstrap import of this file is B4,
  and this file is far past 500 lines, so the cap decision is still unmade.
  **Evaluate:** import, serialize, and re-import produces an identical plan. A context section
  over 500 lines is refused with a clear message naming the overage.

- [ ] **Ticket P8: A review is its own evidence kind.** Register `builtin:review_pass`, labelled
  "Review pass", described as "A reviewer read the change and reported findings", weight 1.0. Add
  it to the gate from `in_progress` to `awaiting_verification`, beside `builtin:automated_check`.
  A passing suite says nothing about dead code, a duplicated helper, or scope that grew. A review
  says nothing about whether the thing runs. Those are two claims, so they are two kinds.
  `builtin:review_note` stays at weight 0.5 for a single remark. Under Ticket A5 the orchestrator
  attaches the row and the subagent report is the payload.
  A limit worth recording rather than hiding: the agent writes this row itself, so the gate cannot
  tell a real review from an empty claim. What it buys is that a missing review becomes a refusal
  naming a missing kind, instead of an absence nobody notices.
  The ticket keeps its P-series id on purpose. An id is a stable reference, and C5 exists to make
  that rule permanent.
  **Evaluate:** a ticket with a passing check and no review is refused, and the refusal names
  `builtin:review_pass`. The same ticket moves once the review row exists. The number of gates a
  human must satisfy is unchanged.

- [ ] **Ticket P11: The plan format follows the plan-skill structure.** aidos adopts the section
  shape the `plan` skill defines: Vision, Checklist, Critical context, User preferences and
  special rules, Human review queue, and an optional Benchmarking section. This changes the tool,
  not the ticket format.
  **The open decision.** `plan.ts` special-cases `## Phase N` headings and gives each phase a
  number, a title, and a state. The skill has one flat checklist and no phases. Decide whether
  aidos keeps phases as a first-class field, or treats them as ordinary sections and lets ticket
  order carry the sequence. Settle this before B4 imports this file, because the import lands in
  whichever shape wins.
  **Evaluate:** a document in the new shape round trips byte for byte. A document with no phase
  heading parses without error. The round-trip tests cover the new shape, not only the old one.

### Phase 3: HTTP and agent loop — `in_progress`

**Goal.** aidos talks to a model and to a browser. dsh provides the transport and the loop. The
work is the tools and the gate enforcement.

- [ ] **Ticket A4: Shell tool.** dsh's `tool-bash` plus the sandbox and the approval seam. The
  shipped permission presets bundle the knobs: `workspace-write` is the workspace-write sandbox
  plus ask approval; `danger-full-access` is full access plus never. The bypass suite is a
  verification artifact of the aidos preset's configuration: each listed bypass attempt must ask
  or refuse. The personal bundle extends the deny list to raw git and to
  manifest and lockfile edits, with the same bypass discipline.
  **Status (B1): the ask is built, the suite is not.** `src/tools/bash-ask.ts` is a
  prepended `tools/pre-execute` listener that returns `ask` for the bash tool, and
  approval outcomes are one-shot, so every call asks again. The personal-bundle deny
  list ships already (the bash-guard and the manifest guard). Two things stay open.
  The bash-ask scope change landed (2026-08-21+): the listener asks only when
  `awaiting_verification` is the ONLY state present, so a concurrent in-progress
  ticket suppresses the ask. `b1-bash-ask` covers it. The bypass suite is
  unwritten, and it carries the real risk of this ticket. It is B5.
  **Evaluate:** an unmatched command asks and does not run. `git push` is refused while its gate
  is unmet, and is not reachable through `git -C`, `sh -c`, an alias, or a script. A test suite
  of bypass attempts is written first and each one fails to bypass.

- [ ] **Ticket A5: Subagent definitions.** On dsh: agent presets plus the subagent tool rows with
  `toolFilter`. Board tools refuse `delegationDepthOf > 0`, so only the orchestrator touches the
  board. A subagent NEVER edits the board. It returns a report, and only the
  orchestrator turns that report into a board change. Identity stays flat:
  every subagent writes as the single author `agent`, and its name is metadata
  on a record rather than an actor of its own.
  **Status (B1): the structural half is done.** `installAidosGuard` refuses every board
  tool when `delegationDepthOf(agent) !== 0`, and the refusal names the orchestrator as
  the only actor that may do it. `childPathScope` is the per-child path predicate.
  Presets load as definitions with no code change, which is dsh behavior rather than
  ours. Open: the aidos preset mounts one row and sets no `toolFilter`, so the belt
  exists and the braces do not. The "no author other than agent, user, and system
  after a multi-subagent session" check needs a real session to run against.
  **The bash hole closes in v1** (decided 2026-08-21). `childPathScope` confines a child's
  read/write/edit and nothing else. The sandbox does confine bash, but only to the whole
  workspace root plus temp, and that policy resolves per SESSION, so a child inherits the
  parent's root unchanged: a child scoped to `src/` cannot `edit` a file in `docs/` but can
  reach it through `sed -i`. aidos clamps the child's bash workdir to its path scope.
  `dsh-tool-bash`'s `resolveWorkdir` (`lib/index.js:177`) only makes a relative workdir
  session-relative and hands an absolute one straight through, so the clamp is ours to write.
  State the limit in the code: it stops the WORKDIR, not an absolute path inside the command
  string, so it narrows the hole rather than closing it.
  **Evaluate:** a new definition file becomes a callable subagent with no code change. A
  malformed definition fails to load with a message naming the file and the problem, and does
  not stop the other definitions loading. A subagent that calls any board tool is refused, and
  the refusal says the orchestrator is the only actor that may do it. After a session that ran
  several subagents, the log holds no author other than `agent`, `user`, and `system`. A child
  scoped to `src/` cannot run a bash command whose workdir falls outside `src/`, and the refusal
  names the scope.

- [ ] **Ticket A6: Subagents run detached.** On dsh: `ctx.jobs` plus the `job_output`/`job_list`/
  `job_kill` tools. Jobs outlive the parent turn and are listed per session. The orchestrator
  attaches a finished report as `builtin:subagent_report` evidence with the job identifier, the
  subagent name, and the start and end times.
  **Status: not started.** dsh's half works today, and the mask's delegation tier
  already names the job tools. The aidos half does not exist. Nothing in `src/` reads
  `ctx.jobs`, and `subagent_report` appears only as a kind string inside the tool
  descriptions. No code attaches a finished report as evidence. That glue is B5.
  **Evaluate:** the parent agent spawns a job and takes its next action in the same turn, before
  that job finishes. A status check names the job, its state, and how long it has run. A report
  fetch against a running job is refused with text that tells the parent to check the status
  again, and it does not block. A subagent that crashes or times out reports a terminal state
  with a reason, so no parent can poll forever. Killing a job stops its process and leaves no
  orphan. Two jobs run at once and neither report is attributed to the wrong job. A report
  attached as evidence carries `agent` as its author and the subagent name as metadata, survives
  a restart, and a query by subagent name and date returns it with its job identifier intact.

- [ ] **Ticket A7: The allowlist proposal and its approval.** The agent proposes file paths.
  You approve, change, or reject them. Only an approved proposal grants write access.
  Decided 2026-08-21 during the B2 grilling, after a read found the write boundary
  unreachable.
  **Why it exists.** `TicketSnapshot.allowlist` is a validated durable field
  (`types.ts:40`, and the invariant key list) with NO writer. `SetTicketArgs` carries no
  allowlist field, `_createTicketInternal` hardcodes `[]` at line 966, and `_editTicket`
  only spreads the previous value. So `allowlistUnion` is always empty, `pathAllowed(path,
  [])` returns false, and every write refuses the moment a ticket enters in-progress. The
  mask shows `write` and `edit` in the in-progress tier and the guard then blocks both
  unconditionally. B1's container walk stopped at signoff, so it never reached this.
  **The flow.** The agent asks through `ask_user_question` with the paths it wants. You
  change them until you are satisfied. The agreed list lands as a `builtin:file_allowlist`
  evidence row. That kind is already registered (weight 1.0, "The files the change may
  touch.") and nothing reads it today. Once the approved row exists, `agentSetTicket` may
  write `ticket.allowlist`, and the write boundary refuses any path the approved row does
  not carry. The approval is a record, not a chat message, so a later reader can see what
  the agent asked for and what you changed.
  **Open decision — SETTLED 2026-08-21.** `builtin:file_allowlist` narrows to
  `allowedAuthors: ["user"]`, and there is NO proposal record. The agent asks
  through `ask_user_question`, which the session log already records, so only
  your approval lands as evidence. No second kind and no payload flag. Accept
  the consequence: the board shows the approved list, not what the agent first
  asked for.
  **A3's guard shape moves here too.** `src/tools/allowlist.ts` matches the tool
  names `write` and `edit` and reads a `file_path` argument, the builtin fs
  shape, so hashline (`path`), `batch_edit`, and `undo_last_edit` bypass it. The
  guard moves onto the `fs/write-intent` and `fs/edit-intent` waterfalls, which
  catch every writer. It ships WITH this ticket, not before: an enforced guard
  over an always-empty union would block every write until the approval flow can
  populate one.
  **Evaluate:** a ticket with no approved row refuses every write, and the refusal names
  the missing approval rather than an empty union. An `agentSetTicket` call naming a path
  that no approved row carries is refused. A reworded approval appends a new row and leaves
  the old one visible. The approval survives replay.

### Phase 4: Web UI — `pending`

**Goal.** The board you actually use, replacing the Phase 1 prototype.

- [ ] **Ticket U2: Board.** The aidos board client plugin: the Tickets tab next to Chat and
  Trajectory, the global Tickets entry near New Session, the ticket grid, detail, field
  editing, comments, and state moves. Evidence groups by the criterion it addresses, and
  uncovered criteria are highlighted (criterion coverage, folded here). Gate refusals
  surface as readable text naming the missing kind.
  **Status: not started.** `packages/` holds exactly one package, `aidos`. No board
  client plugin exists, so every criterion below is unreachable today.
  **Evaluate:** you run a full ticket lifecycle in the browser without touching the prototype.
  Every refusal is legible without reading logs. A ticket with three criteria and evidence
  naming two shows the third as uncovered. Evidence naming no criterion still attaches and
  still counts toward its gate. A criterion reworded after evidence was attached leaves that
  evidence visible as uncovered rather than dropping it silently.

- [ ] **Ticket U3: Evidence and screenshots.** `ctx.attachments` stores content-addressed
  images, hash-deduped. Evidence rows reference the attachment refs. Show the confidence score
  and label it advisory.
  **Status: not started.** Nothing in `src/` reads `ctx.attachments`. The score and
  the gate fraction are computed already (`src/kernel/projections.ts`), so this ticket
  is the attachment path plus the rendering, not the arithmetic.
  **Evaluate:** a pasted screenshot attaches and survives a restart. The score is visibly marked
  as advisory and no control anywhere is enabled or disabled by it.

- [ ] **Ticket U5: Delete the prototype.** Remove `prototype/` from the repository. It was a
  behavior specification with a scheduled death.
  **The bar is already met** (verified 2026-08-21). Every one of the 32 prototype tests has a TS
  counterpart in `packages/aidos/tests/`, checked name by name, plus 8 extra `-tool-` variants
  the prototype never had. The TS suite is 5,364 test lines against the prototype's 5,090 lines
  across 39 files. The tkinter board was never run once, so it pins no behavior worth keeping.
  **What survives the deletion.** The board's UI decisions, recorded in this plan's "The board"
  section: square tiles, a large grid, evidence as tags, the advisory confidence score, and the
  sort keys. Those are design, not code.
  **Cull one TS test with it.** `test-25-every-subcommand-prints-json.test.ts` is 21 lines with
  no assertion, holding a comment that says the claim belongs to the tool test. The real one is
  `test-25-tool-every-result-is-json.test.ts`. Every other TS test exercises the kernel or a
  tool, including the two carrying `cli` in the name, which import `makeStore` and test kernel
  behavior under a prototype-era filename. Rename those two rather than delete them.
  **Evaluate:** `prototype/` is gone, the suite still passes, and no TS file imports anything
  from it. The commit names the port map that replaced it.

### Phase 5: Tools, scripting, and skills — `pending`

**Goal.** The extension surface.

- [ ] **Ticket T4: Skills.** On dsh: `ctx.skills` plus the filesystem provider plus the `skill`
  tool. The preset tool groups are the always-on core; a skill activates a further group.
  **Status: the dsh half is built, the aidos half is not.** `ctx.skills`, the filesystem
  provider, and the `skill` tool all ship with dsh. The aidos package contains no
  `SKILL.md`, so the preset ships no skill directory. This is the same gap C4 records
  for the plan skill. The token measurement has never been taken.
  **Evaluate:** the always-on core is measurably small in tokens, and the number is recorded. A
  task needing an inactive group triggers activation and then completes.

- [ ] **Ticket T5: Scratch workspaces and the scratch tool suite.** The scratch design in this
  plan's "Scratch, not the repo": `$DSH_HOME/aidos/scratch/<workspace-key>/`, durable on disk,
  surfaced to the agent, clearable. It ships four tools: `scratch_read`, `scratch_write`,
  `scratch_edit`, `scratch_mkdir`. A relative path resolves against the scratch root, so
  `scratch_write("foo.md", ...)` lands at `<scratch-root>/foo.md` whatever the session cwd is.
  The names carry a `scratch_` prefix, so they never collide with the builtin fs tools.
  **Status: not started in code.** Nothing in `src/` computes or reads a scratch path. The
  directory is in daily use by hand (the B1 container harness lives under
  `$DSH_HOME/aidos/scratch/--home-sid-repos-aidos--/`), which is what makes the design look done.
  **The agent writes here freely** (decided 2026-08-21). No allowlist, no approval, and no
  read-before-write observation gate. One consequence to build for: the allowlist guard in
  `src/tools/allowlist.ts` matches on path, so it must exempt the scratch root. Without the
  exemption the union check refuses every scratch write the moment a ticket enters in-progress.
  **`scratch_edit` is hash-anchored** (decided 2026-08-21). It takes the same 3-char anchors the
  personal bundle's hashline tools use, so one editing grammar covers every file the agent
  touches. `str_replace_editor` semantics are rejected.
  **It WRAPS hashline. It does not copy it** (decided 2026-08-21). The registry is the seam:
  `ctx.tools.get(name, scope)` returns the live `ToolDefinition`, and `ctx.tools.execute(input)`
  runs a nested dispatch through the whole pipeline. So `scratch_edit` resolves the path against
  the scratch root and then delegates to the already-registered `edit`. Nothing is
  reimplemented, and the hash grammar can never drift from the real one.
  **Why the delegation lands correctly, verified 2026-08-21.** hashline's `toCwd`
  (`paths.js:44`) reads `isAbsolute(expanded) ? expanded : resolvePath(cwd, expanded)`, so an
  ABSOLUTE path arrives unchanged and the caller's cwd is never consulted. `scratch_edit` passes
  the resolved absolute path and needs no cwd override at all.
  **The degradation case, and it is real.** hashline ships in the PERSONAL bundle, and it
  registers on the agent's own scope layer at `agent/session-start`. aidos is unopinionated, so
  a person who installs aidos alone has a builtin `edit` that takes `old_string`/`new_string`,
  not anchors. Decide the fallback: `scratch_edit` delegates to whatever `edit` the scope
  resolves and inherits its grammar, or it detects the hashline shape and refuses when absent.
  Delegating is honest, because one editing grammar per session is the point.
  Do NOT vendor the algorithm. `dsh-better-edit@0.2.1` (MIT) seals `lib/hashline/` behind an
  `exports` map allowing `.` and `./package.json` only, so a copy would drift from the real
  engine on every upstream release. `ToolExecutionInput` is `{ callId, rootCallId?, name,
  arguments, agent?, parent?, signal }`, so a nested dispatch carries the enclosing `rootCallId`
  and the caller's `signal`.
  **`mkdir` is not on the seam, verified 2026-08-21.** `ctx.fs` exposes `resolve`, `stat`,
  `readText`, `streamText`, `writeText`, `editText` and nothing else. The three `mkdir` calls in
  `dsh-fs-local` are a bare `node:fs/promises` import used for atomic-write staging, declared in
  no `.d.ts`. So `scratch_mkdir` either adds a seam method upstream or calls `node:fs` directly.
  The direct call skips the seam's containment, so the tool must clamp the path itself.
  **Evaluate:** `scratch_write("notes.md", ...)` writes `<scratch-root>/notes.md` from a session
  whose cwd is any directory. A path that escapes the root, by `../` or by an absolute path, is
  refused. A scratch write succeeds while a ticket is in-progress and the allowlist union is
  empty. `scratch_read` returns anchors that `scratch_edit` accepts, and a stale anchor is
  refused rather than fuzzy-matched. The directory survives a restart, and clearing removes it
  from disk.

- [ ] **Ticket T6: Archived-session manager.** A client plugin that lists, opens, restores,
  and deletes archived dsh sessions, plus the host-plane rows it needs. Upgraded from a
  cleanup script on 2026-08-21: the script was the fallback, the plugin is the thing.
  **Status: not started, and the seam is half missing.** Verified 2026-08-21 against the
  RPC map. `workspace.archiveSession` exists, is idempotent, and returns the full
  `archivedSessionIds` set. `workspace.list` carries that same set, so a client can already
  READ which sessions are archived. Nothing else is there. The map holds no unarchive
  method and no session delete at all — `workspace.delete` removes a whole workspace, not a
  session — so restore and delete cannot come from a client plugin alone. Upstream
  anticipates the gap: archiving keeps a session in its workspace accounting slot, and the
  contract says "a future unarchive restores its position". So this ticket is a client
  plugin PLUS a small host-plane row exposing unarchive and delete, until upstream ships
  them. Interim, with no plugin: read one with `zstdcat
  $DSH_HOME/sessions/<workspace-dir>/<session-id>/session.jsonl.zstd`, and delete one by
  removing its directory.
  **Evaluate:** the archived list shows each session with its workspace, title, date, and
  on-disk size. Opening one shows its history read-only and does not unarchive it. Restore
  puts it back in its original position. Delete removes the directory and the id from the
  archive set, and the list updates with no refresh. The live current session and every
  subagent session cannot be selected at all.

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
  `deepseek-v4-pro`. Subagents always run OpenCode Go `deepseek-v4-flash`. The dotfiles-ai
  plan owns the profile design.
- **Personal AI config.** Dismissing a question interrupts the agent loop. Rejecting a
  permission request can carry a comment the agent reads at that point in the loop. The
  model edits through hashline, touches git only through MCP, and changes dependencies
  only through the package tool. The dotfiles-ai plan tracks all of it.
- **Board scope.** The Tickets tab and the global Tickets entry both ship in v1.
- The AGENTS.md rules from dotfiles-ai port to `$DSH_HOME/AGENTS.md`.
- **Plan budget: about 1200 lines, excluding the human review queue** (decided
  2026-08-21). aidos is design-heavy, so its source line count understates it.
  Compaction trims tickets and stale context, not the settled design.

---

## Benchmarking

| Metric | Count / Value | Notes |
|---|---|---|
| Verification catch rate | 13 / 32 | independent checks that caught a real discrepancy, vs. total checks performed. The reopen check found two defects the 29 passing tests missed. Reading the implementation found two more. For P3, five checks found one defect, and the one that found it was reading the finished code. P7 units 1 to 3 added four catches from ten checks, and all four came from reading the diff or from breaking the code on purpose: a seq-versus-`at` test that could not discriminate, a `STATE_ORDER` constant that nothing read while the same ordering sat hardcoded three times in SQL, an untested `awaiting_verification` to `done` gate, and a legacy-default block duplicated across two methods. Re-running suites again caught nothing, in any ticket so far. Reading code and deliberately breaking it are the checks that pay. Unit 4b added two catches from four checks. One of them is the first dispatched review pass on this project, and it found a sort regression that the author missed and that a full read of the diff also missed. Reading the diff found three smaller faults of its own. The suite caught nothing again, and running the broken case by hand only confirmed what the review had already named. That is the case for Ticket P8 in one line: a review and a check are different claims, and here they disagreed. B0 added two catches from five checks, both from reading the code: the missing self-transition in `isLegalTransition` (the first kernel pass excluded it while the ported test_15 needed it; the kernel dispatch fixed it in the same round), and a PORT-MAP row that claimed the self-transition pin could not port while the ported test carried it. The suite caught nothing. B1 added two catches from four checks, both outside the suite: the container boot refused `aidos: pending (waiting for service: invariants)` (the shipped web composition mounts no invariants row, so the bundle patch must mount dsh-invariants itself), and the packaging review caught the preset-id problem (the preset directory must be named `aidos`, not `preset`, for the roster). The suite passed green and caught nothing. |
| Escaped defect rate | 0 / 4 | bugs found after a ticket was marked `done`, vs. tickets closed. Both P1 defects were caught before the ticket closed, not after. P3 is not closed yet, so it does not count here. B0 and B1 closed with no escaped defect. |
| Rework/reopen rate | 7 rounds / 6 tickets | P1 and P2 each needed an extra test-and-fix round because my first contract omitted deny-by-default and said nothing about durability. P3 needed one because my contract told import to preserve a `done` mark and also told the agent it could never reach `done`. Those two rules cannot both hold. A subagent found the conflict by writing tests against the contract, before any code existed. Grilling found none of the three. The fourth round is Ticket P7, which discards P1's in-memory projection entirely: my contract never asked how the board would read twenty tickets at a time, so it specified a structure that cannot paginate. Grilling the UI found it, one question in. The fifth round is Ticket P7 rescoping itself while being built: its contract asked for a comments view over an event type that does not exist, and it accepted up front that nothing would guard the rewrite. Both were found by reading the contract against the code before dispatching, not by grilling. The sixth round is B0: the contract review changed three rules after the dispatches started (self-transitions legal, legacy records strict, allowedAuthors widened), so the kernel pass and the test port each needed a convergence fix. Reading the 32 prototype tests against the contract before code found all three. The seventh round is B1: the invariants dependency surfaced only when the bundle ran in a real composition (the harness provided the service, so the suite stayed green); the container test caught it. |
| Rough cost | 4 dispatches for P1+P2, 8 for P3, 11 for P7, 2 for B0, 2 for B1 | of P3's 8, three produced nothing: two `coder` dispatches returned empty without writing a file, and one `general` implementation dispatch timed out. The five that worked were a probe, a test-writing round, a contract revision, the plan parser, and the CLI. Splitting the implementation in two after the timeout is what got it finished. P7 spent 7: two `researcher` maps of the store and its call sites, and five `coder` runs. One `coder` run returned empty again, the same failure as P3, and splitting that unit into implementation and tests fixed it. Two research dispatches up front were worth it: they kept 550 lines of store code out of the main session while still yielding the exact call-site counts the ticket needed. Unit 4b spent the other four: implementation, tests, a review pass, and one fix round. Splitting implementation from tests before dispatching avoided the empty return that hit both P3 and an earlier P7 unit. B0 spent two: the kernel and the test port, split before dispatch, both produced. B1 spent two: the host/tools implementation and the tool-test port, both produced. |
| Contract defects found before code | 5 | the import versus `done` conflict, and Ticket P7 asking for a comments view over an event type nothing writes. Writing tests against a contract, and reading a contract against the code it describes, are the only steps so far that have caught a contradiction rather than a bug. Both happened before any code was dispatched. B0 added three, all from reading the 32 prototype tests against the contract before implementation: self-transitions are legal (test_15 pins a configured gate on a self-pair), legacy records cannot replay in a whole-value fold (the pins become write-boundary pins), and the builtin `allowedAuthors` admit both actors for every kind but the human-only pair and `imported_state`. |

---

## Human review queue

- [ ] A4 bash-ask — with one ticket in-progress and another awaiting verification, a bash call must NOT ask; with only awaiting-verification, it asks. Exercise both on a live session.
- [ ] B3 (the board in daily use) — work real tickets through it for one session and say whether the gate refusals help or annoy. That judgment cannot be made from tests. Retargeted from the Python prototype on 2026-08-21, because U5 deletes it.
- [ ] Ticket P8 — drive a ticket that has a passing check and no review, and say whether the refusal reads clearly at the terminal and names the right kind.
- [ ] Ticket P7 duplicate creation records — `v_projects` and `v_tickets` carry no `GROUP BY`, unlike the other five views. Two `ticket.created` records sharing one id would return the ticket twice, and the old projection collapsed them by last-write-wins. The store never writes a duplicate, so this needs a hand-written log. Decide whether the views should defend anyway.
- [ ] B3 — the `aidos.coldTickets` Remote's latency on a cold session for the "re-read on focus" rule.
- [ ] B1 — container-confirmed (user test log): the six tools appear with the correct constraints, refusals are clean, and the open mask hides write/edit/bash. The remaining half — a signoff unlocking the in-progress tier — needs B2's human surface and is retested then.
- [ ] B3 — the subagent dir/file guard, hands-on: a child scoped to one directory cannot reach another through read/write/edit OR through bash. Decided 2026-08-21 to clamp the child's bash workdir in v1, tracked in Ticket A5. The shell seam confines nothing by itself: `ctx.shell.resolve` and `dsh-subprocess-local` pass `workdir` straight through. Judge whether the clamp blocks legitimate child work.
- [ ] Fresh session (aidos preset) — the six board tools (get_tickets/set_ticket/attach_evidence/move_ticket/plan/plan_import) and `tool:aidos` appear; exercise the state-gated tiers (open tier hides write/edit/bash; awaiting-verification asks on each bash call).
