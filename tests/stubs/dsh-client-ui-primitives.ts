/**
 * Test stub for @deepseek-ai/dsh-client-ui-primitives.
 *
 * The real module exists only inside the running shell: the client build
 * marks every @deepseek-ai/* import external, and the shell's module table
 * supplies the implementation at load time. There is no package to install,
 * so tests that import client components (which now use the shell's chevron
 * primitive) would fail to RESOLVE the import — not assert against it.
 *
 * This stub preserves the contract the components rely on: a component that
 * takes className and aria-hidden and renders an element carrying that
 * className, so any test asserting on the class still sees it. It is wired
 * through vitest.config.ts's alias and never ships in the client bundle.
 */
export function IconChevronDownOutline14(props: {
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const react = require("react");
  return react.createElement("svg", {
    className: props.className,
    "aria-hidden": props["aria-hidden"] ?? true,
    "data-test-stub": "icon-chevron-down",
  });
}
