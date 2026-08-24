/**
 * The small node surface the B1 test fixtures need. The package has no
 * @types/node; the implementation declares its own read surface in
 * src/host/aidos-core.ts, and these ambient declarations merge with it (the
 * plan_import tool reads plan files through `node:fs`).
 */

declare module "node:fs" {
  export function mkdtempSync(prefix: string): string;
  export function writeFileSync(path: string, data: string): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function existsSync(path: string): boolean;
}
declare module "node:os" {
  export function tmpdir(): string;
}
declare module "node:path" {
  export function join(...paths: string[]): string;
  export function isAbsolute(path: string): boolean;
}
