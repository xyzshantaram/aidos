# aidos implementation plan

This file is a bootstrap artifact with a scheduled death. Phase 1 builds a throwaway ticket
board. That board then imports this plan, and this file is deleted. Everything after Phase 1
lives in the board, not here.

How the work is split: you own the architecture and the verification, and the agent writes the
implementation. The thinking happens up front, in long design sessions, so that the agent can
keep working between checkpoints instead of stopping for every small decision. Gates carry the
review in between.

Every user-facing document follows ASD-STE100 Simplified Technical English as closely as the
subject allows. That covers the README, the help text, error messages, and anything the agent
writes for a person to read.

**Evaluation criteria below are a first draft.** None has your signoff yet. Under aidos's own
rules a ticket cannot leave `open` without one, so treat every criterion here as a proposal to
argue with, not a settled contract.

---

## Phase 1: Ticket prototype — `in_progress`

**Goal.** A throwaway board that pins the behavior of the ticket kernel before anyone writes it
in Rust, and that holds this plan so this file can be deleted.

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
  uniformity: tickets, projects, phases, plan meta, kinds, gates, evidence, and comments. `seq`
  is the ordering authority for last-write-wins, and `at` becomes display metadata that no query
  orders by. Two events can share one `time.time()` value, so ordering by `at` picks an
  arbitrary winner. Standard library `sqlite3` cannot register a virtual table, because
  `Connection.create_module` does not exist, so a view is the reachable shape. `json_extract`
  and SQL window functions are both available and do the work.
  The store's read surface becomes explicit query methods, including a paged ticket read taking
  a project filter, a sort key, a limit, and an offset. The dict attributes and
  `rebuild_projection` are deleted, along with the nine call sites in `cli.py` and the two in
  `tests/cli_helpers.py`. The paged read computes the confidence score and the gate fraction as
  columns, so the board sorts on either without loading every row.
  The tests are rewritten in the same change. That is a known risk, accepted on purpose. The
  same hand edits the queries and the assertions that check them, so a wrong view and an
  assertion adjusted to match it can cancel out. Nothing independent guards this rewrite.
  Tickets P1 and P2 stay `done`. This ticket supersedes the mechanism they describe, and it is
  recorded as a rework event in the benchmarking table, because the first contract never
  anticipated paged reads.
  Why the churn is worth it: aidos's Rust side uses `sqlx` over SQLite, so this view SQL ports to
  Tickets C2 and C3 unchanged. The derivation gets written once and serves both implementations.
  **Evaluate:** the full suite passes with no in-memory projection left in the store. A test
  proves last-write-wins follows `seq` and not `at`, using two events written inside one clock
  tick. Reopening the database yields identical reads, because no projection exists to rebuild.
  A page of twenty returns exactly twenty rows and the correct total count. Sorting by score and
  sorting by gate fraction produce different orders on a fixture built to separate them.

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

- [ ] **Ticket P6: Import this plan and delete this file.** Split PLAN.md into tickets by its
  YAML frontmatter and headings. Load the context and rules sections.
  **Evaluate:** every ticket in this file exists in the board with its criteria intact. You
  confirm the board is usable for daily planning. Only then is PLAN.md deleted, in a commit that
  also records why.

---

## Phase 2: aidos core — `pending`

**Goal.** The ticket kernel in Rust, with no HTTP and no agent yet.

- [ ] **Ticket C1: Workspace and data directory.** Cargo workspace. Data under
  `$XDG_DATA_HOME/aidos`. Config loading, including from a git URL. Project registry keyed by
  absolute path, with the `move` command.
  **Evaluate:** a first run creates the data directory and an empty database. `move` repoints a
  project and a later session opens in the new path. A config git URL clones, and a second run
  updates rather than re-clones.

- [ ] **Ticket C2: Event log and projection.** Append-only log. Current state is a projection.
  Author and timestamp stamped at the write boundary.
  **Evaluate:** a test replays a log and reproduces state exactly. A test asserts no code path
  outside the write boundary can set an author. Deleting the projection and rebuilding from the
  log yields identical state.

