/**
 * The board keys its own rows as decimal strings. `local-ticket-view`
 * builds `ticketIdKey` as `String(ticket.id)` for an own row and
 * `<sourceSessionId>:<id>` for a foreign one, and every write component of
 * the detail panel sends that key as `ticketId`. So the host resolve path
 * must read a bare decimal string as an id.
 *
 * It used to read a bare string as a slug only, so Sign off on ticket 2
 * failed with `no such ticket: 2` before any gate ran. A revert of the
 * resolve fix makes both cases below throw UnknownTicket.
 *
 * The `<sessionId>:<id>` form has its own coverage in the workspace merge
 * tests; this file pins the own-row form that the board sends far more
 * often.
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
});
