/**
 * #166 (2026-09-08): a set_ticket call's serialized arguments landed in
 * another ticket's description field — #142 carried #157's write-up plus
 * `<parameter name="title">` fragments.
 *
 * The write path was diagnosed, not guessed. `_editTicket` builds its
 * snapshot from exactly one ticket's previous row and commits one
 * `ticket/change` event, the fold applies that event to exactly
 * `event.ticket.id`, and the workspace merge only selects rows — so neither
 * racing set_ticket calls nor the merge can move one ticket's text into
 * another's fields. The fragments match the model-facing invoke/parameter
 * serialization, which appears nowhere in src: they are caller-composed text
 * the store faithfully persisted (#167 reproduced the shape deliberately;
 * #171 hit it twice more in one session). The sweep of all 183 live tickets
 * found the class still stored: #148's description holds another ticket's
 * title/criteria/phase fragments, and a dozen tickets hold their own
 * criteria inside their description behind
 * `</description><parameter name="criteria">` seams.
 *
 * This file pins both halves: a set_ticket for ticket A cannot mutate ticket
 * B's fields, and a set_ticket whose text fields carry serialized call
 * markup is refused before it can land.
 */

import { describe, expect, it } from "vitest";

import { BadPayloadError } from "../src/host/aidos-core";
import { createHarness, type Harness } from "./b1-harness";

function riggedHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  return harness;
}

/** Two tickets with distinct text in every field. */
function twoTickets(harness: Harness): { a: number; b: number } {
  const agent = harness.asAgent();
  const a = harness.service.setTicket(agent, {
    title: "Ticket A",
    description: "Description of A.",
    body: "Body of A.",
    criteria: "Criteria of A.",
  }).id;
  const b = harness.service.setTicket(agent, {
    title: "Ticket B",
    description: "Description of B.",
    body: "Body of B.",
    criteria: "Criteria of B.",
  }).id;
  return { a, b };
}

function viewJson(harness: Harness, ticketId: number): string {
  return JSON.stringify(harness.service.getTicket(harness.asAgent(), { ticketId }).ticket);
}

describe("#166 a set_ticket for ticket A cannot mutate ticket B's fields", () => {
  it("editing every text field of A leaves B byte-identical", () => {
    const harness = riggedHarness();
    const { a, b } = twoTickets(harness);
    const before = viewJson(harness, b);

    harness.service.setTicket(harness.asAgent(), {
      ticketId: a,
      title: "Ticket A rewritten",
      description: "New description of A.",
      body: "New body of A.",
      criteria: "New criteria of A.",
      order: 7,
    });

    // A moved; B did not — not its fields, nor its revision clock.
    expect(viewJson(harness, a)).not.toBe(before);
    expect(viewJson(harness, b)).toBe(before);
  });

  it("creating a ticket touches no existing row", () => {
    const harness = riggedHarness();
    const { a, b } = twoTickets(harness);
    const beforeA = viewJson(harness, a);
    const beforeB = viewJson(harness, b);

    harness.service.setTicket(harness.asAgent(), {
      title: "Ticket C",
      description: "Arrives without disturbing its neighbours.",
    });

    expect(viewJson(harness, a)).toBe(beforeA);
    expect(viewJson(harness, b)).toBe(beforeB);
  });

  it("a refused markup write stores nothing", () => {
    const harness = riggedHarness();
    const { a, b } = twoTickets(harness);
    const beforeA = viewJson(harness, a);
    const beforeB = viewJson(harness, b);

    expect(() =>
      harness.service.setTicket(harness.asAgent(), {
        ticketId: a,
        description: `Prose.</description>\n<parameter name="criteria">Not here.`,
      }),
    ).toThrow(BadPayloadError);

    expect(viewJson(harness, a)).toBe(beforeA);
    expect(viewJson(harness, b)).toBe(beforeB);
  });
});

describe("#166 serialized call markup in a text field is refused", () => {
  const cases: Array<{ field: string; value: string; marker: RegExp }> = [
    {
      // The #142/#171 shape: criteria written inside the description.
      field: "description",
      value: `Prose.</description>\n<parameter name="criteria">Stray criteria.`,
      marker: /<parameter\s+name\s*=/,
    },
    {
      // The #148 shape: another call's serialization inside the description.
      field: "description",
      value: `Prose.\n<invoke name="mcp__oc__set_ticket">\n<parameter name="title">Foreign title`,
      marker: /invoke/,
    },
    {
      // The #142 body tail: a bare invoke closer.
      field: "body",
      value: "Prose.\n</invoke>\n",
      marker: /invoke/,
    },
    {
      // The #123/#131 shape: a field closer with no opener.
      field: "body",
      value: "Prose.</body>\n",
      marker: /body/,
    },
    {
      // Markup in the criteria itself.
      field: "criteria",
      value: `Prose.\n<parameter name="phase">3`,
      marker: /<parameter\s+name\s*=/,
    },
    {
      // Titles are text too.
      field: "title",
      value: `A title <parameter name="title">doubled`,
      marker: /<parameter\s+name\s*=/,
    },
  ];

  for (const { field, value, marker } of cases) {
    it(`refuses ${field} carrying ${marker} (create and edit)`, () => {
      const harness = riggedHarness();
      const agent = harness.asAgent();
      const ticket = harness.service.setTicket(agent, { title: "Clean ticket" });

      expect(() => harness.service.setTicket(agent, { title: "T", [field]: value })).toThrow(
        BadPayloadError,
      );
      expect(() =>
        harness.service.setTicket(agent, { ticketId: ticket.id, [field]: value }),
      ).toThrow(BadPayloadError);
    });
  }

  it("the refusal names the field and states the discipline", () => {
    const harness = riggedHarness();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Clean ticket" });
    let message = "";
    try {
      harness.service.setTicket(agent, {
        ticketId: ticket.id,
        description: `Prose <parameter name="criteria">stray`,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BadPayloadError);
      message = (error as BadPayloadError).message;
    }
    expect(message).toContain("description");
    expect(message).toContain("separate arguments");
  });

  it("the user path shares the guard", () => {
    const harness = riggedHarness();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Clean ticket" });
    expect(() =>
      harness.service.userSetTicket(agent, {
        ticketId: ticket.id,
        description: `Prose <parameter name="criteria">stray`,
      }),
    ).toThrow(BadPayloadError);
  });

  it("markup inside code spans stays writable — documenting the bug is not the bug", () => {
    // #167 and #171 discuss this exact markup in backticks; those notes must
    // remain editable.
    const harness = riggedHarness();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Clean ticket" });
    const note =
      "Filed with its criteria written INSIDE the description as `<parameter name=\"criteria\">` markup.";
    const edited = harness.service.setTicket(agent, {
      ticketId: ticket.id,
      description: note,
    });
    expect(edited.id).toBe(ticket.id);
    expect(harness.service.getTicket(agent, { ticketId: ticket.id }).ticket.description).toBe(
      note,
    );
  });

  it("ordinary prose — including the words invoke and parameter — still passes", () => {
    const harness = riggedHarness();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Clean ticket" });
    const prose =
      "Invoke the plan importer with no parameters beyond the file path; see parameter docs.";
    const edited = harness.service.setTicket(agent, {
      ticketId: ticket.id,
      description: prose,
    });
    expect(edited.id).toBe(ticket.id);
  });
});
