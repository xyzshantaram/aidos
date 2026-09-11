# #195 FINAL — `_notify` on actionable tool calls + unified arg/output types

Scope complete. Owner resolutions (2026-09-10) applied throughout; where a
resolution overrides the scoping doc it is marked. Build starts when #179 lands;
#179 cutover and this build land together. Independent review: PASS (8ef5bd50).

## 1. `_notify` semantics

`_notify: boolean` is host-defaulted per tool with agent override (absent means
the tool's default). Defaults: `suggest_actions`, `request_allowlist`,
`suggest_tag_change` → `true`; `attach_tags` → `false`; all reads and
agent-executed writes carry no field. M1 (all-true): every `suggest_actions`
promotes, ordering suggestions included — ordering info lives in the row's
reason/rank hint. What is inserted is a COMPACT ROW, not the full call card:
ticket, one-line reason, rank hint
`{approval > verify > signoff > suggestion, gateFraction, at}`, group key
`{ticketRef, triggerKind}`. Muting is per-tool host default config only; no
per-ticket snooze (M2).

## 2. Dismissal memory

Host-side, generalized key `sessionId|ticketRef|actionId|triggerKind`. A
dismissal suppresses exactly one generation of the trigger; the next trigger
for the same key revives it. D1: deterministic asks AND promoted rows use the
same key scheme and are both dismissible — one dismissal model, no special
case. No snooze (M2).

## 3. Queue vs surface split

Waiting-on-you ends up DETERMINISTIC-ONLY: deterministic tabs, sort, filter
stay. What moves: all promoted `suggest_actions` rows, nomination counts, the
unmatched diagnostic. `suggest_actions`' write path is unchanged — promotion is
a presentation-layer insert, not a new write. Deleted: nothing.

## 4. Inbox ergonomics

Ordering: rank hint (`approval > verify > signoff > suggestion`, then
gateFraction, then `at`) drives surface sort. E1: bulk action is BULK-DISMISS
ONLY; every other act is single-click with a click-time re-check reusing #194's
`checkBoardActionAvailable` mechanism (named dependency — a stale row never
writes junk evidence, the #177 lesson; a refused click dismisses nothing and
shows the row stale). E2 (overrides scoper recommendation A): NO CAP — the
surface virtualizes and aidos emits everything; must handle 50-row days.

## 5. Unified types — adoption table

`TicketRef`, `ResolvedTicketId`, `ProjectScope`, `PageArgs`, `AskReason`
(ask-justification cluster only), `NominatableAction`, `QueueActionId` /
`BoardActionId`, `TagChangeAction`, `EvidenceRecord` / `CommentBody` → all in
`kernel/types.ts`. `GateProgressView`, `BoardQuery` → `projections.ts`. Six
runtime schema fragments (row-schema triple, nomination quadruple, and the
single `_notify` arg-field declaration so it cannot drift per-tool — the #82
lesson applied to arg shapes) → new `src/tools/shared-schemas.ts`, pinned by a
grep-test. Do NOT unify (14, with reasons): `to` (transport target), `kind`
(discriminators stay per-union), `index` (row index vs array index), `payload`
(deliberately open), `state` (ticket vs job/run enums), `order` (plan order vs
sort direction), `text` vs `body` (real semantic split, keep the rename),
`approvalPaths` (UI-only), `search` (per-surface semantics), `at` (raw
timestamps), `PhaseSetEvent.number` (event ordinal), score/hash renames
(advisory, non-comparable). Incidentals: `gateSatisfied ===` vs `>=` drift and
`_notify` fragments ride the build; ticket-create snapshot literal
(store.ts:620-634 vs aidos-core.ts:5311-5330), phantom sort-key copy, and the
rest go a separate ticket.

## 6. Sequencing

#194 builds first (independent). This scope is decided (done). The build starts
when #179 lands; #179 cutover and this build land together.

## 7. Build done-state criteria

1. Actionable calls (`suggest_actions`, `request_allowlist`,
   `suggest_tag_change`) carry `_notify`, host-defaulted per §1; `attach_tags`
   defaults false; reads/writes carry no field.
2. Every `suggest_actions` auto-promotes a compact row (rank hint + group key);
   no cap — 50-row day renders without truncation or perf cliff.
3. Host-side dismissal under the §2 key, one-generation suppression, revive on
   next trigger; deterministic asks and promoted rows both dismissible.
4. Bulk-dismiss only; all other acts single-click with click-time re-check via
   #194's mechanism, never writing evidence on refusal.
5. Waiting-on-you deterministic-only; nominations/counts/unmatched on surface.
6. Types adopted per §5; `src/tools/shared-schemas.ts` exists with six
   fragments + grep-test pin; nothing from the do-not-unify list unified.
7. Typechecks + full suite green; #179 cutover and build land together.

## VERIFY-IN-BUILD

- Phantom third sort-key copy: SortKey collapsed to ONE definition.
- `boardKeyOf` vs TicketRefString parser converge on `ResolvedTicketId`.
- Exactly one dismissal key template, used by both ask families.
