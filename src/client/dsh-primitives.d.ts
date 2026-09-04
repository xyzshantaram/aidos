/**
 * Ambient types for the slice of @deepseek-ai/dsh-client-ui-primitives the
 * client bundle imports.
 *
 * The package is NOT installed in this repo's node_modules -- it cannot be,
 * because the real implementation lives inside the shell's frontend bundle.
 * The client build marks every @deepseek-ai/* import external, and at load
 * time the shell's module table hands the bundle the real module (verified
 * in dsh-web-frontend's boot: staticModules maps this exact specifier to the
 * frozen primitives namespace, IconChevronDownOutline14 included). The
 * dotfiles-ai plugins import it through the same seam.
 *
 * Only what is actually imported is declared; widening it invites importing
 * something the type file guessed wrong.
 */
declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ReactElement } from "react";

  export function IconChevronDownOutline14(props: {
    className?: string;
    "aria-hidden"?: boolean;
  }): ReactElement;
}
