# PORT-MAP-B1.md

The B1 test tree: the tool-layer ports of the P3 CLI tests (test_20 to
test_25), the P8 pins (test_27, test_30), the policy tests (guard, mask,
bash-ask, allowlist), and the service tests (the C2 evaluate). Every file
lives under `tests/`; the shared double is `b1-harness.ts`; the shared
describe for the plugin surface is `b1-plugin.test.ts`.

SPEC-B1.md sections 4b, 5, 6, 7, 8, and 9 are the contract. The B0 kernel
tests (test-00 to test-32) are untouched and stay green.

## Files

| File | Covers |
|---|---|
| `b1-harness.ts` | The dsh ctx test double: `tools.register/get/guard/restrict/schemas`, `ctx.on` (generic capture), `systemPrompt.section`, `inject` (immediate), `get('approval')`, `agents`/`sessions`/`sessionProjections`/`invariants`/`settings`/`workspaceRegistry`/`subagents` fakes, `reflect.provide` (the real `AidosService` constructor), `effect`, `plugin`. The fake session (log + append + `internal/dispatch`→`session/event` firehose) and fake agents (delegation depth via the session header, so the real `delegationDepthOf` classifies them). Helpers: `runTool`, `successJson`, `failureJson`, `failureWithCode`, `filterAllows`, `seedEvidence`, `seedFromStore`, `tempPlanFile`, `registerTierTools`. |
| `b1-plugin.test.ts` | The shared describe: `apply` registers the six tools with the dsh-tool-goal shape, the `tool:aidos` prompt section, and the four policy installers; every installer returns a disposer; `registerAidosService`/`registerAidosInvariant` mount; `tools.register` unregisters through its disposer. |
| `test-20-tool-author-is-agent.test.ts` | The author is the agent, never the payload (decision 1). A payload `author`/`actor` key never becomes the stored evidence author; the payload is stored unchanged; every tool result is JSON; a refusal is JSON, never a traceback. |
| `test-21-tool-refuses-human-only-kinds.test.ts` | `user_signoff`/`user_verified` refuse with the `human_only_kind` shape naming the kind and saying a human must supply it; a refused kind stores no evidence; the other builtin kinds attach; an unregistered kind refuses with `unknown_kind`. |
| `test-22-tool-no-agent-path-to-done.test.ts` | No agent path to done: refused from awaiting_verification and from the earlier states, the refusal names the missing kind or the allowed actors, the ticket stays put; an all-done plan import lands every ticket in open with the claim as `builtin:imported_state` evidence only. |
| `test-23-tool-refusal-json-shape.test.ts` | The `gate_refused` JSON shape (fromState, toState, missingKinds, allowedActors, message); an unknown ticket gives structured JSON naming the id, no traceback; a refused move changes no state. |
| `test-24-tool-bootstrap-one-project.test.ts` | The default config is deterministic (the B0 mirror) and the service bootstrap binds one workspace project; a second service over the same log creates no second project; the `aidos` settings namespace is registered. |
| `test-25-tool-every-result-is-json.test.ts` | Every JSON tool renders JSON on success and on failure; `plan` renders markdown and is byte-identical for identical state; a bad payload and a missing file refuse cleanly; a parse error names the line and imports nothing. |
| `test-27-tool-lifecycle-with-human-half-blocked.test.ts` | The agent walks the lifecycle as far as a machine may go; the human-only signoff comes from the board; done stays blocked. |
| `test-30-tool-review-pass-is-its-own-kind.test.ts` | The P8 pin: a passing check without a review refuses naming `review_pass`; a review without a check refuses naming `automated_check`; the agent may author the review and it weighs 1.0; a review note does not satisfy the gate. |
| `b1-guard.test.ts` | The delegation-depth guard: a depth-1 agent is refused on every board tool with the orchestrator-only message; a root agent passes; a non-board tool passes for a subagent; the guard re-checks at call time; its surface is string-or-undefined only. |
| `b1-mask.test.ts` | The state-gated masks via the restriction-intersection model: open-only lacks write/edit/bash; one in-progress ticket adds them; awaiting_verification keeps bash and hides write/edit; done-only sees get_tickets only; the mask re-applies on a `ticket/change` event; restrictions intersect. |
| `b1-bash-ask.test.ts` | The bash-ask listener: `ask` for bash while any ticket awaits verification, delegate for other tools, one-shot re-ask; the approval seam mapping (allowed-once proceeds, the non-grants deny, an absent approval service degrades to deny). |
| `b1-allowlist.test.ts` | The write union: one in-progress ticket with `["src/"]` passes a write to `src/` and refuses `docs/` naming the ticket; two in-progress tickets union; `childPathScope` refuses read/write/edit outside the allowed root naming the root, and admits a file allowlist. |
| `b1-service.test.ts` | The C2 evaluate: appends land in the log as the aidos event types; the invariant rejects a corrupt record before the log changes; rebuilding from the log yields identical state; the author is stamped by the service, never the payload. |
| `node-modules.d.ts` | The small `node:fs`/`node:os`/`node:path` surface the plan fixtures need (the package has no @types/node); merges with the implementation's own declarations. |

