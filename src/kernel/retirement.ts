/**
 * #108: retirement — a reversible hide that gives the board deletes without
 * deleting.
 *
 * KIND, not state, and the reason is structural rather than a matter of
 * taste. A ticket's STATE is one axis (`open → in_progress →
 * awaiting_verification → done`), governed by gates with required evidence.
 * Retirement is ORTHOGONAL to that axis: you might retire a stale `open`
 * ticket, an abandoned `in_progress` one, or a `done` one that turned out
 * to be wrong. Making it a state forces questions with no good answers —
 * which gates lead into it and out of it, what evidence retiring requires,
 * and what state a ticket RETURNS to when un-retired (it would have to be
 * remembered somewhere anyway, which is the kind approach wearing a
 * disguise). It would also break `STATE_ORDER`, which `stateImpliedKinds`,
 * the queue and the board sort all treat as a linear lifecycle. This exact
 * tradeoff was measured on #172 and the kind won there too: a fifth state
 * costs ~78 files (the gate table, projections, queue ordering, action
 * visibility, chips, filters — 65 of those files are tests), while an
 * evidence kind costs a filter at each consumer.
 *
 * The mechanics already exist, which is the rest of the argument:
 * - attach `builtin:retired` to retire;
 * - DETACH it to un-retire (`userDetachEvidence` names rows by `at` + kind,
 *   and the fold drops exactly that row) — nothing is ever removed from the
 *   log, so the append-only property the whole evidence model rests on is
 *   untouched, and "who hid this and when" stays answerable;
 * - the kind carries weight 0 and `allowedAuthors: ["user"]`, exactly like
 *   the `builtin:review_fail` precedent: it never helps satisfy a gate, and
 *   an agent that can hide tickets can hide its own inconvenient work, which
 *   is the same self-marking hazard the gate exists to prevent.
 *
 * A retired ticket is therefore DERIVED, never stored: a ticket is retired
 * exactly when its live evidence rows hold a `builtin:retired` row. Every
 * consumer below reads this module, so there is one definition of "retired"
 * for the host and the client rather than two that can drift.
 */

/**
 * Structural on purpose: both the kernel's EvidenceRow and the client's
 * EvidenceRowLike (whose `at`/`author` are optional) satisfy it, so the
 * host and the client share this one derivation with no casts.
 */

/** The kind id. Exact match everywhere — #96 forbids prefix matching. */
export const RETIRED_KIND = "builtin:retired";

/** The minimum a row must carry for the retirement derivation. */
export interface RetirableRow {
  kind: string;
  payload?: Record<string, unknown>;
  author?: string;
  at?: number;
}

/** A retirement payload after strict parsing. */
export interface RetirementPayload {
  /** The human's reason, trimmed, or null when none was given. */
  reason: string | null;
  /**
   * Where the work WENT rather than only that it stopped: ticket references
   * in the SAME format as `dependsOn` (`<workspaceKey>:<ticketId>` or
   * `<workspaceKey>:<slug>`), deduped, order kept. A split names several.
   */
  supersededBy: string[];
}

/** One live retirement: the payload plus who/when from the row. */
export interface RetirementInfo extends RetirementPayload {
  at: number;
  author: string;
}

/** True when the live rows hold a retirement marker. */
export function isRetired(rows: readonly RetirableRow[] | undefined): boolean {
  if (rows === undefined) return false;
  return rows.some((row) => row.kind === RETIRED_KIND);
}

/**
 * The live retirement, or null. Tolerant on the payload: a row written by
 * an older build (or by hand) with a missing or misshapen field reads as
 * "retired with no detail" rather than crashing the panel — the marker is
 * the fact, the payload is decoration.
 *
 * The LATEST row wins. Retiring an already-retired ticket is refused
 * host-side, so there is normally one; latest-wins is the deterministic
 * answer if two ever coexist.
 */
export function retirementOf(
  rows: readonly RetirableRow[] | undefined,
): RetirementInfo | null {
  if (rows === undefined) return null;
  let found: (RetirableRow & { at: number; author: string }) | null = null;
  for (const row of rows) {
    if (row.kind !== RETIRED_KIND) continue;
    if (typeof row.at !== "number" || typeof row.author !== "string") continue;
    if (found === null || row.at >= found.at) {
      found = { ...row, at: row.at, author: row.author };
    }
  }
  if (found === null) return null;
  return {
    at: found.at,
    author: found.author,
    ...lenientRetirementPayload(found.payload),
  };
}

