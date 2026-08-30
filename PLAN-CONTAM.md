# Plan: stop aidos from firing on non-aidos preset projects

## Context

A write to `/home/sid/repos/dotfiles-ai/sync-models.mjs` was refused with:

```
write to /home/sid/repos/dotfiles-ai/sync-models.mjs is outside the allowlist union;
no in-progress ticket allowlist covers it (board is empty — create and sign off a
ticket, or write under scratch)
```

That is the message `src/tools/allowlist.ts:86` emits when `ctx.aidos` is live but
the board is empty. The user got it while working in a project whose preset is NOT
aidos. So the aidos host plugin was active in a non-aidos session and enforced its
write boundary there. This is preset contamination: aidos must not activate for
projects that do not run the `aidos` preset.

## Root cause

`aidos-core.ts` already gates its *stateful* behavior per agent:

- `bashContext` (line 561) returns `{ profile: "none" }` when
  `presets.composedPreset(agent.ctx) !== "aidos"`.
- project creation (line 1012) bails on the same check.

But the three plugin `apply` entry points install their side effects
**unconditionally**, with no preset check:

- `src/tools/aidos-tools.ts` `apply` (line 519): registers the six board tools,
  the scratch tools, the `tool:aidos` system-prompt section, the delegation-depth
  guard (`installAidosGuard`), the tool mask (`installAidosMask`), and the write
  guard (`installAllowlistGuard`) — all with no gate.
- `src/host/aidos-plugin.ts` `apply` (line 23): provides the `aidos` service and,
  through the `AidosService` constructor, registers aidos session-event types into
  the host's shared `KNOWN_SESSION_EVENT_TYPES` set.
- `src/client/index.ts` `apply` (line tRy): registers the Tickets tab in the
  conversation view.

Because the aidos plugin rows mount wherever the aidos plugins are composed, the
guard/mask/service land in sessions that are not the `aidos` preset, and then fire.

The established, test-proven gate idiom (see `tests/audit-bash1-preset-gate.test.ts`)
is:

```js
const presets = ctx.get("agentPresets");
if (presets && presets.composedPreset(ctx) !== "aidos") {
  // not an aidos project: do nothing
}
```

When `agentPresets` is absent the check short-circuits and aidos proceeds, so this
is safe under the test harness (which never provides the service) and under any
session that has not composed presets.

## The audit: every contamination path

- **A. Write boundary guard** — `installAllowlistGuard` in `aidos-tools.ts`
  `apply`. PRIMARY. Vetoes every write in any session the plugin mounts into,
  including non-aidos projects. Produces the reported refusal.
- **B. Tool mask** — `installAidosMask` in `aidos-tools.ts` `apply`. Masks the
  agent to the open tier (no `write`/`edit`/`bash`) unless an aidos ticket is
  in_progress. Silently strips tools in non-aidos projects.
- **C. Board + scratch tool registration** — `registerGetTickets` … `registerScratchTools`
  in `aidos-tools.ts` `apply`. Pollutes non-aidos sessions with aidos board tools.
- **D. `tool:aidos` system-prompt section** — `ctx.systemPrompt.section(...)` in
  `aidos-tools.ts` `apply`. Injects aidos guidance and the scratch-root note into
  every session's system prompt.
- **E. Delegation-depth guard** — `installAidosGuard` in `aidos-tools.ts` `apply`.
  Refuses board-tool calls from subagents regardless of project.
- **F. Host service provision + session-event global mutation** — `aidos-plugin.ts`
  `apply` → `registerAidosService`. Provides `ctx.aidos` to the session and, via the
  `AidosService` constructor, mutates the host-shared `KNOWN_SESSION_EVENT_TYPES`
  set. The per-agent `bashContext`/project gates already neutralize most of this, but
  the global mutation is still contamination.
- **G. Client Tickets tab** — `src/client/index.ts` `apply`. Registers a Tickets tab
  in the conversation view for every client the aidos client plugin bundle loads into.
- **H. (already safe) `aidos-core.ts` per-agent gates** — `bashContext` and project
  creation already check `composedPreset`. No change needed there, but they explain
  why a non-aidos session with the service still behaved mostly-correctly except for
  the un-gated A–G above.

## Tickets

### Ticket 1 — Gate the three plugin `apply` entries on the aidos preset

**Status:** done

**Files:**
- `src/tools/aidos-tools.ts` — at the top of `apply`, bail when
  `presets && presets.composedPreset(ctx) !== "aidos"`.
- `src/host/aidos-plugin.ts` — in `apply`, return a no-op disposer when the same
  check fails.
- `src/client/index.ts` — in `apply`, bail on the same check (best-effort: if the
  client context has no `agentPresets`, fall through to current behavior so a missing
  service never disables aidos in an aidos project).

