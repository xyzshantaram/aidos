/**
 * #136: the `partner_review` front door and the chain-containment gate.
 *
 * The semantics under test are the ones settled on the harness side on
 * 2026-09-08, which INVERT the deleted `partner` chain's fail-closed rules.
 * This is a reliability aid against drift and misrouting, not a security
 * boundary, so the asymmetry is the property that matters:
 *
 *   contained === true   -> verified, and the chain is recorded
 *   contained === false  -> a POSITIVE finding: invalidate, re-run
 *   undefined / absent   -> unverified. Evidence of nothing. Count it as
 *                           today, never invalidate, never throw.
 *
 * Reviews are batched, so invalidating means re-running a batch: worth
 * paying on a positive off-chain finding, not worth paying on missing data.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { checkGate, reviewChainOf } from "../src/kernel/gates";
import {
  DEFAULT_REVIEW_CHAIN,
  judgeReviewProvenance,
  judgeReviewRow,
} from "../src/kernel/review-provenance";
import { GateRefused } from "../src/kernel/types";
import type { AidosConfig, EvidenceRow, TicketSnapshot } from "../src/kernel/types";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import {
  PARTNER_REVIEW_TYPE,
  configuredReviewChain,
  registerPartnerReview,
  reviewProvenanceReader,
} from "../src/host/partner-review";

const REVIEW_SESSION = "sess-reviewer-1";

const ticket = (): TicketSnapshot =>
  ({ id: 1, state: "in_progress" }) as unknown as TicketSnapshot;

/**
 * A stamped review_pass: the stamp is host-written, never agent-supplied.
 * #126 moved the stamp onto the ROW (`row.stamp`) so it cannot ride the
 * agent-composed payload into model context; these rows mimic what the host
 * writes.
 */
const reviewRow = (sessionId: string | undefined = REVIEW_SESSION): EvidenceRow => ({
  kind: "builtin:review_pass",
  author: "agent",
  at: 1,
  payload: {},
  ...(sessionId === undefined ? {} : { stamp: { sessionId } }),
});

/*
 * #178: every moveToAwaiting call below carries a commit row, so every
 * assertion stays about PROVENANCE -- the file's subject -- rather than the
 * commit requirement. Without it, every "gate opens" assertion would fail on
 * the commit, and every "gate refuses" assertion would refuse for two
 * reasons instead of the one under test.
 */
const commitRow = (): EvidenceRow => ({
  kind: "builtin:user_commit",
  author: "agent",
  at: 3,
  payload: { commit: "abc1234", subject: "the change" },
});

const record = (over: Record<string, unknown> = {}) => ({
  type: PARTNER_REVIEW_TYPE,
  chain: DEFAULT_REVIEW_CHAIN,
  rungsDeclared: [{ provider: "zai", model: "glm-5.3" }],
  rungsUsed: [{ provider: "zai", model: "glm-5.3" }],
  contained: true,
  ...over,
});

function moveToAwaiting(
  evidence: EvidenceRow[],
  lookup?: (sessionId: string) => unknown,
  config: AidosConfig = DEFAULT_CONFIG,
): GateRefused | null {
  try {
    checkGate(
      config,
      ticket(),
      evidence,
      "awaiting_verification",
      "agent",
      lookup,
    );
    return null;
  } catch (error) {
    if (error instanceof GateRefused) return error;
    throw error;
  }
}

