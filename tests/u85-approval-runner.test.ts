/**
 * #85: the approval runner's decision logic.
 *
 * LIMITATION, stated rather than hidden: this repo has no jsdom setup and no
 * component tests, so the RENDERED modal is not exercised here. What is
 * exercised is every decision the runner makes — the value a step starts
 * with, and whether the human's edits count as an amendment — because those
 * are the parts a caller acts on. The rendering needs hands-on verification.
 */

import { describe, expect, it } from "vitest";

import { initialValue, isAmended } from "../src/client/approval-runner";
import type { Step, StepValue } from "../src/client/approval-runner";

describe("u85 approval-runner: initial step values", () => {
  it("a confirm step starts with an empty note and no criterion", () => {
    const step: Step = { kind: "confirm", title: "Sign off?" };
    expect(initialValue(step)).toEqual({ kind: "confirm", note: "" });
  });

  it("a path-list step starts with the proposed paths", () => {
    const step: Step = { kind: "path-list", title: "Paths", paths: ["src/host", "tests"] };
    expect(initialValue(step)).toEqual({
      kind: "path-list",
      paths: ["src/host", "tests"],
    });
  });

  it("a path-list step COPIES the proposal, so editing cannot mutate the caller's array", () => {
    const paths = ["src/host"];
    const step: Step = { kind: "path-list", title: "Paths", paths };
    const value = initialValue(step);
    if (value.kind !== "path-list") throw new Error("wrong kind");
    value.paths.push("src/client");
    expect(paths).toEqual(["src/host"]);
  });

  it("a criteria-checklist starts with everything checked by default", () => {
    const step: Step = {
      kind: "criteria-checklist",
      title: "Criteria",
      criteria: ["a", "b", "c"],
    };
    expect(initialValue(step)).toEqual({
      kind: "criteria-checklist",
      criteria: ["a", "b", "c"],
    });
  });

  it("a criteria-checklist honors an explicit selection, in criterion order", () => {
    const step: Step = {
      kind: "criteria-checklist",
      title: "Criteria",
      criteria: ["a", "b", "c"],
      selected: [2, 0],
    };
    expect(initialValue(step)).toEqual({
      kind: "criteria-checklist",
      criteria: ["a", "c"],
    });
  });

  it("a dependency-picker starts with nothing selected unless told otherwise", () => {
    const step: Step = {
      kind: "dependency-picker",
      title: "Deps",
      candidates: [],
    };
    expect(initialValue(step)).toEqual({ kind: "dependency-picker", ticketIds: [] });
  });
});

describe("u85 approval-runner: approved vs amended", () => {
  const pathStep: Step = {
    kind: "path-list",
    title: "Paths",
    paths: ["src/host", "tests"],
  };

  it("confirming the proposal unchanged is APPROVED, not amended", () => {
    const values: StepValue[] = [{ kind: "path-list", paths: ["src/host", "tests"] }];
    expect(isAmended([pathStep], values)).toBe(false);
  });

  it("editing the path list is AMENDED", () => {
    const values: StepValue[] = [{ kind: "path-list", paths: ["src/host"] }];
    expect(isAmended([pathStep], values)).toBe(true);
  });

  it("reordering the path list is an amendment, because order is meaningful to the caller", () => {
    const values: StepValue[] = [{ kind: "path-list", paths: ["tests", "src/host"] }];
    expect(isAmended([pathStep], values)).toBe(true);
  });

  it("writing a note on a confirm step is NOT an amendment — it is how you approve", () => {
    const step: Step = { kind: "confirm", title: "Sign off?" };
    const values: StepValue[] = [{ kind: "confirm", note: "looks right to me" }];
    expect(isAmended([step], values)).toBe(false);
  });

  it("unchecking a criterion is an amendment", () => {
    const step: Step = {
      kind: "criteria-checklist",
      title: "Criteria",
      criteria: ["a", "b"],
    };
    const values: StepValue[] = [{ kind: "criteria-checklist", criteria: ["a"] }];
    expect(isAmended([step], values)).toBe(true);
  });

  it("one amended step among several makes the whole run amended", () => {
    const confirm: Step = { kind: "confirm", title: "Sign off?" };
    const values: StepValue[] = [
      { kind: "confirm", note: "" },
      { kind: "path-list", paths: [] },
    ];
    expect(isAmended([confirm, pathStep], values)).toBe(true);
  });

  it("a missing value never fakes an amendment", () => {
    expect(isAmended([pathStep], [])).toBe(false);
  });
});
