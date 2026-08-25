/**
 * Ticket U2c: the per-state action descriptors.
 *
 * One test per state asserts the exact descriptor array: label, primary
 * flag, and order. No evidence gate lives here; a gate refusal surfaces as
 * a toast, and that is the component layer's job.
 */

import { describe, expect, it } from "vitest";

import { actionsFor } from "../src/client/action-visibility";
import { makeTicket } from "./u2c-helpers";

describe("u2c action-visibility: actionsFor", () => {
  it("open offers the primary signoff action", () => {
    const ticket = makeTicket({ state: "open" });
    expect(actionsFor(ticket)).toEqual([
      { id: "signoff", label: "Sign off", primary: true },
    ]);
  });

  it("in_progress offers submit for review without a primary flag", () => {
    const ticket = makeTicket({ state: "in_progress" });
    expect(actionsFor(ticket)).toEqual([
      { id: "submit-for-review", label: "Submit for review" },
    ]);
  });

  it("awaiting_verification offers send-back then primary mark done", () => {
    const ticket = makeTicket({ state: "awaiting_verification" });
    expect(actionsFor(ticket)).toEqual([
      { id: "send-back", label: "Send back" },
      { id: "mark-done", label: "Mark done", primary: true },
    ]);
  });

  it("done offers no actions", () => {
    const ticket = makeTicket({ state: "done" });
    expect(actionsFor(ticket)).toEqual([]);
  });
});
