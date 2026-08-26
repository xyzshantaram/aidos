/**
 * Audit tickets A-B6 and A-B7.
 *
 * A-B6: ticketsPage applies the direction to each sort column, but the
 * final tiebreak is a plain id compare. A descending page whose rows
 * hold equal sort keys returns ids in ascending order. It must return
 * descending ids.
 *
 * A-B7: workspaceKeyFromPath encodes a non-BMP character with
 * charCodeAt(0). A for...of loop yields whole code points, so a
 * non-BMP character arrives as one two-unit surrogate pair. charCodeAt
 * reads only the leading surrogate, so two emoji that share one leading
 * surrogate encode to the same value.
 */

import { describe, expect, it } from "vitest";

import { workspaceKeyFromPath } from "../src/kernel/slug";
import { makeStore } from "./helpers";

describe("A-B6 tickets page tiebreak", () => {
  /** Three tickets whose title is the same and whose slugs differ. */
  function storeWithTiedTitles() {
    const store = makeStore();
    const project = store.createProject("/srv/proj/tie", "tie");
    store.createTicket(project, "The same title", "One.", { slug: "tie-one" });
    store.createTicket(project, "The same title", "Two.", { slug: "tie-two" });
    store.createTicket(project, "The same title", "Three.", {
      slug: "tie-three",
    });
    return store;
  }

  it("a descending page with tied sort keys returns descending ids", () => {
    const store = storeWithTiedTitles();
    const ids = store
      .ticketsPage({ sort: "title", descending: true })
      .page.map((row) => row.id);
    expect(ids).toEqual([3, 2, 1]);
  });

  it("an ascending page with tied sort keys returns ascending ids", () => {
    const store = storeWithTiedTitles();
    const ids = store
      .ticketsPage({ sort: "title", descending: false })
      .page.map((row) => row.id);
    expect(ids).toEqual([1, 2, 3]);
  });
});

describe("A-B7 workspace key non-BMP characters", () => {
  it("two emoji that share a leading surrogate encode to different keys", () => {
    // U+1F680 and U+1F6F8 are in the same U+1F6xx block. Both have the
    // leading surrogate 0xD83D.
    const rocket = workspaceKeyFromPath("/srv/🚀/proj");
    const saucer = workspaceKeyFromPath("/srv/🛸/proj");
    expect(rocket).not.toBe(saucer);
  });
});