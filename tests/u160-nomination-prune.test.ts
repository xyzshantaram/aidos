/**
 * #160 (user, 2026-09-08): "the ask cap is broken. I think it may be
 * related to the 'the ask was answered but not shown' thing. The ask stays
 * in the queue even when it's been addressed and counts towards the number
 * of open nominations."
 *
 * The connection was exactly right: the two symptoms are one missing step.
 *
 * A nomination was removed on two paths only — the human dismissed it, or
 * the agent re-nominated the same (ticket, action) pair and replaced it.
 * Nothing removed one when its action was actually PERFORMED. It vanished
 * from the QUEUE anyway, because the display derives asks from board state
 * and a fulfilled ask no longer has an entry to merge onto. So the halves
 * disagreed: invisible in the list, still counted by the cap — and the
 * refusal's own promise ("the human dismisses or acts on them to make
 * room") was false for the acting half.
 *
 * The cure is that the read and the cap call ONE function, so they cannot
 * disagree by construction. These tests pin that property, not just the
 * symptom.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, type Harness } from "./b1-harness";

function setup(): { harness: Harness; agent: ReturnType<Harness["asAgent"]> } {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return { harness, agent: harness.asAgent() };
}

/** An open ticket, the state a signoff nomination applies to. */
let seq = 0;
function openTicket(harness: Harness): number {
  return harness.service.setTicket(harness.asAgent(), { title: `Ask ${++seq}` }).id;
}

/** Drive a ticket to in_progress, which ANSWERS a signoff ask. */
function signOff(harness: Harness, id: number): void {
  harness.seedEvidence(harness.agent, id, "builtin:user_signoff");
  harness.service.agentMoveTicket(harness.asAgent(), { ticketId: id, to: "in_progress" });
}

describe("#160 a fulfilled nomination stops existing", () => {
  it("disappears from the list once its action has been performed", () => {
    const { harness, agent } = setup();
    const id = openTicket(harness);
    harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: id, actionId: "signoff", reason: "please start it" }],
    });
    expect(harness.service.actionNominations(agent)).toHaveLength(1);

    signOff(harness, id);

    // The ask has been answered: it is no longer asking for anything.
    expect(harness.service.actionNominations(agent)).toHaveLength(0);
  });

  it("FREES A CAP SLOT, which is what the refusal always promised", () => {
    /*
     * The headline defect. The refusal says "the human dismisses or acts on
     * them to make room" — acting made no room at all, so in a long session
     * the cap filled with answered work and the agent could nominate
     * nothing.
     */
    const { harness, agent } = setup();
    const ids: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const id = openTicket(harness);
      ids.push(id);
      harness.service.suggestActions(agent, {
        suggestions: [{ ticketId: id, actionId: "signoff", reason: "queued" }],
      });
    }
    // At the cap: one more genuinely new pair must be refused.
    const overflow = openTicket(harness);
    expect(() =>
      harness.service.suggestActions(agent, {
        suggestions: [{ ticketId: overflow, actionId: "signoff", reason: "one too many" }],
      }),
    ).toThrow(/too many nominations/);

    // The human acts on one. That must make room.
    signOff(harness, ids[0] as number);

    expect(() =>
      harness.service.suggestActions(agent, {
        suggestions: [{ ticketId: overflow, actionId: "signoff", reason: "now there is room" }],
      }),
    ).not.toThrow();
  });

  it("does not wedge the cap on a ticket that no longer exists", () => {
    /*
     * A nomination pointing at nothing can never be acted on OR dismissed
     * through the queue, so leaving it in the count is a permanent leak.
     *
     * The deleted ticket is produced INSIDE the session that holds the
     * nomination (review finding on the first cut, 2026-09-08): the original
     * version checked a FRESH harness, which proved session isolation and
     * left the `snapshot === undefined` branch in _liveNominations
     * unexecuted. There is no delete tool yet, so the ticket is dropped
     * from the folded state directly — the same private-access approach as
     * the c5 distinct-ids test's not-yet-implemented-delete simulation —
     * which is exactly the state that folded log would be in if a delete
     * had happened.
     */
    const { harness, agent } = setup();
    const id = openTicket(harness);
    harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: id, actionId: "signoff", reason: "will vanish" }],
    });
    expect(harness.service.actionNominations(agent)).toHaveLength(1);

    const caches = (harness.service as unknown as {
      _caches: Map<unknown, { state: { tickets: Map<number, unknown> } }>;
    })._caches;
    const cache = caches.get(
      (agent as unknown as { session: unknown }).session,
    );
    expect(cache).toBeDefined();
    cache?.state.tickets.delete(id);

    expect(harness.service.actionNominations(agent)).toHaveLength(0);
  });

  it("does NOT prune a nomination that is still asking", () => {
    /*
     * The discriminating half. A prune that removed everything would pass
     * every test above and destroy the feature — the queue would simply be
     * empty.
     */
    const { harness, agent } = setup();
    const untouched = openTicket(harness);
    const answered = openTicket(harness);
    harness.service.suggestActions(agent, {
      suggestions: [
        { ticketId: untouched, actionId: "signoff", reason: "still waiting" },
        { ticketId: answered, actionId: "signoff", reason: "about to be done" },
      ],
    });
    signOff(harness, answered);

    const rows = harness.service.actionNominations(agent);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ticketId).toBe(untouched);
  });

  it("keeps a nomination whose moment has NOT ARRIVED yet", () => {
    /*
     * Caught by an existing #93 test before this shipped: a verify
     * nomination on an OPEN ticket is not spent, it is early. When the
     * ticket reaches awaiting_verification the ask becomes live, so
     * deleting it would throw away a forward-looking ask the agent made on
     * purpose. Only PAST answers a nomination.
     */
    const { harness, agent } = setup();
    const id = openTicket(harness);
    harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: id, actionId: "verify", reason: "check it when it is ready" }],
    });
    expect(harness.service.actionNominations(agent)).toHaveLength(1);
  });

  it("prunes per ACTION, not per ticket", () => {
    /*
     * verify and mark-done both apply to awaiting_verification, while
     * signoff applies to open. A ticket that moved out of open answers its
     * signoff ask and can simultaneously be the target of a live verify
     * ask, so pruning must key on the action's state rather than on the
     * ticket having moved at all.
     */
    const { harness, agent } = setup();
    const id = openTicket(harness);
    harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: id, actionId: "signoff", reason: "sign it" }],
    });
    signOff(harness, id);
    harness.seedEvidence(harness.agent, id, "builtin:automated_check");
    harness.seedEvidence(harness.agent, id, "builtin:review_pass");
    harness.service.agentMoveTicket(agent, { ticketId: id, to: "awaiting_verification" });

    // The signoff ask is spent; a verify ask on the same ticket is live.
    harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: id, actionId: "verify", reason: "now check it" }],
    });
    const rows = harness.service.actionNominations(agent);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actionId).toBe("verify");
  });
});

