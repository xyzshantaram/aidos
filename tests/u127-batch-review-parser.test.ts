/**
 * #127: the batch-review document parser — SPEC v1 and the literate human
 * dialect, one parser, two writers, all five rejection rules.
 *
 * The parser is pure and deterministic; citation resolution is a fixture
 * predicate here (the host injects an fs-backed check). The rules are the
 * point: a pass that asserts nothing cannot stand, citations must resolve,
 * a broken section breaks only its own ticket, and unknown keys are noise.
 */

import { describe, expect, it } from "vitest";

import {
  ESCALATION_THRESHOLD,
  exceedsEscalation,
  parseBatchReview,
} from "../src/kernel/batch-review";

/** The fixture "repo": these paths resolve; everything else is unresolvable. */
const REPO = new Set([
  "src/kernel/gates.ts",
  "src/kernel/types.ts",
  "src/host/aidos-core.ts",
  "tests/u126-evidence-stamping.test.ts",
]);

const resolve = (citation: { file: string }) => REPO.has(citation.file);
const parse = (text: string) => parseBatchReview(text, { resolveCitation: resolve });

describe("#127 SPEC v1, the well-formed document", () => {
  const doc = `Batch review, phase 8 spine.

## Ticket 126 — VERDICT: pass
executor-model: zai/glm-5.3
checked:
- src/kernel/types.ts:69
- src/host/aidos-core.ts:5813
findings:
- minor | src/kernel/types.ts:69 | stamp actor field could carry a doc pointer
uncovered-criteria:
- none
`;

  it("parses the section, verdict, executor-model, checked, findings, uncovered", () => {
    const parsed = parse(doc);
    expect(parsed.tickets.length).toBe(1);
    const ticket = parsed.tickets[0];
    expect(ticket.writer).toBe("machine");
    expect(ticket.claimedVerdict).toBe("pass");
    expect(ticket.verdict).toBe("pass");
    expect(ticket.executorModel).toBe("zai/glm-5.3");
    expect(ticket.checked.length).toBe(2);
    expect(ticket.findings.length).toBe(1);
    expect(ticket.findings[0]).toEqual({
      severity: "minor",
      citation: { file: "src/kernel/types.ts", line: 69 },
      claim: "stamp actor field could carry a doc pointer",
    });
    expect(ticket.uncoveredCriteria).toEqual(["none"]);
    expect(ticket.rejections).toEqual([]);
    expect(parsed.dropped).toEqual([]);
  });
});

describe("#127 rejection rule 1 and rule 3", () => {
  it("rule 1: a pass with empty checked: cannot produce a passing row", () => {
    const doc = `## Ticket 126 — VERDICT: pass
checked:
findings:
- minor | - | looks fine to me
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.claimedVerdict).toBe("pass");
    expect(ticket.verdict).toBe("fail");
    expect(ticket.rejections.join(" ")).toMatch(/rule 1/);
  });

  it("rule 2: unresolvable citations are dropped and recorded", () => {
    const doc = `## Ticket 126 — VERDICT: pass
checked:
- src/kernel/types.ts:69
- does/not/exist.ts:1
`;
    const parsed = parse(doc);
    const [ticket] = parsed.tickets;
    expect(ticket.checked).toEqual(["src/kernel/types.ts:69"]);
    expect(ticket.dropped.length).toBe(1);
    expect(ticket.dropped[0]).toEqual({
      raw: "does/not/exist.ts:1",
      file: "does/not/exist.ts",
      line: 1,
      where: "checked",
    });
    expect(parsed.dropped).toEqual(ticket.dropped);
    expect(ticket.rejections.join(" ")).toMatch(/rule 2/);
  });

  it("rule 3: dropping empties checked:, so the pass cannot stand", () => {
    const doc = `## Ticket 126 — VERDICT: pass
checked:
- does/not/exist.ts:1
- also/absent.ts:99
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.checked).toEqual([]);
    expect(ticket.verdict).toBe("fail");
    expect(ticket.rejections.join(" ")).toMatch(/rule 3/);
  });

  it("a fail verdict needs no checked entries: rules 1/3 gate passes only", () => {
    const doc = `## Ticket 126 — VERDICT: fail
checked:
findings:
- critical | - | the gate drops valid rows
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.verdict).toBe("fail");
    expect(ticket.rejections).toEqual([]);
  });
});

describe("#127 rejection rule 4 and rule 5", () => {
  it("rule 4: a section that fails to parse fails only its own ticket", () => {
    const doc = `## Ticket 126 — VERDICT: pass
checked:
- src/kernel/types.ts:69

## Ticket 127 — VERDICT: banana
checked:
- src/kernel/gates.ts:23

## Ticket 129 — VERDICT: pass
checked:
- src/host/aidos-core.ts:5813
`;
    const parsed = parse(doc);
    expect(parsed.tickets.length).toBe(3);
    const [a, broken, c] = parsed.tickets;
    expect(a.verdict).toBe("pass");
    expect(broken.verdict).toBe("blocked");
    expect(broken.parseError).toBeDefined();
    expect(c.verdict).toBe("pass");
  });

  it("rule 5: unknown keys are ignored, not fatal", () => {
    const doc = `## Ticket 126 — VERDICT: pass
reviewer-mood: cheerful
model_temperature: 0.9
future-key: whatever
checked:
- src/kernel/types.ts:69
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.verdict).toBe("pass");
    expect(ticket.checked.length).toBe(1);
  });
});

