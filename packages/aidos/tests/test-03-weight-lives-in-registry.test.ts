/**
 * Item 3. Weight lives in the registry, not in the rows.
 *
 * The kernel has no setKindWeight. The weight is one field of the kind in
 * the config, so the ported claim reads: the score follows the weight of
 * the config, and the evidence rows never carry a weight. A store built
 * from the same log with a heavier comment kind scores higher without a
 * single new row.
 */

import { describe, expect, it } from "vitest";

import { makeConfig, makeStore, storeFromLog } from "./helpers";

function configWithCommentWeight(weight: number) {
  return makeConfig(
    makeConfig().kinds.map((kind) =>
      kind.id === "builtin:comment" ? { ...kind, weight } : kind,
    ),
  );
}

describe("weight lives in the registry", () => {
  it("the score tracks the registry weight, not the rows", () => {
    const store = makeStore(configWithCommentWeight(0.5));
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    for (let i = 0; i < 3; i++) {
      store.attachEvidence(ticket, "builtin:comment", { i }, "user");
    }

    expect(store.confidenceScore(ticket)).toBe(0.5);

    const rowsBefore = store.evidenceFor(ticket);
    const heavier = storeFromLog(store.events(), configWithCommentWeight(2.5));

    expect(heavier.confidenceScore(ticket)).toBe(2.5);
    expect(heavier.evidenceFor(ticket)).toEqual(rowsBefore);
  });
});
