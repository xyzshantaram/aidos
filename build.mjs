import { build } from "esbuild";

// The aidos-tools agent plugin, bundled so the preset directory is
// self-contained. The dsh packages stay external: the loader resolves them
// from the profile's node_modules at runtime.
await build({
  entryPoints: ["src/tools/aidos-tools.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  external: ["@deepseek-ai/*", "node:*"],
  outfile: "presets/aidos/aidos-tools.js",
  logLevel: "info",
});

// The aidos-core host plugin, bundled the same way.
await build({
  entryPoints: ["src/host/aidos-plugin.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  external: ["@deepseek-ai/*", "node:*"],
  outfile: "dist/host/aidos-plugin.js",
  logLevel: "info",
});
