/**
 * Ticket U2c: shared test helpers for the pure board-logic modules.
 *
 * One fake TicketView builder, the same shape the U2a test file builds
 * locally. The three U2c test files share it so the fixture cannot drift.
 */

import type { TicketView } from "../src/kernel/projections";

/** One fake TicketView. Overrides win over the defaults. */
export function makeTicket(
  overrides: Partial<TicketView> & { updatedAt?: number },
): TicketView {
  return {
    id: 1,
    projectId: 1,
    title: "T",
    description: "",
    body: "",
    criteria: "",
    phase: 0,
    order: 0,
    state: "open",
    confidenceScore: 0,
    gateFraction: null,
    gatePresent: null,
    gateTotal: null,
    updatedAt: 0,
    workspaceKey: "default",
    dependsOn: [],
    ...overrides,
  };
}
