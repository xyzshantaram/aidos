/**
 * The small node builtin surface the service needs, declared because the
 * package has no @types/node. This is a script file (no imports or
 * exports), so the declarations are global ambient modules.
 *
 * The tests run under vitest, which supplies the runtime; these types are
 * the compile-time contract for the synchronous plan-file read, the path
 * resolution under the session workspace, and the allowlist existence
 * checks (#51). Both "fs"/"path" and "node:fs"/"node:path" resolve via
 * these ambient modules.
 *
 * A merge pass that adds @types/node can delete this file.
 */

declare module "fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdirSync(path: string, options: { recursive: boolean }): string | undefined;
  export function existsSync(path: string): boolean;
  /** #101: link node_modules into a fresh worktree, which has none. */
  export function symlinkSync(target: string, path: string, type?: string): void;
}
declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdirSync(path: string, options: { recursive: boolean }): string | undefined;
  export function existsSync(path: string): boolean;
  /** #101: link node_modules into a fresh worktree, which has none. */
  export function symlinkSync(target: string, path: string, type?: string): void;
}
declare module "path" {
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string): string;
  export function dirname(path: string): string;
}
declare module "node:path" {
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string): string;
  export function dirname(path: string): string;
}
declare module "child_process" {
  /** One completed execFile run. */
  export interface ExecFileResult {
    stdout: string;
    stderr: string;
  }
  export function execFile(
    file: string,
    args: string[],
    options: { cwd: string; timeout: number },
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ): void;
}
declare module "node:child_process" {
  /** One completed execFile run. */
  export interface ExecFileResult {
    stdout: string;
    stderr: string;
  }
  export function execFile(
    file: string,
    args: string[],
    options: { cwd: string; timeout: number },
    callback: (error: Error | null, stdout: string, stderr: string) => void,
  ): void;
}
