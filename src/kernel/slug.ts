/**
 * Ticket slug and workspace-key helpers. One shared home for the slugger, the
 * canonical workspace key, and the legacy-snapshot normalization, so the
 * store, the service, the fold, and the invariant never carry a second copy of
 * the same logic.
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
    readable += "~" + character.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
  }
  readable = readable.replace(/^-+/, "");
  if (readable === "") {
    readable = "root";
  }
  if (readable.length > 251) {
    readable = readable.slice(0, 251);
    // Truncation must not land inside a `~XXXX` hex escape: a `~` in the
    // last 4 chars can only be a partial escape, so trim back to it. The
    // result stays under the 251 cap.
    const lastTilde = readable.lastIndexOf("~");
    if (lastTilde >= 247 && !/^~[0-9A-F]{4}$/.test(readable.slice(lastTilde))) {
      readable = readable.slice(0, lastTilde);
    }
  }
  return "--" + readable + "--";
}

/**
 * Normalize one raw ticket snapshot into a complete shape. A snapshot written
 * before C5 has no `slug` or `workspaceKey`; synthesize those here so the
 * strict validation and the fold both treat the record as its normalized
 * values. A missing slug becomes `ticket-<id>`; a missing workspaceKey becomes
 * the canonical key of the owning project's path (the normal case) or an empty
 * string when no such project exists in state.
 */
export function normalizeTicketSnapshot(
  snapshot: Record<string, unknown>,
  resolveAbsPath: (projectId: number) => string | undefined,
): Record<string, unknown> {
  const id = snapshot.id as number;
  const projectId = snapshot.projectId as number;
  const slug = typeof snapshot.slug === "string" ? snapshot.slug : `ticket-${id}`;
  // A snapshot written before D1 has no dependsOn. Synthesize the empty
  // list here so strict validation and the fold both treat the record as
  // its normalized values.
  const dependsOn = Array.isArray(snapshot.dependsOn) ? snapshot.dependsOn : [];
  const absPath = resolveAbsPath(projectId);
  const workspaceKey =
    typeof snapshot.workspaceKey === "string"
      ? snapshot.workspaceKey
      : absPath === undefined
        ? ""
        : workspaceKeyFromPath(absPath);
  return { ...snapshot, slug, workspaceKey, dependsOn };
}
