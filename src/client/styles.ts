/**
 * The board stylesheet. One style tag injected once per page load.
 * Class names are kebab-case only and prefixed with "aidos" to avoid
 * collisions with the shell.
 */

/** The data-plugin-css guard value and the tag identity. */
export const STYLE_TAG_ID = "aidos/board.css";

/** The stylesheet text, one rule per array entry. */
export const CSS_TEXT = [
  // root and layout
  ".aidos-root{box-sizing:border-box;display:flex;gap:16px;padding:14px;color:var(--dsw-alias-label-primary);flex:1;min-width:0}",
  ".aidos-sidebar{flex:none;width:260px;display:flex;flex-direction:column;gap:12px;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}",
  ".aidos-layout{display:flex;gap:16px;align-items:flex-start;flex:1;min-width:0}",
  ".aidos-grid-wrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}",
  ".aidos-grid-chrome{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;align-content:start}",
  // buttons
  ".aidos-btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:999px;font-size:12px;line-height:20px;padding:2px 12px}",
  ".aidos-btn:hover{background:var(--dsw-alias-interactive-bg-hover-accent)}",
  ".aidos-btn-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted);border-color:transparent}",
  ".aidos-btn-dot{position:relative}",
  ".aidos-btn-dot::after{content:\"\";position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);border:1px solid var(--dsw-alias-bg-tertiary)}",
  ".aidos-toggle-btn{min-width:0}",
  ".aidos-sidebar-toggle{margin-left:auto}",
  // sections and controls
  ".aidos-panel-section{display:flex;flex-direction:column;gap:8px}",
  ".aidos-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-panel-title{font-size:12px;font-weight:600;margin:0;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:0.5px}",
  ".aidos-check-list{display:flex;flex-direction:column;gap:4px}",
  ".aidos-check-row{display:flex;align-items:center;gap:6px;font-size:12px;line-height:18px;cursor:pointer}",
  ".aidos-check-row input{cursor:pointer}",
  ".aidos-check-count{color:var(--dsw-alias-label-tertiary)}",
  ".aidos-sort-row{display:flex;align-items:center;gap:6px}",
  ".aidos-sort-row select{flex:1;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 4px}",
  ".aidos-actions-row{display:flex;gap:8px;flex-wrap:wrap}",
  // search and autocomplete
  ".aidos-search-box{position:relative}",
  ".aidos-search-input{box-sizing:border-box;width:100%;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px}",
  ".aidos-autocomplete{position:absolute;z-index:20;top:calc(100% + 2px);left:0;right:0;max-height:220px;overflow:auto;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 6px 20px var(--dsw-alias-bg-mask-drop)}",
  ".aidos-suggestion{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:none;border:none;padding:6px 8px;cursor:pointer}",
  ".aidos-suggestion:hover{background:var(--dsw-alias-interactive-bg-hover)}",
  ".aidos-suggestion-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".aidos-ticket-id-badge{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 6px}",
  // the ticket tile
  ".aidos-tile{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;aspect-ratio:1/1;padding:12px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;cursor:pointer;min-width:0;text-align:left}",
  ".aidos-tile:hover{border-color:var(--dsw-alias-border-l4)}",
  ".aidos-tile-selected{border:2px solid var(--dsw-alias-brand-primary);padding:11px}",
  ".aidos-tile-title{font-size:13px;font-weight:600;line-height:18px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".aidos-tile-meta{display:flex;align-items:center;justify-content:space-between;gap:6px}",
  ".aidos-tile-gate{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary)}",
  // the confidence ring
  ".aidos-ring-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}",
  ".aidos-ring{width:64px;height:64px}",
  ".aidos-ring-percent{font-size:13px;font-weight:700;fill:var(--dsw-alias-label-primary)}",
  ".aidos-ring-asterisk{font-size:10px;fill:var(--dsw-alias-state-warn-primary)}",
  ".aidos-ring-na{font-size:11px;fill:var(--dsw-alias-label-tertiary)}",
  // the state badge
  ".aidos-state-badge{flex:none;font-size:10px;line-height:14px;border-radius:999px;padding:0 8px;white-space:nowrap}",
  ".aidos-state-open{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2)}",
  ".aidos-state-in-progress{color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary);border:1px solid var(--dsw-alias-state-warn-secondary)}",
  ".aidos-state-awaiting-verification{color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);border:1px solid var(--dsw-alias-state-business-primary)}",
  ".aidos-state-done{color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary);border:1px solid var(--dsw-alias-state-success-secondary)}",
  // placeholder evidence chips
  ".aidos-evidence-row{display:flex;gap:6px;flex-wrap:wrap}",
  ".aidos-evidence-tag{font-size:10px;line-height:14px;border:1px solid;border-radius:999px;padding:0 8px}",
  // detail panel: fields, criteria, evidence
  ".aidos-detail-note{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);margin:0}",
  ".aidos-evidence-tags{display:flex;gap:6px;flex-wrap:wrap}",
  ".aidos-criterion{display:flex;flex-direction:column;gap:4px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}",
  ".aidos-criterion-uncovered{background:var(--dsw-alias-bg-warn-soft);opacity:0.7}",
  ".aidos-criterion-ungrouped{border-style:dashed}",
  ".aidos-criterion-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-criterion-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}",
  ".aidos-criterion-count{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary)}",
  ".aidos-evidence-row-item{display:flex;gap:6px;align-items:baseline;font-size:11px;line-height:16px}",
  ".aidos-evidence-kind{font-weight:600;color:var(--dsw-alias-label-primary)}",
  ".aidos-evidence-author{color:var(--dsw-alias-label-tertiary)}",
  ".aidos-evidence-meta{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".aidos-evidence-body{display:flex;flex-direction:column;gap:6px}",
  ".aidos-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;text-align:center;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l3);border-radius:12px}",
  ".aidos-empty-title{font-size:14px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary)}",
  ".aidos-empty-note{font-size:12px;line-height:18px;margin:0;color:var(--dsw-alias-label-secondary)}",
  ".aidos-error{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 16px;color:var(--dsw-alias-state-error-primary);border:1px solid var(--dsw-alias-state-error-secondary);border-radius:12px;font-size:12px;line-height:18px}",
  // skeleton tiles
  ".aidos-skeleton-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}",
  ".aidos-skeleton-tile{aspect-ratio:1/1;border-radius:12px;background:var(--dsw-alias-bg-skeleton)}",
  // the detail side panel
  ".aidos-detail{flex:none;width:300px;display:flex;flex-direction:column;gap:10px;padding:14px;background:var(--dsw-alias-bg-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;align-self:flex-start}",
  ".aidos-detail-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-detail-title{font-size:14px;font-weight:600;line-height:20px;margin:0}",
  ".aidos-detail-close{cursor:pointer;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}",
  ".aidos-detail-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
  // the create modal
  ".aidos-modal-mask{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-drop)}",
  ".aidos-modal{box-sizing:border-box;width:420px;max-width:calc(100vw - 32px);display:flex;flex-direction:column;gap:10px;padding:16px;background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 12px 40px var(--dsw-alias-bg-mask-drop)}",
  ".aidos-modal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".aidos-modal-title{font-size:14px;font-weight:600;margin:0}",
  ".aidos-modal-close{cursor:pointer;border:none;background:none;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:16px;padding:0}",
  ".aidos-modal-body{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
  // the toast
  ".aidos-toast{position:fixed;z-index:200;left:50%;bottom:32px;transform:translateX(-50%);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 14px;box-shadow:0 8px 24px var(--dsw-alias-bg-mask-drop)}",
].join("");

/** Inject the style tag once. The data-plugin-css guard prevents duplicates. */
export function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-plugin-css=\"" + STYLE_TAG_ID + "\"]") !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "aidos";
  tag.dataset.pluginCss = STYLE_TAG_ID;
  tag.textContent = CSS_TEXT;
  document.head.appendChild(tag);
}
