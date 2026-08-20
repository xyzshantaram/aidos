/**
 * Item 2. The author and the time of a row come from the caller, not from
 * the payload. The service stamps the author parameter and the clock; a
 * payload that names an author or a timestamp changes nothing.
 */

import { describe, expect, it } from "vitest";

import { makeStore } from "./helpers";

describe("author is not caller controlled", () => {
  it("a payload author key is ignored", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    store.attachEvidence(
      ticket,
      "builtin:comment",
      { author: "user", note: "tampered" },
      "agent",
    );
    const rows = store.evidenceFor(ticket);
    expect(rows.length).toBe(1);
    expect(rows[0].author).toBe("agent");
  });

  it("a payload created_at key is ignored", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });
    store.attachEvidence(
      ticket,
      "builtin:comment",
      { created_at: 123456789, note: "tampered" },
      "agent",
    );
    const rows = store.evidenceFor(ticket);
    expect(rows.length).toBe(1);
    expect(rows[0].createdAt).not.toBe(123456789);
  });
});
