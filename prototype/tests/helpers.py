"""Shared setup helpers for the tests. No test logic here."""

from aidos_proto.store import Store

DEFAULT_KINDS = [
    ("builtin:user_signoff", "User signoff", "The human confirms the work.", 1.0),
    ("builtin:eval_criteria", "Evaluation criteria", "The criteria to judge the work.", 1.0),
    ("builtin:file_allowlist", "File allowlist", "The files the change may touch.", 1.0),
    ("builtin:agent_report", "Agent report", "The agent describes the work.", 1.0),
    ("builtin:comment", "Comment", "A remark on the ticket.", 0.5),
    ("builtin:review_pass", "Review pass", "A human review passed.", 1.0),
    ("builtin:after_shot", "After shot", "The state after the work.", 1.0),
]


def make_store(kinds=DEFAULT_KINDS, path=None):
    """Return a fresh store with the given kinds registered.

    A path of None gives an in-memory store. A real path gives a
    file-backed store, which a reopen can read again.
    """
    store = Store(":memory:" if path is None else path)
    for kind_id, label, description, weight in kinds:
        store.register_kind(kind_id, label, description, weight)
    return store


def reopen(store):
    """Close a store and return a fresh one opened on the same path."""
    path = store.path
    if path == ":memory:":
        raise ValueError(
            "cannot reopen an in-memory store: give make_store a file path")
    store.close()
    return Store(path)
