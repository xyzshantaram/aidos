/**
 * #127: the batch-review document parser — SPEC v1, one parser, two writers.
 *
 * Pure and deterministic: no LLM, no prompt text, no I/O. Citation
 * resolution is injected as a predicate, so the same function parses a
 * document against the real repo (host) or against fixtures (tests).
 *
 * ## Why markdown, why section-level independence
 *
 * Truncation degrades gracefully in a way JSON never did: a truncated
 * document still yields every complete `## Ticket` section before the cut,
 * so a 3.8 MB analysis lost to a character-38,605 truncation becomes a
 * partial REVIEW rather than a lost one.
 *
 * ## The rules are the point
 *
 * "Cite file:line" is trivially gamed unless citations actually resolve, so
 * the RESOLUTION happens here (rule 2), not as a request to the reviewer.
 * A review that asserts nothing cannot pass (rule 1); a review whose only
 * citations dissolve under resolution is that review (rule 3). A section
 * that fails to parse fails only its own ticket (rule 4); unknown keys are
 * ignored, not fatal (rule 5). All five rules bind the machine writer
 * (frontier-chain SPEC v1 sections) and the human literate form identically:
 * a pass with zero resolvable checked items cannot produce a passing row of
 * EITHER kind (review_pass or user_verified).
 *
 * The two writers normalise to ONE internal verdict model; there is no
 * human-specific parser.
 */

/** A file:line citation as written in a checked entry or finding. */
export interface Citation {
  file: string;
  line: number;
}

export type Severity = "critical" | "major" | "minor";
export type ReviewVerdict = "pass" | "fail" | "blocked";

/** One per-ticket finding line. `citation === null` means the `-` placeholder. */
export interface Finding {
  severity: Severity;
  citation: Citation | null;
  claim: string;
}

/** A citation that did not resolve against the repo — dropped AND recorded. */
export interface DroppedCitation {
  raw: string;
  file: string;
  line: number;
  /** Which list the citation came from. */
  where: "checked" | "finding" | "cross-ticket";
}

/** One `## Ticket <n>` section, normalised to the internal verdict model. */
export interface TicketSection {
  ticket: number;
  /** Which writer produced the section: SPEC v1 machine, or the human form. */
  writer: "machine" | "literate";
  /** The verdict as claimed, when the header carried a readable one. */
  claimedVerdict: ReviewVerdict | null;
  /**
   * The EFFECTIVE verdict after the rejection rules. This is the only
   * verdict a downstream row may trust: a claimed pass can be downgraded
   * here, never upgraded.
   */
  verdict: ReviewVerdict;
  /** Machine writer: the `executor-model:` line, when present. */
  executorModel?: string;
  /** Literate writer: the `verified:` key, when present. */
  verified?: boolean;
  /** Literate writer: the `notes:` key, when present. */
  notes?: string;
  /** The checked entries that SURVIVED resolution (cited or uncited claims). */
  checked: string[];
  /** Checklist items that failed (literate writer: `- [ ]`). */
  failedItems: string[];
  findings: Finding[];
  uncoveredCriteria: string[];
  /** Citations dropped by rule 2, per section. */
  dropped: DroppedCitation[];
  /** Rule 1 / rule 3 downgrades and any rule 4 parse failure, in words. */
  rejections: string[];
  /** Set when the section itself failed to parse (rule 4) — its ticket only. */
  parseError?: string;
}

/** One `## Cross-ticket findings` entry, with every ticket it names. */
export interface CrossTicketFinding extends Finding {
  tickets: number[];
}

/** The whole parsed document. */
export interface BatchReviewDoc {
  tickets: TicketSection[];
  crossTicket: CrossTicketFinding[];
  /** Every rule-2 drop, document-wide (superset of each section's own list). */
  dropped: DroppedCitation[];
  /**
   * True when the document appears cut mid-section (it ends inside a list or
   * an unclosed yaml fence). Complete sections before the cut are still
   * fully parsed — that is the markdown-over-JSON rationale.
   */
  truncated: boolean;
}

/** How many critical findings (per-ticket + cross-ticket) the document holds. */
export function criticalCount(doc: BatchReviewDoc): number {
  let count = 0;
  for (const ticket of doc.tickets) {
    for (const finding of ticket.findings) {
      if (finding.severity === "critical") count += 1;
    }
  }
  for (const finding of doc.crossTicket) {
    if (finding.severity === "critical") count += 1;
  }
  return count;
}

