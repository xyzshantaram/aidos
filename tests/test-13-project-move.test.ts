/**
 * Item 13. Moving a project keeps its tickets.
 *
 * The path updates, the name stays, and every ticket keeps the project id.
 * A store built from the same log reports the same two facts.
 */

import { describe, expect, it } from "vitest";

import { makeStore, storeFromLog } from "./helpers";

describe("project move", () => {
  it("the ticket stays with the project and the path updates", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/alpha", "alpha");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    store.moveProject(project, "/srv/proj/beta");

    const projectInfo = store.getProject(project);
    expect(projectInfo.id).toBe(project);
    expect(projectInfo.absPath).toBe("/srv/proj/beta");
    expect(projectInfo.name).toBe("alpha");

    const ticketInfo = store.getTicket(ticket);
    expect(ticketInfo.projectId).toBe(project);

    const reopened = storeFromLog(store.events());
    expect(reopened.getProject(project).absPath).toBe("/srv/proj/beta");
    expect(reopened.getTicket(ticket).projectId).toBe(project);
  });
});