/** Tolerant payload read for DISPLAY. Never throws. */
function lenientRetirementPayload(payload: unknown): RetirementPayload {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { reason: null, supersededBy: [] };
  }
  const record = payload as Record<string, unknown>;
  const reason =
    typeof record.reason === "string" && record.reason.trim() !== ""
      ? record.reason.trim()
      : null;
  const supersededBy: string[] = [];
  if (Array.isArray(record.supersededBy)) {
    for (const entry of record.supersededBy) {
      if (typeof entry === "string" && entry.trim() !== "" && !supersededBy.includes(entry.trim())) {
        supersededBy.push(entry.trim());
      }
    }
  }
  return { reason, supersededBy };
}

/**
 * Strict payload validation for the WRITE path. Throws an Error naming the
 * first problem; the host wraps it in its own refusal type.
 *
 * `criteria` is allowed through (not validated here): the attach path owns
 * criterion linking and checks it against the ticket's own criteria. Every
 * other unknown key is refused, so a misspelt `superseededBy` fails loudly
 * at retire time rather than silently recording nowhere.
 */
export function parseRetirementPayload(payload: unknown): RetirementPayload {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("the retirement payload must be a JSON object");
  }
  const record = payload as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "reason" && key !== "supersededBy" && key !== "criteria") {
      throw new Error(
        `unknown retirement payload key ${JSON.stringify(key)}; expected "reason" and/or "supersededBy"`,
      );
    }
  }
  if (record.reason !== undefined && typeof record.reason !== "string") {
    throw new Error("the retirement reason must be a string");
  }
  let supersededBy: string[] = [];
  if (record.supersededBy !== undefined) {
    if (!Array.isArray(record.supersededBy)) {
      throw new Error("the retirement supersededBy must be an array of ticket references");
    }
    for (const entry of record.supersededBy) {
      if (typeof entry !== "string" || entry.trim() === "") {
        throw new Error("every supersededBy entry must be a non-empty ticket reference");
      }
    }
    supersededBy = [...new Set(record.supersededBy.map((entry) => (entry as string).trim()))];
  }
  const reason =
    typeof record.reason === "string" && record.reason.trim() !== ""
      ? record.reason.trim()
      : null;
  return { reason, supersededBy };
}

/** One node of a supersede graph, as a lookup sees it. */
export interface SupersedeNode {
  retired: boolean;
  supersededBy: string[];
}

/** What following one start reference produced. */
export interface SupersedeChain {
  start: string;
  /**
   * The refs where following stopped: live tickets, unknown refs, and
   * retired tickets with no onward edge. A reader clicking through lands on
   * one of these — never mid-chain.
   */
  terminals: string[];
  /** True when a branch was cut because it revisited a ref. */
  cycle: boolean;
}

/**
 * Follow each start reference through retired nodes' `supersededBy` edges.
 *
 * TERMINATES by construction: every visited ref is remembered per chain and
 * a revisit cuts the branch with `cycle: true` instead of looping. Unknown
 * refs (lookup returns null) are terminals, not errors — the graph may name
 * a ticket this board cannot see, and a display walk must not throw over it.
 *
 * The host ALSO validates at write time (targets must exist and be live, so
 * no cycle can form after this ticket lands), but the walk stays guarded
 * anyway: display-time chains grow AFTER the fact (A retires to live B,
 * then B retires to C), and a guard that only holds at write time is a
 * guard that expires.
 */
export function followSupersedeChain(
  startRefs: readonly string[],
  lookup: (ref: string) => SupersedeNode | null,
): SupersedeChain[] {
  return startRefs.map((start) => {
    const terminals: string[] = [];
    let cycle = false;
    const seen = new Set<string>([start]);
    const stack: string[] = [start];
    while (stack.length > 0) {
      const ref = stack.pop() as string;
      const node = lookup(ref);
      if (node === null || !node.retired || node.supersededBy.length === 0) {
        if (!terminals.includes(ref)) terminals.push(ref);
        continue;
      }
      for (const next of node.supersededBy) {
        if (seen.has(next)) {
          cycle = true;
          continue;
        }
        seen.add(next);
        stack.push(next);
      }
    }
    return { start, terminals, cycle };
  });
}
