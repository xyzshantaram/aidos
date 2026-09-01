/**
 * #53 + the #51/#53 review ask: the attach surface's JSON validation is
 * extracted (parsePayloadText) so the contract is unit-testable. These pin
 * the user-facing error strings — the attach surface shows them verbatim.
 */
import { describe, expect, it } from "vitest";
import { parsePayloadText } from "../src/client/parse-payload-text";

describe("parsePayloadText", () => {
  it("empty and whitespace input is an empty payload", () => {
    expect(parsePayloadText("")).toEqual({ ok: true, payload: {} });
    expect(parsePayloadText("   \n  ")).toEqual({ ok: true, payload: {} });
  });

  it("a valid object passes through", () => {
    expect(parsePayloadText('{"paths": ["src/"]}')).toEqual({
      ok: true,
      payload: { paths: ["src/"] },
    });
  });

  it("arrays, scalars, and null refuse with the object message", () => {
    expect(parsePayloadText('["x"]').ok).toBe(false);
    expect(parsePayloadText('"string"').ok).toBe(false);
    expect(parsePayloadText("42").ok).toBe(false);
    expect(parsePayloadText("null").ok).toBe(false);
    const refused = parsePayloadText("[]");
    expect(refused.ok === false && refused.error).toBe("Payload must be a JSON object");
  });

  it("garbage refuses naming the parse error", () => {
    const result = parsePayloadText("{not json");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.startsWith("Payload is not valid JSON:")).toBe(true);
  });
});
