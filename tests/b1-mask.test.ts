/**
 * The state-gated tool masks (SPEC-B1.md sections 4 and 9, decision 10).
 *
 * The mask follows the union of ticket states, is re-applied at session start
 * and on every `ticket/change` event, and decides which tools exist. The tier
 * assertions go through the harness's restriction-intersection model
 * (`effectiveToolSet`), which is independent of whether the implementation
 * expresses a tier as a keep-only (`allow`) or a remove (`deny`) filter — and
 * of the case where a tier denies nothing, so the mask registers no
 * restriction at all (the in-progress tier makes every tier tool visible).
 *
 * The done-only session is seeded through the kernel Store (the user drives
 * the last gate), because the agent has no path to done.
 */

import { describe, expect, it } from "vitest";

import { installAidosMask } from "../src/tools/mask";
import { Store } from "../src/kernel/store";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { FIXED_NOW } from "./helpers";
import {
  asContext,
  createHarness,
  SIX_TOOLS,
  type Harness,
} from "./b1-harness";

/** The tools the tier table names beyond the six board tools. */
const TIER_TOOLS = [...SIX_TOOLS, "read", "write", "edit", "bash"];

/** The tools one session may see after the latest mask application. */
function visibleTools(harness: Harness): string[] {
  return harness.effectiveToolSet(TIER_TOOLS);
}

/** Drive one ticket from open to in_progress (the board supplies the signoff). */
function moveToInProgress(harness: Harness, ticketId: number) {
  harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
  harness.service.agentMoveTicket(harness.asAgent(), { ticketId, to: "in_progress" });
}

/** Re-apply the mask over the settled state (the re-apply seam on a change). */
function settleMask(harness: Harness) {
  const lastEvent = harness.session.events[harness.session.events.length - 1];
  harness.fireSessionEvent(harness.session, lastEvent);
}

/** A harness with the mask installed and the session-start application fired. */
function maskedHarness(seed?: (harness: Harness) => void) {
  const harness = createHarness();
  seed?.(harness);
  harness.installService();
  // The tier tools give the mask a universe to mask: without write/edit/bash
  // in the registry the open tier would deny nothing.
  harness.registerTierTools();
  installAidosMask(asContext(harness.ctx));
  harness.fireSessionStart(harness.agent);
  return harness;
}

describe("the state-gated masks", () => {
  it("a session with only open tickets lacks write and edit but keeps bash", () => {
    const harness = maskedHarness();
    harness.service.setTicket(harness.asAgent(), { title: "Still open" });

    const visible = visibleTools(harness);
    expect(visible).toContain("get_tickets");
    expect(visible).not.toContain("write");
    expect(visible).not.toContain("edit");
    expect(visible).toContain("bash");
  });

  it("one in-progress ticket adds write, edit, and bash", () => {
    const harness = maskedHarness();
    const first = harness.service.setTicket(harness.asAgent(), { title: "Open one" });
    const second = harness.service.setTicket(harness.asAgent(), { title: "Open two" });

    expect(visibleTools(harness)).not.toContain("write");

    // The union: one in-progress ticket among open tickets unlocks the tier.
    // The in-progress tier denies nothing, so the mask lifts its restriction.
    moveToInProgress(harness, first.id);
    settleMask(harness);

    const visible = visibleTools(harness);
    expect(visible).toContain("write");
    expect(visible).toContain("edit");
    expect(visible).toContain("bash");
    expect(harness.service.getTickets(harness.asAgent()).length).toBe(2);
    void second;
  });

  it("a ticket in awaiting_verification keeps bash and hides write and edit", () => {
    const harness = maskedHarness();
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "Ready" });

    moveToInProgress(harness, ticket.id);
    harness.seedEvidence(harness.agent, ticket.id, "builtin:automated_check");
    harness.seedEvidence(harness.agent, ticket.id, "builtin:review_pass");
    harness.service.agentMoveTicket(harness.asAgent(), {
      ticketId: ticket.id,
      to: "awaiting_verification",
    });
    settleMask(harness);

    const visible = visibleTools(harness);
    expect(visible).toContain("bash");
    expect(visible).not.toContain("write");
    expect(visible).not.toContain("edit");
  });

  it("a done-only session hides the tier tools but keeps bash", () => {
    const harness = maskedHarness((h) => {
      const store = new Store(DEFAULT_CONFIG, { now: () => FIXED_NOW });
      const project = store.createProject("/srv/proj/cli", "cli");
      const ticket = store.createTicket(project, "Finished", "d", { actor: "user" });
      store.attachEvidence(ticket, "builtin:user_signoff", {}, "user");
      store.moveTicket(ticket, "in_progress", "user");
      store.attachEvidence(ticket, "builtin:automated_check", {}, "user");
      store.attachEvidence(ticket, "builtin:review_pass", {}, "user");
      store.moveTicket(ticket, "awaiting_verification", "user");
      store.attachEvidence(ticket, "builtin:user_verified", {}, "user");
      store.moveTicket(ticket, "done", "user");
      h.seedFromStore(store);
    });

    const visible = visibleTools(harness);
    expect(visible).toContain("get_tickets");
    for (const name of ["set_ticket", "attach_evidence", "move_ticket", "plan", "plan_import"]) {
      expect(visible, `tool ${name} must hide in done`).not.toContain(name);
    }
    for (const name of ["write", "edit"]) {
      expect(visible).not.toContain(name);
    }
    expect(visible).toContain("bash");
  });

  it("the mask re-applies on a ticket/change event", () => {
    const harness = maskedHarness();
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "Moving" });
    expect(visibleTools(harness)).not.toContain("write");

    // The move appends one ticket/change event; the re-apply seam runs and
    // the visible set reflects the new union.
    moveToInProgress(harness, ticket.id);
    settleMask(harness);

    expect(visibleTools(harness)).toContain("write");
  });

  it("restrictions intersect: the mask never re-adds a tool another restriction removed", () => {
    const harness = maskedHarness();
    // A manual restriction (e.g. a deployment toolFilter) denies read.
    harness.ctx.tools.restrict({ deny: ["read"] });
    harness.service.setTicket(harness.asAgent(), { title: "Open" });

    const visible = visibleTools(harness);
    expect(visible).not.toContain("read");
    expect(visible).not.toContain("write");
    expect(visible).not.toContain("edit");
    expect(visible).toContain("bash");
    expect(visible).toContain("get_tickets");
  });
});
