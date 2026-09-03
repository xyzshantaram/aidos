/**
 * #96: a failed review is first-class evidence.
 *
 * `builtin:review_pass` is the GATE KEY for in_progress ->
 * awaiting_verification, so a FAILING review cannot be recorded as one
 * without hollowing out the only mechanism that stops the agent marking its
 * own homework. `builtin:review_fail` exists to record the failure honestly,
 * and its entire contract is that it CONTRIBUTES NOTHING.
 *
 * The dangerous alternative that was rejected during design was namespacing
 * (`review_pass:ok` / `review_pass:fail`), because the only thing that would
 * make it "just work" is PREFIX MATCHING on kind ids -- under which
 * `review_pass:fail` would satisfy a gate wanting `review_pass`, so a failing
 * review would UNLOCK the ticket. These tests pin exact-match semantics so
 * that door stays shut.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { BUILTIN_KINDS, DEFAULT_GATES } from "../src/kernel/constants";
import { kindColor } from "../src/client/board-logic";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
  type Harness,
} from "./b1-harness";

const REVIEW_FAIL = "builtin:review_fail";
const REVIEW_PASS = "builtin:review_pass";

describe("#96 review_fail is evidence that unlocks nothing", () => {
  it("is registered with weight 0 and both authors", () => {
    const def = BUILTIN_KINDS.find((kind) => kind.id === REVIEW_FAIL);
    expect(def).toBeDefined();
    expect(def?.weight).toBe(0);
    expect([...(def?.allowedAuthors ?? [])].sort()).toEqual(["agent", "user"]);
  });

  it("appears in NO gate's requiredKinds", () => {
    for (const gate of DEFAULT_GATES) {
      expect(gate.requiredKinds).not.toContain(REVIEW_FAIL);
    }
  });

  it("review_pass keeps its exact id, so pre-existing log rows stay valid", () => {
    // The whole reason review_pass was NOT renamed: every evidence row in
    // every append-only session log names it. Renaming needs a migration.
    const def = BUILTIN_KINDS.find((kind) => kind.id === REVIEW_PASS);
    expect(def).toBeDefined();
    expect(def?.weight).toBe(1.0);
    const gate = DEFAULT_GATES.find(
      (g) => g.fromState === "in_progress" && g.toState === "awaiting_verification",
    );
    expect(gate?.requiredKinds).toContain(REVIEW_PASS);
  });

  it("reads as a verdict, not as 'a pass over the code'", () => {
    const pass = BUILTIN_KINDS.find((kind) => kind.id === REVIEW_PASS);
    const fail = BUILTIN_KINDS.find((kind) => kind.id === REVIEW_FAIL);
    // The label is what a human actually reads; the id is machinery.
    expect(pass?.label).toContain("accepted");
    expect(fail?.label).toContain("failed");
    // And the description must state the verdict is positive, so an agent
    // cannot honestly attach one for a failing review.
    expect(pass?.description).toContain("PASSED");
    expect(fail?.description).toContain("FAILED");
  });

  it("no kind id is a prefix of another kind id", () => {
    // Defence against ever reintroducing prefix matching: if no id is a
    // prefix of another, a prefix matcher and an exact matcher agree, and a
    // future refactor cannot silently unlock a gate.
    for (const a of BUILTIN_KINDS) {
      for (const b of BUILTIN_KINDS) {
        if (a.id === b.id) continue;
        expect(b.id.startsWith(a.id)).toBe(false);
      }
    }
  });
});

describe("#96 review_fail cannot move a ticket through the gate", () => {
  let harness: Harness;
  let ticketId: number;

  beforeEach(async () => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(
      await harness.runTool("set_ticket", { title: "A failing review", body: "A body." }),
    );
    ticketId = created.ticketId as number;
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
  });

  it("automated_check + review_fail still refuses, naming review_pass", async () => {
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "automated_check", payload: {} }),
    );
    successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "review_fail",
        payload: { verdict: "REVIEW FAIL", findings: 3 },
      }),
    );
    const refused = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(JSON.stringify(refused)).toContain("review_pass");
  });

  it("attaching review_fail does not raise the gate fraction", async () => {
    const before = successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "automated_check", payload: {} }),
    );
    const after = successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "review_fail",
        payload: { verdict: "REVIEW FAIL" },
      }),
    );
    expect(after.gatePresent).toBe(before.gatePresent);
    expect(after.gateSatisfied).toBe(false);
  });

  it("weight 0 means it does not inflate the advisory confidence score either", async () => {
    const before = successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "automated_check", payload: {} }),
    );
    const after = successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "review_fail",
        payload: { verdict: "REVIEW FAIL" },
      }),
    );
    expect(after.confidenceScore).toBe(before.confidenceScore);
  });

  it("a later review_pass still opens the gate, and the fail row stays", async () => {
    // Decision recorded on #96: KEEP BOTH. The round count is the honest
    // history, so a pass never erases the fail that preceded it.
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "automated_check", payload: {} }),
    );
    successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "review_fail",
        payload: { verdict: "REVIEW FAIL" },
      }),
    );
    successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "review_pass",
        payload: { verdict: "REVIEW PASS" },
      }),
    );
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));

    const read = successJson(await harness.runTool("get_ticket", { ticketId }));
    const kinds = (read.evidence as Array<{ kind: string }>).map((row) => row.kind);
    expect(kinds).toContain(REVIEW_FAIL);
    expect(kinds).toContain(REVIEW_PASS);
  });
});

describe("#96 a failed review is distinguishable at a glance", () => {
  it("does not share a colour with review_note or review_pass", () => {
    // Hash-based colours give routine distinctness; a FAILED review needs to
    // read as a warning, so it gets an explicit token instead of whatever the
    // hash lands on next to a plain remark.
    const fail = kindColor("builtin:review_fail");
    expect(fail).not.toBe(kindColor("builtin:review_note"));
    expect(fail).not.toBe(kindColor("builtin:review_pass"));
  });

  it("uses its own verdict token, not a borrowed STATE token", () => {
    // A verdict is not a state. Borrowing --state-awaiting would mean
    // recolouring the state chips silently recolours a verdict.
    const fail = kindColor("builtin:review_fail");
    expect(fail).toBe("var(--verdict-fail)");
    expect(fail).not.toContain("--state-");
  });

  it("declares that token in the stylesheet", () => {
    // A var() reference to an undeclared token renders as nothing, which is
    // exactly the silent-failure class this project keeps hitting.
    const css = readFileSync(
      new URL("../src/client/board.css", import.meta.url),
      "utf8",
    );
    expect(css).toContain("--verdict-fail:");
  });
});

describe("#96 the human attach surface for the review kinds", () => {
  const form = readFileSync(
    new URL("../src/client/evidence-attach.tsx", import.meta.url),
    "utf8",
  );

  it("gives review_fail a tailored form, not the raw-JSON escape hatch", () => {
    /*
     * Review finding 1. review_fail is user-authorable, so the human's kind
     * picker offers it -- but it was missing from the note-carrying branch
     * and fell through to the JSON escape hatch at the bottom of the file.
     * That surface is for FOREIGN and unknown kinds; showing it for a
     * blessed builtin is exactly what #68 exists to eliminate.
     */
    expect(form).toContain("builtin:review_fail");
  });

  it("requires a verdict: review_fail cannot be attached empty", () => {
    /*
     * The escape-hatch form's button is disabled only on a JSON parse error,
     * so falling through to it ALSO permitted an empty note -- a failed
     * review carrying no verdict, which is the one thing the kind exists to
     * carry. The tailored branch disables on an empty note instead.
     */
    const branch = form.slice(form.indexOf("REVIEW_VERDICT_LABEL"));
    const body = branch.slice(0, branch.indexOf("// Foreign/unknown kinds"));
    expect(body).toContain("builtin:review_fail");
    expect(body).toContain('note.trim() === ""');
  });

  it("does not offer the retired comment kind a tailored form either", () => {
    // F3: the offering gate is user-evidence-kinds.ts, but pinning both
    // layers means "no longer offered anywhere" is actually enforced twice.
    const branch = form.slice(form.indexOf("REVIEW_VERDICT_LABEL"));
    const body = branch.slice(0, branch.indexOf("// Foreign/unknown kinds"));
    expect(body).not.toContain("builtin:comment");
  });
});