- [ ] **Ticket C3: Ticket kernel.** States as a Rust enum with an exhaustive transition
  function. Evidence kind registry loaded at startup from builtins and plugin manifests.
  Evidence rows referencing a registered kind. Gate predicates over rows.
  **Evaluate:** the transition function is exhaustive, so adding a state fails to compile until
  every arm is handled. A gate referencing an unregistered kind fails at config load, not at
  gate time. The Phase 1 lifecycle tests are ported and pass against this kernel.

- [ ] **Ticket C4: Plan import and serialization.** Markdown with YAML frontmatter in. Markdown
  out on demand. Context section capped at 500 lines. Rules section writable by the agent.
  **Evaluate:** import, serialize, and re-import produces an identical plan. A context section
  over 500 lines is refused with a clear message naming the overage.

---

## Phase 3: HTTP and agent loop — `pending`

**Goal.** aidos talks to a model and to a browser.

- [ ] **Ticket A1: HTTP and WebSocket.** `poem`. A WebSocket carries the agent-to-client
  protocol. `ts-rs` exports every wire type to TypeScript as a build step. Optional shared token
  so a stray LAN device cannot post.
  **Evaluate:** generated TypeScript matches the Rust types, and a deliberate mismatch fails the
  build rather than reaching the browser. A second device on the LAN connects and receives live
  events. Without the token, a write is refused.

- [ ] **Ticket A2: Agent loop and profiles.** `rig-core`. A profile holds URL, API key, model
  auto-detection, and a preferred model list. Bridge rig's in-process stream onto the WebSocket
  using `futures-util` and `tokio-stream`.
  **Evaluate:** two profiles against the same provider, with different keys, both work in one
  install. Model auto-detection lists models for each. A tool call and its result both appear on
  the WebSocket in order. Cancelling mid-stream leaves no orphaned task.

- [ ] **Ticket A3: Tool dispatch and gate enforcement.** Every state change goes through the
  kernel. A tool call that would breach a gate is refused before it runs, with the missing kind
  named in the error the model reads.
  **Evaluate:** the agent cannot move a ticket to `done` by any tool path. The refusal text is
  specific enough that a model corrects itself rather than retrying blindly. The file allowlist
  is enforced on read and edit tools, not merely recorded.

- [ ] **Ticket A4: Shell tool.** Allow and deny patterns, ask by default for anything unmatched.
  Allow entries must be narrow verbs.
  **Evaluate:** an unmatched command asks and does not run. `git push` is refused while its gate
  is unmet, and is not reachable through `git -C`, `sh -c`, an alias, or a script. A test suite
  of bypass attempts is written first and each one fails to bypass.

- [ ] **Ticket A5: Subagent definitions.** A subagent is defined by a markdown file in the
  config directory, with YAML frontmatter and a body. The frontmatter holds the name, the
  description, the model, the temperature, the tool allow and deny lists, and the permissions.
  The body is the system prompt. Identity stays flat. Every subagent writes as the single author
  `agent`, and its name is metadata on a record rather than an actor of its own.
  A subagent has no access to the ticket board. It cannot create a ticket, edit one, move one,
  or attach evidence. Only the orchestrator touches the board, and it does so under its own
  signoff. That one rule settles two problems at once. The confidence score counts one kind from
  one author once, however many subagents produced the work, so no fan-out inflates it. And
  `allowed_actors` stays a flat list of strings rather than growing into a hierarchy.
  **Evaluate:** a new definition file becomes a callable subagent with no code change. A
  malformed definition fails to load with a message naming the file and the problem, and does
  not stop the other definitions loading. A subagent that calls any board tool is refused, and
  the refusal says the orchestrator is the only actor that may do it. After a session that ran
  several subagents, the log holds no author other than `agent`, `user`, and `system`.

