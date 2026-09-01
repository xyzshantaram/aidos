/**
 * The payload-text parser for the evidence attach surface (#53/#51 review
 * ask). Extracted from the component so the contract is unit-testable:
 *
 * - empty/whitespace input  -> ok with an empty object (the "no payload" case)
 * - valid JSON object       -> ok with that object
 * - JSON array / scalar     -> refused: "Payload must be a JSON object"
 * - unparseable text        -> refused with the parse error named
 *
 * The error strings are user-facing; the attach surface shows them verbatim.
 */

export type ParsedPayload =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string };

export function parsePayloadText(text: string): ParsedPayload {
  if (text.trim() === "") {
    return { ok: true, payload: {} };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error:
        "Payload is not valid JSON: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Payload must be a JSON object" };
  }
  return { ok: true, payload: parsed as Record<string, unknown> };
}
