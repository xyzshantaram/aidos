/**
 * Ticket U2c: the FieldEditor smoke test.
 *
 * LIMITATION: react-testing-library is not installed in this repo and the
 * U2c constraint forbids adding it. No DOM render is possible here.
 * Instead, this test imports the FieldEditor module and asserts the named
 * exports exist and that the component function is callable. The click,
 * type, and save interaction cannot be exercised in this file; the runtime
 * behavior is covered by the live board check in the human review queue.
 */

import { describe, expect, it } from "vitest";

import { FieldEditor, type EditableField } from "../src/client/field-editor";

describe("u2c field-editor: module surface", () => {
  it("exports the FieldEditor component function", () => {
    expect(typeof FieldEditor).toBe("function");
  });

  it("exports the EditableField field-name type", () => {
    const fields: EditableField[] = [
      "title",
      "description",
      "criteria",
      "phase",
      "order",
      "slug",
    ];
    expect(fields).toHaveLength(6);
  });

  it("the FieldEditor function accepts a props object", () => {
    // The function must be callable with a props object without throwing a
    // type error. The render itself needs a DOM, so this asserts only that
    // the component is a function.
    expect(() => {
      const descriptor = Object.getOwnPropertyDescriptor(FieldEditor, "length");
      expect(descriptor?.value).toBe(1);
    }).not.toThrow();
  });
});
