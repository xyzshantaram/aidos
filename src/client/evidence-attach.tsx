/**
 * #53: the kind-tailored evidence attach surface.
 *
 * The two most common kinds — Sign off and Verify — are FIRST-CLASS BUTTONS
 * above the generic form (the user asked for exactly this). Each opens a
 * purpose-built confirm modal:
 *   - Sign off: confirm + optional note + optional criterion link.
 *   - Verify:   confirm + optional note + a paste/drop screenshot that
 *               uploads through the composer's own drop transport and stores
 *               the returned HOST PATH in the payload ({imagePath}).
 * The remaining kinds keep the JSON form below — but the form is TAILORED to
 * the selected kind: file_allowlist gets a paths editor, plain kinds get note
 * only, and the raw JSON textarea appears only for kinds with no tailored
 * shape (#68: raw JSON is the last resort, never the default).
 */
import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { userEvidenceKinds } from "./user-evidence-kinds";
import { parsePayloadText } from "./parse-payload-text";
import { ModalShell, NoteField as NoteFieldShared, Collapse, LinesField } from "./ui";
import { EvidencePayloadView } from "./evidence-payload-view";
import type { EvidenceRowLike } from "./board-logic";
import { BUILTIN_KINDS } from "../kernel/constants";

// ---- shared modal chrome (thin wrappers over ui.tsx) ------------------------

function AttachModal(props: {
  title: string;
  working: boolean;
  onAttach: () => void;
  onClose: () => void;
  children: react.ReactNode;
}) {
  return (
    <ModalShell
      title={props.title}
      working={props.working}
      onClose={props.onClose}
      onConfirm={props.onAttach}
      confirmLabel="Attach"
    >
      {props.children}
    </ModalShell>
  );
}

function NoteField(props: {
  note: string;
  working: boolean;
  onChange: (text: string) => void;
  label?: string;
}) {
  return (
    <NoteFieldShared
      label={props.label ?? "Note (optional)"}
      value={props.note}
      working={props.working}
      onChange={props.onChange}
    />
  );
}

// ---- shared reusable components for editors ---------------------------------

// LinesField now lives in ui.tsx (#93): the allowlist editor, the per-kind
// evidence editors, and the approval runner's path-list step share it.

/** Parse one-per-line text into an array of non-empty strings. */
function parseLinesText(text: string): { ok: boolean; lines?: string[]; error?: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) {
    return { ok: false, error: "Add at least one line." };
  }
  return { ok: true, lines };
}

/** Image paste/drop zone: extracted from VerifyModal so both it and AfterShotForm can use it. */
function ImagePasteZone(props: {
  imagePath: string | null;
  uploading: boolean;
  pasteError: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <>
      <div
        className="aidos-evidence-paste-zone"
        onPaste={(event: react.ClipboardEvent<HTMLDivElement>) => {
          const file = Array.from(event.clipboardData.files)[0];
          if (file) props.onFile(file);
        }}
        onDragOver={(event: react.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
        }}
        onDrop={(event: react.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          const file = Array.from(event.dataTransfer.files)[0];
          if (file) props.onFile(file);
        }}
        tabIndex={0}
      >
        {props.uploading
          ? "Uploading…"
          : props.imagePath !== null
            ? "Screenshot stored — paste again to replace."
            : "Paste or drop a screenshot here (optional)"}
      </div>
      {props.pasteError !== null ? <p className="aidos-evidence-paste-error">{props.pasteError}</p> : null}
    </>
  );
}

// ---- the two primary modals ------------------------------------------------

// ---- the Verify modal (hosted by the action bar) ---------------------------

/** Paste/drop -> host path via the composer's own drop transport. */
async function uploadImagePaste(agentId: string, file: Blob, name: string): Promise<string> {
  const headers: Record<string, string> = {
    "content-type": file.type || "application/octet-stream",
    "x-file-name": name,
    // The route requires the session: the agentId IS the session id.
    "x-session-id": agentId,
  };
  // The workspace root rides the aidos Remote surface (read-only, the
  // session's own cwd); the paste route needs it as a header.
  const root = await callAidosRemote("workspaceRoot", {}, agentId).catch(() => undefined);
  const workspaceDir =
    root !== undefined &&
    typeof root === "object" &&
    !Array.isArray(root) &&
    typeof (root as Record<string, unknown>).workspace === "string"
      ? ((root as Record<string, unknown>).workspace as string)
      : null;
  if (workspaceDir !== null) {
    headers["x-workspace"] = workspaceDir;
  }
  const res = await fetch("/paste-to-path", { method: "POST", headers, body: file });
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as { error?: string } | undefined;
    throw new Error(body?.error ?? `paste upload failed (${res.status})`);
  }
  const attachment = (await res.json()) as { path: string };
  return attachment.path;
}

