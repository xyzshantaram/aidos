/**
 * Plan import and export. The machine surface of the plan skill.
 * SPEC.md section 13 is the contract.
 */

import { parsePlan, renderPlan } from "./plan";
import type { PlanPhase, PlanTicket } from "./plan";
import { ProjectNotEmptyError } from "../kernel/types";
import type { ProjectId, TicketId } from "../kernel/types";
import type { Store } from "../kernel/store";

export interface ImportResult {
  phases: PlanPhase[];
  tickets: TicketId[];
}

/**
 * Load one plan document into an empty project.
 * Every ticket lands in "open". The claimed state becomes one
 * builtin:imported_state row per ticket, author "system".
 */
export function importPlan(
  store: Store,
  projectId: ProjectId,
  text: string,
  source: string,
): ImportResult {
  // 1. Parse first: a parse error imports nothing.
  const document = parsePlan(text);

  // 2. An import loads a whole plan into an empty project; it never merges.
  if (store.ticketsFor(projectId).length > 0) {
    throw new ProjectNotEmptyError(projectId);
  }

  // 6. The plan meta stores verbatim; rules stay "".
  store.setPlanMeta(projectId, {
    frontmatter: document.frontmatter,
    preamble: document.preamble,
    contextSections: document.contextSections,
  });

  const ticketIds: TicketId[] = [];
  for (const phase of document.phases) {
    // 5. Phases come from the document, state as a label.
    store.setPhase(projectId, phase.number, {
      title: phase.title,
      state: phase.state,
    });
    for (const ticket of phase.tickets) {
      // 3 and 5. Every ticket lands in open, phase and order from the
      // document, ids from the store's counter.
      const ticketId = store.createTicket(projectId, ticket.title, "", {
        body: ticket.body,
        criteria: ticket.criteria,
        phase: phase.number,
        order: ticket.order,
      });
      // 4. One imported_state row per ticket, author system.
      store.attachEvidence(
        ticketId,
        "builtin:imported_state",
        { claimed_state: ticket.claimedState, source },
        "system",
      );
      ticketIds.push(ticketId);
    }
  }
  return { phases: document.phases, tickets: ticketIds };
}

/**
 * Serialize one project's plan as markdown.
 * Two exports of the same store give identical bytes.
 */
export function exportPlan(store: Store, projectId: ProjectId): string {
  const meta = store.getPlanMeta(projectId);
  const rows = store.ticketsFor(projectId);
  const phases: PlanPhase[] = store.phasesFor(projectId).map((phase) => ({
    number: phase.number,
    title: phase.title,
    state: phase.state,
    tickets: rows
      .filter((row) => row.phase === phase.number)
      .map((row): PlanTicket => ({
        id: String(row.id),
        title: row.title,
        body: row.body,
        criteria: row.criteria,
        claimedState: row.state,
        order: row.order,
      })),
  }));
  return renderPlan({
    frontmatter: meta.frontmatter,
    preamble: meta.preamble,
    phases,
    contextSections: meta.contextSections,
  });
}
