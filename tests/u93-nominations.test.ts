/**
 * #93: the agent-to-human nomination store.
 *
 * A nomination is a REASON attached to an ask the gate already allows — the
 * agent must not be able to conjure work, name a ticket that does not exist,
 * ask for an action a human never performs, or flood the queue. It is
 * session-scoped by decision, so nothing here touches the kernel.
 */
import { describe, expect, it } from "vitest";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = (harness as unknown as { service: any }).service;
  const agent = (harness as unknown as { asAgent: () => any }).asAgent();
  return { svc, agent };
}

describe("#93 nominations: what the agent may ask for", () => {
  it("accepts a nomination for a real ticket and a human action", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const result = svc.suggestActions(agent, {
      suggestions: [
        { ticketId: ticket.id, actionId: "signoff", reason: "unblocks the store phase" },
      ],
    });
    expect(result.accepted).toBe(1);
    expect(result.nominations[0].reason).toBe("unblocks the store phase");
    expect(svc.actionNominations(agent)).toHaveLength(1);
  });

  it("refuses a ticket that does not exist, naming the id", () => {
    const { svc, agent } = setup();
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: [{ ticketId: 9999, actionId: "signoff", reason: "why not" }],
      }),
    ).toThrow(/unknown ticket 9999/);
  });

  it("refuses an action a human never performs", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: [
          { ticketId: ticket.id, actionId: "submit-for-review", reason: "do it" },
        ],
      }),
    ).toThrow(/not one a human performs/);
  });

  it("refuses a nomination with no reason — the reason IS the feature", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "   " }],
      }),
    ).toThrow(/has no reason/);
  });

  it("refuses an empty batch", () => {
    const { svc, agent } = setup();
    expect(() => svc.suggestActions(agent, { suggestions: [] })).toThrow(
      /no suggestions/,
    );
  });

  it("caps a looping agent rather than letting it flood the queue", () => {
    const { svc, agent } = setup();
    const tickets = Array.from({ length: 21 }, (_unused, index) =>
      svc.setTicket(agent, { title: "Probe " + index }),
    );
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: tickets.map((t) => ({
          ticketId: t.id,
          actionId: "signoff",
          reason: "please",
        })),
      }),
    ).toThrow(/too many nominations/);
  });

  it("re-nominating the same ticket and action REPLACES the reason", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "first" }],
    });
    svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "second" }],
    });
    const rows = svc.actionNominations(agent);
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("second");
  });

  it("the same ticket under two different actions is two nominations", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.suggestActions(agent, {
      suggestions: [
        { ticketId: ticket.id, actionId: "signoff", reason: "start it" },
        { ticketId: ticket.id, actionId: "verify", reason: "then check it" },
      ],
    });
    expect(svc.actionNominations(agent)).toHaveLength(2);
  });
});

describe("#93 nominations: dismissal", () => {
  it("dismissing removes the row", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const created = svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "please" }],
    });
    const id = created.nominations[0].id;
    expect(svc.dismissNomination(agent, { nominationId: id }).dismissed).toBe(id);
    expect(svc.actionNominations(agent)).toHaveLength(0);
  });

  it("dismissing an unknown nomination is refused, naming the id", () => {
    const { svc, agent } = setup();
    expect(() => svc.dismissNomination(agent, { nominationId: "nope" })).toThrow(
      /unknown nomination nope/,
    );
  });
});
