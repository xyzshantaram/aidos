/**
 * Item 14. The log is append-only.
 *
 * One mutation appends exactly one record. A refused move appends one
 * refusal record too, and never rewrites an earlier one. The prefix of the
 * log never changes.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { makeConfig, makeStore } from "./helpers";

const CONFIG: AidosConfig = {
  kinds: makeConfig().kinds,
  gates: [
    {
      fromState: "open",
      toState: "in_progress",
      requiredKinds: ["builtin:user_signoff"],
      allowedActors: ["user"],
    },
  ],
};

describe("the log is append only", () => {
  it("one write appends one record", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const before = store.events();
    store.setTicket(ticket, { actor: "user", title: "T edited" });

    const after = store.events();
    expect(after.length).toBe(before.length + 1);
    expect(after.slice(0, before.length)).toEqual(before);
  });

  it("a refused move appends one record", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const before = store.events();
    expect(() => store.moveTicket(ticket, "in_progress", "user")).toThrow(
      GateRefused,
    );

    const after = store.events();
    expect(after.length).toBe(before.length + 1);
    expect(after.slice(0, before.length)).toEqual(before);
  });

  it("mixed writes and refusals append in order", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const before = store.events();
    store.attachEvidence(ticket, "builtin:comment", { i: 1 }, "user");
    expect(() => store.moveTicket(ticket, "in_progress", "user")).toThrow(
      GateRefused,
    );
    store.attachEvidence(ticket, "builtin:comment", { i: 2 }, "user");
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");

    const after = store.events();
    expect(after.length).toBe(before.length + 5);
    expect(after.slice(0, before.length)).toEqual(before);
  });
});
