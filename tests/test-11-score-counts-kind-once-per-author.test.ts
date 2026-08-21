/**
 * Item 11. A kind contributes its weight once per distinct author.
 *
 * Three rows from the same author count once. A row from a second author
 * counts again. The score is the sum of one weight per distinct
 * (kind, author) pair.
 */

import { describe, expect, it } from "vitest";

import { makeConfig, makeStore } from "./helpers";

describe("counts once per author", () => {
  it("a kind contributes once per author", () => {
    const store = makeStore(
      makeConfig([
        {
          id: "builtin:testimonial",
          label: "Testimonial",
          description: "Evidence of praise.",
          weight: 3.0,
          allowedAuthors: ["user", "agent"],
        },
      ]),
    );
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    for (let i = 0; i < 3; i++) {
      store.attachEvidence(ticket, "builtin:testimonial", { i }, "agent");
    }

    expect(store.confidenceScore(ticket)).toBe(3.0);

    store.attachEvidence(ticket, "builtin:testimonial", { i: 3 }, "user");

    expect(store.confidenceScore(ticket)).toBe(6.0);
  });
});