/** The default escalation threshold for a batch. */
export const ESCALATION_THRESHOLD = 3;

/** Whether the batch crosses the escalation threshold (critical findings). */
export function exceedsEscalation(
  doc: BatchReviewDoc,
  threshold: number = ESCALATION_THRESHOLD,
): boolean {
  return criticalCount(doc) > threshold;
}

// ---- line grammar ----

const TICKET_HEADER = /^##\s+Ticket\s+(\d+)\s*[—–-]+\s*(.*)$/i;
const CROSS_HEADER = /^##\s+Cross-ticket\s+findings\s*$/i;
const VERDICT_CLAUSE = /VERDICT:\s*(pass|fail|blocked)/i;
const HAS_VERDICT_KEY = /(^|\s)VERDICT:/i;
const VERIFIED_CLAUSE = /verified:\s*(yes|no)/i;
const HAS_VERIFIED_KEY = /(^|\s)verified:/i;
const LIST_ITEM = /^-\s+(.*)$/;
const CHECK_ITEM = /^-\s+\[([ xX])\]\s+(.*)$/;
const FINDING_ITEM =
  /^-\s+(?:\|\s*)?(critical|major|minor)\s*\|\s*([^|]+?)\s*\|\s*(.*)$/;
const KEY_LINE = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/;
const CITATION = /^(\S+?):(\d+)$/;
const TICKET_REF = /#(\d+)/g;
const OPEN_FENCE = /^```yaml\s*$/;
const CLOSE_FENCE = /^```\s*$/;

function parseCitation(raw: string): Citation | null {
  const match = CITATION.exec(raw.trim());
  if (!match) return null;
  return { file: match[1], line: Number(match[2]) };
}

type ListKind = "checked" | "findings" | "uncovered" | null;

interface SectionBody {
  executorModel?: string;
  notes?: string;
  checked: string[];
  failedItems: string[];
  findings: Finding[];
  uncovered: string[];
  verified: boolean | undefined;
  /** An unclosed ```yaml fence: the document was cut mid-section. */
  fenceBroken: boolean;
}

/**
 * Read one section's body lines into its fields. Unknown keys and lines are
 * IGNORED (rule 5), never fatal. A flat list is opened by `checked:`,
 * `findings:`, or `uncovered-criteria:`; the `- ` items that follow belong
 * to it until a non-item line appears. Citations on checked entries and
 * findings resolve here (rule 2); whatever fails is pushed to `dropped`
 * and never enters the section.
 */