describe("#136 chain containment", () => {
  it("a contained run on the configured chain is VERIFIED and records its chain", () => {
    const judged = judgeReviewProvenance(record(), DEFAULT_REVIEW_CHAIN);
    expect(judged.standing).toBe("verified");
    expect(judged.chain).toBe(DEFAULT_REVIEW_CHAIN);
    expect(moveToAwaiting([reviewRow(), commitRow()], () => record())).toBeNull();
  });

  it("a run that failed over OUTSIDE its declared chain has its result invalidated", () => {
    const judged = judgeReviewProvenance(record({ contained: false }), DEFAULT_REVIEW_CHAIN);
    expect(judged.standing).toBe("invalidated");
    expect(judged.reason).toMatch(/re-run/);

    const refusal = moveToAwaiting([reviewRow(), commitRow()], () => record({ contained: false }));
    expect(refusal, "an invalidated review must not satisfy the gate").not.toBeNull();
    expect(refusal?.missingKinds).toContain("builtin:review_pass");
    /*
     * The refusal must SAY why, or the human reads "missing review_pass"
     * while the board plainly shows one.
     */
    expect(refusal?.discountedReviews.join(" ")).toMatch(/outside the chain it declared/);
  });

  it("a contained run on the WRONG chain is also invalidated: that is the misrouting case", () => {
    const judged = judgeReviewProvenance(
      record({ chain: "flash" }),
      DEFAULT_REVIEW_CHAIN,
    );
    expect(judged.standing).toBe("invalidated");
    expect(judged.reason).toMatch(/not the configured review chain/);
  });

  it("MISSING provenance proceeds as unverified: it does not invalidate and does not throw", () => {
    for (const absent of [undefined, null, "nonsense", 42, {}]) {
      const judged = judgeReviewProvenance(absent, DEFAULT_REVIEW_CHAIN);
      expect(judged.standing, String(absent)).toBe("unverified");
    }
    // The gate itself: no reader at all is exactly today's behaviour.
    expect(moveToAwaiting([reviewRow(), commitRow()], undefined)).toBeNull();
    // A reader that returns nothing for this session is the dropped-write case.
    expect(moveToAwaiting([reviewRow(), commitRow()], () => undefined)).toBeNull();
  });

  it("a reader that THROWS degrades to unverified rather than out of the gate", () => {
    const thrower = () => {
      throw new Error("provenance store is down");
    };
    expect(judgeReviewRow(reviewRow(), DEFAULT_REVIEW_CHAIN, thrower).standing).toBe(
      "unverified",
    );
    expect(() => moveToAwaiting([reviewRow(), commitRow()], thrower)).not.toThrow();
    expect(moveToAwaiting([reviewRow(), commitRow()], thrower)).toBeNull();
  });

  it("a LEGACY unstamped review_pass keeps satisfying the gate — no migration, by decision", () => {
    /*
     * Settled in writing: legacy rows are automatically promoted. The risk
     * (an old self-reviewed pass stays valid) was accepted rather than
     * overlooked, and adding a backfill here would contradict the decision.
     */
    const legacy: EvidenceRow = {
      kind: "builtin:review_pass",
      author: "agent",
      at: 1,
      payload: { note: "PASS, all six criteria MET" },
    };
    expect(moveToAwaiting([legacy, commitRow()], () => record({ contained: false }))).toBeNull();
  });

  it("only a review_pass can be discounted: no other kind is touched", () => {
    const check: EvidenceRow = {
      kind: "builtin:automated_check",
      author: "agent",
      at: 2,
      payload: {},
      stamp: { sessionId: REVIEW_SESSION },
    };
    // An off-chain record for the same session must not drop the check row.
    const refusal = moveToAwaiting([check, commitRow()], () => record({ contained: false }));
    expect(refusal?.missingKinds ?? []).not.toContain("builtin:automated_check");
  });
});

