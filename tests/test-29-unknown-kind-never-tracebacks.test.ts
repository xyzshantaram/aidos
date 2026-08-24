/**
 * An unknown evidence kind must refuse cleanly on every path.
 *
 * The prototype's point was that plan import attaches its record kind and
 * carries no --kind flag, so a refusal that read the flag raised a second
 * error inside the error handler. The kernel throws one typed error,
 * UnknownKind, on both paths, and the error carries the kind. The
 * no-traceback rendering is a B1 tool guarantee.
 */

import { describe, expect, it } from "vitest";

import { UnknownKind } from "../src/kernel/types";
import { importPlan } from "../src/plan/plan-io";
import { expectThrows, expectUnknownKind, makeStore } from "./helpers";

const PLAN = `- [ ] **Ticket A1: Alpha.** A body **Evaluate:** A test passes.
`;

describe("an unknown kind never tracebacks", () => {
  it("attach evidence names the unknown kind", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });

    const error = expectUnknownKind(() =>
      store.attachEvidence(ticket, "builtin:not_a_real_kind", {}, "agent"),
    );
    expect(error).toBeInstanceOf(UnknownKind);
    expect(error.kind).toBe("builtin:not_a_real_kind");
  });

  it("plan import refuses without a traceback", () => {
    // A store that holds a project but registers no kind. The import
    // cannot write its builtin:imported_state record and must refuse
    // with the kind named, not with a second error.
    const store = makeStore({ kinds: [], gates: [] });
    const project = store.createProject("/srv/proj/bare", "bare");

    expect(() => importPlan(store, project, PLAN, "plan.md")).toThrow(
      UnknownKind,
    );
  });

  it("plan import names the record kind it could not write", () => {
    const store = makeStore({ kinds: [], gates: [] });
    const project = store.createProject("/srv/proj/bare", "bare");

    const error = expectThrows(
      () => importPlan(store, project, PLAN, "plan.md"),
      UnknownKind,
    );
    expect(error.kind).toBe("builtin:imported_state");
    expect(String(error)).toContain("builtin:imported_state");
  });
});
