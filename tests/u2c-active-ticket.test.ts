/**
 * Ticket U2c: the active-ticket derivation.
 *
 * The active ticket is the in_progress ticket with the largest updatedAt.
 * Null when no in_progress ticket exists.
 */

import { describe, expect, it } from "vitest";

import { activeTicketId } from "../src/client/active-ticket";
import { makeTicket } from "./u2c-helpers";

describe("u2c active-ticket: activeTicketId", () => {
  it("returns null for an empty list", () => {
    expect(activeTicketId([])).toBeNull();
  });

  it("returns the id of the only in_progress ticket", () => {
    const tickets = [makeTicket({ id: 7, state: "in_progress", updatedAt: 50 })];
    expect(activeTicketId(tickets)).toBe(7);
  });

  it("returns the id of the in_progress ticket with the larger updatedAt", () => {
    const tickets = [
      makeTicket({ id: 1, state: "in_progress", updatedAt: 100 }),
      makeTicket({ id: 2, state: "in_progress", updatedAt: 200 }),
    ];
    expect(activeTicketId(tickets)).toBe(2);
  });

  it("returns null when every ticket is done", () => {
    const tickets = [
      makeTicket({ id: 1, state: "done", updatedAt: 300 }),
      makeTicket({ id: 2, state: "done", updatedAt: 100 }),
    ];
    expect(activeTicketId(tickets)).toBeNull();
  });

  it("considers only in_progress tickets in a mixed list", () => {
    const tickets = [
      makeTicket({ id: 1, state: "open", updatedAt: 900 }),
      makeTicket({ id: 2, state: "done", updatedAt: 800 }),
      makeTicket({ id: 3, state: "awaiting_verification", updatedAt: 700 }),
      makeTicket({ id: 4, state: "in_progress", updatedAt: 400 }),
      makeTicket({ id: 5, state: "in_progress", updatedAt: 600 }),
    ];
    expect(activeTicketId(tickets)).toBe(5);
  });
});
