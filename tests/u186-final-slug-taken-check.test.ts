/**
 * Ticket #186: createTicket lost the final-slug taken-check.
 *
 * The base slug (`opts.slug` or the title-derived slug) is checked for
 * taken-ness before the id is claimed, but the `ticket-{id}` fallback
 * was not checked at all. A user-claimed slug `ticket-5` could collide
 * with a later auto-generated `ticket-5`. The fix re-checks the FINAL
 * slug on the fallback path and refuses with DuplicateSlug.
 */

import { describe, expect, it } from "vitest";

import { DuplicateSlug } from "../src/kernel/types";
import { makeStore } from "./helpers";

/** A title that slugifies to the empty string, forcing the fallback. */
const NO_SLUG_TITLE = "!!!";

describe("#186 createTicket final-slug taken-check", () => {
  it("refuses an auto-generated slug that collides with a user-claimed ticket-{id}", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/slug186", "slug186");
    // Claim tickets 1..2, then claim a FUTURE fallback number.
    store.createTicket(project, "filler 1", ".", { slug: "filler-1" });
    store.createTicket(project, "filler 2", ".", { slug: "filler-2" });
    // A user explicitly claims a slug a LATER auto fallback will generate.
    // (The claim itself consumes id 3; the auto path catches up at id 5.)
    store.createTicket(project, "user claim", ".", { slug: "ticket-5" });
    store.createTicket(project, NO_SLUG_TITLE, "."); // id 4 -> ticket-4, fine
    // The next auto-generated create resolves to ticket-5 too. The old
    // code appended it silently; the fixed code refuses.
    expect(() => store.createTicket(project, NO_SLUG_TITLE, ".")).toThrow(
      DuplicateSlug,
    );
  });

  it("still creates auto slugs when no collision exists", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/slug186b", "slug186b");
    const id = store.createTicket(project, NO_SLUG_TITLE, ".");
    // The auto slug is ticket-{id}: claiming it again is refused as a
    // duplicate, which proves the fallback slug is what was stored.
    expect(() =>
      store.createTicket(project, "claimer", ".", { slug: `ticket-${id}` }),
    ).toThrow(DuplicateSlug);
  });
});
