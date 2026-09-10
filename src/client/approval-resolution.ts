/**
 * #170: approval resolution has ONE implementation, shared by the ticket
 * card and the queue.
 *
 * The detail panel's AllowlistRequestCard and the queue's performQueueAction
 * used to call `resolveApproval` with their own surrounding logic, so an
 * approval answered from the ticket and one answered from the queue were
 * different code paths -- the same divergence that cost four rounds on
 * signoff (#98) and verify (#123). Both now call this module, which owns
 * the remote, the toasts, and the refusal handling; the callers only
 * refresh.
 */

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

export interface ApprovalResolution {
  /** What the agent will be told (approved list, rejected, or refused). */
  resolved: string;
}

/**
 * Resolve one pending approval card. `approved` carries the (possibly
 * edited) paths; a rejection resolves with no paths. Either way the card
 * drops and the agent is told the outcome through the digest.
 */
export async function resolveApprovalRequest(
  agentId: string,
  requestId: string,
  approved: boolean,
  paths?: readonly string[],
): Promise<ApprovalResolution> {
  try {
    const clean =
      paths === undefined
        ? undefined
        : paths.map((p) => p.trim()).filter((p) => p !== "");
    const outcome = (await callAidosRemote(
      "resolveApproval",
      {
        requestId,
        approved,
        ...(approved && clean !== undefined ? { paths: clean } : {}),
      },
      agentId,
    )) as unknown as ApprovalResolution;
    if (approved) {
      const count = clean === undefined ? 0 : clean.length;
      showToast("Approved " + count + " path(s)", "success");
    } else {
      showToast("Request rejected", "info");
    }
    return outcome;
  } catch (error) {
    showToast(
      error instanceof AidosRemoteError ? error.message : String(error),
      "refusal",
    );
    throw error;
  }
}
