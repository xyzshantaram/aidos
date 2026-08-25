/**
 * The small node builtin surface the service needs, declared because the
 * package has no @types/node. This is a script file (no imports or
 * exports), so the declarations are global ambient modules.
 *
 * The tests run under vitest, which supplies the runtime; these types are
 * the compile-time contract for the synchronous plan-file read and the
 * path resolution under the session workspace. The bare "fs" and "path"
 * specifiers resolve to the node builtins at runtime.
 *
 * A merge pass that adds @types/node can delete this file.
 */
declare module "fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdirSync(path: string, options: { recursive: boolean }): string | undefined;
}
declare module "path" {
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string): string;
}