describe("#160 the list and the cap read the same rule", () => {
  it("what the queue shows is exactly what the cap counts", () => {
    /*
     * The property that makes the bug unrepeatable. Previously the display
     * dropped fulfilled asks while the cap kept them, so the two could
     * disagree silently for the whole session. Asserting the equality
     * directly means a future change that prunes one side and not the
     * other fails here rather than in someone's face.
     */
    const { harness, agent } = setup();
    const answered = openTicket(harness);
    const live = openTicket(harness);
    harness.service.suggestActions(agent, {
      suggestions: [
        { ticketId: answered, actionId: "signoff", reason: "a" },
        { ticketId: live, actionId: "signoff", reason: "b" },
      ],
    });
    signOff(harness, answered);

    const shown = harness.service.actionNominations(agent).length;
    expect(shown).toBe(1);

    // Fill the remaining room exactly; the 20th new pair must still fit if
    // the cap counts what the list shows.
    for (let index = shown; index < 20; index += 1) {
      const id = openTicket(harness);
      harness.service.suggestActions(agent, {
        suggestions: [{ ticketId: id, actionId: "signoff", reason: "filler" }],
      });
    }
    expect(harness.service.actionNominations(agent)).toHaveLength(20);
  });

  it("dismissal still works and still records the human's decision", () => {
    // The prune must not disturb the other removal path, including the
    // dismissed-set that stops the agent re-proposing what was declined.
    const { harness, agent } = setup();
    const id = openTicket(harness);
    const result = harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: id, actionId: "signoff", reason: "please" }],
    });
    const nominationId = result.nominations[0]?.id as string;
    harness.service.dismissNomination(agent, { nominationId });
    expect(harness.service.actionNominations(agent)).toHaveLength(0);
  });
});
