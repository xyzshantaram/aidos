/**
 * The aidos invariant companion. Folds the same stream the projections
 * read and fails on the first corrupt record, before an append commits.
 * SPEC-B1.md sections 4b and 6 are the contract.
 *
 * The installer runs in a child fiber of `ctx.invariants`; `fail(message)`
 * throws the package-attributed `InvariantError` (code `"INVARIANT"`). The
 * append path of the service runs the same pure validation before a log
 * write, so a violating event never reaches the session log.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { Session, SessionEvent } from "@deepseek-ai/dsh-session";
import type { InvariantFailure, InvariantInstaller } from "@deepseek-ai/dsh-invariants";
import { createInitialState, foldAidosEvents } from "../kernel/fold";
import type { AidosState } from "../kernel/fold";
import type { AidosEvent } from "../kernel/events";

/** The package name the invariant registers under. */
export const PACKAGE_NAME = "aidos";

/**
 * The session event types the aidos stream owns. The envelope type of an
 * aidos session event equals the kernel event kind, so the fold reads the
 * data as the AidosEvent directly.
 */
export const AIDOS_EVENT_TYPES: ReadonlySet<string> = new Set([
  "ticket/change",
  "evidence/attached",
  "evidence/detached",
  "plan/change",
  "comment/added",
  "aidos/refusal",
  "project/created",
  "project/moved",
  "phase/set",
]);

/** Fold one session event into the state when it is an aidos event. */
export function foldSessionEvent(state: AidosState, event: SessionEvent): void {
  if (AIDOS_EVENT_TYPES.has(event.type)) {
    foldAidosEvents(state, event.data as AidosEvent);
  }
}

/** One staged candidate fold: the session and the state it validated into. */
interface StagedFold {
  session: Session;
  state: AidosState;
}

/** Clone one folded state so a candidate can validate without mutating it. */
export function cloneState(state: AidosState): AidosState {
  const copy = createInitialState();
  for (const [id, project] of state.projects) copy.projects.set(id, { ...project });
  for (const [projectId, phases] of state.phases) {
    const next = new Map<number, { title: string; state: string }>();
    for (const [number, phase] of phases) next.set(number, { ...phase });
    copy.phases.set(projectId, next);
  }
  for (const [id, snapshot] of state.tickets) copy.tickets.set(id, { ...snapshot });
  for (const [id, rows] of state.evidence) copy.evidence.set(id, [...rows]);
  for (const [id, plan] of state.plans) {
    copy.plans.set(id, {
      frontmatter: plan.frontmatter,
      context: {
        preamble: plan.context.preamble,
        contextSections: plan.context.contextSections.map((section) => ({ ...section })),
      },
      rules: plan.rules,
    });
  }
  for (const [id, comments] of state.comments) copy.comments.set(id, [...comments]);
  for (const [id, at] of state.lastAt) copy.lastAt.set(id, at);
  for (const [id, revision] of state.lastRevision) copy.lastRevision.set(id, revision);
  copy.nextTicketId = state.nextTicketId;
  return copy;
}

/** The installer: fold every session stream and fail on the first corrupt record. */
const install = Object.assign(
  (invCtx: Context, fail: InvariantFailure): void => {
    const states = new WeakMap<Session, AidosState>();
    const staged = new WeakMap<SessionEvent, StagedFold>();

    const applyChecked = (state: AidosState, event: SessionEvent): void => {
      if (!AIDOS_EVENT_TYPES.has(event.type)) return;
      try {
        foldAidosEvents(state, event.data as AidosEvent);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fail(`session event ${event.seq} violates the aidos stream: ${message}`);
      }
    };

    const seed = (session: Session): AidosState => {
      const state = createInitialState();
      for (const event of session.events) applyChecked(state, event);
      states.set(session, state);
      return state;
    };

    const stateFor = (session: Session): AidosState => states.get(session) ?? seed(session);

    // Seed every attached session, and seed each one created later.
    for (const session of invCtx.sessions.list()) seed(session);
    invCtx.on("session/created", (session) => {
      seed(session);
    }, { global: true });

    // Validate the candidate before publication; commit the fold only after
    // the event is in the log, so a violating append cannot half-commit.
    invCtx.on("internal/dispatch", (_mode, eventName, args) => {
      if (eventName !== "session/event") return;
      const [session, event] = args as [Session, SessionEvent];
      const state = cloneState(stateFor(session));
      applyChecked(state, event);
      staged.set(event, { session, state });
    }, { global: true });

    invCtx.on("session/event", (session, event) => {
      const candidate = staged.get(event);
      if (candidate === undefined || candidate.session !== session) {
        fail("session/event reached publication without matching aidos-fold validation");
        return;
      }
      staged.delete(event);
      states.set(session, candidate.state);
    }, { global: true });
  },
  { inject: ["sessions"] as const },
);

/**
 * Register the `aidos` invariant installer under ctx.invariants.
 * Returns the disposer.
 */
export function registerAidosInvariant(ctx: Context): () => void {
  return ctx.invariants.register(PACKAGE_NAME, install satisfies InvariantInstaller);
}
