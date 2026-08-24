/**
 * Ticket U2b: the host-side criterion check at the write boundary.
 *
 * `_attachEvidenceInternal` validates the payload.criteria field: when present,
 * it must exactly match one of the ticket's criterion lines (trimmed, split on
 * newlines). A mismatch throws a BadPayloadError naming the criterion.
 */

import { describe, expect, it } from "vitest";

import { BadPayloadError } from "../src/host/aidos-core";
import type { AidosConfig } from "../src/kernel/types";

import { createHarness } from "./b1-harness";
import { defaultKinds, expectThrows } from "./helpers";
/** A config that carries a couple of agent-authorable kinds. */
const CONFIG: AidosConfig = {
  kinds: [
    ...defaultKinds(),
    {
      id: "kind_a",
      label: "Kind A",
      description: "The first kind.",
      weight: 3.0,
      allowedAuthors: ["user", "agent"],
    },
  ],
  gates: [],
};

describe("u2b host criteria: write-boundary check", () => {
  it("refuses evidence whose payload.criteria names no criterion line", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "First rule.\nSecond rule.",
    });
    expectThrows(
      () =>
        service.agentAttachEvidence(harness.asAgent(), {
          ticketId: ticket.id,
          kind: "builtin:automated_check",
          payload: { criteria: "Bogus" },
        }),
      BadPayloadError,
    );
  });

  it("the refusal names the mismatched criterion", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "First rule.\nSecond rule.",
    });
    let message = "";
    try {
      service.agentAttachEvidence(harness.asAgent(), {
        ticketId: ticket.id,
        kind: "builtin:automated_check",
        payload: { criteria: "Bogus" },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BadPayloadError);
      message = (error as BadPayloadError).message;
    }
    expect(message).toContain("Bogus");
    expect(message).toContain("not one of the ticket's criteria");
  });

  it("accepts evidence whose payload.criteria matches a criterion line", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "First rule.\nSecond rule.",
    });
    const view = service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket.id,
      kind: "builtin:automated_check",
      payload: { criteria: "Second rule.", note: "done" },
    });
    expect(view.ticketId).toBe(ticket.id);
    expect(view.kind).toBe("builtin:automated_check");
    expect(view.payload).toEqual({ criteria: "Second rule.", note: "done" });
  });

  it("accepts evidence with no payload.criteria (no check)", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "First rule.\nSecond rule.",
    });
    const view = service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket.id,
      kind: "builtin:automated_check",
      payload: { note: "general evidence" },
    });
    expect(view.payload).toEqual({ note: "general evidence" });
  });

  it("refuses when the ticket has criteria but the row names a different line", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "The real rule.",
    });
    const error = expectThrows(
      () =>
        service.agentAttachEvidence(harness.asAgent(), {
          ticketId: ticket.id,
          kind: "builtin:automated_check",
          payload: { criteria: "The fake rule." },
        }),
      BadPayloadError,
    );
    expect(error.message).toContain("The fake rule.");
  });

  it("matches after trimming whitespace in both criteria and payload", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "  First rule.  \n  Second rule.  ",
    });
    const view = service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket.id,
      kind: "builtin:automated_check",
      payload: { criteria: "  First rule.  " },
    });
    expect(view.payload).toEqual({ criteria: "  First rule.  " });
  });

  it("refuses non-string payload.criteria", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "First rule.",
    });
    expectThrows(
      () =>
        service.agentAttachEvidence(harness.asAgent(), {
          ticketId: ticket.id,
          kind: "builtin:automated_check",
          payload: { criteria: 42 },
        }),
      BadPayloadError,
    );
  });

  it("checks each line when payload.criteria is multi-line", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), {
      title: "T",
      criteria: "First rule.\nSecond rule.",
    });
    expectThrows(
      () =>
        service.agentAttachEvidence(harness.asAgent(), {
          ticketId: ticket.id,
          kind: "builtin:automated_check",
          payload: { criteria: "First rule.\nBogus" },
        }),
      BadPayloadError,
    );
  });
});