export function VerifyModal(props: { ticketId: number | string; agentId: string; onClose: () => void }) {
  const [note, setNote] = react.useState("");
  const [imagePath, setImagePath] = react.useState<string | null>(null);
  const [uploading, setUploading] = react.useState(false);
  const [working, setWorking] = react.useState(false);
  const [pasteError, setPasteError] = react.useState<string | null>(null);

  async function handleFile(file: File) {
    setPasteError(null);
    setUploading(true);
    try {
      const path = await uploadImagePaste(props.agentId, file, file.name || "pasted-image.png");
      setImagePath(path);
      showToast("Screenshot stored", "success");
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  async function attach() {
    if (working) return;
    setWorking(true);
    try {
      const payload: Record<string, unknown> = {};
      if (note.trim() !== "") payload.note = note.trim();
      if (imagePath !== null) payload.imagePath = imagePath;
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:user_verified", payload },
        props.agentId,
      );
      showToast("Verified", "success");
      props.onClose();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  return (
    <AttachModal title="Verify" working={working || uploading} onAttach={() => void attach()} onClose={props.onClose}>
      <p className="aidos-modal-body">
        {"You verified this ticket hands-on. Paste (Ctrl+V) or drop a screenshot to attach it."}
      </p>
      <ImagePasteZone imagePath={imagePath} uploading={uploading} pasteError={pasteError} onFile={handleFile} />
      <NoteField note={note} working={working} onChange={setNote} />
    </AttachModal>
  );
}

// ---- the tailored form for the remaining kinds -----------------------------

/**
 * #78: the git-commit picker. One dropdown of the workspace's recent commits
 * (loaded once per kind selection via userRecentCommits) plus the shared
 * note field; attaching names only the short hash — the host resolves the
 * commit's real metadata through git show and stores it in the row.
 */
function CommitPickerForm(props: {
  ticketId: number | string;
  agentId: string;
  onAttached?: () => void;
  note: string;
  setNote: (note: string) => void;
  working: boolean;
}) {
  const [commits, setCommits] = react.useState<
    { hash: string; subject: string; author: string; date: string }[]
  >([]);
  const [loadError, setLoadError] = react.useState<string | null>(null);
  const [picked, setPicked] = react.useState("");
  const [attaching, setAttaching] = react.useState(false);

  react.useEffect(function () {
    let alive = true;
    callAidosRemote("userRecentCommits", { ticketId: props.ticketId }, props.agentId)
      .then((out) => {
        if (!alive) return;
        const rows = (out as unknown as { commits?: { hash: string; subject: string; author: string; date: string }[] } | null)?.commits;
        setCommits(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (!alive) return;
        setLoadError(error instanceof AidosRemoteError ? error.message : String(error));
      });
    return () => {
      alive = false;
    };
  }, [props.ticketId, props.agentId]);

  async function attach() {
    if (attaching || picked === "") return;
    setAttaching(true);
    try {
      await callAidosRemote(
        "userAttachCommitEvidence",
        { ticketId: props.ticketId, hash: picked, ...(props.note.trim() === "" ? {} : { note: props.note.trim() }) },
        props.agentId,
      );
      showToast("Commit evidence attached", "success");
      setPicked("");
      props.setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div className="aidos-evidence-tailored">
      <div className="aidos-modal-row">
        <label>Recent commits</label>
        {loadError !== null ? (
          <p className="aidos-evidence-paste-error">{loadError}</p>
        ) : (
          <select
            className="aidos-evidence-attach-kind-select"
            value={picked}
            disabled={attaching}
            onChange={(event) => {
              setPicked(event.target.value);
            }}
          >
            <option value="">{commits.length === 0 ? "Loading commits…" : "Pick a commit…"}</option>
            {commits.map((commit) => (
              <option value={commit.hash} key={commit.hash}>
                {commit.hash + " " + commit.subject + " — " + commit.author}
              </option>
            ))}
          </select>
        )}
      </div>
      <NoteField note={props.note} working={props.working || attaching} onChange={props.setNote} label="Note (optional)" />
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={props.working || attaching || picked === ""}
          onClick={() => void attach()}
        >
          {attaching ? "Working…" : "Attach commit"}
        </button>
      </div>
    </div>
  );
}

/** Editor for builtin:eval_criteria: one-per-line criteria list. */
function EvalCriteriaForm(props: {
  ticketId: number | string;
  agentId: string;
  onAttached?: () => void;
}) {
  const [criteriaText, setCriteriaText] = react.useState("");
  const [note, setNote] = react.useState("");
  const [working, setWorking] = react.useState(false);

  const parsed = parseLinesText(criteriaText);

  async function attach() {
    if (working || !parsed.ok) return;
    setWorking(true);
    try {
      const payload: Record<string, unknown> = { lines: parsed.lines };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:eval_criteria", payload },
        props.agentId,
      );
      showToast("Evaluation criteria attached", "success");
      setCriteriaText("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="aidos-evidence-tailored">
      <LinesField
        label="Evaluation criteria (one per line)"
        value={criteriaText}
        working={working}
        placeholder={"Criterion 1\nCriterion 2"}
        onChange={setCriteriaText}
      />
      <NoteField note={note} working={working} onChange={setNote} />
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={working || !parsed.ok}
          title={parsed.ok ? undefined : parsed.error}
          onClick={() => void attach()}
        >
          {working ? "Working…" : "Attach"}
        </button>
      </div>
    </div>
  );
}

/** Editor for builtin:agent_report: a report textarea + optional note. */
function AgentReportForm(props: {
  ticketId: number | string;
  agentId: string;
  onAttached?: () => void;
}) {
  const [reportText, setReportText] = react.useState("");
  const [note, setNote] = react.useState("");
  const [working, setWorking] = react.useState(false);

  async function attach() {
    if (working || reportText.trim() === "") return;
    setWorking(true);
    try {
      const payload: Record<string, unknown> = { report: reportText.trim() };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:agent_report", payload },
        props.agentId,
      );
      showToast("Agent report attached", "success");
      setReportText("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="aidos-evidence-tailored">
      <div className="aidos-modal-row">
        <label>Report</label>
        <textarea
          className="aidos-evidence-attach-note aidos-evidence-attach-tall"
          value={reportText}
          disabled={working}
          placeholder="Describe the work performed…"
          onChange={(event) => {
            setReportText(event.target.value);
          }}
        />
      </div>
      <NoteField note={note} working={working} onChange={setNote} />
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={working || reportText.trim() === ""}
          onClick={() => void attach()}
        >
          {working ? "Working…" : "Attach"}
        </button>
      </div>
    </div>
  );
}

/** Editor for builtin:automated_check and builtin:test_run: command, result select, optional note. */
function CheckResultForm(props: {
  ticketId: number | string;
  agentId: string;
  kind: "builtin:automated_check" | "builtin:test_run";
  onAttached?: () => void;
}) {
  const [command, setCommand] = react.useState("");
  const [result, setResult] = react.useState<"pass" | "fail" | "">("");
  const [note, setNote] = react.useState("");
  const [working, setWorking] = react.useState(false);

  async function attach() {
    if (working || command.trim() === "" || result === "") return;
    setWorking(true);
    try {
      const payload: Record<string, unknown> = {
        command: command.trim(),
        result,
      };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: props.kind, payload },
        props.agentId,
      );
      showToast(`${props.kind === "builtin:automated_check" ? "Automated check" : "Test run"} attached`, "success");
      setCommand("");
      setResult("");
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="aidos-evidence-tailored">
      <div className="aidos-modal-row">
        <label>Command</label>
        <input
          type="text"
          className="aidos-command-input"
          value={command}
          disabled={working}
          placeholder="npm run test"
          onChange={(event) => {
            setCommand(event.target.value);
          }}
        />
      </div>
      <div className="aidos-modal-row">
        <label>Result</label>
        <select
          className="aidos-evidence-attach-kind-select"
          value={result}
          disabled={working}
          onChange={(event) => {
            setResult(event.target.value as "pass" | "fail" | "");
          }}
        >
          <option value="">Choose a result…</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </div>
      <NoteField note={note} working={working} onChange={setNote} />
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={working || command.trim() === "" || result === ""}
          onClick={() => void attach()}
        >
          {working ? "Working…" : "Attach"}
        </button>
      </div>
    </div>
  );
}

/** Editor for builtin:after_shot: image paste/drop zone + optional note. */
function AfterShotForm(props: {
  ticketId: number | string;
  agentId: string;
  onAttached?: () => void;
}) {
  const [imagePath, setImagePath] = react.useState<string | null>(null);
  const [note, setNote] = react.useState("");
  const [uploading, setUploading] = react.useState(false);
  const [working, setWorking] = react.useState(false);
  const [pasteError, setPasteError] = react.useState<string | null>(null);

  async function handleFile(file: File) {
    setPasteError(null);
    setUploading(true);
    try {
      const path = await uploadImagePaste(props.agentId, file, file.name || "pasted-image.png");
      setImagePath(path);
      showToast("Screenshot stored", "success");
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  async function attach() {
    if (working || imagePath === null) return;
    setWorking(true);
    try {
      const payload: Record<string, unknown> = { imagePath };
      if (note.trim() !== "") payload.note = note.trim();
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:after_shot", payload },
        props.agentId,
      );
      showToast("After shot attached", "success");
      setImagePath(null);
      setNote("");
      props.onAttached?.();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="aidos-evidence-tailored">
      <ImagePasteZone imagePath={imagePath} uploading={uploading} pasteError={pasteError} onFile={handleFile} />
      <NoteField note={note} working={working} onChange={setNote} />
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={working || uploading || imagePath === null}
          onClick={() => void attach()}
        >
          {working ? "Working…" : "Attach"}
        </button>
      </div>
    </div>
  );
}

/** The main tailored form that routes to each kind's editor. */
function TailoredForm(props: { ticketId: number | string; agentId: string; kind: string; onAttached: () => void }) {
  const [note, setNote] = react.useState("");
  const [pathsText, setPathsText] = react.useState("");
  const [payloadText, setPayloadText] = react.useState("");
  const [working, setWorking] = react.useState(false);

  async function attachWith(kind: string, payload: Record<string, unknown>) {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote("userAttachEvidence", { ticketId: props.ticketId, kind, payload }, props.agentId);
      showToast("Evidence attached", "success");
      setNote("");
      setPathsText("");
      setPayloadText("");
      props.onAttached();
    } catch (error) {
      showToast(error instanceof AidosRemoteError ? error.message : String(error), "refusal");
    } finally {
      setWorking(false);
    }
  }

  // builtin:file_allowlist: a paths editor, no JSON.
  if (props.kind === "builtin:file_allowlist") {
    const parsed = parseLinesText(pathsText);
    return (
      <div className="aidos-evidence-tailored">
        <LinesField
          label="Allowed paths (one per line)"
          value={pathsText}
          working={working}
          placeholder={"src/client/\nsrc/host/aidos-core.ts"}
          onChange={setPathsText}
        />
        <NoteField note={note} working={working} onChange={setNote} />
        <div className="aidos-form-actions">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={working || !parsed.ok}
            title={parsed.ok ? undefined : parsed.error}
            onClick={() => {
              if (parsed.ok) void attachWith(props.kind, { paths: parsed.lines });
            }}
          >
            {working ? "Working…" : "Attach"}
          </button>
        </div>
      </div>
    );
  }

  // builtin:eval_criteria: one-per-line criteria editor.
  if (props.kind === "builtin:eval_criteria") {
    return <EvalCriteriaForm ticketId={props.ticketId} agentId={props.agentId} onAttached={props.onAttached} />;
  }

  // builtin:agent_report: report textarea + optional note.
  if (props.kind === "builtin:agent_report") {
    return <AgentReportForm ticketId={props.ticketId} agentId={props.agentId} onAttached={props.onAttached} />;
  }

  // builtin:automated_check and builtin:test_run: command, result, optional note.
  if (props.kind === "builtin:automated_check" || props.kind === "builtin:test_run") {
    return (
      <CheckResultForm
        ticketId={props.ticketId}
        agentId={props.agentId}
        kind={props.kind}
        onAttached={props.onAttached}
      />
    );
  }

  // builtin:after_shot: image paste zone + optional note.
  if (props.kind === "builtin:after_shot") {
    return <AfterShotForm ticketId={props.ticketId} agentId={props.agentId} onAttached={props.onAttached} />;
  }

  // builtin:user_commit: git commit picker.
  if (props.kind === "builtin:user_commit") {
    return <CommitPickerForm ticketId={props.ticketId} agentId={props.agentId} onAttached={props.onAttached} note={note} setNote={setNote} working={working} />;
  }

  /*
   * Note-carrying review kinds: review_pass, review_fail, review_note.
   *
   * builtin:comment retired here too (#96, folded into review_note) -- still
   * a valid kind for a pre-existing row, just no longer offered.
   *
   * #96 review finding 1: review_fail is USER-AUTHORABLE, so the human's
   * kind picker offers it -- but it was missing from this branch and fell
   * through to the raw-JSON escape hatch at the bottom of this file. That
   * was wrong twice over: it showed a raw-JSON surface for a blessed kind
   * (the exact thing #68 exists to eliminate), and that form permits an
   * EMPTY note, so a failed review could be recorded carrying no verdict at
   * all -- the one thing the kind exists to carry.
   */
  const REVIEW_VERDICT_LABEL: Record<string, string> = {
    "builtin:review_pass": "What was reviewed, and why it is accepted",
    "builtin:review_fail": "The verdict and the findings",
    "builtin:review_note": "Note",
  };
  const verdictLabel = REVIEW_VERDICT_LABEL[props.kind];
  if (verdictLabel !== undefined) {
    return (
      <div className="aidos-evidence-tailored">
        <NoteField note={note} working={working} onChange={setNote} label={verdictLabel} />
        <div className="aidos-form-actions">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={working || note.trim() === ""}
            onClick={() => void attachWith(props.kind, { note: note.trim() })}
          >
            {working ? "Working…" : "Attach"}
          </button>
        </div>
      </div>
    );
  }

  // Foreign/unknown kinds: the extenuating-circumstances JSON escape hatch in a collapsed disclosure.
  const parsedPayload = parsePayloadText(payloadText);
  const structured = parsedPayload.ok ? parsedPayload.payload : {};
  const parseError = parsedPayload.ok ? null : parsedPayload.error;

  return (
    <div className="aidos-evidence-tailored">
      <Collapse summary="Raw JSON (optional object)" defaultOpen={false}>
        <div className="aidos-modal-row">
          <textarea
            className="aidos-evidence-attach-note"
            value={payloadText}
            disabled={working}
            placeholder={'{\n  "custom": "value"\n}'}
            onChange={(event) => {
              setPayloadText(event.target.value);
            }}
          />
        </div>
        {parseError !== null ? <p className="aidos-evidence-paste-error">{parseError}</p> : null}
      </Collapse>
      <NoteField note={note} working={working} onChange={setNote} />
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={working || parseError !== null}
          onClick={() => {
            const payload =
              note.trim() === "" ? structured : { ...structured, note: note.trim() };
            void attachWith(props.kind, payload);
          }}
        >
          {working ? "Working…" : "Attach"}
        </button>
      </div>
    </div>
  );
}

// ---- the public surface ------------------------------------------------------

export interface EvidenceAttachProps {
  ticketId: number | string;
  agentId: string;
  /** Called after any successful attach so the parent can refresh. */
  onAttached?: () => void;
}

export function EvidenceAttach(props: EvidenceAttachProps) {
  const kinds = userEvidenceKinds();
  const [kind, setKind] = react.useState(kinds.length > 0 ? kinds[0].id : "");
  const [lastRow, setLastRow] = react.useState<EvidenceRowLike | null>(null);

  // #53, re-grilled: Sign off and Verify are ACTION-BAR buttons (the user
  // wants them at the top, not buried in the evidence panel). The panel
  // keeps only the tailored attach surface for the remaining kinds.
  const remainingKinds = kinds.filter(
    (k) => k.id !== "builtin:user_signoff" && k.id !== "builtin:user_verified",
  );
  void lastRow;

  return (
    <div className="aidos-evidence-attach">
      <div className="aidos-modal-row">
        <label>Other evidence kinds</label>
        <select
          className="aidos-evidence-attach-kind-select"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
          }}
        >
          {remainingKinds.map((descriptor) => (
            <option value={descriptor.id} key={descriptor.id}>
              {descriptor.label}
            </option>
          ))}
        </select>
      </div>
      <TailoredForm ticketId={props.ticketId} agentId={props.agentId} kind={kind} onAttached={() => props.onAttached?.()} />
    </div>
  );
}