**Acceptance criteria:**
- A session that composes the `aidos` preset still gets the full aidos surface
  (tools, mask, guard, write boundary, service, client tab).
- A session whose `agentPresets.composedPreset` is not `"aidos"` gets none of A–G:
  no board tools, no `tool:aidos` prompt section, no mask, no write guard, no `aidos`
  service, no Tickets tab, no global event-type mutation.
- Every existing test still passes (the harness omits `agentPresets`, so the gate
  short-circuits and aidos installs as before).

### Ticket 2 — Add a regression test for the apply gate

**Status:** done

**File:** `tests/audit-contam-apply-gate.test.ts`

Provide a fake `agentPresets` with `composedPreset: () => "some-other-preset"`,
call `apply(asContext(harness.ctx), {})`, and assert that the board tools, the
`tool:aidos` prompt section, the mask/guard listeners, and (via the host entry) the
`aidos` service are NOT installed. Mirror `tests/audit-bash1-preset-gate.test.ts`.

**Acceptance criteria:** The test fails before Ticket 1 and passes after. It must be
able to fail.

## Verification (per the verification skill)

- Revert impact: without the gate, a non-aidos session with aidos plugins composed
  enforces the write boundary (the reported refusal). With the gate, it does not.
- Claim evidence: Ticket 2 asserts the absence of installation under a non-aidos
  preset; `tests/audit-bash1-preset-gate.test.ts` already asserts the same idiom on
  `bashContext`.
- Test tautology check: Ticket 2's assertions are independently falsifiable — they
  fail on the pre-fix code.

## Human review

- Reproduce the original report: in a non-aidos preset project, attempt a write and
  confirm it now succeeds (no "outside the allowlist union" refusal) and that no
  Tickets tab appears.

## Addendum (Aug 31): the Ticket 1 gates were dead code in production and broke the plugin

The gates shipped in daf1f96 and failed in production within a day, with two
symptoms: the Tickets tab showed skeleton tiles for five seconds in every
session, then "The board projection is unavailable. Retry to re-read it."; and
selecting the aidos preset bounced straight back to Standard.

Root cause: `AgentPresets.composedPreset(ctx)` answers the preset of a LIVE
AGENT — it reads the live scope chain (`standingMountFor(ctx)?.presetId` in
dsh-agent-presets), which matches only a context whose scope key is parented
to a standing mount key. Two apply-time contexts are never such a context:

- The host-plane row ctx is unscoped, so `composedPreset(hostCtx)` is
  undefined. `apply` in `src/host/aidos-plugin.ts` therefore always returned
  early: the AidosService never mounted, so no aidos projection units
  registered and the client's `useProjection("aidos.tickets")` stayed
  undefined forever (first symptom).
- A row ctx inside the standing preset mount inherits the mount's own scope
  key, and the mount scope has no parent (`createScope(this.selfCtx, key)` in
  ensureStanding), so `composedPreset(rowCtx)` is undefined too. The preset's
  `aidos-tools` row declares `inject: ["aidos", ...]`, so with the host
  service gated away it waited forever, `mountPreset` rejected with "N row(s)
  did not activate", and every aidos preset select failed and fell back to
  Standard (second symptom).

The client gate in `src/client/index.ts` never ran its intended path either:
the browser has no `agentPresets` service, so `presets &&` short-circuited and
the tab registered in every session regardless of preset.

Fix (same commit as this addendum): remove the apply-time gates from
`src/host/aidos-plugin.ts` and `src/tools/aidos-tools.ts`. The protections the
audit wanted live at the seams that actually run per agent:

- Composition ownership: the aidos tools row is composed only by the aidos
  preset's own `agent.cordis.yml`; the host service only by the bundle patch.
  A preset's rows cannot mount into another preset's sessions.
- Per-agent call-time gates: `bashContext` and project creation already check
  `composedPreset(agent.ctx)` — with a real agent context the check works.
- The mask, the delegation guard, and the write allowlist key off the calling
  agent (`agent.ctx.tools.restrict`, `agents.currentInitiator()`), so they
  were never cross-preset leaks to begin with.
- The host service holds no cross-session state: every read and write is
  keyed by the calling agent's session log. Its one global effect, the
  `KNOWN_SESSION_EVENT_TYPES` registration, is a read-path necessity shared
  with the dsh-llm-fallbacks plugin, not contamination.

Ticket 2's regression test now pins the corrected contract: both apply bodies
install with a fake `agentPresets` answering a non-aidos preset.

The contamination the audit originally reported (the write refusal in
dotfiles-ai) deserves a re-audit under this model: the allowlist guard lives
in the aidos preset row, which should never have been mounted in a
non-aidos session. If that refusal reproduces, the preset composition or the
presets-root config is suspect, not these apply bodies.
  Tickets tab appears.
