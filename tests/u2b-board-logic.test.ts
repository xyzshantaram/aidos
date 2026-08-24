/**
 * Ticket U2b: tests for the evidence board-logic helpers.
 *
 * Covers: evidence grouped by criterion with exact-match payload.criteria;
 * the ungrouped bucket for rows without it; uncovered criteria detected;
 * and kind-count tags with a deterministic color.
 */

import { describe, expect, it } from "vitest";

import {
  type KindCount,
  type EvidenceRowLike,
  evidenceIsMany,
  evidenceKindCounts,
  groupEvidenceByCriterion,
  kindColor,
  parseCriteria,
  uncoveredCriteria,
} from "../src/client/board-logic";

const CRITERIA = "First rule.\nSecond rule.\nThird rule.";

function row(kind: string, payload: Record<string, unknown>): EvidenceRowLike {
  return { kind, payload };
}

describe("u2b board-logic: parseCriteria", () => {
  it("splits on newlines, trims, drops empties", () => {
    expect(parseCriteria("  A  \n\nB\n  \nC  ")).toEqual(["A", "B", "C"]);
  });

  it("returns empty for an empty string", () => {
    expect(parseCriteria("")).toEqual([]);
  });

  it("returns empty when only whitespace/newlines", () => {
    expect(parseCriteria("  \n\n  ")).toEqual([]);
  });
});

describe("u2b board-logic: groupEvidenceByCriterion", () => {
  it("groups rows by exact-match payload.criteria", () => {
    const evidence = [
      row("kind_a", { criteria: "First rule.", note: "one" }),
      row("kind_b", { criteria: "Second rule.", note: "two" }),
      row("kind_a", { criteria: "First rule.", note: "three" }),
    ];
    const groups = groupEvidenceByCriterion(CRITERIA, evidence);
    expect(groups.length).toBe(3);
    expect(groups[0]).toEqual({
      criterion: "First rule.",
      matched: true,
      rows: [
        { kind: "kind_a", payload: { criteria: "First rule.", note: "one" } },
        { kind: "kind_a", payload: { criteria: "First rule.", note: "three" } },
      ],
    });
    expect(groups[1].criterion).toBe("Second rule.");
    expect(groups[1].matched).toBe(true);
    expect(groups[1].rows.length).toBe(1);
    expect(groups[2].criterion).toBe("Third rule.");
    expect(groups[2].matched).toBe(false);
    expect(groups[2].rows.length).toBe(0);
  });

  it("lands rows without payload.criteria in the ungrouped bucket", () => {
    const evidence = [
      row("kind_a", { note: "legacy" }),
      row("kind_b", { criteria: "First rule." }),
    ];
    const groups = groupEvidenceByCriterion(CRITERIA, evidence);
    expect(groups.length).toBe(4);
    const ungrouped = groups[3];
    expect(ungrouped.criterion).toBe("");
    expect(ungrouped.matched).toBe(true);
    expect(ungrouped.rows.length).toBe(1);
    expect(ungrouped.rows[0].kind).toBe("kind_a");
  });

  it("lands rows whose payload.criteria is a non-string in the ungrouped bucket", () => {
    const evidence = [row("kind_a", { criteria: 42 })];
    const groups = groupEvidenceByCriterion(CRITERIA, evidence);
    expect(groups.length).toBe(4);
    expect(groups[3].criterion).toBe("");
    expect(groups[3].rows.length).toBe(1);
  });

  it("lands rows whose payload.criteria matches no criterion line in the ungrouped bucket", () => {
    const evidence = [
      row("kind_a", { criteria: "Bogus" }),
      row("kind_b", { criteria: "First rule." }),
    ];
    const groups = groupEvidenceByCriterion(CRITERIA, evidence);
    expect(groups.length).toBe(4);
    expect(groups[0].rows.length).toBe(1);
    expect(groups[3].rows.length).toBe(1);
    expect(groups[3].rows[0].kind).toBe("kind_a");
  });

  it("keeps criteria in their original order with ungrouped last", () => {
    const evidence = [
      row("kind_a", { criteria: "Third rule." }),
      row("kind_b", { note: "no criteria" }),
    ];
    const groups = groupEvidenceByCriterion(CRITERIA, evidence);
    expect(groups.map((g) => g.criterion)).toEqual(["First rule.", "Second rule.", "Third rule.", ""]);
    expect(groups[2].matched).toBe(true);
    expect(groups[3].criterion).toBe("");
  });

  it("has no ungrouped bucket when every row has a matching criterion", () => {
    const evidence = [row("kind_a", { criteria: "First rule." })];
    const groups = groupEvidenceByCriterion(CRITERIA, evidence);
    expect(groups.length).toBe(3);
  });

  it("handles empty criteria and empty evidence", () => {
    const groups = groupEvidenceByCriterion("", []);
    expect(groups).toEqual([]);
  });

  it("treats whitespace-only criteria lines as absent", () => {
    const criteria = "Real one\n   \nAnother";
    const evidence = [
      row("kind_a", { criteria: "Real one" }),
      row("kind_b", { criteria: "   " }),
    ];
    const groups = groupEvidenceByCriterion(criteria, evidence);
    // "Real one" and "Another" are the two criterion lines.
    expect(groups.length).toBe(3);
    expect(groups[0].criterion).toBe("Real one");
    expect(groups[1].criterion).toBe("Another");
    expect(groups[2].criterion).toBe("");
    expect(groups[2].rows.length).toBe(1);
  });
});

