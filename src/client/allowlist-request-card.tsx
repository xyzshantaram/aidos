/**
 * #51 + #56: the pending-approval card. Kind-generic by design — the card
 * renders whatever the pending request carries (allowlist paths first;
 * signoff requests, criteria confirmations, and future agent-to-user asks
 * ride the same queue -> card -> resolve path). The detail panel mounts one
 * per open ticket and polls while mounted; the agent is steered with the
 * outcome through the existing digest when the user resolves.
 */
import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

interface PendingApproval {
  id: string;
  ticketId: number;
  kind: string;
  prompt: string;
  payload: Record<string, unknown>;
  at: number;
}

export function AllowlistRequestCard(props: {
  ticketId: number | string;
  agentId: string;
  /** Called after a resolution so the parent can refresh. */
  onResolved?: () => void;
}) {
  const [request, setRequest] = react.useState<PendingApproval | null>(null);
  const [paths, setPaths] = react.useState<string[]>([]);
  const [working, setWorking] = react.useState(false);
  // Finding 4 (#51 review): the 2s poll must not clobber edits typed between
  // intervals — the dirty flag latches on the first keystroke and resets
  // only when the request is replaced.
  const dirtyRef = react.useRef(false);
  // Finding 8: the dead `tick` state is gone.

  // Poll while mounted. The request is a peek, not a pop: re-renders and
  // polling never lose it; only an explicit resolve does.
  react.useEffect(function () {
    let cancelled = false;
    async function poll() {
      try {
        const result = await callAidosRemote("pendingApproval", { ticketId: props.ticketId }, props.agentId);
        if (cancelled) return;
        const row =
          result !== null && typeof result === "object" && !Array.isArray(result)
            ? (result as unknown as PendingApproval)
            : null;
        setRequest(row);
        if (row !== null && !dirtyRef.current && Array.isArray(row.payload?.paths)) {
          setPaths((row.payload as { paths: string[] }).paths);
        }
      } catch {
        // Polling is best-effort; a failed poll retries on the next tick.
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    return function () {
      cancelled = true;
      clearInterval(timer);
    };
  }, [props.ticketId, props.agentId]);

  async function resolve(approved: boolean) {
    if (request === null || working) return;
    setWorking(true);
    try {
      const clean = paths.map((p) => p.trim()).filter((p) => p !== "");
      await callAidosRemote(
        "resolveApproval",
        { requestId: request.id, approved, ...(approved ? { paths: clean } : {}) },
        props.agentId,
      );
      showToast(approved ? "Allowlist approved" : "Allowlist rejected", approved ? "success" : "info");
      dirtyRef.current = false;
      setRequest(null);
      props.onResolved?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  if (request === null) return null;

  /*
   * Read from the request, not recomputed here: the CLIENT cannot stat the
   * host filesystem, so the host is the only thing that can know which paths
   * are new. Guarded for an older pending card that predates the field.
   */
  const createdPaths = Array.isArray(request.payload?.created)
    ? (request.payload.created as unknown[]).filter((p): p is string => typeof p === "string")
    : [];

  return (
    <div className="aidos-approval-card">
      <div className="aidos-approval-head">
        <span className="aidos-chip aidos-chip-kind aidos-chip-approval-kind">
          <span className="aidos-chip-key">{request.kind.toUpperCase()}</span>
        </span>
        <span className="aidos-approval-prompt">{request.prompt}</span>
      </div>
      <textarea
        className="aidos-allowlist-input"
        value={paths.join("\n")}
        disabled={working}
        onChange={(event) => {
          dirtyRef.current = true;
          setPaths(event.target.value.split("\n"));
        }}
      />
      {createdPaths.length > 0 ? (
        <p className="aidos-approval-created">
          {/*
            * #104: approving a path into EXISTENCE is a different decision
            * from approving writes to something already there, and the human
            * should see which one they are making rather than discover it
            * afterwards. Before this, a non-existent path was refused
            * outright -- so a ticket whose whole purpose was to create
            * something could never be authorised to create it.
            */}
          {createdPaths.length === 1
            ? "1 path does not exist yet and will be created: "
            : createdPaths.length + " paths do not exist yet and will be created: "}
          {createdPaths.join(", ")}
        </p>
      ) : null}
      <p className="aidos-detail-note">
        Edit the list before approving if the proposal needs amending. The agent is told the outcome either way.
      </p>
      <div className="aidos-form-actions">
        <button className="aidos-btn" disabled={working} onClick={() => void resolve(false)}>
          Reject
        </button>
        <button className="aidos-btn aidos-btn-primary" disabled={working} onClick={() => void resolve(true)}>
          {working ? "Working\u2026" : "Approve"}
        </button>
      </div>
    </div>
  );
}
