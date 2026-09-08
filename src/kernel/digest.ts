/**
 * Digest coalescing: say a repeated instruction ONCE.
 *
 * The report (user, 2026-09-08): signing off four tickets produced four
 * copies of the same worktree paragraph, and the ask was blunt — "board
 * digest should not repeat the exact same worktree instruction like 50
 * times". At four it is noise; at fifty it buries every other change in the
 * digest, which is the one channel the agent is steered with.
 *
 * ## Why this is general rather than a worktree special case
 *
 * The digest's line grammar is already `subject — instruction`: a bolded
 * ticket reference and what happened to it. Anything the board says about N
 * tickets in one flush therefore repeats its tail N times, and worktree
 * preparation is simply the longest such tail today. A rule that keyed on
 * worktrees would leave the next bulk operation to rediscover this — bulk
 * signoff, a batch of review verdicts, a mass send-back.
 *
 * So the rule is: lines sharing an IDENTICAL instruction collapse into one
 * line listing every subject. Nothing is dropped and nothing is summarised
 * — every ticket is still named, and the instruction is still stated in
 * full. Only the repetition goes.
 *
 * ## What it deliberately does not do
 *
 * It does not group by similarity, only by exact equality. Two instructions
 * that differ by a path are two different instructions, and merging them
 * would put one ticket's path against another ticket's name — a digest that
 * lies is worse than one that repeats. That is why the caller puts
 * per-ticket detail in the SUBJECT and keeps the instruction invariant.
 */

/** The separator between a digest line's subject and its instruction. */
export const DIGEST_SEPARATOR = " — ";

/**
 * Collapse lines that share an instruction, preserving first-appearance
 * order. A line with no separator, or a unique instruction, is returned
 * exactly as it came in.
 */
export function coalesceDigestLines(lines: readonly string[]): string[] {
  /** instruction -> the subjects that carried it, in order. */
  const groups = new Map<string, string[]>();
  /** The output slot each group occupies, so order is first-appearance. */
  const order: string[] = [];
  /** Lines that cannot coalesce, kept at their own slot. */
  const passthrough = new Map<number, string>();

  lines.forEach(function (line, index) {
    const at = line.indexOf(DIGEST_SEPARATOR);
    if (at <= 0) {
      passthrough.set(index, line);
      order.push("\u0000line:" + index);
      return;
    }
    const subject = line.slice(0, at);
    const instruction = line.slice(at + DIGEST_SEPARATOR.length);
    const existing = groups.get(instruction);
    if (existing === undefined) {
      groups.set(instruction, [subject]);
      order.push(instruction);
    } else {
      existing.push(subject);
    }
  });

  return order.map(function (slot) {
    if (slot.startsWith("\u0000line:")) {
      return passthrough.get(Number(slot.slice("\u0000line:".length))) ?? "";
    }
    const subjects = groups.get(slot) ?? [];
    /*
     * A group of one is written back verbatim: collapsing must be
     * invisible when there is nothing to collapse, or every single-change
     * digest would be reformatted by a rule that had no work to do.
     */
    return subjects.join(", ") + DIGEST_SEPARATOR + slot;
  });
}