describe("u2b board-logic: uncoveredCriteria", () => {
  it("reports criteria with no evidence rows", () => {
    const evidence = [
      row("kind_a", { criteria: "First rule." }),
      // "Second rule." has no matching row.
    ];
    expect(uncoveredCriteria(CRITERIA, evidence)).toEqual(["Second rule.", "Third rule."]);
  });

  it("reports nothing when every criterion is covered", () => {
    const evidence = [
      row("kind_a", { criteria: "First rule." }),
      row("kind_b", { criteria: "Second rule." }),
      row("kind_a", { criteria: "Third rule." }),
    ];
    expect(uncoveredCriteria(CRITERIA, evidence)).toEqual([]);
  });

  it("excludes the ungrouped bucket from uncovered results", () => {
    const evidence = [
      row("kind_a", { criteria: "First rule." }),
      row("kind_b", { note: "ungrouped" }),
    ];
    expect(uncoveredCriteria(CRITERIA, evidence)).toEqual(["Second rule.", "Third rule."]);
  });
});

describe("u2b board-logic: evidenceIsMany", () => {
  it("is false at or below the default threshold", () => {
    expect(evidenceIsMany([])).toBe(false);
    expect(evidenceIsMany([row("a", {}), row("a", {}), row("a", {}), row("a", {}), row("a", {}), row("a", {})])).toBe(false);
  });

  it("is true above the default threshold", () => {
    const evidence = Array.from({ length: 7 }, () => row("a", {}));
    expect(evidenceIsMany(evidence)).toBe(true);
  });

  it("respects a custom threshold", () => {
    const evidence = Array.from({ length: 3 }, () => row("a", {}));
    expect(evidenceIsMany(evidence, 2)).toBe(true);
    expect(evidenceIsMany(evidence, 3)).toBe(false);
  });
});

describe("u2b board-logic: kindColor", () => {
  it("returns the same color for the same name", () => {
    expect(kindColor("kind_a")).toBe(kindColor("kind_a"));
  });

  it("returns different colors for different names (with high probability)", () => {
    const a = kindColor("kind_a");
    const b = kindColor("kind_b");
    expect(a).not.toBe(b);
  });

  it("returns a value from the palette", () => {
    const color = kindColor("anything");
    expect(color.startsWith("var(--dsw-alias-")).toBe(true);
    expect(color.endsWith(")")).toBe(true);
  });
});

describe("u2b board-logic: evidenceKindCounts", () => {
  it("counts rows per kind and sorts by descending count", () => {
    const evidence: EvidenceRowLike[] = [
      row("kind_a", {}),
      row("kind_a", {}),
      row("kind_b", {}),
    ];
    const counts = evidenceKindCounts(evidence);
    expect(counts.length).toBe(2);
    expect(counts[0].kind).toBe("kind_a");
    expect(counts[0].count).toBe(2);
    expect(counts[1].kind).toBe("kind_b");
    expect(counts[1].count).toBe(1);
  });

  it("ties broken by kind name ascending", () => {
    const evidence: EvidenceRowLike[] = [
      row("zeta", {}),
      row("alpha", {}),
    ];
    const counts = evidenceKindCounts(evidence);
    expect(counts[0].kind).toBe("alpha");
    expect(counts[1].kind).toBe("zeta");
  });

  it("each tag carries a deterministic color from the kind name", () => {
    const evidence: EvidenceRowLike[] = [row("kind_a", {}), row("kind_a", {})];
    const counts = evidenceKindCounts(evidence) as KindCount[];
    expect(counts[0].color).toBe(kindColor("kind_a"));
  });

  it("returns empty for no evidence", () => {
    expect(evidenceKindCounts([])).toEqual([]);
  });

  it("collapses duplicate payloads by kind only", () => {
    const evidence: EvidenceRowLike[] = [
      row("kind_a", { criteria: "First rule." }),
      row("kind_a", { criteria: "Second rule." }),
      row("kind_a", { note: "third" }),
    ];
    const counts = evidenceKindCounts(evidence);
    expect(counts).toEqual([{ kind: "kind_a", count: 3, color: kindColor("kind_a") }]);
  });
});
