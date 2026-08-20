/**
 * Item 4. An unregistered kind is refused without side effects.
 *
 * The refusal is UnknownKind and it carries the kind, so a caller that did
 * not name the kind itself can still report which kind was missing. The log
 * and the evidence stay exactly as they were.
 */

import { describe, expect, it } from "vitest";

import { UnknownKind } from "../src/kernel/types";
import { expectUnknownKind, makeStore } from "./helpers";

describe("unregistered kind refused", () => {
  it("an unknown kind raises and writes nothing", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    const logBefore = store.events();

    const error = expectUnknownKind(() =>
      store.attachEvidence(ticket, "builtin:no_such_kind", { x: 1 }, "agent"),
    );
    expect(error).toBeInstanceOf(UnknownKind);
    expect(error.kind).toBe("builtin:no_such_kind");

    expect(store.evidenceFor(ticket)).toEqual([]);
    expect(store.events()).toEqual(logBefore);
  });
});
