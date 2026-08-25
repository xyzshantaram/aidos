/**
 * Ticket C5: the canonical workspace key.
 *
 * `workspaceKeyFromPath` matches dsh's `projectKey(cwd)` transform. The key is
 * `--` plus a readable core plus `--`, with separators collapsed to one dash,
 * safe characters kept, and every other character hex-escaped.
 */

import { describe, expect, it } from "vitest";

import { workspaceKeyFromPath } from "../src/kernel/slug";

describe("workspaceKeyFromPath", () => {
  it("maps a plain absolute path to its key", () => {
    expect(workspaceKeyFromPath("/home/sid/repos/aidos")).toBe("--home-sid-repos-aidos--");
    expect(workspaceKeyFromPath("/srv/proj/a")).toBe("--srv-proj-a--");
  });

  it("collapses consecutive separators into one dash", () => {
    expect(workspaceKeyFromPath("//usr//local//bin")).toBe("--usr-local-bin--");
    expect(workspaceKeyFromPath("/a///b")).toBe("--a-b--");
  });

  it("treats backslash and colon as separators too", () => {
    expect(workspaceKeyFromPath("C:\\Users\\sid")).toBe("--C-Users-sid--");
    expect(workspaceKeyFromPath("C:/Users/sid")).toBe("--C-Users-sid--");
  });

  it("escapes unsafe characters to zero-padded uppercase hex", () => {
    expect(workspaceKeyFromPath("/a b")).toBe("--a~0020b--");
    expect(workspaceKeyFromPath("/a#b")).toBe("--a~0023b--");
  });

  it("keeps safe punctuation as-is", () => {
    expect(workspaceKeyFromPath("/a.b-c_d")).toBe("--a.b-c_d--");
  });

  it("strips leading dashes and falls back to root on an empty core", () => {
    expect(workspaceKeyFromPath("//")).toBe("--root--");
    expect(workspaceKeyFromPath("")).toBe("--root--");
    expect(workspaceKeyFromPath("/")).toBe("--root--");
  });

  it("caps the readable core at 251 characters", () => {
    const long = "/" + "a".repeat(300);
    const core = workspaceKeyFromPath(long).slice(2, -2);
    // No cap per grill answer "No cap — full-length keys": deep paths
    // must not collide on truncated scratch dirs. Core keeps full length.
    expect(core.length).toBe(300);
    expect(workspaceKeyFromPath(long)).toBe("--" + "a".repeat(300) + "--");
  });
});
