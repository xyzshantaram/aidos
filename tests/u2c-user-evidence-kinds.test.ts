/**
 * Ticket U2c: the user-attachable evidence kinds.
 *
 * The returned ids are exactly the subset of BUILTIN_KINDS whose
 * allowedAuthors includes "user", minus the system-only imported-state
 * kind. Human-only kinds come first, then the rest alphabetically by id.
 */

import { describe, expect, it } from "vitest";

import { BUILTIN_KINDS } from "../src/kernel/constants";
import { userEvidenceKinds } from "../src/client/user-evidence-kinds";

describe("u2c user-evidence-kinds: userEvidenceKinds", () => {
  it("returns exactly the user-allowed kinds minus the system-only kind", () => {
    const expected = BUILTIN_KINDS.filter(
      (kind) => kind.allowedAuthors.includes("user") && kind.id !== "builtin:imported_state",
    )
      .map((kind) => kind.id)
      .sort();
    const actual = userEvidenceKinds()
      .map((kind) => kind.id)
      .sort();
    expect(actual).toEqual(expected);
  });

  it("lists the human-only kinds first in the fixed order", () => {
    const ids = userEvidenceKinds().map((kind) => kind.id);
    expect(ids.slice(0, 3)).toEqual([
      "builtin:user_signoff",
      "builtin:user_verified",
      "builtin:file_allowlist",
    ]);
  });

  it("sorts the remaining kinds alphabetically by id", () => {
    const ids = userEvidenceKinds().map((kind) => kind.id);
    const rest = ids.slice(3);
    const sorted = [...rest].sort();
    expect(rest).toEqual(sorted);
  });

  it("carries the label and description from the constant table", () => {
    for (const descriptor of userEvidenceKinds()) {
      const source = BUILTIN_KINDS.find((kind) => kind.id === descriptor.id);
      expect(source).toBeDefined();
      expect(descriptor.label).toBe(source?.label);
      expect(descriptor.description).toBe(source?.description);
    }
  });
});
