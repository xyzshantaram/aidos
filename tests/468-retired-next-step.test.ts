/**
 * #468: next_step guidance ignores retirement.
 *
 * Owner report, live board: a retired ticket's next-step guidance still said
 * "propose the files this ticket needs (request_allowlist)" — an action the
 * tool REFUSES for retired tickets. Guidance naming a refused action teaches
 * the agent to ignore guidance, which is the exact failure #411 exists to
 * prevent.
 *
 * Mechanism: `nextStep` handled `done` and fell through to gate guidance for
 * every other state, and retirement is a KIND (#108), not a state — so a
 * retired ticket kept the guidance of whatever state it was retired in.
 *
 * These tests pin the fix at both layers:
 * - the kernel: `nextStep` returns one retirement line for a retired ticket
 *   in ANY state, and byte-identical guidance otherwise;
 * - the service: `nextStepFor` threads the flag from `_isRetired` on the
 *   routed cache, so the owner-visible case (retired open ticket, empty
 *   allowlist) answers the retirement line through the real tools.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { nextStep } from "../src/kernel/next-step";
import type { NextStepInput } from "../src/kernel/next-step";
import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness } from "./b1-harness";

const input = (over: Partial<NextStepInput> & { retired?: boolean }): NextStepInput =>
  ({ state: "open", allowlist: [], criteria: "- it works", ...over }) as NextStepInput;

const none = (): Set<string> => new Set();

describe("#468 a retired ticket is told it is retired, not what to request", () => {
  it("open + empty allowlist + retired gets the retirement line, never the allowlist step", () => {
    // The exact owner-visible case: before the fix this fell into the open
    // branch and proposed an allowlist the tools refuse to take.
    const step = nextStep(DEFAULT_CONFIG, input({ retired: true }), none()) ?? "";
    expect(step).toMatch(/retired/);
    expect(step).toMatch(/Retired panel/);
    expect(step).not.toContain("request_allowlist");
    expect(step).not.toMatch(/propose the files/);
    expect(step).not.toMatch(/ready for|still needs/);
  });

  it("retired in in_progress and awaiting_verification get the SAME line", () => {
    // Retirement is orthogonal to state (#108): one line, every state.
    const states = ["open", "in_progress", "awaiting_verification"] as const;
    const steps = states.map(
      (state) =>
        nextStep(
          DEFAULT_CONFIG,
          input({ state, allowlist: ["src"], retired: true }),
          none(),
        ) as string,
    );
    for (const step of steps) expect(step).toMatch(/retired/);
    expect(new Set(steps).size).toBe(1);
  });

  it("the retirement line names what the tools refuse: no writes, no moves, no allowlist", () => {
    const step = nextStep(DEFAULT_CONFIG, input({ retired: true }), none()) ?? "";
    expect(step).toMatch(/no writes/);
    expect(step).toMatch(/no gate moves/);
    expect(step).toMatch(/no allowlist requests/);
    expect(step).toMatch(/un-retire/);
  });

  it("done stays first: a retired done ticket needs nothing", () => {
    expect(
      nextStep(DEFAULT_CONFIG, input({ state: "done", retired: true }), none()),
    ).toBeUndefined();
  });

  it("the flag is explicit, not inferred from state", () => {
    // The same open ticket without the flag keeps the old guidance — state
    // alone never implies retirement.
    const without = nextStep(DEFAULT_CONFIG, input({}), none()) ?? "";
    expect(without).toContain("request_allowlist");
    const flagged = nextStep(DEFAULT_CONFIG, input({ retired: true }), none()) ?? "";
    expect(flagged).not.toContain("request_allowlist");
  });
});

describe("#468 non-retired guidance is byte-identical to before", () => {
  it("retired:false is the same as omitting the flag", () => {
    const omitted = nextStep(DEFAULT_CONFIG, input({}), none());
    const explicit = nextStep(DEFAULT_CONFIG, input({ retired: false }), none());
    expect(explicit).toBe(omitted);
  });

  it("the open ladder is untouched without the flag", () => {
    // No criteria -> criteria first; criteria but no allowlist -> allowlist;
    // grilled and scoped -> ready for signoff. Same sentences as #174 pins.
    expect(
      nextStep(DEFAULT_CONFIG, input({ criteria: "  " }), none()) ?? "",
    ).toContain("criteria");
    expect(nextStep(DEFAULT_CONFIG, input({}), none()) ?? "").toContain(
      "request_allowlist",
    );
    expect(
      nextStep(DEFAULT_CONFIG, input({ allowlist: ["src"] }), none()) ?? "",
    ).toMatch(/ready for.*user_signoff/);
  });

  it("in_progress still names the missing kinds without the flag", () => {
    const step =
      nextStep(
        DEFAULT_CONFIG,
        input({ state: "in_progress", allowlist: ["src"] }),
        none(),
      ) ?? "";
    expect(step).toMatch(/still needs/);
    expect(step).toContain("review_pass");
  });
});

describe("#468 nextStepFor threads _isRetired from the routed cache", () => {
  function setup() {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    return { harness, svc: harness.service, agent: harness.asAgent() };
  }

  it("a user-retired open ticket with an empty allowlist answers the retirement line", async () => {
    const { svc, agent } = setup();
    svc.setTicket(agent, { title: "Doomed", criteria: "- it works" });
    const ticketId = svc.getTickets(agent)[0]?.id;
    if (ticketId === undefined) throw new Error("test setup: ticket not found");
    svc.userRetireTicket(agent, { ticketId, reason: "superseded" });
    const step = svc.nextStepFor(agent, ticketId) ?? "";
    expect(step).toMatch(/retired/);
    expect(step).toMatch(/Retired panel/);
    expect(step).not.toContain("request_allowlist");
  });

  it("a live ticket keeps its gate guidance through the same path", async () => {
    const { svc, agent } = setup();
    svc.setTicket(agent, { title: "Live", criteria: "- it works" });
    const ticketId = svc.getTickets(agent)[0]?.id;
    if (ticketId === undefined) throw new Error("test setup: ticket not found");
    const step = svc.nextStepFor(agent, ticketId) ?? "";
    expect(step).toContain("request_allowlist");
  });
});
