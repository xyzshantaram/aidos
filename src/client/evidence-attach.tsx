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
import { ModalShell, NoteField as NoteFieldShared } from "./ui";
import { EvidencePayloadView } from "./evidence-payload-view";
import type { EvidenceRowLike } from "./board-logic";

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

// ---- the two primary modals ------------------------------------------------

// ---- the Verify modal (hosted by the action bar) ---------------------------

/** Paste/drop -> host path via the composer's own drop transport. */
async function uploadImagePaste(agentId: string, file: Blob, name: string): Promise<string> {
  const headers: Record<string, string> = {
    "content-type": file.type || "application/octet-stream",
    "x-file-name": name,
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
      <div
        className="aidos-evidence-paste-zone"
        onPaste={(event: react.ClipboardEvent<HTMLDivElement>) => {
          const file = Array.from(event.clipboardData.files)[0];
          if (file) void handleFile(file);
        }}
        onDragOver={(event: react.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
        }}
        onDrop={(event: react.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          const file = Array.from(event.dataTransfer.files)[0];
          if (file) void handleFile(file);
        }}
        tabIndex={0}
      >
        {uploading
          ? "Uploading\u2026"
          : imagePath !== null
            ? "Screenshot stored — paste again to replace."
            : "Paste or drop a screenshot here (optional)"}
      </div>
      {pasteError !== null ? <p className="aidos-evidence-paste-error">{pasteError}</p> : null}
      <NoteField note={note} working={working} onChange={setNote} />
    </AttachModal>
  );
}

// ---- the tailored form for the remaining kinds -----------------------------

function parseAllowlistText(text: string): { ok: boolean; paths?: string[]; error?: string } {
  const paths = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (paths.length === 0) {
    return { ok: false, error: "List at least one path." };
  }
  return { ok: true, paths };
}

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

  // file_allowlist: a paths editor, no JSON.
  if (props.kind === "builtin:file_allowlist") {
    const parsed = parseAllowlistText(pathsText);
    return (
      <div className="aidos-evidence-tailored">
        <div className="aidos-modal-row">
          <label>{"Allowed paths (one per line)"}</label>
          <textarea
            className="aidos-evidence-attach-note aidos-allowlist-input"
            value={pathsText}
            disabled={working}
            placeholder={"src/client/\nsrc/host/aidos-core.ts"}
            onChange={(event) => {
              setPathsText(event.target.value);
            }}
          />
        </div>
        <NoteField note={note} working={working} onChange={setNote} />
        <div className="aidos-form-actions">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={working || !parsed.ok}
            title={parsed.ok ? undefined : parsed.error}
            onClick={() => {
              if (parsed.ok) void attachWith(props.kind, { paths: parsed.paths });
            }}
          >
            {working ? "Working\u2026" : "Attach"}
          </button>
        </div>
      </div>
    );
  }

  // Note-only kinds: a plain note rides as the payload's note field.
  if (props.kind === "builtin:review_note" || props.kind === "builtin:user_verified" || props.kind === "builtin:user_signoff") {
    return (
      <div className="aidos-evidence-tailored">
        <NoteField note={note} working={working} onChange={setNote} label="Note" />
        <div className="aidos-form-actions">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={working}
            onClick={() => void attachWith(props.kind, note.trim() === "" ? {} : { note: note.trim() })}
          >
            {working ? "Working\u2026" : "Attach"}
          </button>
        </div>
      </div>
    );
  }

  // Foreign/unknown kinds: the extenuating-circumstances JSON escape hatch.
  const parsedPayload = parsePayloadText(payloadText);
  const structured = parsedPayload.ok ? parsedPayload.payload : {};
  const parseError = parsedPayload.ok ? null : parsedPayload.error;
  return (
    <div className="aidos-evidence-tailored">
      <div className="aidos-modal-row">
        <label>Payload JSON (optional object)</label>
        <textarea
          className="aidos-evidence-attach-note"
          value={payloadText}
          disabled={working}
          placeholder={'{\n  "paths": ["src/"]\n}'}
          onChange={(event) => {
            setPayloadText(event.target.value);
          }}
        />
      </div>
      {parseError !== null ? <p className="aidos-evidence-paste-error">{parseError}</p> : null}
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
          {working ? "Working\u2026" : "Attach"}
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
