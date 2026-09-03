/**
 * Item 25 (tool layer). Every tool renders JSON, on success and on failure.
 *
 * SPEC-B1.md decision 2: every tool result is JSON on success and on failure;
 * refusals are structured JSON errors, never tracebacks. `plan` is the one
 * exception: its result is the plan markdown. A bad payload and a missing
 * file refuse cleanly.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import {
  asContext,
  createHarness,
  failureJson,
  failureOf,
  successJson,
  type Harness,
  type ToolOutcome,
} from "./b1-harness";

/** A plan document that imports without an error. */
const SMALL_PLAN = `- [ ] **Ticket 1: Do the work.** A body.

  **Evaluate:**

  - The work is done.
`;

/** A plan document that holds a line the parser must reject. */
const BAD_PLAN_LINES = [
  "## Notes",
  "",
  "- [ ] **Ticket 1: Read it.** A body.",
  "",
  "  **Evaluate:**",
  "",
  "  - The work is done.",
  "",
  "This line is neither a ticket nor a continuation.",
  "",
];
const BAD_PLAN = BAD_PLAN_LINES.join("\n");
const BAD_LINE_NUMBER =
  BAD_PLAN_LINES.indexOf("This line is neither a ticket nor a continuation.") + 1;

/** The six tools that must render JSON. `plan` is the exception. */
const JSON_TOOLS = [
  "get_tickets",
  "set_ticket",
  "attach_evidence",
  "move_ticket",
  "plan_import",
] as const;

describe("every tool renders JSON", () => {
  let harness: Harness;
  let ticketId: number;
  let smallPlanFile: string;
  let badPlanFile: string;

  beforeEach(async () => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(await harness.runTool("set_ticket", { title: "Ticket one" }));
    ticketId = created.ticketId as number;
    smallPlanFile = harness.tempPlanFile(SMALL_PLAN);
    badPlanFile = harness.tempPlanFile(BAD_PLAN);
  });

  it("every JSON tool renders JSON on success", async () => {
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    const importer = createHarness();
    importer.installService();
    apply(asContext(importer.ctx), {});

    const runs: { name: (typeof JSON_TOOLS)[number]; args: Record<string, unknown> }[] = [
      { name: "get_tickets", args: {} },
      { name: "set_ticket", args: { ticketId, title: "New" } },
      { name: "attach_evidence", args: { ticketId, kind: "builtin:test_run" } },
      { name: "move_ticket", args: { ticketId, to: "in_progress" } },
      { name: "plan_import", args: { file: smallPlanFile } },
    ];
    const seen = new Set<string>();
    for (const run of runs) {
      const outcome =
        run.name === "plan_import"
          ? await importer.runTool(run.name, run.args)
          : await harness.runTool(run.name, run.args);
      const payload = successJson(outcome);
      expect(payload.ok).toBe(true);
      seen.add(run.name);
    }
    expect([...seen].sort()).toEqual([...JSON_TOOLS].sort());
  });

  it("a refused move renders JSON and names the gate fields", async () => {
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "done" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.fromState).toBe("open");
    expect(refusal.toState).toBe("done");
  });

  it("every failure renders structured JSON", async () => {
    const importer = createHarness();
    importer.installService();
    apply(asContext(importer.ctx), {});

    const runs: { name: string; args: Record<string, unknown>; code: string; on: Harness }[] = [
      { name: "get_tickets", args: { projectId: 999 }, code: "unknown_project", on: harness },
      { name: "set_ticket", args: { ticketId: 999, title: "X" }, code: "unknown_ticket", on: harness },
      { name: "set_ticket", args: {}, code: "bad_payload", on: harness },
      {
        name: "attach_evidence",
        args: { ticketId, kind: "builtin:no_such_kind" },
        code: "unknown_kind",
        on: harness,
      },
      {
        name: "attach_evidence",
        args: { ticketId, kind: "builtin:user_signoff" },
        code: "human_only_kind",
        on: harness,
      },
      {
        name: "attach_evidence",
        args: { ticketId, kind: "builtin:test_run", payload: "not an object" },
        // The parameter schema catches the non-object payload before the
        // body runs (ToolArgsError, code INVALID_ARGS): the refusal is
        // structured either way, never a traceback.
        code: "INVALID_ARGS",
        on: harness,
      },
      { name: "move_ticket", args: { ticketId, to: "done" }, code: "gate_refused", on: harness },
      { name: "move_ticket", args: { ticketId: 999, to: "done" }, code: "unknown_ticket", on: harness },
      { name: "plan", args: { projectId: 999 }, code: "unknown_project", on: harness },
      { name: "plan_import", args: { file: "absent_plan.md" }, code: "file_not_read", on: harness },
      { name: "plan_import", args: { file: smallPlanFile }, code: "project_not_empty", on: harness },
      { name: "plan_import", args: { file: badPlanFile }, code: "plan_parse_error", on: importer },
    ];

    for (const run of runs) {
      const outcome = await run.on.runTool(run.name, run.args);
      expect(outcome.isError, `${run.name} ${JSON.stringify(run.args)} must fail`).toBe(true);
      const failure = failureOf(outcome);
      expect(failure.code, `${run.name} must carry code ${run.code}`).toBe(run.code);
      expect(failure.message.length).toBeGreaterThan(0);
    }
  });

  it("an import into a used project names the reason", async () => {
    const refusal = failureJson(
      await harness.runTool("plan_import", { file: smallPlanFile }),
    );
    expect(refusal.error).toBe("project_not_empty");
  });

  it("a plan parse error names the line and imports nothing", async () => {
    const importer = createHarness();
    importer.installService();
    apply(asContext(importer.ctx), {});

    const refusal = failureJson(
      await importer.runTool("plan_import", { file: badPlanFile }),
    );
    expect(refusal.error).toBe("plan_parse_error");
    expect(refusal.line).toBe(BAD_LINE_NUMBER);
    expect(String(refusal.message)).toContain(String(BAD_LINE_NUMBER));

    const listed = successJson(await importer.runTool("get_tickets", {}));
    expect((listed.tickets as unknown[]).length).toBe(0);
  });

  it("plan renders markdown, not JSON", async () => {
    const first = await harness.runTool("plan", {});
    expect(first.isError).toBe(false);
    const text = (first.content[0] as { type: "text"; text: string }).text;
    expect(() => JSON.parse(text)).toThrow();
    expect(text).toContain("Ticket one");
    expect(text).toMatch(/- \[/);
    });

  it("plan is byte-identical for identical state", async () => {
    const first = await harness.runTool("plan", {});
    const second = await harness.runTool("plan", {});
    expect(first.isError).toBe(false);
    expect(second.isError).toBe(false);
    const firstText = (first.content[0] as { type: "text"; text: string }).text;
    const secondText = (second.content[0] as { type: "text"; text: string }).text;
    expect(firstText).toBe(secondText);
  });

  it("a bad payload on attach_evidence refuses without a traceback", async () => {
    const outcome: ToolOutcome = await harness.runTool("attach_evidence", {
      ticketId,
      kind: "builtin:test_run",
      payload: "not an object",
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.error?.message).not.toMatch(/\n\s+at /);
  });
});