## The harness contract (the ctx surface the tests fake)

- `tools.register(def) -> disposer`, `tools.get(name)`, `tools.guard(fn) ->
  disposer`, `tools.restrict(filter) -> disposer` (records the filter and the
  calling scope), `tools.schemas(scope)` (the mask's deny-list input).
- `on(type, listener, opts?) -> disposer` for any event the wiring uses,
  captured generically (`tools/pre-execute`, `agent/session-start`,
  `session/event`, `internal/dispatch`, ...).
- `systemPrompt.section(section)` captured.
- `inject(services, cb)` invokes `cb(ctx)` immediately with the fakes for
  `sessionProjections` (register capturing), `invariants` (register
  capturing), `settings` (register capturing + a settable value), and
  `workspaceRegistry` (a controllable binding).
- `get(name)` resolves the approval seam: `ctx.get('approval')` returns a
  controllable `{ request }`; `undefined` degrades to deny.
- The fake `Agent` (id, status "running", session with `events`/`append`/
  `header`, ctx with a scope-recording tools view) and `agents`
  (get/roots/list/currentInitiator).
- The harness constructs the REAL `AidosService` over the fake session
  (`new AidosService(ctx, config)`), so the C2 evaluate runs against real
  logic. `reflect.provide` makes `ctx.aidos` resolve; `effect` and `plugin`
  are the other cordis hooks the service touches.
- `runTool(name, args)` resolves the captured definition and calls
  `execute(args, exec)` with a minimal ToolRunContext, then normalizes the
  outcome exactly like the registry: success content is
  `output.render(args, value)`; a thrown `HarnessError` becomes
  `{ isError: true, error: { message, info: { name, code } } }` with the
  `Error: <message>` text content.

## Prototype module to TS file (tool layer)

| Prototype module | TS file | Adaptation |
|---|---|---|
| test_20_cli_author_is_agent | `test-20-tool-author-is-agent.test.ts` | The CLI always acts as "agent" → the tool body passes `exec.agent` to the service, which stamps the actor. The flag-rejection claims (no `--author`/`--actor` flag) port as "the parameters schema has no author/actor field"; the payload-key claims port directly. The kernel event vocabulary has no ticket author field, so the stored-author claim reads the `evidence/attached` row the log records. |
| test_21_cli_refuses_human_only_kinds | `test-21-tool-refuses-human-only-kinds.test.ts` | The CLI's refusal object ports to the `human_only_kind` HarnessError: `{ ok: false, error: "human_only_kind", kind, message }`, message names the kind and says a human must supply it. `AGENT_KINDS` becomes the B0 five-kind agent-authorable list (`builtin:imported_state` is system-only). |
| test_22_no_agent_path_to_done | `test-22-tool-no-agent-path-to-done.test.ts` | The CLI's `move-ticket` refusal ports to `gate_refused` with `fromState`/`toState`/`missingKinds`/`allowedActors`/`message` (camelCase, not the prototype's snake_case). The import of an all-done document runs through the tool on a second harness (the prototype's second database); `source` is the file path given. |
| test_23_refusal_json_shape | `test-23-tool-refusal-json-shape.test.ts` | The refusal JSON object ports key for key (camelCase). "No traceback" ports as the refusal being a `HarnessError` whose message is JSON and contains no stack frames. |
| test_24_init_is_idempotent | `test-24-tool-bootstrap-one-project.test.ts` | The CLI's init ports to the service bootstrap: one workspace project per session, a second service over the same log binds the same project. The deterministic config stays the B0 mirror. |
| test_25_every_subcommand_prints_json | `test-25-tool-every-result-is-json.test.ts` | `init` → the service bootstrap (test-24); `create-ticket`/`set-ticket` → `set_ticket`; `show`/`list` → `get_tickets`; `attach-evidence` → `attach_evidence`; `move-ticket` → `move_ticket`; `plan export` → `plan` (the one markdown result); `plan import` → `plan_import`. Exit codes become `isError`; stdout JSON becomes the rendered content / the refusal message. |
| test_27_lifecycle_with_human_half_blocked | `test-27-tool-lifecycle-with-human-half-blocked.test.ts` | `attach_as_human` becomes the harness's `seedEvidence` (the board appends the user-authored row to the session log); the moves go through the tools. |
| test_30_review_pass_is_its_own_kind | `test-30-tool-review-pass-is-its-own-kind.test.ts` | The score reads the `get_tickets` rows' `confidenceScore`. The refusal pins the missing kind by its full `builtin:` id. |

## Policy-test coverage list (SPEC-B1 section 9)

- **Guard**: depth-1 refused on every board tool with the orchestrator-only
  message; root agent passes; non-board tools pass for subagents; re-check at
  call time; monotonic string-or-undefined surface.
- **Mask**: open-only lacks write/edit/bash; one in-progress ticket adds them
  (the union); awaiting_verification keeps bash and hides write/edit;
  done-only sees get_tickets only; re-applies on a `ticket/change` event;
  restrictions intersect (the mask never re-adds a tool another restriction
  removed).
- **Bash-ask**: `ask` for bash while any ticket awaits verification, delegate
  for other tools, each call asks again (one-shot); approval resolution:
  allowed-once proceeds, rejected/cancelled/unavailable deny, absent approval
  service degrades to deny.
- **Allowlist**: the write union (one in-progress ticket `["src/"]`: write to
  `src/` passes, `docs/` refuses naming the ticket; two tickets union);
  `childPathScope` refuses read/write/edit outside the allowed root naming the
  root, admits a file allowlist, and leaves non-path tools alone.
- **Service (C2)**: appends land as the aidos event types; the invariant
  rejects a corrupt record before the log changes; deleting the projections
  and rebuilding from the log yields identical state; author stamping lives in
  the service (a payload author key never becomes the stored author).

## Adaptations made during reconciliation (one line each)

- The mask computes its deny list from `ctx.tools.schemas(scopeOf(ctx))`, so
  the harness fakes `tools.schemas` and the mask tests register the tier tool
  names (`registerTierTools`) — with only the six board tools registered, the
  open tier would deny nothing.
- The in-progress tier denies nothing, so the mask registers no restriction
  there; the mask tests assert through the harness's restriction-intersection
  model (`effectiveToolSet`) instead of "the latest restriction".
- The `plan_import` tool reads the file through `node:fs` (resolved under the
  session workspace root), not `ctx.fs`; the tests write real temporary files
  (`tempPlanFile`) and pass absolute paths; the imported row's `source` is the
  path given.
- The allowlist guard names the in-progress ticket by its **id** ("in-progress
  ticket 1"), not its title.
- A non-object `attach_evidence` payload is refused by the parameter schema as
  `INVALID_ARGS` before the tool body runs; a `bad_payload` refusal is the
  service-level shape.
- The service appends one `project/created` at construction (the C1 workspace
  binding) and one `phase/set` on a ticket create when the phase is absent;
  the service tests assert behavior and event kinds, never exact event counts
  around the bootstrap.
- `ticketStates` folds on read, so seeding the session log before (or after)
  constructing the service works; the harness fires `internal/dispatch` before
  `session/event` so the invariant companion's staged fold observes appends.
- The agent's delegation depth rides `session.header.delegationDepth`, so the
  real `delegationDepthOf` classifies the fake agents without mocking
  `@deepseek-ai/dsh-subagent`.

## Claims that could not port, with the ticket that carries each

| Claim | Prototype / SPEC | Why it cannot port | Ticket |
|---|---|---|---|
| `attach_evidence` offers a kind named `subagent_report` | SPEC-B1 decision 3 | The kernel constant table registers `builtin:agent_report`, not `builtin:subagent_report`; the short name `subagent_report` cannot resolve to a registered kind. The tests use the B0 five-kind agent-authorable list. | B1 |
| The CLI flag spellings, exit codes, stderr, and the subprocess | test_20, 23, 25, 27 | The tool layer has no flags and no exit codes; refusal state is `isError` and the refusal is a `HarnessError` with a JSON message. | B1 |
| `show`'s ticket object with an `evidence` list | test_24, 25 | The board read model is `get_tickets` (projection rows with `confidenceScore`/`gateFraction`); the per-ticket evidence view is B3 board surface. | B3 |
| A second `init` keeps the tickets by reading them back | test_24 | The bootstrap only binds the project; ticket persistence across service mounts is the log (tested by the rebuild test in `b1-service`). | B1 |
| The `--project ID` default of 1 for every subcommand | cli_helpers | The session's workspace project is the default; explicit ids are `projectId` in the tool args. | B1 |
| The exact refusal text of the CLI ("missing evidence kinds: ...") | cli_helpers | The tool's `gate_refused.message` carries the kernel `GateRefused` message; the refusal JSON fields are the structured contract. | B1 |
| A gate referencing an unregistered kind fails at config load | SPEC-B1 decision 14 (C3's evaluate) | The service's `resolveConfig` implements it (throws at load), but the B1 test plan does not pin it; a config-load test belongs to C3. | C3 |

## Typecheck and test result

`npm run typecheck:tests` passes clean (src and tests, zero errors). `npm test`
(vitest run) is green: 47 files, 213 tests — the B0 kernel suite (33 files)
stays green alongside the B1 files.

The implementation dispatch landed while the tests were being written; the
tests were reconciled against the landed wiring (the mask's schemas-based deny
list, the node:fs plan read, the id-naming allowlist refusal, the INVALID_ARGS
payload refusal). The B1 files import only exports that exist.

## Things a merge pass should double check

- The mask tests drive the re-apply through the harness's `fireSessionEvent`
  after each state change, in addition to the auto-fire on append; if the
  service's fold ever becomes subscription-only (instead of folding the whole
  log on first read), the seeded-before-construction cases would need the seed
  to happen after construction instead.
- The `plan_import` file read is real `node:fs`; if the implementation moves
  to a sandboxed `ctx.fs`, the temp-file fixtures still work when the file
  paths match, but the fixture helper may need to seed the fake fs instead.
- The refusal JSON includes `ok: false`; the tests assert the `error` field
  and the SPEC-listed fields, not `ok` — either spelling passes.
- The done-only mask seed drives the whole lifecycle through the kernel Store
  with `actor: "user"`; the DEFAULT_GATES allow it, and the seeded project
  path matches the harness workspace so the service binds instead of creating
  a duplicate.
