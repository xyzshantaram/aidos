/**
 * Item 27. The CLI walks the lifecycle as far as a machine may go.
 *
 * The agent creates the ticket and makes every move it may make. The board
 * supplies the human evidence through the user actor. The last gate stays
 * shut.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { EvidenceAuthorRefused, GateRefused } from "../src/kernel/types";
import {
  expectEvidenceAuthorRefused,
  expectGateRefused,
  makeStore,
} from "./helpers";

function freshStore() {
  const store = makeStore(DEFAULT_CONFIG);
  const project = store.createProject("/srv/proj/cli", "cli");
  const ticket = store.createTicket(project, "Walk the lifecycle", "A body.", {
    actor: "agent",
  });
  return { store, project, ticket };
}

describe("lifecycle with the human half blocked", () => {
  it("a new ticket starts open", () => {
    const { store, ticket } = freshStore();
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("the move out of open needs a signoff", () => {
    const { store, ticket } = freshStore();
    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "agent"),
    );
    expect(refusal.missingKinds).toEqual(["builtin:user_signoff"]);
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("the agent cannot supply the signoff itself", () => {
    const { store, ticket } = freshStore();
    const error = expectEvidenceAuthorRefused(() =>
      store.attachEvidence(ticket, "builtin:user_signoff", {}, "agent"),
    );
    expect(error).toBeInstanceOf(EvidenceAuthorRefused);
    expect(error.kind).toBe("builtin:user_signoff");
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("the agent reaches in progress after a human signoff", () => {
    const { store, ticket } = freshStore();
    expect(() => store.moveTicket(ticket, "in_progress", "agent")).toThrow(
      GateRefused,
    );
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "agent");
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });

  it("the agent reaches awaiting verification", () => {
    const { store, ticket } = freshStore();
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "agent");
    store.attachEvidence(ticket, "builtin:automated_check", {}, "agent");
    store.attachEvidence(ticket, "builtin:review_pass", {}, "agent");
    store.moveTicket(ticket, "awaiting_verification", "agent");
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
  });

  it("the automated check is needed for the second move", () => {
    const { store, ticket } = freshStore();
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "agent");
    store.attachEvidence(ticket, "builtin:review_pass", {}, "agent");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "agent"),
    );
    expect(refusal.missingKinds).toEqual(["builtin:automated_check"]);
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });

  it("done stays blocked", () => {
    const { store, ticket } = freshStore();
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "agent");
    store.attachEvidence(ticket, "builtin:automated_check", {}, "agent");
    store.attachEvidence(ticket, "builtin:review_pass", {}, "agent");
    store.moveTicket(ticket, "awaiting_verification", "agent");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "done", "agent"),
    );
    expect(refusal.fromState).toBe("awaiting_verification");
    expect(refusal.toState).toBe("done");
    expect([...refusal.allowedActors].sort()).toEqual(["user"]);
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
  });
});
