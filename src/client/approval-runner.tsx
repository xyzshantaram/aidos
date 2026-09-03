/**
 * #85: the APPROVAL RUNNER — one modal that runs every approval flow.
 *
 * It takes a STEP LIST, renders each step by kind, collects the answer, and
 * returns one outcome. Every `request_*` tool and every queue action (#93)
 * delegates here, so there is one interaction implementation rather than one
 * per flow.
 *
 * The outcome distinguishes three cases, because the caller must be able to
 * tell them apart:
 *
 *  - `approved` — confirmed, and nothing was edited. Write what was proposed.
 *  - `amended`  — confirmed, but the human changed values. The caller shows
 *                 the agent what changed so it can re-propose rather than
 *                 silently accepting an edit it never saw.
 *  - `rejected` — nothing is written, at all.
 *
 * The runner performs NO writes and knows no board verbs. It collects and
 * returns; the caller decides what that means. That is what makes it usable
 * by the queue, by the request_* tools, and by anything later.
 */
import react from "react";

import { ModalShell, LinesField, NoteField, linesOf } from "./ui";
import { TicketStrip } from "./ticket-strip";

import type { TicketStripTicket } from "./ticket-strip";

/** A note, with an optional criterion to attach it to. */
export interface ConfirmStep {
  kind: "confirm";
  title: string;
  /** The question, in the human's terms. */
  prompt?: string;
  noteLabel?: string;
  /** Offered for linking; a step with none simply omits the picker. */
  criteria?: readonly string[];
}

/** The allowlist editor's shape: a one-per-line path list. */
export interface PathListStep {
  kind: "path-list";
  title: string;
  prompt?: string;
  label?: string;
  paths: readonly string[];
}

/** A checklist over proposed criteria. */
export interface CriteriaChecklistStep {
  kind: "criteria-checklist";
  title: string;
  prompt?: string;
  criteria: readonly string[];
  /** Indexes checked when the step opens. Defaults to all. */
  selected?: readonly number[];
}

/** Pick tickets to propose as dependency edges. Renders TicketStrips. */
export interface DependencyPickerStep {
  kind: "dependency-picker";
  title: string;
  prompt?: string;
  candidates: readonly TicketStripTicket[];
  /** Ticket ids checked when the step opens. */
  selected?: readonly string[];
}

export type Step =
  | ConfirmStep
  | PathListStep
  | CriteriaChecklistStep
  | DependencyPickerStep;

/** One step's collected answer, discriminated by the step kind. */
export type StepValue =
  | { kind: "confirm"; note: string; criterion?: string }
  | { kind: "path-list"; paths: string[] }
  | { kind: "criteria-checklist"; criteria: string[] }
  | { kind: "dependency-picker"; ticketIds: string[] };

export type RunOutcome =
  | { status: "approved"; values: StepValue[] }
  | { status: "amended"; values: StepValue[] }
  | { status: "rejected" };

/**
 * The answer a step starts with, before the human touches anything.
 * Exported so the step defaults are unit-testable without a DOM.
 */
export function initialValue(step: Step): StepValue {
  switch (step.kind) {
    case "confirm":
      return { kind: "confirm", note: "" };
    case "path-list":
      return { kind: "path-list", paths: [...step.paths] };
    case "criteria-checklist": {
      const selected =
        step.selected ?? step.criteria.map((_criterion, index) => index);
      return {
        kind: "criteria-checklist",
        criteria: [...selected]
          .sort((a, b) => a - b)
          .map((index) => step.criteria[index])
          .filter((c): c is string => typeof c === "string"),
      };
    }
    case "dependency-picker":
      return { kind: "dependency-picker", ticketIds: [...(step.selected ?? [])] };
  }
}

/**
 * Did the human change anything? Compared structurally rather than by
 * reference, so a re-render never fakes an amendment. A confirm step's NOTE
 * is not an amendment: writing a note is the normal way to approve, not a
 * change to what was proposed.
 */
