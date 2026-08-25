/**
 * Ticket U2c: the collapsible comments section. Newest first. A textarea at
 * the bottom sends through userAddComment; Enter inserts a newline and
 * Ctrl+Enter sends.
 */

import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import type { CommentRecord } from "../kernel/types";

export interface CommentsSectionProps {
  ticketId: number;
  comments: CommentRecord[];
  agentId: string;
}

const EMPTY_COMMENTS: CommentRecord[] = [];

export function CommentsSection(props: CommentsSectionProps) {
  const comments = props.comments ?? EMPTY_COMMENTS;
  // Collapse only the single-comment case. Zero comments (a new ticket) and
  // two or more stay expanded so the composer stays visible.
  const [collapsed, setCollapsed] = react.useState(comments.length === 1);
  const [draft, setDraft] = react.useState("");
  const [sending, setSending] = react.useState(false);

  const newestFirst = [...comments].sort((a, b) => b.at - a.at);

  async function send() {
    if (sending) return;
    if (draft.trim() === "") return;
    setSending(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: draft },
        props.agentId,
      );
      setDraft("");
      showToast("Comment added", "success");
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSending(false);
    }
  }

  const rows = newestFirst.map((comment, index) => {
    const time = new Date(comment.at * 1000).toLocaleString();
    return (
      <div className="aidos-comment" key={index}>
        <div>
          <span className="aidos-evidence-author">{comment.author}</span>
        </div>
        <p className="aidos-detail-body">{comment.text}</p>
        <p className="aidos-detail-note">{time}</p>
      </div>
    );
  });

  return (
    <div className="aidos-comments-section">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Comments</h4>
        <button
          className="aidos-btn aidos-toggle-btn"
          onClick={() => {
            setCollapsed(!collapsed);
          }}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {collapsed ? null : (
        <>
          {rows.length === 0 ? (
            <p className="aidos-detail-note">No comments yet.</p>
          ) : (
            rows
          )}
          <textarea
            className="aidos-comment-textarea"
            value={draft}
            placeholder="Add a comment. Ctrl+Enter sends."
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === "Enter") {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="aidos-comment-send"
            disabled={sending || draft.trim() === ""}
            onClick={send}
          >
            Send
          </button>
        </>
      )}
    </div>
  );
}