- [ ] **Ticket A6: Subagents run detached.** Depends on Ticket A5. A subagent is a long-running
  job, not a blocking call. The spawn tool starts the job, returns a job identifier at once, and
  never waits for a result. A second tool reports the status of a job. A third returns the
  finished report. A fetch against a job that is still running returns a status, not a partial
  report. Jobs outlive the parent turn and are listed per session. The Phase 1 work is the
  reason this ticket exists: two dispatches returned nothing and one timed out, and a blocking
  call hides all three until the timeout expires.
  A finished report can optionally become a provenance item. The orchestrator attaches it, since
  a subagent cannot write to the board itself. It lands as an evidence row under its own kind,
  with the job identifier, the subagent name, and the start and end times. You can then ask
  later what a named subagent did on a given day, and read its own account of the work rather
  than infer it from the diff.
  **Evaluate:** the parent agent spawns a job and takes its next action in the same turn, before
  that job finishes. A status check names the job, its state, and how long it has run. A report
  fetch against a running job is refused with text that tells the parent to check the status
  again, and it does not block. A subagent that crashes or times out reports a terminal state
  with a reason, so no parent can poll forever. Killing a job stops its process and leaves no
  orphan. Two jobs run at once and neither report is attributed to the wrong job. A report
  attached as evidence carries `agent` as its author and the subagent name as metadata, survives
  a restart, and a query by subagent name and date returns it with its job identifier intact.

---

## Phase 4: Web UI — `pending`

**Goal.** The board you actually use, replacing the Phase 1 prototype.

- [ ] **Ticket U1: Scaffold and live client.** Svelte 5 with Vite. WebSocket client with
  reconnect. Types from `ts-rs`.
  **Evaluate:** a dropped connection reconnects and the view is correct afterward with no
  refresh. No hand-written duplicate of a Rust type exists in the source.

- [ ] **Ticket U2: Board.** Ticket list and detail, field editing, comments, state moves. Gate
  refusals surface as readable text naming the missing kind.
  **Evaluate:** you run a full ticket lifecycle in the browser without touching the prototype.
  Every refusal is legible without reading logs.

- [ ] **Ticket U3: Evidence and screenshots.** Attach, paste, and view evidence, including
  images. Show the confidence score and label it advisory.
  **Evaluate:** a pasted screenshot attaches and survives a restart. The score is visibly marked
  as advisory and no control anywhere is enabled or disabled by it.

- [ ] **Ticket U4: Node-tree renderer.** The same node vocabulary as Phase 1, recursive. Form
  submissions post back and become evidence rows.
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

---

## Phase 5: Tools, scripting, and skills — `pending`

**Goal.** The extension surface.

- [ ] **Ticket T1: Script engine.** `rquickjs` with `AsyncRuntime` and `AsyncContext`. Set
  `set_memory_limit`, `set_max_stack_size`, and `set_interrupt_handler`. Host async functions
  wrapped with `Async(f)` so a script awaits them as promises.
  **Evaluate:** an infinite loop is stopped by the interrupt handler and does not hang the
  server. An allocation loop hits the memory cap and fails the one script without taking down
  the process. A script awaiting a database write does not block a tokio worker. A script cannot
  reach the filesystem, the network, a timer, or a process.

- [ ] **Ticket T2: Tool loader.** A tool is a directory holding `README.md` with frontmatter, a
  description, screenshots, and `script.js`. Drop it in the config directory to add it. Ship a
  `.d.ts` for the tool API.
  **Evaluate:** a new directory becomes a callable tool. A malformed tool fails to load with a
  message naming the file and the problem, and does not stop other tools loading. Editor
  completion works against the shipped types.

- [ ] **Ticket T3: Script standard library.** `ctx`, `ui`, `util`, `store`, following
  nostr-canvas's `prelude.lua` split. `ui` holds node constructors. Raw host bindings stay
  hidden behind the assembled globals.
  **Evaluate:** a tool builds a node tree using only `ui` constructors and it renders. A script
  cannot reach a raw host binding directly. A typo on a global is an error with a line number,
  not a silent undefined.