describe("#127 cross-ticket findings and escalation", () => {
  it("a cross-ticket finding names three tickets", () => {
    const doc = `## Ticket 126 — VERDICT: pass
checked:
- src/kernel/types.ts:69

## Cross-ticket findings
- critical | src/kernel/gates.ts:23 | the stamp reader and the gate disagree (#126 #127 #129)
`;
    const parsed = parse(doc);
    expect(parsed.crossTicket.length).toBe(1);
    expect(parsed.crossTicket[0].tickets).toEqual([126, 127, 129]);
    expect(parsed.crossTicket[0].citation).toEqual({
      file: "src/kernel/gates.ts",
      line: 23,
    });
  });

  it("a batch over the escalation threshold crosses; at or under it does not", () => {
    const finding = (n: number) => `## Ticket ${n} — VERDICT: fail
checked:
- src/kernel/types.ts:69
findings:
- critical | - | broken thing ${n}
`;
    const atThreshold = parse(
      [0, 1, 2].map(finding).join("\n"),
    );
    expect(ESCALATION_THRESHOLD).toBe(3);
    expect(exceedsEscalation(atThreshold)).toBe(false);
    const over = parse([0, 1, 2, 3].map(finding).join("\n"));
    expect(exceedsEscalation(over)).toBe(true);
    // Cross-ticket criticals count too.
    const cross = parse(`## Cross-ticket findings
- critical | src/kernel/gates.ts:23 | #1 #2 #3
`);
    expect(exceedsEscalation(cross, 0)).toBe(true);
  });
});

describe("#127 truncation: section-level independence", () => {
  const full = `## Ticket 126 — VERDICT: pass
checked:
- src/kernel/types.ts:69

## Ticket 127 — VERDICT: fail
checked:
- src/kernel/gates.ts:23
findings:
- major | src/kernel/gates.ts:23 | the parser drops valid entries
`;

  it("a document truncated mid-section still applies every complete section", () => {
    // Cut in the middle of ticket 127's findings item: the section header
    // exists but its content is amputated, and that must not matter to the
    // complete section before it.
    const cut = full.indexOf("- major") + 4;
    const parsed = parse(full.slice(0, cut));
    const first = parsed.tickets.find((ticket) => ticket.ticket === 126);
    expect(first).toBeDefined();
    expect(first?.verdict).toBe("pass");
    expect(first?.checked.length).toBe(1);
  });

  it("a document truncated inside a yaml fence is marked truncated", () => {
    const doc = `## Ticket 126 — verified: yes
\`\`\`yaml
verified: yes
notes: looked at the diff and the criteria together
`;
    const parsed = parse(doc);
    expect(parsed.truncated).toBe(true);
    expect(parsed.tickets.length).toBe(1);
    expect(parsed.tickets[0].verified).toBe(true);
    expect(parsed.tickets[0].notes).toContain("criteria");
  });
});

describe("#127 the human literate form is the SAME format", () => {
  it("a prefilled human form parses to the internal model and applies the rules", () => {
    const doc = `## Ticket 126 — verified: yes
notes: every criterion has a hunk; checked against the diff
- [x] every evidence row carries model id, chain name, session id
- [x] payload-crafted stamps do not survive
findings:
- minor | src/kernel/types.ts:69 | stamp could document its own shape
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.writer).toBe("literate");
    expect(ticket.verified).toBe(true);
    expect(ticket.verdict).toBe("pass");
    expect(ticket.checked.length).toBe(2);
    expect(ticket.notes).toContain("hunk");
    expect(ticket.findings.length).toBe(1);
  });

  it("any failed checklist item is a fail — the human surface has no blocked", () => {
    const doc = `## Ticket 129 — verified: yes
- [x] the gate reads the snapshot only
- [ ] no fail-closed comment remains
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.verdict).toBe("fail");
    expect(ticket.failedItems).toEqual(["no fail-closed comment remains"]);
    expect(ticket.verdict).not.toBe("blocked");
  });

  it("verified: no is a fail even with every item checked", () => {
    const doc = `## Ticket 129 — verified: no
- [x] criterion one
- [x] criterion two
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.verdict).toBe("fail");
  });

  it("rules bind the human writer too: a pass with zero resolvable checks fails", () => {
    const doc = `## Ticket 126 — verified: yes
- [x] does/not/exist.ts:1
`;
    const [ticket] = parse(doc).tickets;
    expect(ticket.checked).toEqual([]);
    expect(ticket.verdict).toBe("fail");
    expect(ticket.rejections.join(" ")).toMatch(/rule 3/);
  });
});

describe("#127 the parse path is deterministic", () => {
  it("parsing twice yields deep-equal documents", () => {
    const doc = `## Ticket 126 — VERDICT: pass
executor-model: zai/glm-5.3
checked:
- src/kernel/types.ts:69
- absent.ts:1
findings:
- critical | absent.ts:4 | ghosts
## Cross-ticket findings
- major | - | #126 #126 #9
`;
    const first = parse(doc);
    const second = parse(doc);
    expect(second).toEqual(first);
    // And the dedupe + ordering are part of that determinism.
    expect(first.crossTicket[0].tickets).toEqual([126, 9]);
  });
});
