/**
 * #21: a badge should contribute information, not clutter.
 *
 * Two rules, both pure and both derived rather than hardcoded:
 *
 *  - a DEPENDENCY chip shows the bare ticket id when the dependency is local,
 *    and keeps a workspace label only when it genuinely crosses a workspace;
 *  - an EVIDENCE chip is dropped from a TILE when the ticket's state already
 *    proves that kind is present, unless there is more than one row of it.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  displayDep,
  evidenceKindCounts,
  stateImpliedKinds,
  tileKindCounts,
  workspaceLabel,
} from "../src/client/board-logic";
import { DEFAULT_GATES } from "../src/kernel/constants";

const OWN = "--home-sid-repos-aidos--";
const OTHER = "--home-sid-repos-dotfiles-ai--";

describe("#21 dependency chips: local id only, workspace only when foreign", () => {
  it("drops the workspace prefix from a LOCAL dependency, keeping the hash", () => {
    /*
     * The PREFIX was the furniture -- identical on every chip, carrying no
     * information. The HASH is the meaning: "#93" reads as a ticket
     * reference in any tracker, while a bare "93" reads as an unlabelled
     * number. User-reported after the first version dropped both.
     */
    expect(displayDep(OWN + ":93", OWN)).toBe("#93");
  });

  it("KEEPS a workspace label on a foreign dependency", () => {
    expect(displayDep(OTHER + ":7", OWN)).toBe("ai#7");
  });

  it("tells a foreign dependency apart from a local one", () => {
    /*
     * The defect this replaced: the old form rewrote EVERY workspace prefix
     * to the literal string "aidos#", so these two rendered identically. The
     * chip looked like it was drawing a distinction while erasing it.
     */
    expect(displayDep(OWN + ":7", OWN)).not.toBe(displayDep(OTHER + ":7", OWN));
  });

  it("shows MORE, not less, when the own workspace is unknown", () => {
    // Omitting ownWorkspaceKey must never hide the prefix: an unlabelled
    // foreign dependency reading as local would be a lie.
    expect(displayDep(OTHER + ":7")).toBe("ai#7");
    expect(displayDep(OWN + ":7")).toContain("#");
  });

  it("passes a reference that is not in the workspace shape through unchanged", () => {
    expect(displayDep("42", OWN)).toBe("42");
    expect(displayDep("", OWN)).toBe("");
  });

  it("keeps a slug reference readable", () => {
    expect(displayDep(OWN + ":some-ticket-slug", OWN)).toBe("#some-ticket-slug");
  });

  it("workspaceLabel takes the last meaningful segment", () => {
    expect(workspaceLabel(OWN)).toBe("aidos");
    expect(workspaceLabel("--x--")).toBe("x");
    // Degenerate input must not produce an empty label.
    expect(workspaceLabel("")).toBe("");
    expect(workspaceLabel("----")).toBe("----");
  });
});

