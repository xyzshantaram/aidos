import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      /*
       * The shell's primitives module exists only at runtime: the client
       * build marks every @deepseek-ai/* import external, and the shell's
       * module table supplies the implementation at load time (verified in
       * dsh-web-frontend's boot). There is no package to install, so tests
       * importing client components cannot resolve the specifier. The stub
       * preserves the contract the components use -- className rides through
       * to the rendered element. See tests/stubs/ for the full contract.
       */
      "@deepseek-ai/dsh-client-ui-primitives": resolve(
        __dirname,
        "tests/stubs/dsh-client-ui-primitives.ts",
      ),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
