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
  selection cover the profile story.

What is net-new is small. It is exactly the part of aidos that is aidos:

1. The **ticket/evidence/gate kernel** as a dsh session domain (a service,
   strict replay fold, invariant, projection units, Remote endpoints, and
   model-facing tools). It is a direct port of the Phase-1 prototype,
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
| MCP servers | nostrbook, gitlab, swiggy-food, swiggy-instamart, git | web_search and web_fetch are native dsh tools. The git row is the model's only git surface (W10). |
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

#### Projection units (Ticket P7's SQL views, ported)

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
- It renders the ticket grid: title, state, confidence score prominently
  labeled advisory, gate fraction muted below it, project filter, sort by
  score or fraction, detail panel (side, not modal). The panel shows
  evidence grouped by criterion and highlights uncovered criteria (Ticket
  P9's coverage read, folded into the board).
- It acts through the Remote endpoints (`ctx.remote.aidos.<method>(
  sessionId, ...)`, the generated client for the service's typert bindings):
  create and edit fields, attach evidence as `user` (including screenshots
  via `ctx.attachments`), move states, sign off (`builtin:user_signoff`),
  send back with comments, mark done.
- It surfaces gate refusals verbatim (`str(GateRefused)` equivalent).
- It re-reads on focus (the prototype's "no timer" rule). The projection
  cache and change frames make this trivial.

The agent-built throwaway dashboards (node-tree, Ticket U4) are **paused**.
Later work looks at nostr-canvas for the declarative node tree. The prototype
never built a board; the web board (B3) is the first one. The aidos board
client plugin is unaffected: it is a real product surface, not a throwaway
dashboard.

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
The dotfiles-ai repo keeps only the user's own tracked content. Once the
port is verified, the opencode items that moved out are deleted from the
repo (W12).

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
| Text editing | dsh-better-edit (hashline, npm, MIT): hash-anchored `read`/`edit`/`batch_edit`/`undo_last_edit` replacing the builtin fs `read`/`edit`. Writes go through `ctx.fs`, so the sandbox still confines. Guidance overrides per preset at `$DSH_HOME/plugins/dsh-better-edit/<preset>/`. | Personal bundle plugin add |
| Git access | Raw git is denied to the model. The official MCP git server (`mcp-server-git` via uvx) exposes status, diff, log, commit, add, reset, branch, checkout, and show as `mcp__git__*` tools. A `git` stub on the model's PATH redirects to those tools or asks the user. The A4 bypass suite covers the escape routes. | Personal bundle patch plus preset |
| Dependencies | A `package` tool takes the ecosystem, autodetects the package manager, and installs the latest registry version. Manifest and lockfile paths are denied to the read/write/edit tools; the tool is the only path that changes them. | Personal bundle custom tool plus guard |
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
AI. It exposes OpenAI-compatible endpoints: `/v1/chat/completions` and
`/v1/models` (user-verified on port 9000). The opencode config also treats
it as Anthropic-compatible, and dsh's pi-ai adapter serves the
`anthropic-messages` protocol, so no adapter plugin is needed either way.
W0 declares the route through pi-ai with `api: openai-completions` and
`baseURL: http://127.0.0.1:9000/v1`. That protocol also enables `/models`
auto-detection in the Models page, which `anthropic-messages` cannot do.
A dummy `apiKeyEnv` value satisfies the credential check. The exact rows
are in `docs/w0-providers.md`.

#### Personal AI config

Two behaviors the user wants from the harness. Both ship in the personal
bundle.

**Dismissed questions interrupt the loop.** Today, closing a question
rejects the pending ask with code `ASK_CANCELLED` (verified in
`dsh-host-apiproxy`: the pending promise rejects with that code). The model
then sees a tool error and keeps going. The personal preset ships its own
`ask_user_question` tool row that wraps the shipped tool. On `ASK_CANCELLED`
the wrapper calls `exec.agent.cancel('user-dismissed-question',
{ keepInbox: true })`. `Agent.cancel` aborts the active turn and the
between-turn task. `keepInbox` preserves queued and steering work for the
next user prompt, so a dismissed question stops the run, not the session.
Plan-review dismissal already stops via `dsh-plan-mode`; the wrapper covers
the generic question path. Tool shadowing: preset row order decides which
`ask_user_question` row wins. Confirm at W7.

**Steering is built in.** The `/btw` command idea is dropped. The dsh
composer already steers a running agent: a user message sent while a turn
is in flight submits in `steer` mode at the nearest step boundary. No
custom client plugin needed.

**Reject with a comment.** The approval answer payload is exactly
`{ sessionId, approvalId, outcome: 'allowed-once' | 'rejected' }` (verified
in `dsh-host-apiproxy/api/approvals.schema`). There is no comment channel,
and the model sees only the resulting tool outcome. The personal bundle's
client plugin extends the permission card with an optional Comment field.
Reject with a comment answers the approval normally (`'rejected'`) and
injects a steering user message through
`sessions.send(sessionId, { mode: 'steer', content })`. The `steer` mode
submits at the nearest step boundary, so the agent reads the comment at that
point in the loop. The message reads "The user rejected the <tool> call.
Comment: <text> Adjust your next action." The upstream end state is an
optional rejection-reason field on the approval outcome. Confirm the
permission-card seat at W8.

**Hashline editing (W9).** dsh-better-edit replaces the builtin fs `read`
and `edit` with hash-anchored `read`/`edit`/`batch_edit`/`undo_last_edit`.
Every line carries a 3-character content hash. An edit targets hashes, so
the model never echoes the replaced text (31 to 43 percent fewer output
tokens) and a stale or ambiguous range is hard-rejected before anything is
written. Writes go through `ctx.fs`, so the sandbox and the observation
policy still confine. Guidance overrides per preset live at
`$DSH_HOME/plugins/dsh-better-edit/<preset>/<section>.md` and are seeded on
first boot. The builtin `write` and `read_image` stay. The registry rule:
duplicates within one layer fail, and scoped registrations shadow globals.
The personal preset removes the conflicting builtins on purpose. Its plugin
file calls `ctx.tools.restrict({ deny: ['read', 'edit'] })` on the agent
scope. The restriction removes exactly those global tools from the visible
surface. hashline's scoped `read` and `edit` stay, because restrictions
never touch scoped registrations. The result is deterministic and does not
depend on registration order. The fs plugin has no per-tool disable
config. Confirm the layer hashline registers into at W9.

**Git through MCP only (W10).** The official `mcp-server-git` (run via
uvx) exposes status, unstaged and staged diff, log, commit, add, reset,
branch, checkout, and show as `mcp__git__*` tools. Raw git is denied to the
model two ways. A `tools/pre-execute` deny refuses bash calls whose command
matches git patterns. A `git` stub on the model's bash PATH prints "Use the
mcp__git__* tools. If the operation is not available there, ask the user to
run it." The MCP server cannot push, fetch, manage remotes, stash, rebase,
merge, touch submodules, or handle credentials, so those operations always
route to the user. The A4 bypass suite extends to the escape routes
(`git -C`, `sh -c`, aliases, scripts, command substitution). The human side
keeps real git. The PATH-stub mechanics land on `dsh-shell-env`'s
contributor registry or the sandbox executor's env config. Confirm at W10.

**Dependencies through a tool only (W11).** A `package` tool takes the
ecosystem (rust, python, nodejs, go, and so on), autodetects the package
manager (cargo, uv or pip or poetry, npm or pnpm or bun, go, and so on),
resolves the latest version from the registry, and runs the change. A guard
denies `read`/`write`/`edit` calls whose path is a manifest or lockfile:
`package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`,
`pnpm-lock.yaml`, `bun.lock`, `cargo.toml`, `Cargo.lock`, `pyproject.toml`,
`poetry.lock`, `Pipfile`, `requirements.txt`, `go.mod`, `go.sum`, and
`Gemfile`. The model cannot pin an outdated version, because the tool is
the only writer and it always resolves current. Review the file list at
W11. `requirements.txt` may deserve an exception.

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
the title rewriter, the cost display, the dismiss-interrupt wrapper, the
reject-with-comment permission card). It lives in `~/repos/dotfiles-ai`
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

1. **B0, domain kernel plus tests.** DONE. `packages/aidos/` holds the
   pure TypeScript kernel (fold, invariant, gate engine, projections,
   Store, plan parser, plan import and export) plus all 32 ported tests,
   the constants mirror, and the audit pin. SPEC.md is the contract.
   122 tests green, both typechecks pass. No UI, no tools. C2 plus C3 and
   the P-series pins. SPEC.md dies at B1: the kernel consumes it, its
   decisions fold into this file, and the B1 commit deletes it.
2. **B1, tools.** `get_tickets`, `set_ticket`, `attach_evidence`,
   `move_ticket`, `plan`, `plan_import`, with the guard and the depth check.
   The state-gated tool tiers ship here: the `ctx.tools.restrict` masks
   follow the union of ticket states, the state-aware `tools/pre-execute`
   listener forces bash to ask while a ticket awaits verification, and the
   per-ticket allowlist guard enforces the write union and the subagent
   path scopes. Port the P3 CLI tests (test_20 to 25) as tool tests. Port
   the P8 pins and the builtin-kind mirror pin (one constant table plus a
   deliberate test mirror).
3. **B2, human surface.** Remote endpoints plus `userQuestions`-backed
   flows. Port the lifecycle tests that need two actors (test_08, test_09,
   test_22, test_27).
4. **B3, board client plugin.** The Tickets tab, the global Tickets entry,
   the grid, detail, evidence, signoff, send-back, the active-ticket focus
   control, and the per-ticket allowlist editor. Criterion coverage
   (Ticket P9's read) lands here. Port the projection and view tests
   (test_26, test_31, test_32) against the client read model. U5's "every
   behavior has an equivalent test" checklist is the definition of done.
   **Evaluate:** a dropped connection reconnects and the view is correct
   afterward with no refresh.
5. **B4, plan skill plus import dogfood.** Import this file into the board.
   Delete this file under a ticket (P6). Keep the benchmarking table alive.
6. **B5, subagent and job glue plus shell posture checks.** A6 provenance
   attachment. The shell bypass suite (Ticket A4) against the shipped shell
   posture.
7. **W0, personal bundle scaffold.** The sync script (dotfiles-ai to
   `$DSH_HOME`), the preset directory, and the provider routes in Settings
   to Models: OpenCode Go, the direct DeepSeek route, and meridian as an
   OpenAI-compatible route (`api: openai-completions`,
   `baseURL: http://127.0.0.1:9000/v1`). No adapter plugin is needed.
   **Evaluate:** two profiles against the same provider, with different
   keys, both work in one install. Model auto-detection lists models for
   each.
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
    lines. The configs stay in the deployed locations.
    **Evaluate:** a second device on the LAN connects and receives live
    events. Without the token, a write is refused.
13. **W6, profiles client.** The Profile submenu in the model seat, the
    badge, the per-session override, the cost display, and the title
    rewriter.
14. **W7, dismissed questions interrupt the loop.** The personal
    `ask_user_question` wrapper tool. `Agent.cancel` with `keepInbox: true`
    on `ASK_CANCELLED`.
15. **W8, reject with a comment.** The permission-card extension: a Comment
    field, a normal `'rejected'` answer, and a steering-message injection
    that carries the comment to the agent.
16. **W9, hashline editing.** Install dsh-better-edit. Confirm the layer it
    registers into (duplicates within one layer fail; scoped shadows
    global). `ctx.tools.restrict({ deny: ['read', 'edit'] })` from the
    personal preset removes the builtin pair. Override the guidance per
    preset.
17. **W10, git through MCP only.** The `mcp__git` server row. The bash deny
    patterns for raw git and the `git` PATH stub. Extend the A4 bypass
    suite with the escape routes.
18. **W11, dependencies through a tool only.** The `package` tool with
    ecosystem autodetect. The manifest and lockfile deny guard on the
    read/write/edit tools.
19. **W12, decommission dotfiles-ai.** After the personal bundle (W0 to
    W11) is verified from `$DSH_HOME` alone, delete the opencode content
    that moved out of dotfiles-ai: the ported skills, the agent
    definitions (coder, tester, researcher, see), the opencode plugins,
    the MCP rows, and the provider config. The repo keeps the user's own
    tracked content and the sync source for the bundle. The dotfiles
    README states the new purpose. **Evaluate:** the harness works with no
    opencode config left, and a fresh clone of dotfiles-ai syncs the same
    personal bundle.

B0 and the W-series are independent. The personal bundle delivers immediate
value before the kernel finishes. The board (B3) is the milestone that ships
the first board.

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
- **The Go subscription route** is pinned: base URL `https://opencode.ai/zen/go/v1`
  (the adapter appends `/chat/completions`), model ids `deepseek-v4-pro` and
  `deepseek-v4-flash` (the docs list more, and
  `https://opencode.ai/zen/go/v1/models` serves the full catalog for
  auto-detection). The API key lives in `$DSH_HOME/.credentials.yaml` under
  `OPENCODE_GO_API_KEY` (or the env var, which wins). Configure the route in
  W0.
- **Meridian's protocol** is settled. Meridian exposes OpenAI-compatible
  `/v1/chat/completions` and `/v1/models` on port 9000 (user-verified).
  dsh's pi-ai adapter serves both `openai-completions` and
  `anthropic-messages`, so no adapter plugin is needed. W0 declares the
  route with `api: openai-completions` and a dummy key. One curl probe
  before wiring confirms the endpoints.
- **The Profile seat** replaces the shipped model seat. The slot shadowing
  must be confirmed in W6, together with the badge comparison against the
  live session selection.
- **The title rewriter** races the renderer's `DocumentTitle` effect. A
  `MutationObserver` on `document.title` wins in practice. The upstream fix
  (a configurable product title) is the clean end state.
- **The cost display seat** is a companion to the shipped stats strip. Its
  exact seat comes from the client slot surface at build time.
- **The ask-user wrapper shadows the shipped tool.** Preset row order decides
  which `ask_user_question` row wins. Confirm at W7.
- **The approval outcome has no rejection-reason channel.** The comment rides
  a steering message, not the approval result. The upstream end state is an
  optional reason field on the outcome.
- **The permission-card seat** is where the Comment field mounts. Confirm at
  W8.
- **hashline and the builtin fs tools share `read` and `edit`.** The
  registry fails duplicates within one layer and lets scoped registrations
  shadow globals. The deterministic fix: `ctx.tools.restrict({ deny:
  ['read', 'edit'] })` from the personal preset removes the builtin pair
  from the visible surface, and hashline's scoped tools stay. Confirm the
  layer hashline registers into at W9. The builtin `write` and `read_image`
  stay either way.
- **The git PATH stub needs an env seam.** `dsh-shell-env`'s contributor
  registry or the sandbox executor's env config must carry the stub dir and
  drop git from the model PATH. Confirm at W10. The pre-execute deny is the
  belt either way.
- **The MCP git server is early development.** Its tool set is the contract.
  Operations outside it always route to the user.
- **The manifest deny must cover the hashline edit path.** hashline writes
  through `ctx.fs`, so the guard hooks the same write boundary as the
  builtin tools, not only the tool schemas.
- **The tool tiers are a UX judgment.** awaiting-verification asks on every
  bash call while any ticket waits. A concurrent in-progress ticket pays
  the same ask. Settle before B1 ships.
- **Multiple in-progress tickets union their allowlists** at the write
  boundary. A refusal names the ticket whose allowlist must grow. The
  union semantics and the refusal text need review.
- **Subagents inherit the mask.** A child spawned in open has no
  implementation tools. One spawned in-progress has them, scoped by the
  child's own path guard when one is set. The child-scope path guard is
  the verified seam; confirm whether bash workdirs are confined in v1.

---

## Checklist

The tickets below are the contract. The Phase-1 prototype pins the behavior
its tests assert; the dsh port is checked against them one by one (Ticket
U5's rule). Phase and order are first-class ticket fields.

### Phase 1: Ticket prototype — `in_progress`

**Goal.** A throwaway prototype that pins the behavior of the ticket kernel before anyone
writes the real one. The repository holds this plan until the board can import it (Ticket P6).

**Constraints.** Python and `sqlite3`. Standard library only. Lives in `prototype/` in this
repository. It is a behavior specification, not a component. No line of it survives into aidos.
The tkinter board (Ticket P4) and the node-tree renderer (Ticket P5) are dropped: the 32 tests
and the paged read already pin the behavior a board would have exercised, and the web board
(B3) is the first real one. Throwaway code in a repository you keep does not stay throwaway
unless someone deletes it on purpose, so Ticket U5 exists to be that someone.

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
  board cannot run until the web board exists (B3), so this ticket stays open on purpose. I verified the rest
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
  stays optional glue. The personal bundle ships a sync script instead.
  **Evaluate:** a first run attaches the session to its workspace path. `move` repoints a
  project and a later session opens in the new path. The sync script copies dotfiles-ai to
  `$DSH_HOME`. A second run updates rather than duplicating.

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

**Goal.** aidos talks to a model and to a browser. dsh provides the transport and the loop. The
work is the tools and the gate enforcement.

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
  or refuse. The personal bundle extends the deny list to raw git and to
  manifest and lockfile edits (W10, W11), with the same bypass discipline.
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

- [ ] **Ticket U2: Board.** The aidos board client plugin: the Tickets tab next to Chat and
  Trajectory, the global Tickets entry near New Session, the ticket grid, detail, field
  editing, comments, and state moves. Evidence groups by the criterion it addresses, and
  uncovered criteria are highlighted (Ticket P9's coverage read, folded here). Gate refusals
  surface as readable text naming the missing kind.
  **Evaluate:** you run a full ticket lifecycle in the browser without touching the prototype.
  Every refusal is legible without reading logs. A ticket with three criteria and evidence
  naming two shows the third as uncovered. Evidence naming no criterion still attaches and
  still counts toward its gate. A criterion reworded after evidence was attached leaves that
  evidence visible as uncovered rather than dropping it silently.

- [ ] **Ticket U3: Evidence and screenshots.** `ctx.attachments` stores content-addressed
  images, hash-deduped. Evidence rows reference the attachment refs. Show the confidence score
  and label it advisory.
  **Evaluate:** a pasted screenshot attaches and survives a restart. The score is visibly marked
  as advisory and no control anywhere is enabled or disabled by it.

- [ ] **Ticket U4: Node-tree renderer.** Paused. No renderer ships in v1. Later work looks at
  nostr-canvas for the declarative node tree.
  **Evaluate:** the agent builds a throwaway review dashboard, you complete it, and the
  submissions appear as evidence on the right tickets. An unknown node kind renders an error
  node and does not break the page.

- [ ] **Ticket U5: Delete the prototype.** Remove `prototype/` once the web UI has replaced it.
  The prototype was always meant to die. This ticket is the only thing that makes that happen.
  **Evaluate:** you confirm you have run a full ticket lifecycle in the browser, including
  evidence attach. Every behavior the prototype's tests pin has an equivalent test in the dsh
  suite, checked one by one against the prototype's test list, not by eye. Only then is
  `prototype/` removed, in a commit that names the tests that replaced it.

### Phase 5: Tools, scripting, and skills — `pending`

**Goal.** The extension surface.

- [ ] **Ticket T3: Tool types.** The tool API is the standard library: `exec` is the context,
  output schemas are the util, service calls are the store. The aidos tool packages ship a
  `.d.ts` for editor completion.
  **Evaluate:** a tool author gets editor completion and inline type errors against the shipped
  types. A parameter typo fails schema validation rather than passing silently.

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
- **Personal AI config.** Dismissing a question interrupts the agent loop (W7). Rejecting a
  permission request can carry a comment the agent reads at that point in the loop (W8). The
  model edits through hashline (W9), touches git only through MCP (W10), and changes
  dependencies only through the package tool (W11).
- **Board scope.** The Tickets tab and the global Tickets entry both ship in v1.
- The AGENTS.md rules from dotfiles-ai port to `$DSH_HOME/AGENTS.md` (W5).

---

## Human review queue

- [ ] Phase 1 (whole prototype) — use it for one real working session and say whether the gate
  refusals help or annoy. That judgment cannot be made from tests.
- [ ] Ticket P8 — drive a ticket that has a passing check and no review, and say whether the
  refusal reads clearly at the terminal and names the right kind.
- [ ] Ticket P7 paged read — decide whether the gate fraction is the number the board should
  sort on, before the board (B3) builds a card around it. It counts only the forward transition,
  so a ticket in `done` shows nothing at all.
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
- [ ] W0 — curl-probe http://127.0.0.1:9000/v1/chat/completions and /v1/models once, and confirm
  the openai-completions route answers before wiring.
- [ ] W6 — the Profile seat shadowing and the badge comparison against the live session
  selection.
- [ ] W6 — the title rewriter race against the renderer's `DocumentTitle` effect.
- [ ] W6 — the cost display seat next to the shipped stats strip.
- [ ] B3 — the `aidos.coldTickets` Remote's latency on a cold session for
  the "re-read on focus" rule.
- [ ] W7 — dismiss-interrupt semantics: `keepInbox: true` (preserve queued work for the next
  prompt) versus a hard stop.
- [ ] W7 — the ask-user wrapper's shadowing order against the shipped tool row.
- [ ] W8 — comment delivery: a steering message versus an upstream rejection-reason field on
  the approval outcome.
- [ ] W8 — the permission-card seat for the Comment field.
- [ ] W9 — the layer hashline registers into, and the
  `restrict({ deny: ['read', 'edit'] })` result on the visible tool list.
  Plus the guidance override layout per preset.
- [ ] W10 — the PATH-stub mechanics, and the git-MCP coverage list (push,
  remotes, stash, rebase, and submodules always go to the user).
- [ ] W11 — the manifest file list (the `requirements.txt` exception?) and
  the ecosystem autodetect behavior.
- [ ] W12 — the harness runs with zero opencode config left in
  dotfiles-ai, and a fresh clone syncs the same bundle.
- [ ] B0 — run `npm test` in `packages/aidos/` yourself and skim
  PORT-MAP.md's "could not port" rows before B1 builds on the kernel.
- [ ] B1 — awaiting-verification asks on every bash call; decide whether a
  concurrent in-progress ticket pays the same ask.
- [ ] B1 — the union semantics of multiple in-progress tickets: the write
  refusal names the ticket whose allowlist must grow; confirm the text.
- [ ] B3 — the subagent dir/file guard: the child-scope path predicate on
  read/write/edit, and whether bash workdirs are confined in v1.

---

## Benchmarking

| Metric | Count / Value | Notes |
|---|---|---|
| Verification catch rate | 11 / 28 | independent checks that caught a real discrepancy, vs. total checks performed. The reopen check found two defects the 29 passing tests missed. Reading the implementation found two more. For P3, five checks found one defect, and the one that found it was reading the finished code. P7 units 1 to 3 added four catches from ten checks, and all four came from reading the diff or from breaking the code on purpose: a seq-versus-`at` test that could not discriminate, a `STATE_ORDER` constant that nothing read while the same ordering sat hardcoded three times in SQL, an untested `awaiting_verification` to `done` gate, and a legacy-default block duplicated across two methods. Re-running suites again caught nothing, in any ticket so far. Reading code and deliberately breaking it are the checks that pay. Unit 4b added two catches from four checks. One of them is the first dispatched review pass on this project, and it found a sort regression that the author missed and that a full read of the diff also missed. Reading the diff found three smaller faults of its own. The suite caught nothing again, and running the broken case by hand only confirmed what the review had already named. That is the case for Ticket P8 in one line: a review and a check are different claims, and here they disagreed. B0 added two catches from five checks, both from reading the code: the missing self-transition in `isLegalTransition` (the first kernel pass excluded it while the ported test_15 needed it; the kernel dispatch fixed it in the same round), and a PORT-MAP row that claimed the self-transition pin could not port while the ported test carried it. The suite caught nothing. |
| Escaped defect rate | 0 / 3 | bugs found after a ticket was marked `done`, vs. tickets closed. Both P1 defects were caught before the ticket closed, not after. P3 is not closed yet, so it does not count here. B0 closed with no escaped defect. |
| Rework/reopen rate | 6 rounds / 5 tickets | P1 and P2 each needed an extra test-and-fix round because my first contract omitted deny-by-default and said nothing about durability. P3 needed one because my contract told import to preserve a `done` mark and also told the agent it could never reach `done`. Those two rules cannot both hold. A subagent found the conflict by writing tests against the contract, before any code existed. Grilling found none of the three. The fourth round is Ticket P7, which discards P1's in-memory projection entirely: my contract never asked how the board would read twenty tickets at a time, so it specified a structure that cannot paginate. Grilling the UI found it, one question in. The fifth round is Ticket P7 rescoping itself while being built: its contract asked for a comments view over an event type that does not exist, and it accepted up front that nothing would guard the rewrite. Both were found by reading the contract against the code before dispatching, not by grilling. The sixth round is B0: the contract review changed three rules after the dispatches started (self-transitions legal, legacy records strict, allowedAuthors widened), so the kernel pass and the test port each needed a convergence fix. Reading the 32 prototype tests against the contract before code found all three. |
| Rough cost | 4 dispatches for P1+P2, 8 for P3, 11 for P7, 2 for B0 | of P3's 8, three produced nothing: two `coder` dispatches returned empty without writing a file, and one `general` implementation dispatch timed out. The five that worked were a probe, a test-writing round, a contract revision, the plan parser, and the CLI. Splitting the implementation in two after the timeout is what got it finished. P7 spent 7: two `researcher` maps of the store and its call sites, and five `coder` runs. One `coder` run returned empty again, the same failure as P3, and splitting that unit into implementation and tests fixed it. Two research dispatches up front were worth it: they kept 550 lines of store code out of the main session while still yielding the exact call-site counts the ticket needed. Unit 4b spent the other four: implementation, tests, a review pass, and one fix round. Splitting implementation from tests before dispatching avoided the empty return that hit both P3 and an earlier P7 unit. B0 spent two: the kernel and the test port, split before dispatch, both produced. |
| Contract defects found before code | 5 | the import versus `done` conflict, and Ticket P7 asking for a comments view over an event type nothing writes. Writing tests against a contract, and reading a contract against the code it describes, are the only steps so far that have caught a contradiction rather than a bug. Both happened before any code was dispatched. B0 added three, all from reading the 32 prototype tests against the contract before implementation: self-transitions are legal (test_15 pins a configured gate on a self-pair), legacy records cannot replay in a whole-value fold (the pins become write-boundary pins), and the builtin `allowedAuthors` admit both actors for every kind but the human-only pair and `imported_state`. |