export function isAmended(steps: readonly Step[], values: readonly StepValue[]): boolean {
  return steps.some((step, index) => {
    const before = initialValue(step);
    const after = values[index];
    if (after === undefined) return false;
    if (before.kind === "confirm" || after.kind === "confirm") return false;
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}

export interface ApprovalRunnerProps {
  title: string;
  steps: readonly Step[];
  working?: boolean;
  onResolve: (outcome: RunOutcome) => void;
  onClose: () => void;
}

export function ApprovalRunner(props: ApprovalRunnerProps) {
  const steps = props.steps;
  const [index, setIndex] = react.useState(0);
  const [values, setValues] = react.useState<StepValue[]>(() =>
    steps.map(initialValue),
  );

  const step = steps[index];
  const value = values[index];
  const last = index === steps.length - 1;
  const working = props.working === true;

  const update = (next: StepValue) => {
    setValues((previous) => {
      const copy = [...previous];
      copy[index] = next;
      return copy;
    });
  };

  const advance = () => {
    if (!last) {
      setIndex(index + 1);
      return;
    }
    props.onResolve({
      status: isAmended(steps, values) ? "amended" : "approved",
      values,
    });
  };

  if (step === undefined || value === undefined) return null;

  return (
    <ModalShell
      title={steps.length > 1 ? props.title + " (" + (index + 1) + "/" + steps.length + ")" : props.title}
      working={working}
      onClose={props.onClose}
    >
      <div className="aidos-runner-step">
        <h4 className="aidos-runner-step-title">{step.title}</h4>
        {step.prompt !== undefined ? (
          <p className="aidos-runner-step-prompt">{step.prompt}</p>
        ) : null}
        <StepBody step={step} value={value} working={working} onChange={update} />
      </div>
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-danger"
          disabled={working}
          onClick={() => {
            props.onResolve({ status: "rejected" });
          }}
        >
          Reject
        </button>
        {index > 0 ? (
          <button
            className="aidos-btn"
            disabled={working}
            onClick={() => {
              setIndex(index - 1);
            }}
          >
            Back
          </button>
        ) : null}
        <button className="aidos-btn aidos-btn-primary" disabled={working} onClick={advance}>
          {working ? "Working\u2026" : last ? "Confirm" : "Next"}
        </button>
      </div>
    </ModalShell>
  );
}

function StepBody(props: {
  step: Step;
  value: StepValue;
  working: boolean;
  onChange: (value: StepValue) => void;
}) {
  const { step, value, working, onChange } = props;

  if (step.kind === "confirm" && value.kind === "confirm") {
    return (
      <>
        <NoteField
          label={step.noteLabel ?? "Note (optional)"}
          value={value.note}
          working={working}
          onChange={(note) => {
            onChange({ ...value, note });
          }}
        />
        {step.criteria !== undefined && step.criteria.length > 0 ? (
          <div className="aidos-modal-row">
            <label>Link to a criterion (optional)</label>
            <select
              className="aidos-select"
              value={value.criterion ?? ""}
              disabled={working}
              onChange={(event) => {
                const criterion = event.target.value;
                onChange({
                  ...value,
                  criterion: criterion === "" ? undefined : criterion,
                });
              }}
            >
              <option value="">{"\u2014 none \u2014"}</option>
              {step.criteria.map((criterion) => (
                <option key={criterion} value={criterion}>
                  {criterion}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </>
    );
  }

  if (step.kind === "path-list" && value.kind === "path-list") {
    return (
      <LinesField
        label={step.label ?? "Paths (one per line)"}
        value={value.paths.join("\n")}
        working={working}
        onChange={(text) => {
          onChange({ kind: "path-list", paths: linesOf(text) });
        }}
      />
    );
  }

  if (step.kind === "criteria-checklist" && value.kind === "criteria-checklist") {
    const chosen = new Set(value.criteria);
    return (
      <ul className="aidos-runner-checklist">
        {step.criteria.map((criterion) => (
          <li key={criterion}>
            <label>
              <input
                type="checkbox"
                checked={chosen.has(criterion)}
                disabled={working}
                onChange={() => {
                  const next = new Set(chosen);
                  if (next.has(criterion)) next.delete(criterion);
                  else next.add(criterion);
                  onChange({
                    kind: "criteria-checklist",
                    criteria: step.criteria.filter((c) => next.has(c)),
                  });
                }}
              />
              <span>{criterion}</span>
            </label>
          </li>
        ))}
      </ul>
    );
  }

  if (step.kind === "dependency-picker" && value.kind === "dependency-picker") {
    const chosen = new Set(value.ticketIds);
    return (
      <ul className="aidos-ticket-strips">
        {step.candidates.map((candidate) => {
          const id = String(candidate.id);
          return (
            <TicketStrip
              key={id}
              ticket={candidate}
              meta={chosen.has(id) ? "will be proposed as a dependency" : undefined}
              highlighted={chosen.has(id)}
              actions={
                <button
                  className="aidos-btn"
                  disabled={working}
                  onClick={() => {
                    const next = new Set(chosen);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    onChange({
                      kind: "dependency-picker",
                      ticketIds: step.candidates
                        .map((c) => String(c.id))
                        .filter((c) => next.has(c)),
                    });
                  }}
                >
                  {chosen.has(id) ? "Remove" : "Add"}
                </button>
              }
            />
          );
        })}
      </ul>
    );
  }

  return null;
}