describe("#136 the configured chain is a NAME, never a model", () => {
  it("defaults to frontier and reads the configured value", () => {
    expect(reviewChainOf({})).toBe("frontier");
    expect(reviewChainOf({ reviewChain: "" })).toBe("frontier");
    expect(reviewChainOf({ reviewChain: "orchestrator-work" })).toBe("orchestrator-work");
    expect(configuredReviewChain(undefined)).toBe("frontier");
    expect(configuredReviewChain({ reviewChain: "flash" })).toBe("flash");
  });

  it("no chain literally named `partner` survives anywhere in the source", () => {
    /*
     * The chain named `partner` was DELETED harness-side. A reference to it
     * would resolve to nothing at dispatch, so this is a real break rather
     * than tidiness.
     */
    for (const file of [
      "../src/kernel/review-provenance.ts",
      "../src/kernel/gates.ts",
      "../src/host/partner-review.ts",
    ]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text, file).not.toMatch(/chain: ?["']partner["']/);
      expect(text, file).not.toMatch(/["']partner["'] chain/);
    }
  });
});

describe("#136 registration is inert until the harness catches up", () => {
  const ctxWith = (services: Record<string, unknown>) =>
    ({ get: (name: string) => services[name] }) as never;

  it("registers nothing when the service is absent, and still returns a disposer", () => {
    const dispose = registerPartnerReview(ctxWith({}), "frontier");
    expect(typeof dispose).toBe("function");
    expect(() => dispose()).not.toThrow();
    expect(reviewProvenanceReader(ctxWith({}))).toBeUndefined();
  });

  it("registers the type with a chain NAME, denies board writes and child spawns, and unregisters", () => {
    let definition: Record<string, unknown> | undefined;
    let disposed = 0;
    const dispose = registerPartnerReview(
      ctxWith({
        subagentTypes: {
          register: (def: Record<string, unknown>) => {
            definition = def;
            return () => {
              disposed += 1;
            };
          },
        },
      }),
      "frontier",
    );

    expect(definition?.name).toBe("partner_review");
    expect(definition?.chain).toBe("frontier");
    expect(definition?.maxDepth).toBe(1);
    const deny = (definition?.toolFilter as { deny?: string[] } | undefined)?.deny ?? [];
    for (const write of [
      "attach_evidence",
      "move_ticket",
      "set_ticket",
      "suggest_actions",
    ]) {
      expect(deny, "a reviewer must not write to the board").toContain(write);
    }
    for (const spawn of ["subagent", "subagent_fork"]) {
      expect(deny, "a reviewer must not launder work through a child").toContain(spawn);
    }
    // Reads are NOT denied: the reviewer reads the ticket it reviews.
    for (const read of ["get_ticket", "get_tickets", "get_evidence", "plan"]) {
      expect(deny, "a reviewer reads the board it reviews").not.toContain(read);
    }

    dispose();
    expect(disposed).toBe(1);
  });

  it("survives a harness whose register or lookup throws", () => {
    const hostile = ctxWith({
      subagentTypes: {
        register: () => {
          throw new Error("nope");
        },
      },
      chainProvenance: {
        forSession: () => {
          throw new Error("nope");
        },
      },
    });
    expect(() => registerPartnerReview(hostile, "frontier")).not.toThrow();
    const reader = reviewProvenanceReader(hostile);
    expect(reader).toBeDefined();
    expect(reader?.("any")).toBeUndefined();
  });
});

describe("Task A: the subagent model pin is inside config, where it is read", () => {
  /*
   * `agentOptions` is declared in the tool's Config schema and read as
   * `config.agentOptions` when the start request is built. As a SIBLING of
   * config nothing reads it, so the pin silently does nothing and every
   * subagent inherits the parent's provider/model — observed live as
   * subagents running the orchestrator head with no failover at all,
   * because the failover layer only engages when a request's
   * (provider, model) matches a rung of that agent's chain.
   *
   * Parsed, not eyeballed: the whole defect was invisible indentation.
   */
  const preset: unknown = parseYaml(
    readFileSync(new URL("../presets/aidos/agent.cordis.yml", import.meta.url), "utf8"),
  );

  /*
   * The preset is a top-level LIST of rows, and a row's `config` may itself
   * be a list of nested rows (the isolate group holds the subagent tools).
   * Walk it rather than assuming a depth: the pin being at the wrong depth
   * is the entire defect, so the test must find rows by id wherever they
   * sit.
   */
  const rowsById = new Map<string, Record<string, unknown>>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    const row = node as Record<string, unknown>;
    if (typeof row.id === "string") rowsById.set(row.id, row);
    walk(row.config);
  };
  walk(preset);

  for (const id of ["tool-subagent", "tool-subagent-fork"]) {
    it(`${id} has config.agentOptions.model`, () => {
      const row = rowsById.get(id);
      expect(row, `${id} row must exist`).toBeDefined();
      const config = row?.config as { agentOptions?: { model?: unknown; provider?: unknown } };
      expect(config?.agentOptions, "agentOptions must live INSIDE config").toBeDefined();
      expect(typeof config?.agentOptions?.model).toBe("string");
      expect(typeof config?.agentOptions?.provider).toBe("string");
      // And nothing may be left at row level, where nothing reads it.
      expect(row?.agentOptions, "a row-level agentOptions is a dead pin").toBeUndefined();
    });
  }
});

/**
 * #136, the HUMAN-VISIBLE half (user direction, 2026-09-08): "new reviews
 * made after the fix gain a verified checkmark with a tooltip saying that
 * this review ran through the configured reviewer chain, and nothing
 * changes about old review evidence."
 *
 * So the mark must be a pure ADDITION, arriving with stamping and never
 * re-labelling what already exists — and it must reach a human without
 * reaching the model, which the contract states plainly: provenance never
 * appears as a tool, a prompt section, or tool-result text.
 */
describe("#136 the verified mark degrades progressively and stays out of model context", () => {
  const strip = readFileSync(
    new URL("../src/client/evidence-strip.tsx", import.meta.url).pathname,
    "utf8",
  );
  const panel = readFileSync(
    new URL("../src/client/detail-panel.tsx", import.meta.url).pathname,
    "utf8",
  );
  const tools = readFileSync(
    new URL("../src/tools/aidos-tools.ts", import.meta.url).pathname,
    "utf8",
  );
  const core = readFileSync(
    new URL("../src/host/aidos-core.ts", import.meta.url).pathname,
    "utf8",
  );

  it("renders NOTHING for a row the harness never stamped", () => {
    /*
     * The whole progressive-degradation requirement in one assertion: only
     * "verified" and "invalidated" draw anything, so an unstamped legacy
     * row -- which is every review row that exists today -- looks exactly
     * as it always has.
     */
    expect(strip).toContain(
      'props.standing === "verified" || props.standing === "invalidated"',
    );
  });

  it("judges an unstamped legacy row as unverified, never as a finding", () => {
    const judgement = judgeReviewRow(
      { kind: "builtin:review_pass", payload: { note: "PASS" } },
      "frontier",
      () => ({ chain: "frontier", contained: true }),
    );
    expect(judgement.standing).toBe("unverified");
    expect(judgement.reason).toMatch(/predates stamping|never written|absent/);
  });

  it("gives the verified mark a tooltip that names the chain", () => {
    const judgement = judgeReviewRow(
      { kind: "builtin:review_pass", payload: {}, stamp: { sessionId: REVIEW_SESSION } },
      "frontier",
      () => ({ chain: "frontier", contained: true, rungsDeclared: [], rungsUsed: [] }),
    );
    expect(judgement.standing).toBe("verified");
    expect(judgement.reason).toContain("frontier");
    // The strip shows exactly that string, so the tooltip is the reason.
    expect(strip).toContain("props.standingReason");
  });

  it("reaches the board through a REMOTE, and no tool exposes it", () => {
    /*
     * "provenance never reaches model context: no tool, prompt section, or
     * tool-result text exposes it; human visibility is board/UI only."
     * A Remote is callable by the client and not by the model, which is
     * why the standing rides one.
     */
    expect(core).toContain('@Remote("reviewStandings")');
    expect(panel).toContain('callAidosRemote("reviewStandings"');
    expect(tools).not.toContain("reviewStandings");
    expect(tools).not.toContain("chainProvenance");
    expect(tools).not.toContain("judgeReviewRow");
  });

  it("never lets the decoration break the panel it decorates", () => {
    // A failed fetch clears the marks and renders the evidence anyway: a
    // badge must not be the reason a human cannot read their evidence.
    expect(panel).toContain(".catch(() => {");
    expect(panel).toContain("if (alive) setStandings({});");
  });
});
