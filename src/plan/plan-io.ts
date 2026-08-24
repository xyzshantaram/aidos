/**
 * Plan import and export. The machine surface of the plan skill.
 * SPEC.md section 13 is the contract.
 */

import { parsePlan, renderPlan } from "./plan";
import type { PlanTicket } from "./plan";
import { ProjectNotEmptyError } from "../kernel/types";
import type { ProjectId, TicketId } from "../kernel/types";
import type { Store } from "../kernel/store";

export interface ImportResult {
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
  for (const ticket of document.tickets) {
    // 3 and 5. Every ticket lands in open, order from the document, phase
    // and ids from the store's defaults.
    const ticketId = store.createTicket(projectId, ticket.title, "", {
      body: ticket.body,
      criteria: ticket.criteria,
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
  return { tickets: ticketIds };
}

/**
 * Serialize one project's plan as markdown.
 * Two exports of the same store give identical bytes.
 */
export function exportPlan(store: Store, projectId: ProjectId): string {
  const meta = store.getPlanMeta(projectId);
  const tickets: PlanTicket[] = store.ticketsFor(projectId).map((row): PlanTicket => ({
    id: String(row.id),
    title: row.title,
    body: row.body,
    criteria: row.criteria,
    claimedState: row.state,
    order: row.order,
  }));
  return renderPlan({
    frontmatter: meta.frontmatter,
    preamble: meta.preamble,
    contextSections: meta.contextSections,
    tickets,
  });
}