function readBody(
  lines: readonly string[],
  start: number,
  resolveCitation: (citation: Citation) => boolean,
  dropped: DroppedCitation[],
  openList: ListKind = null,
): { body: SectionBody; end: number } {
  const body: SectionBody = {
    checked: [],
    failedItems: [],
    findings: [],
    uncovered: [],
    verified: undefined,
    fenceBroken: false,
  };
  let list: ListKind = openList;
  let index = start;
  for (; index < lines.length; index++) {
    const line = lines[index];
    if (/^##\s/.test(line)) break; // the next section owns the rest

    if (OPEN_FENCE.test(line)) {
      // The literate form may carry its keys in the family's yaml-block
      // grammar (src/plan/yaml-blocks.ts). Its keys are read as the same
      // `verified:`/`notes:` facts; the fence itself is scanned here so a
      // broken fence marks the truncation rather than aborting the section.
      let closed = false;
      for (let scan = index + 1; scan < lines.length; scan++) {
        if (CLOSE_FENCE.test(lines[scan])) {
          closed = true;
          index = scan;
          break;
        }
        const fenceKey = KEY_LINE.exec(lines[scan]);
        if (fenceKey) {
          const name = fenceKey[1].toLowerCase();
          const value = fenceKey[2].trim();
          if (name === "verified" && /^(yes|no)$/i.test(value)) {
            body.verified = /^yes$/i.test(value);
          } else if (name === "notes" && value !== "") {
            body.notes = body.notes ? body.notes + " " + value : value;
          }
          // Other keys inside the block: ignored (rule 5).
        }
      }
      if (!closed) {
        body.fenceBroken = true;
        index = lines.length;
      }
      list = null;
      continue;
    }

    const check = CHECK_ITEM.exec(line);
    if (check) {
      list = "checked";
      if (check[1] === " ") {
        body.failedItems.push(check[2].trim());
      } else {
        body.checked.push(check[2].trim());
      }
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item && list !== null) {
      const raw = item[1].trim();
      if (list === "checked") {
        body.checked.push(raw);
      } else if (list === "uncovered") {
        body.uncovered.push(raw);
      } else {
        const finding = FINDING_ITEM.exec(line);
        if (finding) {
          const citeRaw = finding[2].trim();
          const citation = citeRaw === "-" ? null : parseCitation(citeRaw);
          if (citation && !resolveCitation(citation)) {
            dropped.push({
              raw: citeRaw,
              file: citation.file,
              line: citation.line,
              where: "finding",
            });
          } else {
            body.findings.push({
              severity: finding[1].toLowerCase() as Severity,
              citation,
              claim: finding[3].trim(),
            });
          }
        }
        // An unparseable finding line is ignored, not fatal (rule 5).
      }
      continue;
    }

    const key = KEY_LINE.exec(line);
    if (key) {
      list = null;
      const name = key[1].toLowerCase();
      const value = key[2].trim();
      if (name === "executor-model" && value !== "") body.executorModel = value;
      else if (name === "notes" && value !== "")
        body.notes = body.notes ? body.notes + " " + value : value;
      else if (name === "checked" && value === "") list = "checked";
      else if (name === "findings" && value === "") list = "findings";
      else if (name === "uncovered-criteria" && value === "") list = "uncovered";
      else if (name === "verified" && /^(yes|no)$/i.test(value))
        body.verified = /^yes$/i.test(value);
      // Any other key: ignored (rule 5).
      continue;
    }

    if (line.trim() === "") {
      list = null;
      continue;
    }
    // Prose and anything else: ignored (rule 5).
  }
  return { body, end: index };
}

/** Resolve the checked list against the repo, dropping what fails (rule 2). */
function resolveChecked(
  checked: readonly string[],
  resolveCitation: (citation: Citation) => boolean,
  dropped: DroppedCitation[],
): string[] {
  const kept: string[] = [];
  for (const entry of checked) {
    const citation = parseCitation(entry);
    if (citation && !resolveCitation(citation)) {
      dropped.push({
        raw: entry,
        file: citation.file,
        line: citation.line,
        where: "checked",
      });
      continue;
    }
    kept.push(entry);
  }
  return kept;
}

/**
 * Parse a batch-review document.
 *
 * `resolveCitation` answers whether one file:line exists in the repo; the
 * host passes an fs-backed check, tests pass a fixture set. Unresolvable
 * citations are dropped and recorded (rule 2) — never silently kept, never
 * fatal.
 */
export function parseBatchReview(
  text: string,
  opts: { resolveCitation?: (citation: Citation) => boolean } = {},
): BatchReviewDoc {
  // Default: every citation resolves. A caller with no repo still gets the
  // rule structure; a caller WITH a repo injects the truth.
  const resolveCitation = opts.resolveCitation ?? (() => true);
  const lines = text.split("\n");
  const tickets: TicketSection[] = [];
  const crossTicket: CrossTicketFinding[] = [];
  const dropped: DroppedCitation[] = [];

  let truncated = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const cross = CROSS_HEADER.exec(line);
    if (cross) {
      // Cross-ticket findings are bare list items directly under the header.
      const { body, end } = readBody(lines, i + 1, resolveCitation, dropped, "findings");
      const localDropped = dropped.splice(0);
      for (const finding of body.findings) {
        const refs = [...finding.claim.matchAll(TICKET_REF)].map((match) =>
          Number(match[1]),
        );
        crossTicket.push({ ...finding, tickets: [...new Set(refs)] });
      }
      truncated = truncated || body.fenceBroken;
      dropped.push(...localDropped);
      i = end - 1;
      continue;
    }

    const header = TICKET_HEADER.exec(line);
    if (!header) continue;

    const ticket = Number(header[1]);
    const clause = header[2].trim();
    const verdictMatch = VERDICT_CLAUSE.exec(clause);
    const verifiedMatch = VERIFIED_CLAUSE.exec(clause);
    const writer: "machine" | "literate" =
      verdictMatch !== null || HAS_VERDICT_KEY.test(clause) ? "machine" : "literate";

    const { body, end } = readBody(lines, i + 1, resolveCitation, dropped);
    const localDropped = dropped.splice(0);
    truncated = truncated || body.fenceBroken;

    const checked = resolveChecked(body.checked, resolveCitation, localDropped);

    const machineVerdict =
      verdictMatch !== null
        ? (verdictMatch[1].toLowerCase() as ReviewVerdict)
        : HAS_VERDICT_KEY.test(clause)
          ? null // a VERDICT: key with an unreadable word is rule 4's parse error
          : null;
    const literateVerified = verifiedMatch
      ? /^yes$/i.test(verifiedMatch[1])
      : body.verified;

    const section = buildSection({
      ticket,
      writer,
      claimedVerdict: writer === "machine" ? machineVerdict : null,
      verified: writer === "literate" ? literateVerified : undefined,
      headerUnreadable: writer === "machine" && machineVerdict === null,
      body: { ...body, checked },
      dropped: localDropped,
    });
    dropped.push(...localDropped);
    tickets.push(section);
    i = end - 1;
  }

  return { tickets, crossTicket, dropped, truncated };
}

