# PORT-MAP.md

The B0 test tree, one vitest file per prototype module. The kernel reads
kinds, weights, and gates from one `AidosConfig` value injected at store
construction, so every `make_store(kinds)` and `set_gate(...)` call becomes
a config value. Reopen becomes replay: `storeFromLog(log, config)` builds a
fresh store from the old store's log and the tests compare views.

Files: `helpers.ts` plus `test-00-constants-mirror.test.ts` (the mirror
pin) and `test-01-replay.test.ts` through `test-32-tickets-page.test.ts`.
The audit pin (test_19's port) lives in `test-19-registry-changes-audited.test.ts`.

| Prototype module | TS file | Adaptation notes |
|---|---|---|
| test_01_replay | `test-01-replay.test.ts` | Reopen becomes replay. Config carries user_signoff weight 2.0 and the one gate; the two register/weight/gate records leave the log (config is not log). Refused moves stay in the log as `aidos/refusal`. Log count pin kept as >= 12 (the kernel log holds 14 events). Views compared via `getTicket`, `evidenceFor`, `confidenceScore`, `events()`. |
| test_02_author_not_caller_controlled | `test-02-author-not-caller-controlled.test.ts` | Direct port. `kind_id` -> `kind`, `created_at` -> `createdAt`, `author` stays `author`. |
| test_03_weight_lives_in_registry | `test-03-weight-lives-in-registry.test.ts` | No `setKindWeight`. The claim "score tracks the registry weight, rows unchanged" reads from a store built on the same log with the heavier comment weight in config. |
| test_04_unregistered_kind_refused | `test-04-unregistered-kind-refused.test.ts` | Direct port. `UnknownKind.kind` carries the kind; log and evidence unchanged. |
| test_05_namespacing | `test-05-namespacing.test.ts` | The mid-test `set_kind_weight(builtin:comment, 0.1)` becomes a second config on the same log. `assertCountEqual` -> `expectSameItems`. |
| test_06_gate_refuses_missing_kind | `test-06-gate-refuses-missing-kind.test.ts` | Direct port. `str(GateRefused)` contains the kinds; `missingKinds` order-free via `expectSameItems`. |
| test_07_gate_refuses_disallowed_actor | `test-07-gate-refuses-disallowed-actor.test.ts` | Direct port. |
| test_08_full_lifecycle | `test-08-full-lifecycle.test.ts` | Gates become config. The prototype attached every required kind as the move's actor; the widened constant table admits both user and agent for every kind the flow attaches, so the helper keeps the prototype's pattern (attach as the move actor, then move). The refusal and move claims are unchanged. |
| test_09_send_back | `test-09-send-back.test.ts` | Direct port. The send-back edge is legal in the kernel; the gate requires `builtin:comment` from the user. |
| test_10_score_is_advisory | `test-10-score-is-advisory.test.ts` | Direct port. Plugin kinds carry `allowedAuthors` so the mixed user/agent attaches typecheck. |
| test_11_score_counts_kind_once_per_author | `test-11-score-counts-kind-once-per-author.test.ts` | Direct port. |
| test_12_loosening_gate_needs_no_migration | `test-12-loosening-gate-needs-no-migration.test.ts` | The mid-test `set_gate` becomes a looser config on the same log. The claim ports as: loosening never touches the log, and a store from the same log with the looser gate allows the move. |
| test_13_project_move | `test-13-project-move.test.ts` | Reopen becomes replay; no file I/O. |
| test_14_log_append_only | `test-14-log-append-only.test.ts` | Direct port. Refused moves append one `aidos/refusal` record. |
| test_15_deny_by_default | `test-15-deny-by-default.test.ts` | Ports directly. Self-transitions are legal (SPEC decision 3), so both self-transition cases port: refused without a gate (`noGate: true`) and allowed when a gate exists on the exact self-pair (attach user_signoff, move `open` -> `open`, state stays open). Every unconfigured or non-walk pair refuses with `GateRefused`. |
| test_16_refused_move_logged | `test-16-refused-move-logged.test.ts` | The audit record is `aidos/refusal`; its fields (actor, fromState, toState, ticketId, reason) replace `str(Event)`. Reopen becomes replay. |
| test_17_state_survives_reopen | `test-17-state-survives-reopen.test.ts` | File-backed reopen becomes log replay, twice for the repeatable pin. |
| test_18_registry_survives_reopen | `test-18-registry-survives-reopen.test.ts` | The registry is the config, passed to the fresh store. Weight 2.5 lives in the config; the score 3.5 pin holds. |
| test_19_registry_changes_audited | `test-19-registry-changes-audited.test.ts` | The audit pin: after a sequence covering every mutation, no event has kind `kind.registered`, `kind.weight_set`, or `gate.set`, and every event kind is in the B0 vocabulary. Plus the frozen-copy pin: `events()` is frozen and a push throws. The versioned settings seam is B1. |
| test_20_cli_author_is_agent | `test-20-cli-author-is-agent.test.ts` | The claim ports as "the author is the actor parameter, never the payload" with a comment; test_02 pins the same rule. Flag rejection and JSON output are B1. The kernel event vocabulary has no ticket author field. |
| test_21_cli_refuses_human_only_kinds | `test-21-cli-refuses-human-only-kinds.test.ts` | `EvidenceAuthorRefused` carries kind and author. `builtin:imported_state` is system-only in the constant table, so the agent list is the five agent-authorable kinds. The "a human must supply it" phrasing is the B1 tool message. |
| test_22_no_agent_path_to_done | `test-22-no-agent-path-to-done.test.ts` | Ported fully on the kernel surface. The setup attaches the five agent-authorable kinds. `GateRefused` carries missingKinds, allowedActors, fromState, toState. The all-done plan import lands every ticket in open with one `builtin:imported_state` row per ticket, author system, payload `{claimed_state, source}`. |
| test_23_refusal_json_shape | `test-23-refusal-json-shape.test.ts` | The refusal JSON object ports to `GateRefused` field checks. Unknown ticket -> `UnknownTicket` with `ticketId` and a message naming the id. JSON rendering and no-traceback are B1. |
| test_24_init_is_idempotent | `test-24-init-is-idempotent.test.ts` | "The default config is deterministic": two `DEFAULT_CONFIG` values deep-equal, and a store built from it exposes exactly the constants. The second-init project and ticket claims are B1. |
| test_25_every_subcommand_prints_json | `test-25-every-subcommand-prints-json.test.ts` | One comment only. The claim is a B1 tool test. |
| test_26_plan_round_trip | `test-26-plan-round-trip.test.ts` | Fixture verbatim. `importPlan(store, projectId, text, source)` and `exportPlan(store, projectId)`. `ROUND_TRIP_TICKET_KEYS` = id, title, body, criteria, phase, order. Marks checked via `[${STATE_MARKS[state]}]`. Parse-error pins: `PlanParseError.line` is the 1-based number, `message` contains it, nothing imports. Non-empty project refuses with `ProjectNotEmptyError`. |
| test_27_lifecycle_with_human_half_blocked | `test-27-lifecycle-with-human-half-blocked.test.ts` | Direct port on the kernel surface with `DEFAULT_CONFIG`. The signoff attempt raises `EvidenceAuthorRefused`. |
| test_28_store_plan_fields | `test-28-store-plan-fields.test.ts` | Plan-field and phase tests port directly. `setPhase` on an unknown project throws `UnknownProject`. The `OldRecordReplayTest` ports as a write-boundary pin: `createTicket` writes the full snapshot with the defaults, so `getTicket` reports body "", criteria "", phase 1, order next-free, and `setTicket` keeps every field it does not name. The old-record angle is a comment, because the dsh snapshot is whole-value and strict replay rejects a partial record as corrupt. |
| test_29_unknown_kind_never_tracebacks | `test-29-unknown-kind-never-tracebacks.test.ts` | `UnknownKind` carries the kind on both paths. Plan import into a kind-less store refuses with `UnknownKind("builtin:imported_state")` and its message names the kind. The no-traceback rendering is B1. |
| test_30_review_pass_is_its_own_kind | `test-30-review-pass-is-its-own-kind.test.ts` | Direct port with `DEFAULT_CONFIG`. The review weighs 1.0 per the constant table. |
| test_31_views_match_projection | `test-31-views-match-projection.test.ts` | The custom "review" state is not in the enum. Gates adapt to `(open, in_progress)` needing kind_a and kind_b from user or agent, and `(in_progress, awaiting_verification)` needing kind_a from the user; ticket one drives to awaiting_verification. The v_* literals become projection literals with camelCase keys and the adapted states, with the 7-kind subset plus kind_a weight 3.0 and kind_b weight 2.0 in config. The at non-falling pin survives (fixed clock). The refused move appends one `aidos/refusal` and changes no view. `SeqOrderingTest` cannot port (see the non-portable list). `LegacyTicketDefaultsTest` ports via the public API: `createTicket` fills the defaults and `getTicket` reports the literal values, including the next-free order stepping past an existing ticket. |
| test_32_tickets_page | `test-32-tickets-page.test.ts` | Direct port. The `(open, review)` gate becomes `(done, open)`; the fraction stays null. The legacy sort pin creates the tickets without explicit order: auto-filled orders 1, 2, 1 across the phases give the phase sort `[1, 3, 2]`, the order the filled defaults reported. The unknown sort key throws an `Error` whose message names the key. Limit default 20, total before limit and offset, descending reverses id order, page score equals `confidenceScore` for every row. The coverage walk attaches each gate kind as the user, like the prototype. |

## The mirror pin and the audit pin

- `test-00-constants-mirror.test.ts` restates `STATE_ORDER`, all 12 rows of
  `BUILTIN_KINDS`, and `DEFAULT_GATES` verbatim and asserts deep equality.
  Drift fails the suite. The kernel dispatch widened the `allowedAuthors`
  of the constant table (only `builtin:user_signoff` and
  `builtin:user_verified` are human-only; `builtin:imported_state` is
  system-only) and updated SPEC section 6 with the justification; the
  mirror restates the current table. The widening lets the store tests
  attach kinds exactly as the prototype did: test_15 attaches every
  default kind as the user, test_08 attaches each required kind as the
  move's actor, and test_32's coverage walk attaches as the user.
- `test-19-registry-changes-audited.test.ts` is the audit pin. After any
  sequence of store calls no event has a config-mutation kind, every event
  kind is in the B0 vocabulary (ticket/change, evidence/attached,
  plan/change, comment/added, aidos/refusal, project/created,
  project/moved, phase/set), `events()` returns a frozen copy, and a
  mutation attempt throws and leaves the log unchanged.

## Claims that could not port, and the ticket that carries each

| Claim | Prototype | Why it cannot port | Ticket |
|---|---|---|---|
| A later record wins even when its `at` is lower (seq beats at) | test_31 `SeqOrderingTest` | The kernel rejects a record whose `at` falls for its subject (SPEC decision 7, fold rule 6); it is an `InvariantError`, not a view choice. Ordering is the log order the caller promises. | C3 |
| The raw SQL registry rows and their seq ordering | test_31 view queries, test_19 audit records | The kernel has no SQL and no `kind.registered` events. The literals become projection literals over `config` and the store reads; the audit claim becomes the log-never-carries-config pin. | C2, C3 |
| The CLI flag spellings, exit codes, JSON rendering, and "no traceback" output | test_20, test_23, test_25, test_27, test_29 | The kernel is a library. The B1 tool owns the CLI, the subprocess, the JSON objects, and the traceback-free rendering. The typed errors and their fields port. | B1 |
| `builtin:imported_state` may be attached by the agent | test_21, test_22 | The constant table gives the kind `allowedAuthors: ["system"]`, so the agent attach path refuses it. Imported rows come from the import path with author system. | B1 |
| The "a human must supply it" refusal phrasing | test_21 | The kernel error names the kind and the author; the human phrasing is the B1 tool's message. | B1 |
| Init creates one project and a second init keeps it | test_24 | Project creation and init are CLI behavior. The kernel pins the deterministic config. | B1 |

Two prototype claims that looked non-portable changed meaning with the
SPEC update, and now port as write-boundary pins:

- test_15's self-transition cases port directly: SPEC decision 3 makes
  `(state -> the same state)` a legal transition, so a configured gate on
  a self-pair governs the move like any other exact pair.
- The legacy-record replay pins (test_28 `OldRecordReplayTest`, test_31
  `LegacyTicketDefaultsTest`, test_32's legacy sort) port as write-boundary
  pins: the dsh snapshot is whole-value, so a partial record cannot exist
  (strict replay rejects it as corrupt), and the defaults live in
  `createTicket` and the reads. The raw-append angle is a comment in each
  file.

## Typecheck and test result

`npm run typecheck:tests` (tsc -p tsconfig.tests.json, includes src and
tests) passes clean. `npm test` (vitest run) is green: 33 files, 119 tests,
including the mirror and the audit pins. The kernel dispatch landed while
the port was in flight; the four failures its first implementation exposed
were three test bugs (an ungated audit walk, an id-sorted ticket literal
compared to phase order, and a kind attached by an author the config did
not permit) and one mirror update for the widened `allowedAuthors` table.
Every test file imports only existing exports.

## Things a merge pass should double check

- The kernel dispatch added `project/created`, `project/moved`, and
  `phase/set` to the event vocabulary (SPEC section 7) to back
  `createProject`, `moveProject`, and `setPhase`, resolving the gap the
  original stub left. The tests only count events and read views, so they
  do not depend on the encoding, but the fold's validation rules in SPEC
  section 8 now cover the three new event types (rules 12 and 13).
- `moveTicket` appends one `aidos/refusal` event for an illegal transition
  as well as for a gate refusal, and throws `GateRefused` with
  `noGate: true`. The tests never count events for an illegal refusal, so
  they pass either way, but the SPEC should confirm this is the intended
  audit behavior (it matches the prototype, which logged every refusal).
- SPEC decision 3 now makes self-transitions legal, and test_15 pins the
  `open` -> `open` move through a configured gate. The kernel's
  `isLegalTransition` in `src/kernel/gates.ts` still allows only forward
  steps and the send-back edge, and the fold's transition-legality rule in
  `src/kernel/invariants.ts` must accept `(s, s)` too. Until the kernel
  catches up, the self-transition-with-gate case fails at runtime even
  though the SPEC and the ported test are right.
- `setPhase` on an unknown project throws `UnknownProject` (test_28 pins
  it); the SPEC documents `getPhase` but the store also checks `setPhase`.
- The legacy-defaults text in SPEC section 10 describes the read-path
  fallback and now states that the dsh snapshot is whole-value: the write
  boundary applies the defaults at `createTicket`, and the legacy pins
  read them through the public API. If the kernel dispatch still plans a
  raw-record fallback, the "cannot port" notes in this map would change
  again.
- The store's reads never alias caller data: `events()` and
  `evidenceFor` return clones, and `events()` is deeply frozen. The
  frozen-copy pin in test_19 asserts the array level; a deeper freeze
  check could be added later if the kernel keeps the deep freeze.
- The `PlanParseError.message` field is worth a look: the constructor in
  `src/kernel/types.ts` calls `super("line N: ...")` and then overwrites
  `this.message` with the raw message. test_26 asserts `line` and that
  `message` contains the number; both hold either way.
