/**
 * Item 20. The CLI always stores the author "agent". No flag changes it.
 *
 * The kernel has no CLI, so the claim ports to the kernel surface: the
 * author is the actor parameter, never the payload. test_02 pins the same
 * rule. This file restates it with the CLI's actor and payload shapes so
 * the port map stays one to one. The flag-rejection claims and the JSON
 * output claims are B1 tool tests. The kernel event vocabulary has no
 * ticket author field either, because the actor rides the write call, not
 * the event.
 */

import { describe, expect, it } from "vitest";

import { BUILTIN_KINDS } from "../src/kernel/constants";
import { makeConfig, makeStore } from "./helpers";

describe("the CLI author is the agent", () => {
  it("the author is the actor parameter, never the payload", () => {
    const store = makeStore(makeConfig([...BUILTIN_KINDS]));
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Ticket one", "A description.", {
      actor: "agent",
    });

    const payload = { author: "user", actor: "user", note: "three" };
    store.attachEvidence(ticket, "builtin:test_run", payload, "agent");

    const rows = store.evidenceFor(ticket);
    expect(rows.length).toBe(1);
    expect(rows[0].author).toBe("agent");
    expect(rows[0].payload).toEqual(payload);
  });
});
