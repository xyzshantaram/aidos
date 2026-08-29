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

  - A-B3 finding: the global `Object.freeze` swap in `_commit` (`src/host/aidos-core.ts`, ~896-940) is replaceable. `Session.append` cannot write `ignorable`, but `src/host/session-events.ts` already mutates the host's shared `KNOWN_SESSION_EVENT_TYPES` Set at startup, so the persistence reader accepts aidos types with no `ignorable` marker. The swap only adds resilience for a reader that loads the persisted log WITHOUT the aidos plugin applied (cross-version or standalone log tools): there it prevents a hard-refuse of aidos events. Follow-up A-B3-FIX removes the swap and depends on registration.

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
- [ ] A-LOG1 — run a board flow (create a ticket, attach evidence, move it) and confirm the log at `info` shows the tool calls, the gate result, and the append.

- [ ] A-UI1 — open the Tickets tab and confirm the board spans the full width
      and clears the chat input, Apply and Reset sit at the right edge of the
      filter panel, and the sort-direction icon sits beside the dropdown,
      points the right way for each state, and its hover text names the
      other state.