describe("#21 evidence chips a state already implies are dropped from tiles", () => {
  it("an open ticket implies nothing", () => {
    expect(stateImpliedKinds("open").size).toBe(0);
  });

  it("in_progress implies the signoff that unlocked it", () => {
    expect(stateImpliedKinds("in_progress")).toContain("builtin:user_signoff");
  });

  it("awaiting_verification implies the check and the accepted review too", () => {
    const implied = stateImpliedKinds("awaiting_verification");
    expect(implied).toContain("builtin:user_signoff");
    expect(implied).toContain("builtin:automated_check");
    expect(implied).toContain("builtin:review_pass");
    // But NOT the verification it has not received yet.
    expect(implied).not.toContain("builtin:user_verified");
  });

  it("done implies every forward gate's kinds", () => {
    const implied = stateImpliedKinds("done");
    for (const gate of DEFAULT_GATES) {
      if (gate.fromState === "awaiting_verification" && gate.toState === "in_progress") {
        continue; // the send-back edge proves nothing
      }
      for (const kind of gate.requiredKinds) {
        expect(implied).toContain(kind);
      }
    }
  });

  it("a BACKWARD gate implies nothing, however many kinds it requires", () => {
    /*
     * The send-back edge (awaiting_verification -> in_progress) exists so a
     * human can push work back. Reaching in_progress by that route proves
     * NOTHING about evidence, so its requiredKinds must never be treated as
     * implied. Every shipped backward gate has an empty requiredKinds today,
     * which is exactly why this needs an injected table: with the real one
     * the guard is unreachable, and an unreachable guard is untrustworthy.
     */
    const gates = [
      { fromState: "open", toState: "in_progress", requiredKinds: ["builtin:user_signoff"] },
      {
        fromState: "awaiting_verification",
        toState: "in_progress",
        requiredKinds: ["builtin:review_fail"],
      },
    ] as const;
    const implied = stateImpliedKinds("in_progress", gates);
    expect(implied).toContain("builtin:user_signoff");
    expect(implied).not.toContain("builtin:review_fail");
  });

  it("a self-edge implies nothing either", () => {
    const gates = [
      { fromState: "in_progress", toState: "in_progress", requiredKinds: ["builtin:agent_report"] },
    ] as const;
    expect(stateImpliedKinds("in_progress", gates).size).toBe(0);
  });

  it("is DERIVED from the gates, not hardcoded", () => {
    // Every implied kind must be traceable to some gate's requiredKinds.
    const fromGates = new Set(DEFAULT_GATES.flatMap((gate) => gate.requiredKinds));
    for (const kind of stateImpliedKinds("done")) {
      expect(fromGates.has(kind)).toBe(true);
    }
  });

  it("drops the restatement chip from a tile", () => {
    const counts = evidenceKindCounts([
      { kind: "builtin:user_signoff", payload: {} },
      { kind: "builtin:agent_report", payload: {} },
    ]);
    const shown = tileKindCounts("in_progress", counts).map((c) => c.kind);
    expect(shown).not.toContain("builtin:user_signoff");
    expect(shown).toContain("builtin:agent_report");
  });

  it("KEEPS an implied kind when there is more than one row of it", () => {
    /*
     * The rule is "drop the restatement", not "drop the history". Two
     * review_pass rows mean the work took two review rounds, which is one of
     * the most informative things a tile can say (#96) -- suppressing it
     * because the state implies ONE would destroy exactly that signal.
     */
    const counts = evidenceKindCounts([
      { kind: "builtin:review_pass", payload: {} },
      { kind: "builtin:review_pass", payload: {} },
    ]);
    const shown = tileKindCounts("awaiting_verification", counts).map((c) => c.kind);
    expect(shown).toContain("builtin:review_pass");
  });

  it("suppresses nothing on an open ticket", () => {
    const counts = evidenceKindCounts([{ kind: "builtin:user_signoff", payload: {} }]);
    expect(tileKindCounts("open", counts)).toHaveLength(1);
  });

  it("never invents a chip that was not in the counts", () => {
    const counts = evidenceKindCounts([{ kind: "builtin:agent_report", payload: {} }]);
    const shown = tileKindCounts("done", counts);
    expect(shown.length).toBeLessThanOrEqual(counts.length);
  });
});

describe("#21 the chip look lives in the stylesheet, not in inline styles", () => {
  const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const tags = readFileSync(
    new URL("../src/client/evidence-tags.tsx", import.meta.url),
    "utf8",
  );

  it("kind chips no longer set a saturated background inline", () => {
    // The hue rides a custom property; a raw `background: <hue>` inline is
    // what made every chip a competing colour block.
    expect(tags).not.toContain("background: count.color");
    expect(tags).toContain("--chip-hue");
  });

  it("declares the rule that consumes the custom property", () => {
    // A custom property nothing reads is dead weight, and a var() reference
    // to an undeclared property renders as nothing -- the silent-failure
    // class this project keeps hitting.
    expect(css).toContain("--chip-hue");
  });

  it("the count segment no longer inverts to a near-white block", () => {
    const countRule = css.slice(css.indexOf(".aidos-chip-count {"));
    const body = countRule.slice(0, countRule.indexOf("}"));
    expect(body).not.toContain("#f9fafb");
  });
});

