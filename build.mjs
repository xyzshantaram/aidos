import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

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

// The client half: the Tickets board React components. esbuild bundles it
// browser/cjs (react and every @deepseek-ai package external: the shell's
// module table provides them at runtime), then the result is wrapped in the
// window.__ModuleLoader__.load facade the client-module loader expects. The
// dotfiles-ai plugins (subscriptions, approval-comment) use the same recipe
// against this same web profile.
// A real .css file becomes its text as a string at build time (design copied
// from dotfiles-ai). The board imports "./board.css" and injects the text
// once at runtime. dsh ships the CSS as a single string, so there is no
// bundler-level css loader to rely on.
const cssTextPlugin = {
  name: "css-text",
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => ({
      path: resolve(args.resolveDir, args.path),
      namespace: "css-text",
    }));
    build.onLoad({ filter: /.*/, namespace: "css-text" }, async (args) => {
      const text = await readFile(args.path, "utf8");
      return { contents: `export default ${JSON.stringify(text)};`, loader: "js" };
    });
  },
};

await build({
  entryPoints: ["src/client/index.ts"],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  // Classic JSX: esbuild emits react.createElement(...) so the dsh client
  // runtime (which only supports createElement, not the jsx-runtime) can run
  // the bundle. The source is written in real JSX; this transform is the only
  // place it is lowered.
  jsx: "transform",
  jsxFactory: "react.createElement",
  jsxFragment: "react.Fragment",
  tsconfig: "tsconfig.client.json",
  external: ["react", "react/jsx-runtime", "react-dom/client", "@deepseek-ai/*"],
  plugins: [cssTextPlugin],
  outfile: "dist/client/_client.bundle.js",
  logLevel: "info",
});
{
  await mkdir("lib", { recursive: true });
  const bundled = (await readFile("dist/client/_client.bundle.js", "utf8")).replace(/\s+$/, "");
  await writeFile(
    "lib/client.js",
    `window.__ModuleLoader__.load({\n\tid: "aidos",\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;\n\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n${bundled}\n\t\treturn module.exports;\n\t}\n});\n`,
  );
  await rm("dist/client/_client.bundle.js");
}