- [ ] **Ticket T4: Skills.** A small always-on tool core. A skill activates a further group.
  **Evaluate:** the always-on core is measurably small in tokens, and the number is recorded. A
  task needing an inactive group triggers activation and then completes.

- [ ] **Ticket T5: Scratch workspaces.** Session-scoped, durable, with a stable identifier.
  Contents are reachable from the ticket database as agent-readable context. Removed when the
  session is deleted or when you clear it.
  **Evaluate:** the agent creates a workspace, writes per-item subdirectories, builds a
  dashboard over them, and your comments and screenshots land as evidence. The workspace
  survives an aidos restart. Clearing removes it from disk and from the database.

---

## Spikes and open risks

- **rquickjs embeds C.** An engine bug can take down the host process, and `Module::load` is
  `unsafe` because malformed bytecode can corrupt the engine. Decide whether tool scripts run
  in-process or in a child process before Phase 5 starts. `boa_engine` is the pure-Rust fallback
  and loses a memory cap, host-async await, and value-level serde.
- **rig ships no HTTP transport.** The bridge from its in-process stream to the WebSocket is
  aidos's own code and its own bug surface. Ticket A2 owns it.
- **Broad allow patterns reopen the shell bypass.** Ask-by-default is the real control, not the
  pattern list. Ticket A4's bypass suite is the check on this and should be written first.
- **Providers are not uniformly OpenAI compatible.** Translate through rig's provider layer.
  Anthropic's own compatibility layer ignores `strict`, prompt caching, and `reasoning_effort`,
  and Anthropic states it is not production ready.
- **Fossil was rejected.** Only a hard multi-machine sync requirement should reopen it. Its
  ticket schema has no one-to-many child table, so evidence rows are not expressible in it.

## Deferred

- A shell-command classifier, scored against the opencode history database, that approves,
  rejects, or scores a command. Only worth doing once Ticket A4's bypass suite exists to score
  against.
- A skill that explores a command-line tool and helps you author a gate pattern for it.
- A `customize-aidos` skill mirroring `customize-opencode`.
- Multi-person LAN identity. Deferred by decision, not by oversight. Retrofitting it touches
  every write path that stamps an author.

## Human review queue

- [ ] Phase 1 (whole prototype) — use it for one real working session and say whether the gate
  refusals help or annoy. That judgment cannot be made from tests.

## Benchmarking

| Metric | Count / Value | Notes |
|---|---|---|
| Verification catch rate | 3 / 9 | independent checks that caught a real discrepancy, vs. total checks performed. The reopen check found two defects the 29 passing tests missed. Reading the implementation found two more. For P3, five checks found one defect, and the one that found it was reading the finished code. Re-running suites, re-reading tests, and driving the CLI by hand each found nothing new. Reading code is the check that pays. |
| Escaped defect rate | 0 / 2 | bugs found after a ticket was marked `done`, vs. tickets closed. Both P1 defects were caught before the ticket closed, not after. P3 is not closed yet, so it does not count here. |
| Rework/reopen rate | 4 rounds / 3 tickets | P1 and P2 each needed an extra test-and-fix round because my first contract omitted deny-by-default and said nothing about durability. P3 needed one because my contract told import to preserve a `done` mark and also told the agent it could never reach `done`. Those two rules cannot both hold. A subagent found the conflict by writing tests against the contract, before any code existed. Grilling found none of the three. The fourth round is Ticket P7, which discards P1's in-memory projection entirely: my contract never asked how the board would read twenty tickets at a time, so it specified a structure that cannot paginate. Grilling the UI found it, one question in. |
| Rough cost | 4 dispatches for P1+P2, 8 for P3 | of the 8, three produced nothing: two `coder` dispatches returned empty without writing a file, and one `general` implementation dispatch timed out. The five that worked were a probe, a test-writing round, a contract revision, the plan parser, and the CLI. Splitting the implementation in two after the timeout is what got it finished. |
| Contract defects found before code | 1 | the import versus `done` conflict. Writing tests against a contract, with no implementation to shape them, is the only step so far that has caught a contradiction rather than a bug. |
