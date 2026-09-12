/**
 * The board addresses every row as a decimal string. `local-ticket-view`
 * builds `ticketIdKey` as `String(ticket.id)` for own AND foreign rows
 * (#45: the `<sourceSessionId>:<id>` composite is gone — a plain id is the
 * address now), and every write component of the detail panel sends that
 * key as `ticketId`. So the host resolve path must read a bare decimal
 * string as an id.
 *
 * It used to read a bare string as a slug only, so Sign off on ticket 2
 * failed with `no such ticket: 2` before any gate ran. A revert of the
 * resolve fix makes both cases below throw UnknownTicket.
 *
 * #45 DECISION: this file is KEPT, not removed. The decimal-string form it
 * pins is still exactly what the board sends on every write, so deleting
 * it would be invisible coverage loss on the most-sent address shape.
 * What changed is the paragraph below: the composite form lost its
 * routing branch, and the third case pins that refusal.
 */

import { describe, expect, it } from "vitest";

import type { AidosConfig } from "../src/kernel/types";
import { UnknownTicket } from "../src/kernel/types";
import { makeConfig } from "./helpers";
import { createHarness } from "./b1-harness";

/** One signoff gate: the open to in_progress edge the Sign off button drives. */
const GATE_CONFIG: AidosConfig = {
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

describe("a board write carries the ticket id as a decimal string", () => {
  it("signoff moves the ticket that the board names as a string", () => {
    const harness = createHarness();
    harness.settingsValue = GATE_CONFIG;
    const service = harness.installService();
    const agent = harness.asAgent();

    const first = service.userSetTicket(agent, { title: "First", description: "d" }).id;
    const second = service.userSetTicket(agent, { title: "Second", description: "d" }).id;
    expect(second).not.toBe(first);

    // Both calls take the board key form, not the number.
    service.userAttachEvidence(agent, {
      ticketId: String(second),
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    service.userMoveTicket(agent, { ticketId: String(second), to: "in_progress" });

    const rows = service.getTickets(agent);
    expect(rows.find((row) => row.id === second)?.state).toBe("in_progress");
    expect(rows.find((row) => row.id === first)?.state).toBe("open");
  });

  it("an unknown decimal string still refuses", () => {
    const harness = createHarness();
    harness.settingsValue = GATE_CONFIG;
    const service = harness.installService();
    const agent = harness.asAgent();

    service.userSetTicket(agent, { title: "Only", description: "d" });

    expect(() => service.userMoveTicket(agent, { ticketId: "404", to: "in_progress" })).toThrow(
      UnknownTicket,
    );
  });

  it("a composite session-headed string is no longer an address", () => {
    // #45: the composite form lost its session-routing branch. The board
    // no longer sends it, and the host refuses it rather than routing it.
    const harness = createHarness();
    harness.settingsValue = GATE_CONFIG;
    const service = harness.installService();
    const agent = harness.asAgent();

    service.userSetTicket(agent, { title: "Only", description: "d" });

    expect(() =>
      service.userMoveTicket(agent, { ticketId: "some-session:1", to: "in_progress" }),
    ).toThrow(UnknownTicket);
  });
});
