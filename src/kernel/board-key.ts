/**
 * THE board key: one ticket, one address, everywhere.
 *
 * The whole point of the canonical id system is cross-workspace and
 * cross-session correctness — a ticket is addressed the same way by every
 * reader, so a lookup can never resolve to a same-numbered ticket in
 * someone else's board.
 *
 * ## The rule
 *
 * A bare id is a DISPLAY form, and it is legitimate only in a local,
 * single-workspace context where "#12" is unambiguous to the human reading
 * it. It is never an address. Anything that LOOKS UP, WRITES, ROUTES or
 * KEYS A MAP uses the board key.
 *
 * ## Why this module exists rather than a local closure
 *
 * It was a local closure inside ticket-view.tsx, and #93's review found the
 * consequence: the work queue keyed its evidence lookups with a bare
 * `String(ticket.id)`, so a foreign ticket read the WRONG rows — empty, or
 * a same-numbered own ticket's — and an action on it wrote to the own
 * ticket carrying that number. The fix moved it to board-logic.ts and
 * declared it "the single implementation", which it was not: the host kept
 * an inline copy in the workspace merge's dedupe (`keyOf`), so the two
 * planes agreed by coincidence rather than by construction. Both now call
 * this, and a test pins that no third copy appears.
 *
 * Kernel rather than client, because the HOST needs it too: the merge
 * writes the evidence and comment maps this key indexes, and the client
 * reads them back. A key written by one rule and read by another is the
 * exact class of bug the canonical id exists to make impossible.
 */

/** The fields the key is derived from. Both planes' row types satisfy it. */
export interface BoardKeyed {
  id: number | string;
  /** True when the row came from ANOTHER session's board. */
  foreign?: boolean;
  /** The owning session, present on a foreign row. */
  sourceSessionId?: string;
}

/**
 * The address of one board row.
 *
 * A foreign row is `sourceSessionId:id`; an own row is its bare id, which
 * is the local address AND the display form. That conditional is a known
 * wart — the same ticket is "12" to its own session and "sess-abc:12" to
 * every other one, so the id is canonical only within a reader — and it is
 * kept for now because the stored evidence and comment maps, the tools'
 * composite ids, and the client's persisted selection are all keyed this
 * way. Widening it is a data migration, not an edit. What this module DOES
 * guarantee is that every reader derives it identically.
 */
export function boardKeyText(row: BoardKeyed): string {
  return row.foreign === true && row.sourceSessionId !== undefined
    ? row.sourceSessionId + ":" + String(row.id)
    : String(row.id);
}

/**
 * Split a board key back into its parts.
 *
 * Only a fully numeric tail is an id, matching the tool surface's rule: a
 * session id may itself contain a colon, so the LAST colon is the
 * separator and anything else is a bare local id.
 */
export function parseBoardKey(key: string): {
  sourceSessionId?: string;
  id: number;
  foreign: boolean;
} {
  const cut = key.lastIndexOf(":");
  if (cut > 0) {
    const tail = key.slice(cut + 1);
    if (/^\d+$/.test(tail)) {
      return {
        sourceSessionId: key.slice(0, cut),
        id: Number(tail),
        foreign: true,
      };
    }
  }
  return { id: Number(key), foreign: false };
}
