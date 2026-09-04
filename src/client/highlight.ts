/**
 * #82: syntax highlighting for the scratch rows, matching tool-render.
 *
 * The rules here -- the extension map, lazy grammar registration, and the
 * escaped-text fallback -- are ported from tool-render so a scratch read
 * highlights exactly as a builtin read does. Only the grammars it registers
 * are carried over; adding more would make the two diverge in the other
 * direction.
 *
 * Pure and free of React, so every rule is testable. tool-render keeps this
 * inline in its component file, which is the pattern this project keeps
 * paying for.
 */

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";

/** The grammars tool-render registers. Kept identical on purpose. */
const GRAMMARS: Record<string, unknown> = {
  javascript,
  typescript,
  json,
  python,
  bash,
  yaml,
};

/** File extension -> highlight.js language, copied from tool-render. */
const EXTENSION_LANGUAGE: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  jsonl: "json",
  py: "python",
  pyi: "python",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
};

const registered = new Set<string>();

/**
 * Register a grammar on first use.
 *
 * Lazy because highlight.js's core ships no languages: registering all of
 * them eagerly would pull every grammar into the bundle for a transcript
 * that may contain none of them.
 */
function ensureLanguage(name: string): void {
  if (!Object.prototype.hasOwnProperty.call(GRAMMARS, name)) return;
  if (registered.has(name)) return;
  hljs.registerLanguage(name, GRAMMARS[name] as never);
  registered.add(name);
}

export function extensionOf(path: string): string {
  const match = /\.([A-Za-z0-9_+-]+)$/.exec(path);
  return match === null ? "" : match[1].toLowerCase();
}

/** The language for a path, or null when the extension is unknown. */
export function languageFor(path: string): string | null {
  return EXTENSION_LANGUAGE[extensionOf(path)] ?? null;
}

/** HTML-escape, for the unhighlighted fallback. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Highlighted HTML for one line.
 *
 * Falls back to ESCAPED text for an unknown language or a grammar failure.
 * That fallback is load-bearing: the result is injected as HTML, so
 * returning raw text on failure would put file contents into the DOM
 * unescaped.
 */
export function highlightCode(text: string, language: string | null): string {
  if (language !== null) ensureLanguage(language);
  const use = language !== null && hljs.getLanguage(language) !== undefined ? language : null;
  if (use !== null) {
    try {
      return hljs.highlight(text, { language: use }).value;
    } catch {
      /* fall through to escaped text */
    }
  }
  return escapeHtml(text);
}

/** The gutter width, sized to the widest line number, as tool-render does. */
export function gutterWidth(numbers: ReadonlyArray<number | null>): string {
  let max = 1;
  for (const number of numbers) {
    if (number === null) continue;
    const length = String(number).length;
    if (length > max) max = length;
  }
  return String(max + 2) + "ch";
}
