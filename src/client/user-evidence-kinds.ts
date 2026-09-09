/**
 * Ticket U2c: the evidence kinds the human may attach.
 *
 * The subset of the builtin kinds whose allowedAuthors includes "user",
 * minus the system-only imported-state kind and the RETIRED remark kind
 * (builtin:comment folded into builtin:review_note — #96). Human-only kinds
 * come first, then the rest alphabetically by id. No React, no DOM.
 */

import { BUILTIN_KINDS } from "../kernel/constants";

export interface KindDescriptor {
  id: string;
  label: string;
  description: string;
}

/** The human-only kinds, in the order the contract fixes. */
const HUMAN_ONLY_IDS = ["builtin:user_signoff", "builtin:user_verified", "builtin:file_allowlist"];

/** The system-only kind. The human never attaches it. */
const SYSTEM_ONLY_ID = "builtin:imported_state";

/** Deprecated: folded into builtin:review_note (#96). No longer offered. */
const RETIRED_IDS = new Set(["builtin:comment"]);

/**
 * #108: builtin:retired is USER-authorable but is never offered in the
 * attach form — the ONLY writer is the host's userRetireTicket Remote,
 * which runs the supersede and dependent validations the raw form cannot.
 * A free-form retired row with a malformed supersededBy would create
 * exactly the dangling references the retire gate exists to refuse.
 */
const NOT_OFFERED_IDS = new Set(["builtin:retired"]);

/**
 * The user-attachable kinds. Human-only kinds first, then the rest sorted
 * by id ascending.
 */
export function userEvidenceKinds(): KindDescriptor[] {
  const humanOnly: KindDescriptor[] = [];
  const rest: KindDescriptor[] = [];
  for (const kind of BUILTIN_KINDS) {
    if (!kind.allowedAuthors.includes("user")) continue;
    if (kind.id === SYSTEM_ONLY_ID || RETIRED_IDS.has(kind.id)) continue;
    if (NOT_OFFERED_IDS.has(kind.id)) continue;
    const descriptor: KindDescriptor = {
      id: kind.id,
      label: kind.label,
      description: kind.description,
    };
    if (HUMAN_ONLY_IDS.includes(kind.id)) {
      humanOnly.push(descriptor);
    } else {
      rest.push(descriptor);
    }
  }
  rest.sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return humanOnly.concat(rest);
}
