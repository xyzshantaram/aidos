---
name: update-board
description: Reconcile the aidos board with git history and the working tree, for changes that landed outside aidos. Use when the user invokes /update-board, or after work was committed by a non-aidos session, a direct terminal edit, or a hotfix — the agent reads the git log, maps commits to tickets, and updates each ticket to match what actually shipped.
whenToUse: The user types /update-board, or says the board is stale / out of sync with the repo, or asks to "import changes made outside aidos" — or you notice commits in the log that no ticket's evidence references.
---

# update-board skill

Work lands in this repo through channels the board never sees: the user edits
directly, another session commits, a hotfix ships from a terminal. The board
then lies — tickets sit open for work that is already merged, or describe a
reality that has drifted. This skill makes the board match the tree. It never
makes the tree match the board.

You may be invoked by a human (`/update-board`) or by another agent (the
skill tool). The procedure is the same for both.

## 1. Establish the boundary — never guess a range silently

Find the last commit the board already knows about:

- Scan existing evidence payloads for commit hashes (`automated_check`,
  `review_pass`, `review_fail`, `agent_report` rows that name a `commit`).
- The boundary is the NEWEST such commit that is an ancestor of HEAD.
- If no evidence names any commit, or the newest one is not on HEAD's
  history, STOP and ask the user for a starting point ("how far back should
  I reconcile?"). A silent guess reconciles the wrong range and attaches
  evidence to the wrong tickets — the worst outcome this skill can produce,
  because the evidence then looks authoritative.

## 2. Map commits to tickets — the #101 rule, exactly

A commit belongs to ticket N when its subject references `#N` (e.g.
`fix(#112) round 2: ...`) or the ticket's slug. Read subjects, not file
paths: file overlap is a coincidence machine, and mapping by it attaches
commits to tickets that never asked for them.

- A subject naming SEVERAL tickets (`feat(#73,#114,#117): ...`) belongs to
  all of them.
- A subject naming NO ticket belongs to no ticket. That is a REPORT (step 4),
  not an invitation to guess.
- Merge commits, reverts and pure chore (`chore: bump deps`) map to nothing;
  note them in the report line only if they change behaviour.

## 3. Update each mapped ticket to match reality

"Reality" means the tree and the suite, not the commit message. Messages
overclaim; the suite does not.

1. **Run the checks first.** `npx vitest run`, both typechecks, the build —
   whatever this repo's definition of green is. A ticket whose landed work
   fails the suite is NOT reconciled to "done"; it gets the failure recorded.
2. **Attach one `automated_check` per ticket** naming: the commit hash, the
   suite result, and — in one or two sentences — what actually shipped versus
   what the ticket still claims. If they differ, say so in the evidence; that
   difference is the whole point of this skill.
3. **If the work is complete, call `suggest_actions`** with `verify` for that
   ticket, with a reason that names what to look at. You NEVER move the
   ticket yourself and you NEVER attach `user_signoff`, `user_verified`, or
   any human-only evidence. Reconciliation ends at a nomination; the human
   finishes it.
4. **If the description drifted** — the ticket describes an approach or a
   scope that shipped differently — update it with `set_ticket`, and attach a
   `review_note` quoting the old claim, so the change is auditable rather
   than silent.

## 4. Un-ticketed work is surfaced, not silently filed

List the commits in range that mapped to no ticket, one line each:
`<short-hash> <subject>`. Then one question: want tickets filed for any of
these? Filing without asking invents history — the human decides what
deserves a ticket. (There is no nomination action for "file a ticket", so
this is one of the legitimate prose asks.)

## 5. Close out

One short summary: range reconciled (`<oldest>..<HEAD>`), tickets updated,
tickets nominated, un-ticketed commits listed. Then nothing else — no
reminder lists, no next-steps paragraph.

## Hard limits

- No pushing, force-pushing, or rewriting history. This skill reconciles the
  board; git is an input, never an output.
- No ticket state changes. `move_ticket` is not part of this skill.
- No human-only evidence. Ever.
- No writes outside the repo.
