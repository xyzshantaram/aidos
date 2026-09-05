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

  /*
   * The shell's own card renders this exact component beside the word
   * "Inspect" (dsh-client-ui-tool's client bundle), so aidos's inspect
   * affordance uses it rather than a redraw.
   *
   * Declared only after checking it is in the SAME frozen namespace the
   * chevron comes from -- both appear as `Name:binding` entries of one
   * object literal in dsh-web-frontend's bundle, 572 bytes apart. A name
   * merely USED inside the shell would not be importable through this
   * specifier, and this file's whole risk is declaring something the shell
   * does not actually hand over.
   */
  export function IconInspectOutline12(props?: {
    className?: string;
    "aria-hidden"?: boolean;
  }): ReactElement;
}