describe("#21 the tile wiring and its tooltips", () => {
  const tile = readFileSync(
    new URL("../src/client/ticket-tile.tsx", import.meta.url),
    "utf8",
  );

  it("passes the VIEWING session's workspace to the dependency chip", () => {
    /*
     * Review F2. This passed `ticket.workspaceKey` -- the TILE's own ticket's
     * workspace -- into a parameter meaning the viewing session's. On a
     * foreign tile the two differ, so a foreign ticket's dependency on its
     * OWN workspace rendered as a bare number, indistinguishable from one of
     * ours, while the id chip on the same tile correctly said "other#5". The
     * same tile disagreed with itself. Twelfth instance of the address-space
     * confusion, one call site from the fix that motivated this ticket.
     */
    expect(tile).toContain("displayDep(ref, props.ownWorkspaceKey)");
    expect(tile).not.toContain("displayDep(ref, ticket.workspaceKey)");
  });

  it("passes the viewing workspace to the id chip too", () => {
    expect(tile).toContain("ticketChipLabel(ticket, props.ownWorkspaceKey)");
  });

  it("passes the state so implied chips are suppressed", () => {
    expect(tile).toContain("state={ticket.state}");
  });

  it("every chip whose label became an icon keeps a title AND an aria-label", () => {
    /*
     * Review F4: `title` on a <span> inside a <button> NEVER reaches the
     * accessible name -- title is only a fallback for an element with no
     * other name source, and these spans have text content. With the glyph
     * aria-hidden, a screen reader heard a bare "3/4": strictly worse than
     * the word "Gate" it replaced. The user's condition for replacing a
     * label was that hovering still explains it; that has to hold for people
     * who cannot hover at all.
     */
    expect(tile.match(/aria-label=/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(tile).toContain('title={"Depends on " + ref}');
    expect(tile).toContain('aria-label={"Depends on " + ref}');
    expect(tile).toContain("title={fullTicketId(ticket)}");
  });

  it("uses real icons, not font glyphs", () => {
    // Glyph availability is a gamble (a missing one renders as tofu) and a
    // font decides its stroke weight, which is what made them "kinda thin".
    expect(tile).toContain("KeyholeIcon");
    expect(tile).toContain("ForkIcon");
    expect(tile).toContain("CompassIcon");
    for (const glyph of ["\u25e7", "\u25d1", "\u21b3"]) {
      expect(tile).not.toContain(glyph);
    }
  });

  it("puts confidence last, after the dependencies", () => {
    // User's ask: confidence is advisory, so it reads last.
    // Measured in the CHIP ROW, not the whole file -- the import line lists
    // the icons alphabetically and would make this assertion meaningless.
    const chips = tile.slice(tile.indexOf('className="aidos-tile-chips"'));
    expect(chips.indexOf("CompassIcon")).toBeGreaterThan(chips.indexOf("ForkIcon"));
    expect(chips.indexOf("CompassIcon")).toBeGreaterThan(chips.indexOf("KeyholeIcon"));
    expect(chips.indexOf("ForkIcon")).toBeGreaterThan(chips.indexOf("KeyholeIcon"));
  });
});

describe("#21 the icon set has one stroke weight", () => {
  const icons = readFileSync(
    new URL("../src/client/icons.tsx", import.meta.url),
    "utf8",
  );

  it("sets an explicit stroke width", () => {
    /*
     * Every icon previously omitted stroke-width, so all rendered at the SVG
     * default of 1px. A hairline beside 600-weight 11px text reads as a grey
     * smudge however bright the colour token is -- which is why the user saw
     * "too low contrast" AND "icons are kinda thin" as one complaint.
     */
    expect(icons).toContain("ICON_STROKE");
    expect(icons).toContain("strokeWidth: ICON_STROKE");
  });

  it("has no <svg> that bypasses the shared props", () => {
    // A future icon must not be able to reintroduce a hairline.
    const svgOpens = icons.match(/<svg\b/g) ?? [];
    const shared = icons.match(/<svg \{\.\.\.iconProps\(\)\}>/g) ?? [];
    expect(shared.length).toBe(svgOpens.length);
  });
});

describe("#21 the chip row reads as a timeline, in order", () => {
  it("IMPORTED always leads, whatever its timestamp says", () => {
    /*
     * User's ask: "imported should go at the beginning". It is the ticket's
     * ORIGIN -- the state a plan document claimed before anything happened
     * here -- so it leads even when timestamps disagree. They often do: an
     * import stamps every row at the same instant, and a re-import can stamp
     * it later than real work that preceded it.
     */
    const counts = evidenceKindCounts([
      { kind: "builtin:user_signoff", payload: {}, at: 100 },
      { kind: "builtin:imported_state", payload: {}, at: 900 },
      { kind: "builtin:automated_check", payload: {}, at: 200 },
    ]);
    expect(counts[0].kind).toBe("builtin:imported_state");
  });

  it("then everything else in the order it happened", () => {
    const counts = evidenceKindCounts([
      { kind: "builtin:user_verified", payload: {}, at: 400 },
      { kind: "builtin:automated_check", payload: {}, at: 200 },
      { kind: "builtin:imported_state", payload: {}, at: 999 },
      { kind: "builtin:user_signoff", payload: {}, at: 100 },
      { kind: "builtin:review_pass", payload: {}, at: 300 },
    ]);
    expect(counts.map((c) => c.kind)).toEqual([
      "builtin:imported_state",
      "builtin:user_signoff",
      "builtin:automated_check",
      "builtin:review_pass",
      "builtin:user_verified",
    ]);
  });

  it("a repeated kind keeps its FIRST position and reports the count", () => {
    // Two review rounds must not jump review_pass to the end: its place is
    // where it entered the story, and the count segment says it recurred.
    const counts = evidenceKindCounts([
      { kind: "builtin:review_pass", payload: {}, at: 100 },
      { kind: "builtin:user_verified", payload: {}, at: 200 },
      { kind: "builtin:review_pass", payload: {}, at: 300 },
    ]);
    expect(counts[0].kind).toBe("builtin:review_pass");
    expect(counts[0].count).toBe(2);
  });
});

describe("#21 only the gate, id, state and blocked-on-you may draw attention", () => {
  const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const tile = readFileSync(
    new URL("../src/client/ticket-tile.tsx", import.meta.url),
    "utf8",
  );

  function ruleBody(selector: string): string {
    const at = css.indexOf(selector);
    expect(at).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  }

  it("the GATE keeps the loud near-white value", () => {
    // It is the only metric that controls anything, so it earns the volume.
    expect(ruleBody(".aidos-chip-gate .aidos-chip-value {")).toContain("#f9fafb");
  });

  it("CONFIDENCE does not, because it is advisory", () => {
    /*
     * Confidence never unlocks anything, so it must not carry the gate's
     * visual authority. It shared the same stark white pill, which gave an
     * advisory number the same weight as the thing that actually gates.
     */
    const value = ruleBody(".aidos-chip-conf .aidos-chip-value {");
    expect(value).not.toContain("#f9fafb");
    expect(value).toContain("color-mix");
  });

  it("the pending-approval flag is warning-tinted and sits by the id", () => {
    expect(ruleBody(".aidos-chip-approval-flag {")).toContain("--state-awaiting");
    // Beside the id chip, before the state chip: it is card-level context,
    // not another entry in the chip row at the bottom.
    const meta = tile.slice(
      tile.indexOf('className="aidos-tile-meta"'),
      tile.indexOf('className="aidos-tile-title"'),
    );
    expect(meta).toContain("aidos-chip-approval-flag");
    expect(meta).toContain("AlertCircleIcon");
  });

  it("the flag is keyed by BOARD KEY, never a bare id", () => {
    const view = readFileSync(
      new URL("../src/client/ticket-view.tsx", import.meta.url),
      "utf8",
    );
    expect(view).toContain("awaitingApprovalKeys?.has(boardKeyOf(ticket))");
    expect(view).not.toContain("awaitingApprovalKeys?.has(String(ticket.id))");
  });
});
