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

/** #158: one entry of a directory listing, enough to tell a directory apart. */
interface AidosDirent {
  name: string;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

declare module "fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdirSync(path: string, options?: { recursive: boolean }): string | undefined;
  export function existsSync(path: string): boolean;
  /** #110: tests resolve tmpdir, which is behind a link on some platforms. */
  export function realpathSync(path: string): string;
  /** #101: link node_modules into a fresh worktree, which has none. */
  export function symlinkSync(target: string, path: string, type?: string): void;
  /** #120: a successful plan import deletes the plan file. */
  export function unlinkSync(path: string): void;
  /**
   * #158: preparation finds every directory in the main checkout that has a
   * node_modules, so a pnpm workspace gets one link per package without
   * aidos knowing anything about that repository's layout.
   */
  export function readdirSync(path: string, options: { withFileTypes: true }): AidosDirent[];
}
declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdirSync(path: string, options?: { recursive: boolean }): string | undefined;
  export function existsSync(path: string): boolean;
  /** #110: tests resolve tmpdir, which is behind a link on some platforms. */
  export function realpathSync(path: string): string;
  /** #101: link node_modules into a fresh worktree, which has none. */
  export function symlinkSync(target: string, path: string, type?: string): void;
  /** #120: a successful plan import deletes the plan file. */
  export function unlinkSync(path: string): void;
  /** #158: see the "fs" declaration above. */
  export function readdirSync(path: string, options: { withFileTypes: true }): AidosDirent[];
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
/**
 * #38: the small `node:sqlite` surface the store needs, declared here for
 * the same reason as the modules above. (Unlike them, no @types/node
 * declaration resolves under this repo's TS7/Bundler setup — the import
 * fails with TS2591 without this shim — so this is the only declaration,
 * not a narrowing of a second one.) Results stay `unknown` at the
 * boundary; every caller casts to the row shape it selected.
 */
declare module "node:sqlite" {
  export interface SqliteStatement {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { lastInsertRowid: number | bigint };
  }
  export interface SqliteDatabase {
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    close(): void;
  }
  export const DatabaseSync: new (path: string) => SqliteDatabase;
}
