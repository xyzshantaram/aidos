/**
 * Item 21. The CLI refuses to author the two kinds that only a human gives.
 *
 * The kernel's write boundary enforces the kind's allowedAuthors, so the
 * agent attach of builtin:user_signoff and builtin:user_verified throws
 * EvidenceAuthorRefused, and the error carries the kind and the author.
 * The "a human must supply it" phrasing is the B1 tool's message; the
 * kernel error names the kind and the author. builtin:imported_state is
 * system-only in the constant table, so the prototype's agent list of six
 * shrinks to the five kinds the agent may author.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { EvidenceAuthorRefused } from "../src/kernel/types";
import { expectEvidenceAuthorRefused, makeStore } from "./helpers";

/** The kinds the CLI may author, from the B0 constant table. */
const AGENT_AUTHORABLE = [
  "builtin:automated_check",
  "builtin:after_shot",
  "builtin:test_run",
  "builtin:review_note",
  "builtin:review_pass",
];

describe("the CLI refuses human only kinds", () => {
  it("user signoff is refused", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });
    const error = expectEvidenceAuthorRefused(() =>
      store.attachEvidence(ticket, "builtin:user_signoff", {}, "agent"),
    );
    expect(error).toBeInstanceOf(EvidenceAuthorRefused);
    expect(error.kind).toBe("builtin:user_signoff");
    expect(error.author).toBe("agent");
  });

  it("user verified is refused", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });
    const error = expectEvidenceAuthorRefused(() =>
      store.attachEvidence(ticket, "builtin:user_verified", {}, "agent"),
    );
    expect(error.kind).toBe("builtin:user_verified");
    expect(error.author).toBe("agent");
  });

  it("the refusal names the kind", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });
    for (const kind of ["builtin:user_signoff", "builtin:user_verified"]) {
      const error = expectEvidenceAuthorRefused(() =>
        store.attachEvidence(ticket, kind, {}, "agent"),
      );
      expect(error.kind).toBe(kind);
      expect(String(error)).toContain(kind);
    }
  });

  it("a refused kind stores no evidence", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });
    for (const kind of ["builtin:user_signoff", "builtin:user_verified"]) {
      expect(() => store.attachEvidence(ticket, kind, {}, "agent")).toThrow(
        EvidenceAuthorRefused,
      );
    }
    expect(store.evidenceFor(ticket)).toEqual([]);
  });

  it("the other agent kinds are accepted", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "agent" });
    for (const kind of AGENT_AUTHORABLE) {
      store.attachEvidence(ticket, kind, {}, "agent");
    }
    const attached = store.evidenceFor(ticket).map((row) => row.kind);
    expect([...attached].sort()).toEqual([...AGENT_AUTHORABLE].sort());
  });
});
