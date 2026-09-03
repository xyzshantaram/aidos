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

/** #93 review, findings 2 and 3. */
describe("#93 nominations: a refused batch changes nothing", () => {
  it("a batch with a bad entry commits NONE of it", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: [
          { ticketId: ticket.id, actionId: "signoff", reason: "valid one" },
          { ticketId: 9999, actionId: "signoff", reason: "bad one" },
        ],
      }),
    ).toThrow(/unknown ticket 9999/);
    // The valid entry must NOT have landed.
    expect(svc.actionNominations(agent)).toHaveLength(0);
  });

  it("a refused batch does not destroy the nomination it would have replaced", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "original" }],
    });
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: [
          { ticketId: ticket.id, actionId: "signoff", reason: "replacement" },
          { ticketId: 9999, actionId: "signoff", reason: "bad one" },
        ],
      }),
    ).toThrow(/unknown ticket 9999/);
    const rows = svc.actionNominations(agent);
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("original");
  });
});

describe("#93 nominations: a dismissal sticks for the session", () => {
  it("re-proposing a dismissed (ticket, action) is ACCEPTED but flagged to the agent", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const created = svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "please" }],
    });
    svc.dismissNomination(agent, { nominationId: created.nominations[0].id });
    const again = svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "please again" }],
    });
    // Accepted -- refusing would let one dismissed entry kill a whole batch,
    // and would make a genuinely-changed situation unraisable all session.
    expect(again.accepted).toBe(1);
    // ...but the agent is TOLD, which is what criterion 8 actually requires.
    expect(again.previouslyDismissed).toEqual(["#" + ticket.id + " signoff"]);
  });

  it("an undismissed ask is not flagged", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const result = svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "first ask" }],
    });
    expect(result.previouslyDismissed).toEqual([]);
  });

  it("a dismissed entry does not refuse the rest of its batch", () => {
    const { svc, agent } = setup();
    const a = svc.setTicket(agent, { title: "A" });
    const b = svc.setTicket(agent, { title: "B" });
    const created = svc.suggestActions(agent, {
      suggestions: [{ ticketId: a.id, actionId: "signoff", reason: "one" }],
    });
    svc.dismissNomination(agent, { nominationId: created.nominations[0].id });
    const batch = svc.suggestActions(agent, {
      suggestions: [
        { ticketId: a.id, actionId: "signoff", reason: "again" },
        { ticketId: b.id, actionId: "signoff", reason: "fresh" },
      ],
    });
    expect(batch.accepted).toBe(2);
  });

  it("a dismissal is scoped to that action; another action on the same ticket still works", () => {
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const created = svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "please" }],
    });
    svc.dismissNomination(agent, { nominationId: created.nominations[0].id });
    const next = svc.suggestActions(agent, {
      suggestions: [{ ticketId: ticket.id, actionId: "verify", reason: "different ask" }],
    });
    expect(next.accepted).toBe(1);
  });
});
