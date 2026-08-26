# Plan — aidos audit and fix sweep

## Vision

One pass over the aidos source to close real bugs, remove hand-rolled code that
a standard library covers, and add leveled logging so a person can see what the
harness does at runtime. This file is temporary. It is deleted when the sweep
lands.

The matching sweep in `~/repos/dotfiles-ai` (`PLAN-AUDIT.md` there) belongs to
another agent. Do not touch that repo. dotfiles-ai pins an aidos revision, so
its owner re-pins it after this sweep lands.

## Checklist

- [ ] **A-B3 — Research only: is the global `Object.freeze` swap replaceable?**
  `aidos-core.ts:886-908` replaces the global `Object.freeze` for the duration of
  every append, to mark a session envelope ignorable. Commit `9767492` claimed to
  remove this and did not. Do not change code in this ticket. Report whether a
  non-global mechanism (a `WeakSet` of envelopes, a marker property, a dsh-side
  hook) can carry the same signal, and what would break.
  **Evaluate:** a written finding that names a concrete alternative or states why
  none exists. Decide the follow-up ticket after reading it.

- [ ] **A-LOG1 — Host-layer logging: gaps and happy paths.**
  Add leveled `ctx.logger` calls across `src/kernel`, `src/tools`, and
  `src/host`. Cover the happy paths, not only the failures: tool invocation
  start and end for the six board tools (`aidos-tools.ts`) and the four scratch
  tools (`scratch.ts`), gate pass (`aidos-core.ts:1185-1192`,
  `store.ts:680-686`), project bootstrap (`aidos-core.ts:971-996`), the append
  boundary (`_commit`, `aidos-core.ts:868-911`), and the config-load refusal at
  `aidos-core.ts:216-218`. Give the silent catch blocks listed in Critical
  context a `warn`. Follow the level convention in Critical context.
  **Evaluate:** run one manual flow (create a ticket, attach evidence, move it)
  and confirm the log shows the tool calls, the gate result, and the append.
  `npm test` green.

- [ ] **A-LOG2 — Client-layer logging.**
  Add the same leveled logging to `src/client` (about 24 files). Cover the happy
  paths: panel mount, data load, each user action that reaches the host, and
  each response. Keep routine chatter at `debug`.
  **Evaluate:** `npm run build` passes. Human review: open the board panel with
  the browser console at `debug` and confirm a normal session reads clearly and
  does not flood.

## Critical context

- `dist/host/aidos-plugin.js` and `presets/aidos/aidos-tools.js` are committed on
  purpose (`.gitignore` says so). Rebuild with `npm run build` after every
  TypeScript change and commit the bundle with the source.
- The kernel (`src/kernel`) is deliberately dependency-free. Do not add a runtime
  import there.
- The event-sourcing store and the `workspaceKeyFromPath` encoding are deliberate
  designs, not reinvention. Leave both alone.
- `prototype/` no longer exists. Two comments still reference it
  (`store.ts:2` and the `plan.py` reference). Drop those lines as a drive-by in
  whichever ticket touches those files.
- A-HYG2 closed the pre-C5 legacy tolerance (`slug`/`workspaceKey` fallback,
  soft orphan checks) but left the pre-D1 `dependsOn` fallback in
  `normalizeTicketSnapshot` alone, at your request, to keep the sweep to a
  workable clean state first. `grep -rn legacy src/` still returns two
  `dependsOn`-related hits for that reason.
- Logging level convention for both repos:
  `error` = the operation failed and the caller is affected.
  `warn` = a fallback fired or a refusal happened.
  `info` = a state change a person would want in a normal-volume log.
  `debug` = per-call trace and payload detail.

## User preferences and special rules

- Never commit without explicit approval.
- Fine to add well-scoped, actively maintained libraries. Ask before adding one.
- `see.ts` and `approval-comment` in the sibling repo belong to another agent.
  Read only.

## Human review queue

- [ ] A-W3 — open the board panel, confirm toasts and remote calls still work
      after the id-generation change.
- [ ] A-LOG2 — open the board panel with the console at `debug`, confirm the log
      is readable and not flooded.
- [ ] A-UI1 — open the Tickets tab and confirm the board spans the full width
      and clears the chat input, Apply and Reset sit at the right edge of the
      filter panel, and the sort-direction icon sits beside the dropdown,
      points the right way for each state, and its hover text names the
      other state.
