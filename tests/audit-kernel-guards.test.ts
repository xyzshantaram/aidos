/**
 * Tickets A-B1 and A-B2: guards on evidence attach and comment add.
 *
 * A-B1: attachEvidence must refuse a ticket that does not exist, and its
 * at must never fall below the ticket's last at.
 * A-B2: addComment must refuse a ticket that does not exist, and its at
 * must never fall below the ticket's last at. Two comments in sequence
 * must never go backwards.
 *
 * The injected clock drives every at value. A backwards clock exposes the
 * missing floors. A fixed clock hides them.
 */

import { describe, expect, it } from "vitest";

import type { CommentAddedEvent } from "../src/kernel/events";
import { UnknownTicket } from "../src/kernel/types";
import { expectThrows, makeConfig, makeStore } from "./helpers";

/** The comment/added events of one store, oldest first. */
function commentEvents(store: ReturnType<typeof makeStore>): CommentAddedEvent[] {
  return store.events().filter(
    (event): event is CommentAddedEvent => event.kind === "comment/added",
  );
}

describe("A-B1 evidence guards", () => {
  it("attachEvidence refuses a ticket that does not exist", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/guards", "guards");
    store.createTicket(project, "Real", "A description.");
    expectThrows(
      () =>
        store.attachEvidence(999, "builtin:user_signoff", { ok: true }, "user"),
      UnknownTicket,
    );
  });

  it("evidence at never falls below the ticket's last at", () => {
    let now = 100.0;
    const store = makeStore(makeConfig(), { now: () => now });
    const project = store.createProject("/srv/proj/guards", "guards");
    const ticket = store.createTicket(project, "T", "A description.");
    // A comment is a write to the ticket. Its at advances the ticket's
    // timeline. The fold does not track lastAt for comments today.
    now = 200.0;
    store.addComment(ticket, "A remark", "user");
    // The clock goes backwards. The stored at must still hold the floor.
    now = 150.0;
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    const rows = store.evidenceFor(ticket);
    expect(rows[0].createdAt).toBeGreaterThanOrEqual(200.0);
  });
});

describe("A-B2 comment guards", () => {
  it("addComment refuses a ticket that does not exist", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/guards", "guards");
    store.createTicket(project, "Real", "A description.");
    expectThrows(() => store.addComment(999, "A remark", "user"), UnknownTicket);
  });

  it("comment at never falls below the ticket's last at", () => {
    let now = 100.0;
    const store = makeStore(makeConfig(), { now: () => now });
    const project = store.createProject("/srv/proj/guards", "guards");
    const ticket = store.createTicket(project, "T", "A description.");
    now = 90.0;
    store.addComment(ticket, "A remark", "user");
    const comments = commentEvents(store);
    expect(comments[0].at).toBeGreaterThanOrEqual(100.0);
  });

  it("two comments in sequence never go backwards", () => {
    let now = 100.0;
    const store = makeStore(makeConfig(), { now: () => now });
    const project = store.createProject("/srv/proj/guards", "guards");
    const ticket = store.createTicket(project, "T", "A description.");
    now = 120.0;
    store.addComment(ticket, "First remark", "user");
    now = 110.0;
    store.addComment(ticket, "Second remark", "user");
    const comments = commentEvents(store);
    expect(comments[1].at).toBeGreaterThanOrEqual(comments[0].at);
  });
});