/**
 * Ticket slug and workspace-key helpers. One shared home for the slugger, the
 * canonical workspace key, and snapshot normalization, so the store, the
 * service, the fold, and the invariant never carry a second copy of the same
 * logic.
 */

/** The kebab-case slug derived from a title: empty on no usable text. */
export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The dsh canonical project key of one absolute path, matching the
 * `projectKey(cwd)` transform: separators collapse to one `-`, safe characters
 * pass through, every other character becomes `~` plus its zero-padded uppercase
 * hex charCode, and the whole readable core is wrapped in `--`.
 *
 * No length cap: per your grill answer we keep the full readable core so two
 * deep workspace paths never collide. Previously this capped at 251 chars and
 * truncated, which could make two different workspaces share the same scratch
 * directory.
 */
export function workspaceKeyFromPath(cwd: string): string {
  let readable = "";
  let previousWasSeparator = false;
  for (const character of cwd) {
    if (character === "/" || character === "\\" || character === ":") {
      if (!previousWasSeparator) {
        readable += "-";
      }
      previousWasSeparator = true;
      continue;
    }
    previousWasSeparator = false;
    if (character !== "~" && /[A-Za-z0-9._-]/.test(character)) {
      readable += character;
      continue;
    }
    readable += "~" + character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
  }
  readable = readable.replace(/^-+/, "");
  if (readable === "") {
    readable = "root";
  }
  return "--" + readable + "--";
}

/**
 * Normalize one raw ticket snapshot by filling pre-D1 gaps only.
 *
 * Why this exists:
 * Tickets created before D1 had no `dependsOn` field. No real aidos ticket has
 * been created yet in prod, but the test suite synthesizes old-format records
 * (see tests/d1-depends-on.test.ts) to prove that an old log still replays
 * after the schema grew. This helper fills that legacy gap:
 *   - missing dependsOn -> []
 *
 * As of C5, `slug` and `workspaceKey` are required fields with no fallback.
 * New code always writes all three fields. The strict invariant (invariants.ts)
 * calls this too, so the dependsOn gap is not treated as corrupt. New writes are
 * validated at the service/store boundary before they ever reach the invariant.
 */
export function normalizeTicketSnapshot(
  snapshot: Record<string, unknown>,
): Record<string, unknown> {
  const slug = snapshot.slug;
  const workspaceKey = snapshot.workspaceKey;
  const dependsOn = Array.isArray(snapshot.dependsOn) ? snapshot.dependsOn : [];
  return { ...snapshot, slug, workspaceKey, dependsOn };
}