/** Assemble one normalised section, applying rules 1, 3, and 4. */
function buildSection(input: {
  ticket: number;
  writer: "machine" | "literate";
  claimedVerdict: ReviewVerdict | null;
  verified: boolean | undefined;
  headerUnreadable: boolean;
  body: SectionBody;
  dropped: DroppedCitation[];
}): TicketSection {
  const { ticket, writer, body, dropped } = input;
  const section: TicketSection = {
    ticket,
    writer,
    claimedVerdict: input.claimedVerdict,
    verdict: "fail",
    checked: body.checked,
    failedItems: body.failedItems,
    findings: body.findings,
    uncoveredCriteria: body.uncovered,
    dropped: dropped.filter((entry) => entry.where !== "cross-ticket"),
    rejections: [],
  };
  if (body.executorModel !== undefined) section.executorModel = body.executorModel;
  if (input.verified !== undefined) section.verified = input.verified;
  if (body.notes !== undefined) section.notes = body.notes;

  // Rule 4: a section that fails to parse fails only its own ticket, never
  // the batch. The human surface has no blocked verdict, so a literate
  // section that cannot state a verdict is a plain fail: a human who
  // attached nothing verified nothing.
  if (input.headerUnreadable || (writer === "literate" && input.verified === undefined)) {
    section.parseError =
      writer === "machine"
        ? "the section header carries no readable VERDICT word"
        : "the section header carries no readable verified: key";
    section.verdict = writer === "machine" ? "blocked" : "fail";
    section.rejections.push(section.parseError);
    return section;
  }

  if (writer === "literate") {
    // Literate: pass only when verified: yes AND every checklist item
    // passes; any failed item is a fail.
    if (section.verified !== true) {
      section.rejections.push("verified is not yes");
      return section; // verdict stays "fail"
    }
    if (section.failedItems.length > 0) {
      section.rejections.push(
        `${section.failedItems.length} checklist item(s) failed`,
      );
      return section;
    }
    // verified: yes and every item passes: the human surface's pass.
    section.verdict = "pass";
  } else {
    section.verdict = input.claimedVerdict as ReviewVerdict;
    if (section.verdict !== "pass") return section;
  }

  // Rules 1 and 3 — the same bar for both writers: a pass with zero
  // resolvable checked entries cannot produce a passing row of either kind
  // (review_pass from the machine writer, user_verified from the human).
  // `checked` is already the post-resolution list (rule 2 ran before this),
  // so the rule 3 case — dropping empties the list — lands in this same
  // branch, which is what rule 3 says: it is rule 1 by another road.
  if (section.checked.length === 0) {
    section.verdict = "fail";
    section.rejections.push(
      dropped.some((entry) => entry.where === "checked")
        ? "rejection rule 3: every checked citation failed to resolve, so the " +
            "section asserts nothing and its pass cannot stand"
        : "rejection rule 1: the section asserts no checked items, so its pass " +
            "cannot produce a passing row",
    );
    return section;
  }

  if (dropped.length > 0) {
    section.rejections.push(
      `rejection rule 2: ${dropped.length} citation(s) did not resolve against ` +
        "the repo and were dropped",
    );
  }

  return section;
}
