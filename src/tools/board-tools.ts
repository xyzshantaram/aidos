/** Shared board-tool list so guard and mask cannot drift (M8). Single source. */
export const BOARD_TOOLS = [
  "get_tickets",
  "set_ticket",
  "attach_evidence",
  "move_ticket",
  "plan",
  "plan_import",
] as const;
