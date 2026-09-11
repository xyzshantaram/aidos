# The review chain: a reliability configuration

## What it is

`reviewChain` (aidos config, default `"frontier"`) is the NAME of the subagent
chain that batch reviews are dispatched on. The harness resolves that name
against the live profile at dispatch; aidos never resolves it to models. A
chain is a list of provider/model rungs with failover: a run may start at the
head and finish several rungs down.

## What it is NOT

It is not a security boundary, and nothing about it should be described as
one. Nothing prevents a host plugin from writing evidence rows or provenance
stamps; an adversary with host access wins regardless. What the chain catches
is DRIFT AND MISROUTING — aidos quietly sending a batch of reviews to a cheap
tier. Reviews are expensive, and a positive off-chain finding is exactly the
failure this exists to catch: a cheap-written review that waved a defect
through.

## The gate

The review-pass gate is a CONTAINMENT check (#129), built on the harness's
`chainProvenance.forSession` record and the host-written stamp on every
evidence row (#126):

- `contained === true` and the record's chain equals the configured review
  chain → the review is **verified**; the chain is recorded on the board.
- `contained === false` (or the right chain, wrong name) → the review is
  **invalidated**: the result does not count and the batch should be re-run.
  The refusal names it as OFF-CHAIN.
- Provenance **unavailable** (service absent, dropped write, legacy row from
  before stamping) → **unverified**. Absence of data is evidence of nothing:
  the row counts exactly as it always has. No code path throws on a
  provenance problem.

The strongest consequence this mechanism may ever have is "this review
result is invalid; re-run it". It never wedges the board, never blocks a
session, and never escalates beyond a re-run.

## Escape hatches stay

Human signoff and `user_verified` always pass the gate. Hands-on
verification in the GUI remains the human's final gate.

## Legacy rows

`review_pass` rows created before stamping have no provenance and read as
unavailable → unverified-proceed. There is deliberately NO migration, NO
backfill, NO grandfather flag, and NO compatibility branch: the accepted risk
(an old self-reviewed pass stays valid) was accepted in writing, and the
mitigation is care going forward, not code.
