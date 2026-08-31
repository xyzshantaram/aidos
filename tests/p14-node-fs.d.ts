/**
 * The extra node surface the P14 test needs. The package has no @types/node;
 * the ambient declarations in this file merge with the ones in
 * tests/node-modules.d.ts and src/host/node-builtins.d.ts.
 */

declare module "node:fs" {
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}

/** The directory of the current module, as CommonJS provides it. */
declare const __dirname: string;
