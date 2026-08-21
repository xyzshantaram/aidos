#!/usr/bin/env python3
"""
Repair aidos session logs: stamp `ignorable: true` onto aidos-typed events.

The dsh host reader refuses a session log containing an event type outside
its baked KNOWN_SESSION_EVENT_TYPES unless the envelope carries `ignorable`.
aidos appended its domain events (project/created, ticket/change, ...) without
that marker, so every session that received one fails to load. This rewrites
the stored logs so those aidos-typed events are marked ignorable. DSH's own
event types are already known and must be left untouched.

Each session file is /home/sid/.dsh/sessions/<workspace>/<session>/session.jsonl.zstd
(zstd-compressed JSONL: line 1 is the {"type":"session",...} header, then one
event per line). For every event whose `type` is in the 8 aidos types, we
insert `"ignorable":true` as the second key, preserving every other byte.
Non-aidos lines and the header are untouched byte-for-byte.

Back up the whole sessions tree before running (the brief does this to a
timestamped sibling).

Usage:
  fix-aidos-sessions.py --dry-run [ROOT]   # report files that need changes
  fix-aidos-sessions.py [ROOT]             # rewrite in place
Default ROOT: /home/sid/.dsh/sessions
"""
import json
import os
import subprocess
import sys
import tempfile

AIDOS_TYPES = {
    "ticket/change",
    "evidence/attached",
    "plan/change",
    "comment/added",
    "aidos/refusal",
    "project/created",
    "project/moved",
    "phase/set",
}

ROOT = "/home/sid/.dsh/sessions"
ZSTD = "/usr/bin/zstd"


def decompress(path: str) -> bytes:
    out = subprocess.run([ZSTD, "-d", "-c", path], check=True, capture_output=True)
    return out.stdout


def compress_frame(data: bytes) -> bytes:
    """Compress one independently decodable Zstandard frame.

    The dsh JSONL backend requires the on-disk artifact to be a
    concatenation of independent Zstandard frames: frame 1 holds only the
    header line, and each following frame holds one durable append batch.
    `readFirstZstdLine` decompresses only the first structurally complete
    frame and requires it to decode to exactly one newline-terminated line.
    Recompressing the whole rewritten blob as a single frame collapses that
    boundary and breaks every session this script actually changes.
    """
    # -q : quiet; keep default level so the output stays comparable in size.
    out = subprocess.run([ZSTD, "-q", "-c"], input=data, check=True, capture_output=True)
    return out.stdout


def rewrite_line(line: bytes) -> bytes:
    """Return the line with ignorable added, or None if no change needed."""
    text = line.decode("utf-8").rstrip("\n")
    if not text:
        return None
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    typ = obj.get("type")
    if not isinstance(typ, str) or typ not in AIDOS_TYPES:
        return None
    # Idempotent: leave an event that is already marked ignorable untouched.
    if obj.get("ignorable") is True:
        return None
    # Insert `"ignorable":true` immediately after the `"type":"<kind>"` token.
    marker = '"type":"' + typ + '"'
    idx = text.find(marker)
    if idx < 0:
        # Defensive: the parsed type exists but the literal token is not in the
        # text (e.g. escaped). Handle by full re-serialization of this line.
        obj["ignorable"] = True
        return json.dumps(obj, ensure_ascii=False).encode("utf-8") + b"\n"
    insert_at = idx + len(marker)
    new_text = text[:insert_at] + ',"ignorable":true' + text[insert_at:]
    return new_text.encode("utf-8") + b"\n"


def process_file(path: str, dry_run: bool) -> int:
    raw = decompress(path)
    lines = raw.split(b"\n")
    # Drop the trailing empty element from the final newline, if present.
    if lines and lines[-1] == b"":
        lines = lines[:-1]
    changed = 0
    out_lines = []
    for line in lines:
        new_line = rewrite_line(line)
        if new_line is not None:
            changed += 1
            out_lines.append(new_line)
        else:
            out_lines.append(line + b"\n")
    if changed == 0:
        return 0
    if dry_run:
        print(f"{path}: {changed} aidos event(s) to mark")
        return changed
    # The on-disk artifact must stay a concatenation of independent
    # Zstandard frames: frame 1 holds only the header line, so
    # `readFirstZstdLine` can validate it without decoding the rest of the
    # log. Compress the header alone into frame 1, and every event line
    # into a second frame, then concatenate. This does not reproduce the
    # backend's original per-append-batch frame boundaries, but the reader
    # does not require that: only the header frame's shape is checked.
    header_line = out_lines[0]
    event_lines = out_lines[1:]
    new_raw = compress_frame(header_line) + compress_frame(b"".join(event_lines))
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(new_raw)
        os.replace(tmp, path)
    finally:

        if os.path.exists(tmp):
            os.unlink(tmp)
    print(f"{path}: marked {changed} aidos event(s)")
    return changed


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    root = args[0] if args else ROOT
    dry_run = "--dry-run" in sys.argv
    total = 0
    files = 0
    for dirpath, _dirnames, filenames in os.walk(root):
        for name in filenames:
            if name != "session.jsonl.zstd":
                continue
            path = os.path.join(dirpath, name)
            n = process_file(path, dry_run)
            if n:
                files += 1
                total += n
    print(f"--- {files} file(s), {total} aidos event(s) {'to mark' if dry_run else 'marked'} ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
