# helm implementation plan

This file is a bootstrap artifact with a scheduled death. Phase 1 builds a throwaway ticket
board. That board then imports this plan, and this file is deleted. Everything after Phase 1
lives in the board, not here.

Split of work: the plan and the Phase 1 prototype are written for you. You build helm itself,
from Phase 2 onward.

**Evaluation criteria below are a first draft.** None has your signoff yet. Under helm's own
rules a ticket cannot leave `open` without one, so treat every criterion here as a proposal to
argue with, not a settled contract.

---

## Phase 1: Ticket prototype — `in_progress`

**Goal.** A throwaway board that pins the behavior of the ticket kernel before anyone writes it
in Rust, and that holds this plan so this file can be deleted.

**Constraints.** Python, tkinter, and `sqlite3`. Standard library only. Lives in `prototype/`
in this repository. It is a behavior specification, not a component. No line of it survives
into helm. Throwaway code in a repository you keep does not stay throwaway unless someone
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

- [ ] **Ticket P4: Board.** tkinter. Ticket list and detail, field editing, comments, the four
  states with gate enforcement on every move, and evidence attach including screenshot files.
  A refusal shows the missing kind in plain language.
  **Evaluate:** you use it for a working session without dropping to SQL. Every refusal names
  what is missing. A screenshot attaches, persists, and displays after a restart.

- [ ] **Ticket P5: Node-tree renderer.** Render a declarative node tree into tkinter widgets:
  `stack`, `row`, `text`, `markdown`, `image`, `form`, `input`, `checkbox`, `dropdown`,
  `button`. A form submit produces structured data that lands as an evidence row.
  **Evaluate:** a hand-written node tree renders, and its form submission appears as an evidence
  row on the right ticket with the right author. An unknown node kind renders an error node
  rather than crashing the board.

- [ ] **Ticket P6: Import this plan and delete this file.** Split PLAN.md into tickets by its
  YAML frontmatter and headings. Load the context and rules sections.
  **Evaluate:** every ticket in this file exists in the board with its criteria intact. You
  confirm the board is usable for daily planning. Only then is PLAN.md deleted, in a commit that
  also records why.

---

## Phase 2: helm core — `pending`

**Goal.** The ticket kernel in Rust, with no HTTP and no agent yet.

- [ ] **Ticket C1: Workspace and data directory.** Cargo workspace. Data under
  `$XDG_DATA_HOME/helm`. Config loading, including from a git URL. Project registry keyed by
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

**Goal.** helm talks to a model and to a browser.

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
  survives a helm restart. Clearing removes it from disk and from the database.

---

## Spikes and open risks

- **rquickjs embeds C.** An engine bug can take down the host process, and `Module::load` is
  `unsafe` because malformed bytecode can corrupt the engine. Decide whether tool scripts run
  in-process or in a child process before Phase 5 starts. `boa_engine` is the pure-Rust fallback
  and loses a memory cap, host-async await, and value-level serde.
- **rig ships no HTTP transport.** The bridge from its in-process stream to the WebSocket is
  helm's own code and its own bug surface. Ticket A2 owns it.
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
- A `customize-helm` skill mirroring `customize-opencode`.
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
| Rework/reopen rate | 3 / 3 | P1 and P2 each needed an extra test-and-fix round because my first contract omitted deny-by-default and said nothing about durability. P3 needed one because my contract told import to preserve a `done` mark and also told the agent it could never reach `done`. Those two rules cannot both hold. A subagent found the conflict by writing tests against the contract, before any code existed. Grilling found none of the three. |
| Rough cost | 4 dispatches for P1+P2, 8 for P3 | of the 8, three produced nothing: two `coder` dispatches returned empty without writing a file, and one `general` implementation dispatch timed out. The five that worked were a probe, a test-writing round, a contract revision, the plan parser, and the CLI. Splitting the implementation in two after the timeout is what got it finished. |
| Contract defects found before code | 1 | the import versus `done` conflict. Writing tests against a contract, with no implementation to shape them, is the only step so far that has caught a contradiction rather than a bug. |
