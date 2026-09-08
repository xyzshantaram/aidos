/**
 * #136: the `partner_review` front door.
 *
 * Registers a chain-pinned reviewer subagent type with the harness, and
 * hands the gate a provenance reader. Both harness services may be ABSENT
 * (an older harness), so everything here is guarded with `ctx.get` and this
 * module ships INERT rather than broken: registration is dormant until the
 * services appear, which is the intended Cordis idiom.
 *
 * ## What this is not
 *
 * Not a security boundary, and it must not be built or described like one.
 * Nothing prevents a host plugin from writing provenance rows. What it
 * defends against is DRIFT AND MISROUTING — aidos quietly dispatching a
 * batch of reviews to a cheap tier — and the strongest consequence it may
 * ever have is "this review result is invalid; re-run it". It may never
 * block a session, wedge the board, or throw out of the gate.
 *
 * ## What aidos does NOT implement
 *
 * The harness side: the services themselves, the dispatch layer, chain
 * resolution, and the provenance store all live in dotfiles-ai. aidos
 * supplies a chain NAME and reads a record. If the frozen contract is ever
 * insufficient, the correct move is to say so and stop — not to work
 * around it here.
 */

import type { Context } from "@deepseek-ai/cordis";

import { DEFAULT_REVIEW_CHAIN } from "../kernel/review-provenance";

/** The subagent type name the model sees. */
export const PARTNER_REVIEW_TYPE = "partner_review";

/**
 * The reviewer's persona. Deliberately short: the REVIEW CONTRACT lives in
 * the batch-review document spec and in each ticket's criteria, both of
 * which the reviewer reads from the board itself. A long persona here is
 * prompt text pretending to be enforcement.
 */
const REVIEWER_PERSONA =
  "You are a review partner. You review the DIFF and the ticket's criteria " +
  "from the board; the worker's own report is context only, never the thing " +
  "you review. Answer explicitly, per ticket, which criteria have NO " +
  "corresponding diff hunk: omission is the defect class this exists to " +
  "catch, and a diff-only reading is structurally blind to it. Your " +
  "deliverable is the review document at the path in your brief — not a " +
  "summary message, which would invite the orchestrator to review the " +
  "summary instead of the work.";

/**
 * Tools a reviewer must not have.
 *
 * The board WRITES are refused for any subagent anyway (the depth guard),
 * so this is the second layer rather than the only one. The subagent tools
 * are denied for a different reason: a reviewer that can spawn its own
 * children can launder work through a cheap tier and return it as its own
 * review, which is exactly the routing this mechanism exists to detect.
 */
const REVIEWER_DENY = [
  "set_ticket",
  "attach_evidence",
  "move_ticket",
  "plan_import",
  "plan_meta_set",
  "request_allowlist",
  "suggest_actions",
  "subagent",
  "subagent_fork",
  "ralph",
  "workflow",
];

/** The shape of the harness service, as far as aidos uses it. */
interface SubagentTypesService {
  register: (definition: {
    name: string;
    description: string;
    chain: string;
    toolFilter?: { allow?: string[]; deny?: string[] };
    persona?: string;
    maxDepth?: number;
  }) => () => void;
}

interface ChainProvenanceService {
  forSession: (sessionId: string) => unknown;
}

function serviceOf<T>(ctx: Context, name: string): T | undefined {
  try {
    return (ctx as unknown as { get: (key: string) => unknown }).get(name) as
      | T
      | undefined;
  } catch {
    /*
     * A harness whose service lookup throws is an older harness, not a
     * fault worth failing the plugin for. Same branch as absent.
     */
    return undefined;
  }
}

/**
 * Register the reviewer type, if the harness offers the service.
 *
 * Returns a disposer in every case, so the caller can register it with
 * `ctx.effect` without branching. An absent service disposes to a no-op.
 */
export function registerPartnerReview(ctx: Context, reviewChain: string): () => void {
  const service = serviceOf<SubagentTypesService>(ctx, "subagentTypes");
  if (service === undefined || typeof service.register !== "function") {
    return () => {};
  }
  try {
    const dispose = service.register({
      name: PARTNER_REVIEW_TYPE,
      description:
        "Dispatch an independent review of ticket work on the configured " +
        "review chain. The reviewer reads the board and the diff, and writes " +
        "a batch-review document; it cannot write to the board itself.",
      /*
       * A NAME, never a model. The harness resolves it at dispatch against
       * the live profile, so switching profiles changes the models with no
       * edit here. An unknown name is a hard error at dispatch on the
       * harness side — surfaced, never silently downgraded to the parent's
       * model.
       */
      chain: reviewChain,
      toolFilter: { deny: REVIEWER_DENY },
      persona: REVIEWER_PERSONA,
      maxDepth: 1,
    });
    return typeof dispose === "function" ? dispose : () => {};
  } catch {
    /*
     * Registration is a convenience, not a precondition for the board. A
     * harness that rejects the definition leaves aidos exactly as it was.
     */
    return () => {};
  }
}

/**
 * The provenance reader the gate takes, or undefined when the harness has
 * no such service.
 *
 * Undefined is the honest answer for "no provenance available", and the
 * gate treats it as missing data: every review counts as it counts today.
 * The reader never throws — `judgeReviewRow` also wraps it, so a throwing
 * harness degrades to unverified rather than to a refusal.
 */
export function reviewProvenanceReader(
  ctx: Context,
): ((sessionId: string) => unknown) | undefined {
  const service = serviceOf<ChainProvenanceService>(ctx, "chainProvenance");
  if (service === undefined || typeof service.forSession !== "function") {
    return undefined;
  }
  return (sessionId: string) => {
    try {
      return service.forSession(sessionId);
    } catch {
      return undefined;
    }
  };
}

/** The configured review chain, defaulted. Never a model, never pinned. */
export function configuredReviewChain(config: unknown): string {
  if (typeof config === "object" && config !== null) {
    const value = (config as { reviewChain?: unknown }).reviewChain;
    if (typeof value === "string" && value !== "") return value;
  }
  return DEFAULT_REVIEW_CHAIN;
}
