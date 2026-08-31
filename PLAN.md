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

**Evaluation criteria are rewritten in the new import format** (2026-08-26): one
criterion per physical line, short and checkable, because evidence rows match a
criterion by exact trimmed line text. Wrapped prose criteria fragmented on the
first import. Treat every criterion here as a proposal to argue with, not a
settled contract.
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
  (`automated_check`, `review_pass`, `review_note`, `agent_report`).
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

The board ships as a client bundle inside the aidos package itself
(decided 2026-08-22, replacing the earlier separate-package plan): the
package.json declares `dsh.client` (`platform: "web"`) and exports
`./client` at `lib/client.js`. build.mjs bundles `src/client/` with esbuild
(browser, cjs, jsx automatic; react and every `@deepseek-ai/*` package
external — the shell's module table provides them) and wraps the result in
the `window.__ModuleLoader__.load({ id, factory })` facade, the same
dotfiles-ai plugins recipe. The UI is hand-rolled React with plain CSS
classes: `@deepseek-ai/dsh-client-ui-primitives` is not installed anywhere
reachable (restricted scope, no local `.d.ts`), so depending on it would be
unverifiable; the shipped plugins in this profile avoid it too. It mounts
through the slot system (`ctx.slots.inject(...)`). The goal bar in the
input dock and the plan seat are the precedents. The board does
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
  attaches it as `builtin:agent_report` evidence (author `agent`, payload
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
   - the client bundle rides in the same package (no separate roster row:
     `dsh.client` + the `./client` export are discovered by the scan).
   - inserts the `aidos` settings namespace row for gate and kind config.
2. The **aidos preset** (agent plane): a directory with `agent.cordis.yml`
   (rows: `aidos-tools` via a relative path, the `tool:aidos` prompt section,
   skill filesystem roots, the `plan` skill, the delegation group that keeps
   board tools out of children) plus `preset.yml`. It sits alongside
   `standard` in the preset roster. Sessions pick it to opt into the ticket
   flow.
3. The React board is item 1's own `./client` export (decided
   2026-08-22; no separate board package).

Patch layers apply in order: bundle patches, then the profile's
`cordis.patch.yml`, then the home-level `$DSH_HOME/cordis.patch.yml` (home
wins). Patch files hot-reload (`watchUserPatches`). Bundle layers are static
per boot.

**Two cutover gotchas (2026-08-20), independent causes:**

1. **The preset did not mount until the bundle was installed.** The aidos tools mount against a host-plane `aidos-core` that comes only from the aidos BUNDLE patch. Adding the preset alone leaves it `waiting for aidos` (`dsh plugin --profile web add <aidos-path>`). `dotfiles-ai/dsh/sync.sh` step 8b does the bundle-add so a fresh sync converges.
2. **An unquoted colon-space broke preset.yml.** The description `agent: plan` read as nested YAML (`ScannerError`). Quote any description holding a colon. dsh still discovered the preset by directory name, so the tools and tier masks worked with zero display metadata.
3. **A repair script that recompresses a session log must keep the header as its own Zstandard frame (2026-08-21, commit `febe9715e08b6d2b4dc7fcdcd5ae536ca1aedf95`).** aidos's eager session-start bootstrap (fixed in the same commit) wrote an unreadable `project/created` event into every session, so a repair pass had to rewrite the affected logs in place. The dsh JSONL backend's on-disk artifact is a concatenation of independent Zstandard frames, and its startup session-list scan (`readFirstZstdLine` / `assertZstdHeaderFrame`) decompresses only the FIRST frame and requires it to decode to exactly one newline-terminated line — the header. A first draft of the repair script decompressed the whole log, edited the target lines, and recompressed the entire result as one frame. That merged the header and every event into that single first frame, so every repaired session crashed `dsh` on the next start with `corrupt Zstandard session log: first frame is not exactly one header line`. The fix: compress the header line and the event lines as two separate frames, then concatenate. Verified against real session backups by calling the installed package's own `readFirstZstdLine`/`readRaw`/`readPrefix` directly (bypassing its cordis constructor), confirming byte-identical content aside from the intended edits and full event-count parity before and after.

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
   **A third defect explains the 404; the note above was itself incomplete
   (corrected again, later the same day, 2026-08-22).** Two problems were
   real and are now fixed. `build.mjs` had no `target` on either
   `esbuild.build()` call, so it passed `@Remote(...)` decorator syntax
   through unlowered. Node cannot execute that syntax, and the container
   crashed on every boot importing `aidos-core` with `SyntaxError: Invalid
   or unexpected token`. Fix: add `target: "es2022"` to both calls (done,
   uncommitted). A rebuilt, crash-free container still 404'd on `POST
   /api/aidos/userAttachEvidence`, which led to a third, deeper cause.
   `@Remote(...)` writes a marker into a `WeakMap` defined inside
   `@deepseek-ai/dsh-typert-protocol`'s own module scope, keyed by the
   service prototype. `dsh-api-gateway`'s `collectSrcClaims()` reads that
   same `WeakMap` to decide which endpoints it will dispatch. Node keys its
   module cache on resolved file path, not package name and version. The B1
   container bind-mounts this repo straight to `/opt/aidos`, which carries
   its own `pnpm install` (needed for local `tsc`/`vitest`/`esbuild`) and
   therefore its own copy of `dsh-typert-protocol`. That copy and the CLI's
   own copy are two different files sharing one version string. Node loads
   each as a separate module instance with its own `WeakMap`. `aidos-core.ts`
   writes its `@Remote` marker into one instance; the gateway reads the
   other. The lookup finds nothing, silently — no crash, no log line.
   `claimsEndpoint` returns false and the request falls through to a plain
   404, indistinguishable from a route that was never registered.
   Confirmed directly: two decorated dummy classes, one per copy of
   `dsh-typert-protocol`, resolve to `Object.is(modA, modB) === false`
   despite identical source text, and `remoteMethods()` under one copy sees
   no markers written under the other. `settings.describe` confirms
   `AidosService`'s constructor genuinely ran (it is the only place that
   registers the `aidos` settings namespace); `goals/clear`, dispatched
   through the same gateway and the same slash-grammar recipe, returns a
   real business response (`"no current goal"`), proving the gateway and
   the recipe both work. Only aidos's own endpoint 404s, and only because
   of the duplicate module instance.
   **This is a property of the B1 test harness, not the design.**
   `dsh-app-boot`'s `healProfilesModuleFallback` maintains a flat symlink
   farm at `$DSH_HOME/profiles/node_modules`, one link per package in the
   dsh app's own dependency closure, each pointing at the CLI's real copy.
   Node's directory walk-up from an installed bundle finds this farm after
   the bundle's own `node_modules` and lands on the same file the CLI uses,
   collapsing exactly this kind of split. A real `dsh plugin --profile web
   add <aidos-bundle>` install places the package under
   `$DSH_HOME/profiles/web/node_modules/aidos/`, inside that walk-up path.
   `dsh-typert-protocol` is a `devDependency` only in aidos's `package.json`
   today, and a package manager never nests a consumed package's own
   `devDependencies`, so a real install would never materialize a private
   copy at all; resolution would walk past the empty spot and land on the
   farm. `/opt/aidos`, the B1 container's raw bind-mount target, sits
   outside `$DSH_HOME` entirely (reachable only through a symlink at
   `$DSH_HOME/profiles/web/node_modules/aidos`, and Node's walk-up follows
   the real path after the symlink, not the symlink's own location), so it
   can never reach the farm regardless of whether the shadow copy is
   present. Attempted to confirm by removing the shadow copy directly and
   re-probing: the mount is read-only (`ext4 ro`), so the removal failed,
   and the test could not run to completion. The structural argument does
   not depend on that test — it follows from Node's own resolution
   algorithm and the two directories' fixed relationship — but it remains
   unconfirmed by a passing live probe against this exact container.
   **Net effect on B2.** The recipe, the kernel, the `TypertRemoteService`/
   `@Remote` structural change, and `aidos-core.ts` are all correct and
   match `dsh-goal`'s pattern. `build.mjs` needed and now has its `target`
   fix. Nothing in aidos's design or code caused the 404; the B1
   container's bind-mount install method broke an assumption the farm
   mechanism depends on. Two follow-ups, neither blocking B2's design:
   (1) add `@deepseek-ai/dsh-typert-protocol` to aidos's `package.json` as
   a `peerDependency` alongside its existing `devDependency`, matching
   `dsh-goal` exactly — this documents the real contract, though it would
   not by itself have prevented this container's specific artifact; (2) the
   B1 harness itself cannot currently prove aidos's own Remote endpoints
   dispatch end to end, because its bind-mount install method is not the
   one production or `dsh plugin add` uses. A harness that installs aidos
   through the real profile-bundle flow (or one with a writable overlay
   letting the shadow-copy test complete) is needed to close this out with
   an unambiguous live pass, not architectural inference alone.

   **Still not wire-verified after a real profile install (2026-08-22, same
   day, third correction).** The user installed aidos through the real
   `dotfiles-ai/sync.sh` flow (not the B1 container's bind-mount), which the
   note above predicted would collapse the module-identity split. Confirmed
   on disk: `$DSH_HOME/profiles/web/package.json` lists `"aidos":
   "github:xyzshantaram/aidos#207cfc6203d9"` in `dependencies` and `"aidos"`
   in `dsh.profile.bundles`; `$DSH_HOME/profiles/web/node_modules/aidos`
   exists with a fresh `dist/` (timestamps matching the install, not stale).
   The user restarted the `dsh web` process behind this GUI twice. Despite
   that, `cordis_inspect_query` against `Service.listService` on the live
   process still shows no `aidos` key at all — not even a partially loaded
   or crashed entry, just absent, the same as before the install existed.
   This is a materially different symptom from the B1 container's history:
   there the service mounted (confirmed via `settings.describe` showing the
   `aidos` namespace) and only the Remote-claim step failed silently. Here,
   nothing suggests the service constructor ran at all. Not yet diagnosed:
   whether the profile composition actually includes the `aidos-core` row
   from `cordis.patch.yml` in this real install (unconfirmed whether the
   patch file is even read from the installed package's own directory
   versus some cached/stale composition), whether the restart the user
   performed actually replaced the running process rather than something
   adjacent to it (e.g., a different `dsh-remote`-managed process than the
   one this GUI's Cordis Inspect tools talk to), or whether the real
   install hit a different failure mode than the B1 container did. The
   session paused here for compaction before further debugging, per user
   request. **B2 remains open and NOT wire-verified.** Do not treat the
   `build.mjs` and `peerDependencies` fixes from the same day as sufficient
   evidence that B2 works — they are necessary but were never confirmed
   sufficient against a real install; this new finding suggests something
   else is still wrong, possibly unrelated to the module-identity fix.


   **B2 wire-verification closed (2026-08-22, same day, fourth entry;
   supersedes the note above).** The missing-service alarm above was a false
   signal from the wrong diagnostic tool, not a real defect. `Service.listService`
   (queried through `cordis_inspect_query`) reads `ctx.typert.listPackages()`,
   the generated-reflection package table that `dsh-goal`, `dsh-commands`,
   `dsh-at-file`, and similar packages populate through a generated
   `typert.host.js` calling `ctx.typert.register()` with a full
   `model.services[]` tree. `aidos` has no code-generation step. It hand-writes
   `@Remote("userAttachEvidence")` decorators directly on `AidosService` and
   relies only on `dsh-api-gateway`'s SRC/conservative-fallback path, which
   reads Cordis's live service registry, not the typert package table. A
   package built this way cannot appear in `Service.listService`, mounted or
   not. The two restarts changed nothing because nothing was broken.

   Confirmed directly against the live process, with real file and process
   access: `ctx.get('aidos')` resolves to a live `AidosService` instance
   carrying every real method (`getTickets`, `userAttachEvidence`,
   `userMoveTicket`, `_createTicket`, and the rest), with `typertRemote`
   correctly bound to namespace `aidos`. A direct
   `typertGateway.invoke({namespace: 'aidos', method: 'userAttachEvidence',
   args: {agentId, args: {ticketId, kind}}})` call, run from a temporary
   diagnostic Cordis plugin against the live process, reached the real method
   body and returned its own business rejection (`"no such ticket:
   nonexistent-diagnostic-probe-999999"`) rather than a gateway routing error.
   A business-level rejection, not a dispatch failure, means every layer
   resolved: descriptor lookup, the `remoteMethods()` marker read on the live
   service, wire-shape validation, agent-id lookup, and dispatch into the real
   method.

   **B2 is wire-verified.** The `build.mjs` and `peerDependencies` fixes from
   earlier the same day were correct and necessary; this closes the loop the
   note above left open. One wrinkle for anyone reading Cordis Inspect Service
   catalogs in this repo going forward: `Service.listService` is not a
   complete list of mounted services. It lists only packages with generated
   typert reflection. A service can be fully live and correctly wired for RPC
   while invisible to that one Inspect query. Confirm a hand-written `@Remote`
   service with `ctx.get(serviceKey)` or a real `typertGateway.invoke()`
   probe, not `Service.listService`.

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
   **Stage 1 broke the test transform, fixed 2026-08-22.** The `@Remote`
   decorators were this repo's first use of TC39 standard decorators.
   `vitest@4.1.11`'s default resolved `vite@8.2.2` transforms `.ts` files
   through rolldown's oxc parser, which has no decorator support yet (open
   upstream: oxc-project/oxc#9170). Every file that imported `aidos-core.ts`,
   directly or transitively, failed at transform with `SyntaxError: Invalid or
   unexpected token`, 21 of 54 suites. `tsc --noEmit` and raw `esbuild` both
   parsed the same syntax cleanly, so this was not a `tsconfig.json` problem.
   Fix: pin `vite` to `^6.4.3` as an explicit devDependency (it was an unlisted
   transitive dependency of vitest). Vite 6's esbuild-based transform handles
   standard decorators correctly against this repo's existing `tsconfig.json`,
   which never set `experimentalDecorators`. `vitest.config.ts` needed no
   change in the end; a custom esbuild-plugin workaround was tried and
   reverted, because forcing `experimentalDecorators: true` in an esbuild
   override makes esbuild emit the legacy three-argument decorator call, a
   different calling convention than `@Remote` expects, and produces a
   malformed decorator context at runtime. All 54 suites, 253 tests, pass
   after the downgrade.

2. **B3, board client plugin.** The Tickets tab (U2a), the detail panel and
   evidence (U2b), the actions (U2c), the global Tickets entry (U2d), and the
   per-ticket allowlist editor (U2e). Criterion coverage lands in U2b. Port
   the projection and view tests (test_26, test_31, test_32) against the
   client read model. U5's "every behavior has an equivalent test" checklist
   is the definition of done. U2b through U2e were grilled on 2026-08-24;
   their scope and evaluation criteria are in the checklist entries.
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

## Tickets

The tickets below are the contract. Phase headings returned on 2026-08-26: a
`## Phase N: <title> — \`<state>\`` heading sets the phase number and title of
every ticket after it, which supersedes P11's flat-checklist settlement. Ticket
order inside one phase carries the sequence. The kernel keeps `phase` and
`order` fields. The Python prototype was dissolved on 2026-08-21: it had pinned
the behavior it existed to pin, and the dsh package is now larger and better
tested than its specification.

## Phase 2: aidos core — `in_progress`

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
  **Evaluate:** a first run attaches the session to its workspace path
  `move` repoints a project and a later session opens in the new path
  the sync script copies dotfiles-ai to `$DSH_HOME` and a second run updates rather than duplicating

- [x] **Ticket C5: Globally distinct ticket ids.** A ticket id becomes unique across every
  workspace, so one id can never mean two tickets. The raw form is the dsh canonical workspace
  key, a colon, and an id unique inside that workspace:
  `--home-sid-repos-aidos--:distinct-ticket-ids`. The display form shortens the key to its last
  path segment: `aidos:distinct-ticket-ids`. Every ticket also carries a per-workspace number
  that only climbs and is never reassigned, so `aidos:#341` names the same ticket for good.
  **Done.** Every ticket snapshot now carries a durable `slug` and a `workspaceKey` in the dsh
  canonical `--...--` form (shared helper `workspaceKeyFromPath`, reused by T5 scratch). The
  numeric `TicketId` is the internal key and allocates from a folded monotonic `nextTicketId`
  counter, never `max + 1` over live keys. A tool argument takes the slug or the number; a bare
  form means the current workspace, `<workspaceKey>:<slug>` crosses workspaces, and a
  foreign-workspace write is refused naming the workspace to open. Legacy pre-C5 logs replay by
  synthesizing the two fields at the fold/invariant layer. Covered by `tests/c5-*` (workspace-key,
  distinct-ids, legacy-replay, clone-state-counter).
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
  **Evaluate:** creating a ticket with a slug the workspace already holds is refused
  a rename leaves every existing reference resolving to the same ticket
  a bare `#341` in a session on workspace A never resolves to a ticket in workspace B
  a write against a foreign id is refused and names the workspace to open
  two workspaces whose paths end in the same segment render distinct badge colors
- [x] **Ticket C4: Plan import and serialization.** On dsh: the `plan` and `plan_import` tools
  plus the `plan` skill. Markdown with YAML frontmatter in. Markdown out on demand. The context
  cap applies at the write boundary. This file's design sections are the first real import; the
  importer must handle a context longer than 500 lines (raise the cap for the bootstrap import
  or fold the design into context and rules).
  **Status (B1): the machine half only.** `AidosService.plan`/`planImport` in
  `aidos-core.ts` implement import and export directly against the session log,
  both tools are registered, `PLAN_CONTEXT_LIMIT` is 500, and the over-cap error
  names the overage. test-26 pins the round trip against the live tools. Two
  parts stay open.
  There is no `SKILL.md` anywhere in the package, so the preset ships no skill
  directory and the writer gets no guidance. The bootstrap import of this file is B4.
  **Cap settled 2026-08-24 by grilling: raise it.** `PLAN_CONTEXT_LIMIT` moves to
  2000 so the bootstrap import of this file fits. New plans still respect the cap;
  only the constant changes.
  **Evaluate:** import, serialize, and re-import produces an identical plan
  a context section over the cap is refused with a clear message naming the overage

- [x] **Ticket P8: A review is its own evidence kind.** Register `builtin:review_pass`, labelled
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
  **Done.** `builtin:review_pass` is registered (weight 1.0), the gate requires it beside
  `automated_check`, and `test-30-tool-review-pass-is-its-own-kind` pins every criterion.
  **Evaluate:** a ticket with a passing check and no review is refused, and the refusal names `builtin:review_pass`
  the same ticket moves once the review row exists
  the number of gates a human must satisfy is unchanged

- [x] **Ticket P11: The plan format follows the plan-skill structure.** aidos adopts the section
  shape the `plan` skill defines: Vision, Checklist, Critical context, User preferences and
  special rules, Human review queue, and an optional Benchmarking section. This changes the tool,
  not the ticket format.
  **Settled 2026-08-24 by grilling: flat checklist, no phases.** The plan
  format is a flat checklist. Ticket order carries the sequence. A series of
  tickets (for example W1-W4) uses the ticket title for the series order.
  `plan.ts` no longer special-cases `## Phase N` headings. The ticket's
  `phase` and `order` fields remain in the kernel (importing keeps them in
  order), but the document shape is flat. A document with no phase heading
  parses without error. The round-trip tests cover the new flat shape, not
  only the old phased one.
  **Implementation contract (designed 2026-08-24, dispatch-ready).**
  - `PlanDocument` loses `phases`; gains `tickets: PlanTicket[]` (flat,
    document order). `PlanPhase` is deleted from `src/plan/plan.ts`.
  - `parsePlan` collects ticket lines wherever they appear into the flat
    list; `## Heading` lines that are not ticket lines still open context
    sections. A line inside a context section that is neither a ticket nor a
    continuation still throws `PlanParseError` naming the line.
  - `renderPlan` emits frontmatter, preamble, context sections, then the
    flat ticket list. No `## Phase N` headings ever.
  - `importPlan` loops `document.tickets`; no `setPhase` calls. Tickets keep
    their `order` from the document and take the kernel's default phase (1).
  - `exportPlan` lists tickets in store order (phase then order), no phase
    grouping in the output.
  - Service: `plan()` renders the flat shape; `planImport` returns
    `{ tickets: TicketId[] }` (the `phases` key is dropped from the service
    return and from the `plan_import` tool output schema).
  - `PLAN_CONTEXT_LIMIT` moves 500 → 2000 (C4).
  **Evaluate:** a document in the new shape round trips byte for byte
  a document with no phase heading parses without error
  the round-trip tests cover the new shape, not only the old one

## Phase 3: HTTP and agent loop — `in_progress`

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
  **Evaluate:** an unmatched command asks and does not run
  `git push` is refused while its gate is unmet, and is not reachable through `git -C`, `sh -c`, an alias, or a script
  a test suite of bypass attempts is written first and each one fails to bypass

- [ ] **Ticket A5: Subagent definitions.** On dsh: agent presets plus the subagent tool rows with
  `toolFilter`. Board tools refuse `delegationDepthOf > 0`, so only the orchestrator touches the
  board. A subagent NEVER edits the board. It returns a report, and only the
  orchestrator turns that report into a board change. Identity stays flat:
  every subagent writes as the single author `agent`, and its name is metadata
  on a record rather than an actor of its own.
  **Status: structural half done; bash hang closed.** `installAidosGuard` refuses every board
  tool when `delegationDepthOf(agent) !== 0`, and the refusal names the orchestrator as
  the only actor that may do it. `childPathScope` is the per-child path predicate.
  Presets load as definitions with no code change, which is dsh behavior rather than
  ours. The braces landed: the prompt guidance tells the orchestrator to pass a
  spawn-time `toolFilter`, and `b1-toolfilter-braces` covers the filter and the
  guard. The real-session author audit stays open. The "no author other than
  agent, user, and system
  after a multi-subagent session" check needs a real session to run against.
  **The bash workdir clamp landed** (decided 2026-08-21). `childPathScope` now also
  clamps the bash WORKDIR to the child's path scope, mirroring `dsh-tool-bash`'s
  `resolveWorkdir` (missing runs at the session cwd, relative resolves against it),
  so a child scoped to `src/` cannot reach `docs/` through `sed -i`. It stops the
  WORKDIR, not an absolute path inside the command string, so it narrows the hole
  rather than closing it. `b1-allowlist` covers it.
  **Evaluate:** a new definition file becomes a callable subagent with no code change
  a malformed definition fails to load with a message naming the file and the problem, and does not stop the other definitions loading
  a subagent that calls any board tool is refused, and the refusal says the orchestrator is the only actor that may do it
  after a session that ran several subagents, the log holds no author other than `agent`, `user`, and `system`
  a child scoped to `src/` cannot run a bash command whose workdir falls outside `src/`, and the refusal names the scope

- [ ] **Ticket A6: Subagents run detached.** On dsh: `ctx.jobs` plus the `job_output`/`job_list`/
  `job_kill` tools. Jobs outlive the parent turn and are listed per session. The orchestrator
  attaches a finished report as `builtin:agent_report` evidence with the job identifier, the
  subagent name, and the start and end times.
  **Status: not started.** dsh's half works today, and the mask's delegation tier
  already names the job tools. The aidos half does not exist. Nothing in `src/` reads
  `ctx.jobs`, and `agent_report` appears only as a kind string inside the tool
  descriptions. No code attaches a finished report as evidence. That glue is B5.
  **Evaluate:** the parent agent spawns a job and takes its next action in the same turn, before that job finishes
  a status check names the job, its state, and how long it has run
  a report fetch against a running job is refused with text that tells the parent to check the status again, and it does not block
  a subagent that crashes or times out reports a terminal state with a reason, so no parent can poll forever
  killing a job stops its process and leaves no orphan
  two jobs run at once and neither report is attributed to the wrong job
  a report attached as evidence carries `agent` as its author and the subagent name as metadata, survives a restart, and a query by subagent name and date returns it with its job identifier intact

- [x] **Ticket A7: The allowlist proposal and its approval.** The agent proposes file paths.

  You approve, change, or reject them. Only an approved proposal grants write access.
  Decided 2026-08-21 during the B2 grilling, after a read found the write boundary
  unreachable.
  **Status: implemented 2026-08-21, closed 2026-08-22.**

  **Why it exists.** `TicketSnapshot.allowlist` is a validated durable field
  (`types.ts:40`, and the invariant key list) with NO writer. `SetTicketArgs` carries no
  allowlist field, `_createTicketInternal` hardcodes `[]` at line 966, and `_editTicket`
  only spreads the previous value. So `allowlistUnion` is always empty, `pathAllowed(path,
  [])` returns false, and every write refuses the moment a ticket enters in-progress. The
  mask shows `write` and `edit` in the in-progress tier and the guard then blocks both
  unconditionally. B1's container walk stopped at signoff, so it never reached this.
  **The flow.** The agent asks through `ask_user_question` with the paths it wants. You
  change them until you are satisfied. The agreed list lands as a `builtin:file_allowlist`
  evidence row. That kind is registered (weight 1.0, "The files the change may
  touch."), and the coverage check reads it. Once an approved row exists, `userSetTicket` may
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
  **Implemented 2026-08-21.** The guard registers prepended on both fs
  waterfalls and throws to refuse. An allowed write calls `next()`, so the
  observation-policy staleness bookkeeping still runs. Approved paths ride in
  the evidence payload under a `paths` key (`{ paths: string[] }`). That
  convention lives in the coverage check's comment until B2 or B3 gives it a
  schema home.
  **Fixed 2026-08-22.** The create-path defect is closed: `_createTicket` now
  refuses any `allowlist` field on create, and names why: a ticket with no id
  yet can have no covering `builtin:file_allowlist` row. Verified directly
  (not by subagent report): `tsc --noEmit` is clean, the five A7 tests pass,
  and the full suite passes 253/253 across 54 files. Two gaps stay open as
  B2 scope, not defects: no public user-evidence attach path exists yet, so
  the coverage gate is satisfiable only through tests until
  `userAttachEvidence` lands, and `userSetTicket` has no production caller
  for the same reason.
  **Evaluate:** a ticket with no approved row refuses every write, and the refusal names the missing approval rather than an empty union
  an `agentSetTicket` call naming a path that no approved row carries is refused
  a reworded approval appends a new row and leaves the old one visible
  the approval survives replay


## Phase 4: Web UI — `in_progress`

**Goal.** The board you actually use, replacing the Phase 1 prototype.

- [x] **Ticket U2a: Local Tickets tab and shared board components.** Builds the Tickets tab that
  reads the open session's own board, plus three components the later Web UI tickets reuse:
  `FilterPanel`, `TicketView`, and the ticket tile.
  **Scope.** `FilterPanel` takes an optional `projects` prop. It shows a project checklist only
  when that prop is present. It always shows a state checklist (default: every state, with `done`
  sorted last), a sort control (Confidence, Gates, Time updated, Alphabetical, each with its own
  tiebreak: Confidence ties break by Gates, Gates ties break by Confidence, Time ties break
  alphabetically, alphabetical ties break by Time), a global ascending/descending toggle, and a
  debounced title-or-id search box with autocomplete drawn only from already-loaded tickets. Every
  control stages behind an explicit Apply button. An orange dot marks Apply as dirty until clicked.
  Reset clears only the staged controls back to hardcoded defaults. Apply persists filter, sort,
  and search state to storage (per-workspace for the local view) only when clicked.
  `TicketView` renders the grid: `FilterPanel` as a collapsible sidebar (expanded by default)
  beside a grid of square tiles. Each tile shows the title, a confidence ring (shadowed track,
  single-color arc, percentage centered inside, an asterisk with a hover tooltip explaining
  "advisory," and a greyed empty track with "N/A" centered when the ticket has zero criteria), the
  gate fraction as plain text ("N/A", sorted last under every sort key, when there are zero
  criteria), a colored state badge, and evidence tags. U2a ships the tags as static placeholders,
  since real evidence data is U2b's job. A selected tile shows a visible highlight.
  `LocalTicketView` wraps `FilterPanel` and `TicketView` for the Tickets tab: no `projects` prop,
  no pagination, no virtualization, no sync button. It reads the open session's live
  `aidos.tickets` projection through `useProjection`, so it updates on every change frame with no
  polling. The tab itself carries a badge with the count of open (non-`done`) tickets.
  Clicking a tile opens a fully generic placeholder detail panel (same content regardless of which
  ticket is selected, since the real panel is U2b's job) and pushes `?ticket=<id>` onto the URL
  (one history entry per selection). Loading that URL directly looks the id up in the
  already-loaded projection: a match reopens the panel, a miss shows a toast plus the generic
  panel. Closing the panel, by its close button or by clicking the same tile again, pops the query
  param and replaces the history entry rather than pushing a new one. A selected ticket that the
  current filter hides still shows in the (still generic) panel; only its tile disappears from the
  grid.
  Autocomplete suggestions appear once typing starts, list title plus ticket-id badge, and jump
  straight to that ticket's detail panel on selection, bypassing Apply. The search box clears
  after the jump; other staged controls survive.
  Loading state is skeleton tiles. A load error is an inline message with a retry button that
  re-issues the same subscribe call. A grid with zero tickets shows a message plus a hint toward
  creation. A grid emptied by the active filter or search shows a different message naming the
  cause plus a clear-filters action. A persistent Create button lives in the grid chrome and in the
  empty-state hint; both open a modal. U2a's modal shows a stub placeholder only, since the real
  form is U2c's job.
  **Out of scope.** Real evidence-tag data (U2b), the real detail panel (U2b), edit/move/signoff/
  send-back (U2c), the real create form (U2c), the cross-workspace global view and its
  `coldSnapshot` fetch, workspace badges, sync button, streaming fill, and partial-failure banner
  (U2d), and the per-ticket allowlist editor (U2e).
  **Implemented 2026-08-22, pending the hands-on GUI check.** Ships as the
  aidos package's own `./client` export (`src/client/`, bundled to
  `lib/client.js`): `board-logic.ts` under a 41-test contract
  (tests/u2a-board-logic.test.ts), `FilterPanel`, the tile and grid, and
  `LocalTicketView`. The tab badge rides the slot label: a thunk reads a
  module-level count, and a count change re-registers the identical
  conversation.view entry to bump the slot version, because the tab header
  only re-renders on slot mutation and that remounts the view by design.
  View state lives in a module-level per-session store, so the remount is
  invisible. Two known limits: the badge count goes stale while the Tickets
  tab is not mounted (it refreshes on entry), and the label shows the count
  of the last session whose board mounted. The projection view gained
  `updatedAt` and `workspaceKey` (host-side) so the Time-updated sort and
  per-workspace filter storage work from live data. The pure logic is
  verified; the visual checks below still need eyes on the real GUI.
  **Evaluate:** the Tickets tab appears beside Chat and Trajectory, and its badge count changes live when a ticket's state changes, with no page reload
  a ticket created through another path appears in the grid with no reload, proving the live subscription rather than a one-time fetch
  toggling a filter or sort control shows the orange Apply-dirty dot immediately and clears it after Apply
  reset restores only the staged controls, leaving the last-applied state intact until Apply runs again
  each of the four sort keys, and each key's documented tiebreak, produces the right order, and the ascending/descending toggle reverses it
  a zero-criteria ticket shows N/A in the ring and sorts last regardless of the active sort key or direction
  typing a partial title or id narrows the autocomplete list to loaded tickets only, and picking a suggestion opens that ticket's panel directly and clears the search box
  selecting a tile sets `?ticket=<id>`, and reloading the page with that param reopens the same ticket or shows a not-found toast
  closing the panel, either way, pops the query param and does not leave a stray back-button entry
  the two empty-grid messages read differently, and the filtered case offers a clear-filters action
  create opens a modal holding only a stub placeholder, not a working form
- [x] **Ticket U2b: Ticket detail panel and evidence.** Replaces U2a's generic placeholder panel
  with the real detail view: fields, criteria, and evidence grouped by the criterion it addresses,
  with uncovered criteria highlighted. Builds the real evidence tags U2a's tiles currently show as
  placeholders.
  **Scope (grilled 2026-08-24).**
  - **Layout.** The detail panel keeps the side placement. Ticket fields (title,
    description, state badge, confidence ring, gate fraction) render on top,
    always visible. Evidence grouped by criterion sits in a collapsible
    section below, collapsed by default when there are many rows.
  - **Uncovered criteria** (criteria with no evidence rows) are highlighted
    with a muted background tint and dimmed text. No icon, no badge.
  - **Tile evidence tags.** Each evidence kind with at least one row shows as
    a tag on the tile carrying a count (for example `check 2`). The color is
    deterministic from the kind name. The placeholder chips in U2a are
    replaced.
  - **Criterion addressing (settled 2026-08-24: named criteria with a
    write-boundary check).** An evidence row's payload carries an optional
    `criteria` field naming the criterion text it addresses. `attachEvidence`
    validates at the write boundary: when `payload.criteria` is present, it
    must exactly match one of the ticket's criterion lines (trimmed). A
    mismatch refuses, naming the criterion — the same spirit as the
    allowlist paths check. A test pins the refusal.
  - **Read-only.** No actions in this ticket. Editing, moves, signoff, and
    send-back are U2c.
  - **Remote call path.** The board has no generated typert client bindings
    (aidos hand-writes `@Remote`). Writes in U2c and later POST the
    client-request envelope directly to `/api/aidos/<method>` (the recipe
    pinned in B2). U2b itself is read-only and needs no Remote calls; it
    reads the `aidos.evidence` projection alongside `aidos.tickets`.
  **Status: not started.**
  **Evaluate:** a ticket with evidence in two kinds shows two count tags on its tile
  a criterion with no rows is tinted and dimmed; one with rows is not
  evidence with a `criteria` payload field groups under that criterion, and the board shows an ungrouped bucket for rows written before the check existed
  attaching evidence whose `criteria` names no criterion line refuses, naming the criterion
  the detail panel opens at the side, shows fields on top, and the evidence section collapses and expands
  a dropped connection reconnects and the view is correct afterward with no refresh

- [ ] **Ticket U2c: Ticket actions.** Create (replacing U2a's stub modal), field editing, state
  moves, signoff, and send-back, all through the Remote endpoints. Gate refusals surface as
  readable text naming the missing kind.
  **Scope (grilled 2026-08-24).**
  - **Create form.** Title, description, and criteria only. Phase, order, and
    slug are set later through edit. The modal replaces U2a's stub.
  - **Edit.** Inline per-field editing: each field (title, description,
    criteria, phase, order, slug) has an edit button that turns the field
    into an input with Save and Cancel. One field per save.
  - **State moves.** User-owned transitions show as buttons always:
    signoff (`open` to `in_progress`), mark done (`awaiting_verification` to
    `done`), send-back (`awaiting_verification` to `in_progress`). The other
    legal transition (`in_progress` to `awaiting_verification`) hides in an
    advanced modal or spoiler.
  - **Signoff** opens a confirmation dialog that explains what signoff means
    (the agent gets write access). Confirm attaches `builtin:user_signoff`
    and moves the ticket.
  - **Send-back** requires a reason: a text area, and the reason attaches as
    a user comment before the move. Two events, one click.
  - **Mark done** is a two-step modal. Step one shows the criteria reminder.
    Step two shows the evidence summary (what the agent claims to have done),
    a final comment field, and Confirm. Confirm attaches
    `builtin:user_verified`, the comment, and moves the ticket.
  - **Gate refusals** surface as a toast that auto-dismisses, with the
    refusal text verbatim.
  - **Comments.** A collapsible comments section below evidence: the thread
    newest first, a text area and Send at the bottom, through
    `userAddComment`.
  - **Evidence attach.** A plain-text attach form in the detail panel: pick a
    user-allowed kind, optional note, through `userAttachEvidence`.
    Screenshots are U3.
  - **Active-ticket focus.** The ticket moved to `in_progress` becomes the
    active ticket. A small Active marker shows on its tile and the detail
    panel defaults to it.
  - **Host-side prerequisite.** `userSetTicket` exists but is NOT a
    `@Remote` (`aidos-core.ts:645`). This ticket adds the `@Remote`
    decorator so the board can create and edit. The write path is the raw
    client-request POST from U2b's note: `payload.args` carries `{ agentId:
    <sessionId>, args: <business args> }` (the dsh-agent lookup wire).
  **Evaluate:** the `userSetTicket` Remote is live and pinned by `b2-user-setticket-remote`, and the eight action components are built and wired into DetailView
  a ticket created through the modal appears in the grid with no reload
  editing a field saves one field
  signoff with confirm moves `open` to `in_progress` and shows the Active marker
  send-back with no reason is refused; with a reason it comments and moves
  mark done shows criteria then evidence then confirm, and moves on confirm
  a gate refusal (for example mark done with no `user_verified`) surfaces as a toast naming the missing kind
  the `in_progress` to `awaiting_verification` move hides behind the advanced control
  the allowlist half of `userSetTicket` is U2e

- [ ] **Ticket U2d: Global cross-workspace Tickets entry.** The sidebar-footer entry near New
  Session. Wraps U2a's `FilterPanel`/`TicketView` with the `projects` filter enabled, the
  `aidos.coldTickets` Remote fetch per visible session, a colored `aidos#<n>` workspace badge
  (color from a deterministic hash of the full workspace path, so colliding last-path-segments
  still differ; hover reveals `aidos/<slug>` plus the full path), a manual sync button that doubles
  as its own fetch spinner, refetch on tab focus and on visibility change, tiles streaming in per
  session as each `coldSnapshot` call resolves, and a banner for any session whose fetch failed
  while the rest of the grid still renders. Load-more pagination, since this view fetches per
  session over the network rather than reading one live projection.
  **Scope (grilled 2026-08-24).**
  - **Sessions shown.** Every session that has an aidos project. No picker,
    no search-to-add. The grid grows as more workspaces use aidos.
  - **Tile click.** Opens a read-only detail panel for that ticket's fields
    and evidence. No actions in this view. The panel offers to open the
    owning workspace's session (a deep link into that session's board) or to
    create a new session in that workspace.
  - **Freshness.** Fetch on mount and on tab focus and window focus. A manual
    sync button refetches all sessions and doubles as its own spinner. No
    timer.
  - **Host-side prerequisite.** `aidos.coldTickets(sessionId, opts)` does
    not exist. This ticket adds it: the host resolves the session and
    cold-reads its `aidos.tickets` projection via
    `ctx.sessionProjectionCache.coldSnapshot`. The client reads projections
    only for open sessions, so this is the cross-workspace read path.
  **Evaluate:** the global board lists tickets from every session that has an aidos project, and each tile carries a workspace badge whose color is a deterministic hash of the full workspace path
  a session whose fetch failed shows a banner while the rest of the grid still renders
  tiles stream in per session as each fetch resolves, and the sync button refetches all sessions

- [ ] **Ticket U2e: Per-ticket allowlist editor.**
  **Scope (grilled 2026-08-24).**
  - The editor is a modal opened from the detail panel (in-progress tickets
    only). A text area holds one path per line, plus a preview of the union
    with the other in-progress tickets' allowlists. Save sends the whole list
    through `userSetTicket` with the `allowlist` field.
  - **Approval record.** Saving also writes a `builtin:file_allowlist`
    evidence row (author `user`, payload `{ paths: string[] }`) with the new
    paths, matching the A7 design where the row is the durable approval
    record. The ticket field and the row are written together.
  **Evaluate:** adding a path through the modal makes a write to that path succeed while the ticket is in-progress, and removing a path makes it refuse again
  the saved list appears both in the ticket's allowlist field and as a `builtin:file_allowlist` evidence row
  the union preview names the other in-progress tickets' paths

- [ ] **Ticket U3: Evidence and screenshots.** `ctx.attachments` stores content-addressed
  images, hash-deduped. Evidence rows reference the attachment refs. Show the confidence score
  and label it advisory.
  **Scope (grilled 2026-08-24).**
  - **A new `builtin:media` kind.** Registered with a typed payload shape:
    `{ ref: <attachmentId>, mime, caption? }`. Screenshots sort and display
    distinctly from text evidence.
  - **Attach flow.** Both a file-picker button in the detail panel's evidence
    section and clipboard paste (Ctrl/Cmd+V while the panel is focused). The
    browser reads the file as base64, sends it through an aidos Remote that
    admits it via the host attachment store, gets back the durable ref, and
    attaches evidence with the typed `builtin:media` payload.
  - **Rendering.** Inline thumbnails in the detail panel's evidence section.
    Clicking a thumbnail opens an expanded viewer. The tile carries a small
    image icon tag.
  - **API facts (verified 2026-08-24).** `ctx.attachments` is an
    `AttachmentStore`: `saveImage(input)` returns a durable
    `ImageAttachmentRef`; `readImage(ref)` returns verified bytes. The host
    apiproxy already admits browser uploads through
    `admitEncodedImages(ctx.attachments, images)`. The aidos Remote for
    admission is net-new (nothing in `src/` reads `ctx.attachments` today).
  **Evaluate:** a pasted screenshot attaches as a `builtin:media` row and survives a restart
  a screenshot renders as a thumbnail in the detail panel and opens full-size on click
  the score is visibly marked advisory, and no control anywhere is enabled or disabled by it

- [x] **Ticket U5: Delete the prototype.** Remove `prototype/` from the repository. It was a
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
  **Done:** `prototype/` directory deleted (all 38 tracked files plus both `__pycache__` dirs gone); `test-25-every-subcommand-prints-json.test.ts` culled as a 21-line no-assertion duplicate of the real `test-25-tool-every-result-is-json.test.ts`; `test-20-cli-author-is-agent.test.ts` renamed to `test-20-author-is-agent.test.ts` and `test-21-cli-refuses-human-only-kinds.test.ts` renamed to `test-21-refuses-human-only-kinds.test.ts` (the `cli` prefix was a prototype-era leftover; content unchanged). Port map: the Python prototype was replaced by the TS suite under `packages/aidos/tests/`; no TS file imports from `prototype/` — the only remaining references are historical doc comments in `src/plan/plan.ts:2` and `src/kernel/store.ts:2`.
  **Evaluate:** `prototype/` is gone, the suite still passes, and no TS file imports anything from it
  the commit names the port map that replaced it


## Phase 5: Tools, scripting, and skills — `pending`

**Goal.** The extension surface.

- [ ] **Ticket T4: Skills.** On dsh: `ctx.skills` plus the filesystem provider plus the `skill`
  tool. The preset tool groups are the always-on core; a skill activates a further group.
  **Status: the dsh half is built, the aidos half is not.** `ctx.skills`, the filesystem
  provider, and the `skill` tool all ship with dsh. The aidos package contains no
  `SKILL.md`, so the preset ships no skill directory. This is the same gap C4 records
  for the plan skill. The token measurement has never been taken.
  **Evaluate:** the always-on core is measurably small in tokens, and the number is recorded
  a task needing an inactive group triggers activation and then completes

- [x] **Ticket T5: Scratch workspaces and the scratch tool suite.** The scratch design in this
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
  **Subagents share the scratch root too** (decided 2026-08-22). The scratch
  directory is durable memory across agents, not a private ledger for one
  agent. A delegated child reads and writes the same `<scratch-root>/` tree
  its parent uses, including writing a file a sibling subagent or the parent
  later reads, so two agents can hand off state through a plain file, not
  only through the message channel between them. `childPathScope`
  (`src/tools/allowlist.ts`), the guard a parent installs on a scoped child,
  must always include the workspace's scratch root in its allowed list, on
  top of whatever directory scope the parent grants for the delegated task.
  A child scoped to `src/` for its ticket can still read and write
  `<scratch-root>/`.

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
  not anchors.
  **Settled 2026-08-24 by grilling: delegate.** `scratch_edit` delegates to
  whatever `edit` the scope resolves and inherits its grammar. With hashline
  it uses anchors; with the builtin edit it inherits that grammar. One
  editing grammar per session is the point.
  **The scratch path reaches the agent through tool results plus a preset
  note (settled 2026-08-24).** `scratch_read` and `scratch_write` return the
  resolved scratch root in their results, and the aidos preset's prompt
  mentions it. No dedicated `scratch_root` tool, no system-prompt stamp.
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
  **Evaluate:** `scratch_write("notes.md", ...)` writes `<scratch-root>/notes.md` from a session whose cwd is any directory
  a path that escapes the root, by `../` or by an absolute path, is refused
  a scratch write succeeds while a ticket is in-progress and the allowlist union is empty
  `scratch_read` returns anchors that `scratch_edit` accepts, and a stale anchor is refused rather than fuzzy-matched
  the directory survives a restart, and clearing removes it from disk

- [x] **Ticket T6: Archived-session manager.** Done in a separate repo. Dropped from this plan. **Evaluate:** delivered in a separate repo; nothing to implement in this plan.

- [ ] **Ticket D1: Dependency tracking.** A ticket carries an informational `dependsOn`
  list of `<workspaceKey>:<ticketId>` references (cross-workspace allowed). No gate
  enforces it; the board shows it.
  **Evaluate:** the kernel stores and validates the field, the invariant refuses self-dependencies and cycles, and the `set_ticket` tool passes it through
  the search Remote finds tickets by title or id, and dependency badges render in the tile and the detail panel

## Phase 6: Board and import fixes — `pending`

**Goal.** The detail view reads like a dossier, not a wall of raw fields, and
the plan format round trips description and phase.

- [ ] **Ticket U6: Badge, pill, and tile cleanup.** Every badge and pill gets white
  text on its existing background, so no variant reads grey-on-grey. The ticket
  id renders as a colored badge (deterministic color from a hash of the full id
  or workspace key, per C5's display rule) with the full id on hover, in the
  detail header left of the title and on each tile; the tile drops its global
  `title` attribute so the hover reaches the badge. The `builtin:imported_state`
  tag renders in a friendlier shape on the tile and in the detail view.
  **Evaluate:** no badge or pill anywhere renders grey text on a grey background
  the ticket id badge color is stable per id and its hover tooltip shows the full id
  hovering the tile shows no browser title tooltip, and hovering the id badge does
  the evidence tag row reads as a label with a count, not a raw kind id with a number
- [ ] **Ticket U7: Detail header and quick-facts table.** The confidence ring leaves
  the detail view. A wikipedia-style summary table sits at the top: Gate, Confidence,
  Phase, Order, always visible. Gate renders as m/n with a label, not a bare
  percentage. Description moves directly below the table. An empty description shows
  an empty-state note.
  **Evaluate:** the summary table shows all four rows with labels, and gate reads as m over n
  the confidence row carries the advisory marker
  description sits below the table and an empty description shows an indicator
- [ ] **Ticket U8: Description from the plan body.** The detail view renders
  `description` (not `body`) as its editable description, which U7's section shows.
  No host change: import and export own the field mapping (P12).
  **Evaluate:** the detail view shows and edits the description field, and no client code reads `body`
- [ ] **Ticket U9: Collapsible sections.** Dependencies and Evidence become bordered
  panels with a header row that collapses the body. Evidence keeps its
  auto-collapse-when-more-than-six-rows rule. Description and Comments stay open.
  **Evaluate:** Dependencies and Evidence each collapse and expand through their header row
  the Evidence section opens collapsed when the ticket holds more than six rows
- [ ] **Ticket U10: Evidence as bullets.** Each evidence row renders as one bullet:
  kind label, author, criterion it addresses. The uncovered tint stays.
  **Evaluate:** each evidence row is one bullet carrying kind, author, and criterion
  uncovered criteria keep the tint
- [ ] **Ticket U11: Textarea overflow.** The detail panel, the create-ticket modal,
  and the comments form render outside `.aidos-root`, so the global border-box
  reset misses them and `width: 100%` plus padding overflows to the right. Extend
  the box-sizing rule to the aidos subtree everywhere it mounts.
  **Evaluate:** the create-ticket textareas, the comment textarea, and the evidence
  note stay inside their containers at narrow widths
  the field-editor textarea in the detail panel does not overflow
- [ ] **Ticket P12: Import and export carry description and phase.** Import maps the
  plan body to the ticket description and keeps the criteria. A `## Phase N: <title>`
  heading sets the phase number and title of every ticket after it; any other heading
  leaves phase 1. Export emits description as the body prose, emits phase headings,
  and writes criteria with the two-space continuation prefix it forgot. Phase creation
  rides the existing `phase/set` event.
  **Evaluate:** importing a phased plan puts each ticket in its heading's phase with the heading as phase title
  a ticket's plan body appears as its description in the detail view
  import then export reproduces the input document including phase headings and multi-line criteria
  the existing round-trip tests still pass on single-phase documents
- [ ] **Ticket U12: Plan meta modal.** A button on the board chrome opens a modal
  showing the stored plan meta from the `aidos.plan` projection: frontmatter,
  preamble, and each context section, each section collapsible. An edit mode saves
  changes through the new host Remote.
  **Evaluate:** the modal shows frontmatter, preamble, and every context section with per-section collapse
  editing a section and saving updates the stored plan meta
- [ ] **Ticket P13: Agent plan meta tools.** `plan_meta` returns
  `{frontmatter, preamble, contextSections}` as JSON. `plan_meta_set` replaces the
  whole meta with the same whole-value rule as plan_import. Both masked from
  subagents like the other plan tools.
  **Evaluate:** `plan_meta` returns the parsed meta of the session's project
  `plan_meta_set` replaces the meta and the change survives replay
  a subagent calling either tool is refused

- [ ] **Ticket P14: Real frontmatter parsing with standard libraries.** The
  frontmatter stays a verbatim string today, and the hand-rolled fence handling in
  `plan.ts` is the kind of code a maintained library replaces. Add `gray-matter`
  and `yaml` as dependencies (the audit rules allow well-scoped libraries; the
  kernel stays dependency-free — the imports live in `src/plan/` only). The
  frontmatter becomes parsed data on `PlanDocument` (the raw text keeps riding
  for round-trip fidelity). The ticket-line grammar (`- [MARK] **Ticket ID:
  Title.**`, the Evaluate marker, two-space continuations) is
  aidos-specific and stays hand-rolled.
  **Evaluate:** a plan with YAML frontmatter exposes its fields on the parsed document
  a document with malformed frontmatter is refused with a message naming the problem
  the round-trip tests still pass byte for byte on documents whose frontmatter never changed
  `package.json` carries the two dependencies and `src/kernel/` imports neither

- [x] **Ticket U13: The detail panel keeps its shape under long text.** The panel is a
  column flex box with a capped height, so a child with `overflow: hidden` shrinks. The
  quick facts table lost its last row on a short ticket and vanished on a long one. The
  panel children now set `flex: none`. The workspace merge spinner centers in the grid
  area. The `searchTickets` Remote read `ctx.sessions` without declaring it, so the
  dependency search refused with a service error.
  **Evaluate:** a ticket with a several thousand character description still shows every quick facts row
  the dependency search returns matches instead of a service refusal
  the merge spinner sits in the middle of the grid area

- [ ] **Ticket U14: One chip language and one token set.** `UI-SPEC.md` sections 1, 2, 3,
  8 and 10 define the tokens, the type scale, the chip family, the form rules, and the
  exact class names. This ticket owns `board.css` alone: it adds the state colors and the
  metric background, adds the `.aidos-chip` family, and deletes `.pill`,
  `.aidos-state-badge`, `.aidos-evidence-tag`, `.aidos-dep-badge`, `.aidos-id-badge`, and
  `.aidos-ticket-id-badge`.
  **Evaluate:** every chip on the board is 18px tall with white text and a 3px radius
  no textarea or input overflows its container in the detail panel or in any modal
  the removed class names appear in no stylesheet and in no component

- [ ] **Ticket U15: The card follows variant A.** The tile carries an id chip and a state
  chip on the first row, the title over at most two lines, a description preview over at
  most two lines, and one chip row holding gate, confidence, and evidence counts. The
  grid holds four columns, two while the detail panel is open.
  **Evaluate:** a tile with a long title clamps at two lines instead of clipping mid word
  the gate chip reads `Gate 0/1` and the confidence chip reads `Conf 0%`
  opening the detail panel drops the grid to two columns

- [ ] **Ticket U16: The detail panel follows the spec.** Header, quick facts with `State`,
  `Gate`, `Confidence`, `Phase`, `Order` and `Slug`, the description rendered as markdown
  with a clip past 320px, criteria as bullets with the covered count in the heading,
  dependencies, evidence as plain bullets, comments, and a left aligned action row under
  the quick facts. The stray field editors for criteria, phase and order go away.
  **Evaluate:** an imported ticket shows its criteria as bullets and not as evidence rows
  the evidence panel holds one bullet per row and no `Ungrouped` bucket
  the description renders bold, code and lists instead of raw markdown text
  no bare value with an Edit button sits below the description

- [ ] **Ticket U17: The ticket view carries the slug.** The kernel has held `slug` and
  `workspaceKey` since C5, and the documented global id is `<workspaceKey>:<slug>`. The
  client built its own id from the numeric ticket id instead. The projection now carries
  the slug, and every id chip derives its label, its color and its hover text from the
  real global id.
  **Evaluate:** the hover text of an id chip reads `<workspaceKey>:<slug>`
  the tool output schema for `get_tickets` accepts the new field
  two workspaces whose paths end in the same segment still render different chip colors

- [ ] **Ticket U18: The board tiles inside its view.** The grid column and the detail
  panel each scroll on their own, and neither one grows the page behind the board. The
  layout caps its height, both panes carry their own scroll, and the grid chrome stays
  visible while the tiles scroll under it.
  **Evaluate:** scrolling the tile grid leaves the detail panel where it is
  scrolling the detail panel leaves the tile grid where it is
  the page behind the board shows no scrollbar of its own
  the ticket count and the Plan and Create controls stay visible while the grid scrolls

- [x] **Ticket U19: The bundles load under the harness.** `gray-matter` calls `require`
  at runtime. The node bundles are ESM, so esbuild's shim threw `Dynamic require of
  "fs" is not supported` and the whole plugin tree failed to load. Every node bundle now
  carries a banner that builds a real `require` from the module URL. The unit tests run
  the source, not the bundle, so they could not see this: `build.mjs` now ends with a
  probe that bundles the plan parser with the same settings, imports it, and parses a
  document with frontmatter.
  **Evaluate:** the dsh profile loads the aidos plugin with no dynamic require error
  a build whose bundle cannot load fails with a named probe error instead of passing

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

- [ ] U6/U11 (the board restyle) — click through the board on a live session: id badge colors differ between workspaces with the same last path segment, the badge hover shows the full id, evidence tags read as labels with counts, no pill renders grey-on-grey, and the create-modal textareas, comment textarea, and detail field editor stay inside their containers at narrow widths. Confirm the evidence tag wrapper (its fixed-height row rule was dropped) still reads well when tags wrap.
- [ ] U7-U10 (the detail view) — open a ticket: the summary table shows Gate m/n, advisory Confidence, Phase, Order; the description section sits below the table with the empty-state note; Dependencies and Evidence collapse through their header rows; evidence renders as one bullet per row; Sign off right-aligns.
- [ ] U12/P13 (plan meta) — open the Plan modal from the board chrome, edit a block, save, reopen, and confirm the change persisted. On a fresh session, confirm a subagent can see neither plan_meta nor plan_meta_set in its tool list.
- [ ] P12 (reimport) — after the delete-and-reimport, confirm the board shows phases matching the plan headings, descriptions carry the plan prose, and `plan` export re-imports byte for byte.
- [ ] C5 — the badge and cross-workspace display need the board (B3): two workspaces whose paths end in the same segment must render distinct badge colors, and a `#number` / bare slug in a session must never reach another workspace. Kernel resolution is unit-tested; the rendering halves ship with the board.
- [ ] A4 bash-ask — with one ticket in-progress and another awaiting verification, a bash call must NOT ask; with only awaiting-verification, it asks. Exercise both on a live session.
- [ ] B3 (the board in daily use) — work real tickets through it for one session and say whether the gate refusals help or annoy. That judgment cannot be made from tests. Retargeted from the Python prototype on 2026-08-21, because U5 deletes it.
- [ ] Ticket P8 — drive a ticket that has a passing check and no review, and say whether the refusal reads clearly at the terminal and names the right kind.
- [ ] Ticket P7 duplicate creation records — `v_projects` and `v_tickets` carry no `GROUP BY`, unlike the other five views. Two `ticket.created` records sharing one id would return the ticket twice, and the old projection collapsed them by last-write-wins. The store never writes a duplicate, so this needs a hand-written log. Decide whether the views should defend anyway.
- [ ] B3 — the `aidos.coldTickets` Remote's latency on a cold session for the "re-read on focus" rule.
- [ ] B1 — container-confirmed (user test log): the six tools appear with the correct constraints, refusals are clean, and the open mask hides write/edit/bash. The remaining half — a signoff unlocking the in-progress tier — needs B2's human surface and is retested then.
- [ ] B3 — the subagent dir/file guard, hands-on: a child scoped to one directory cannot reach another through read/write/edit OR through bash. The bash workdir clamp is in (`childPathScope`), so verify a `src/`-scoped child cannot bash into `docs/`, and judge whether the clamp blocks legitimate child work.
- [ ] Fresh session (aidos preset) — the six board tools (get_tickets/set_ticket/attach_evidence/move_ticket/plan/plan_import) and `tool:aidos` appear; exercise the state-gated tiers (open tier hides write/edit/bash; awaiting-verification asks on each bash call).
- [ ] U2b/U2c (the board in daily use) — work real tickets through the detail panel and actions for one session: signoff, mark done, send-back with a reason, comments, evidence attach. Say whether the gate refusals help or annoy. That judgment cannot be made from tests. The U2c host half lands here too: POST `/api/aidos/userSetTicket` for a create and an edit on a live session (the envelope and the `agentId` wire are pinned by `b2-user-setticket-remote`; the live check exercises the real gateway and the real agent lookup).
- [ ] P11 flat format — the round trip on a flat plan (no `## Phase` headings) is byte for byte; a document with no phase heading imports without error, and ticket order survives.
- [ ] A-W3 — open the board panel, confirm toasts and remote calls still work after the id-generation change.
- [ ] A-LOG2 — open the board panel with the console at `debug`, confirm the log is readable and not flooded.
- [ ] A-LOG1 — run a board flow (create a ticket, attach evidence, move it) and confirm the log at `info` shows the tool calls, the gate result, and the append.
- [ ] A-UI1 — open the Tickets tab and confirm the board spans the full width and clears the chat input, Apply and Reset sit at the right edge of the filter panel, and the sort-direction icon sits beside the dropdown, points the right way for each state, and its hover text names the other state.
