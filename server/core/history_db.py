"""SQLite-backed persistent history for download tasks."""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "history.db"
_lock = threading.Lock()
_conn: Optional[sqlite3.Connection] = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(str(_DB_PATH), timeout=5, check_same_thread=False)
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA busy_timeout=3000")
        _conn.row_factory = sqlite3.Row
    return _conn


def init_db() -> None:
    """Create the tasks table if it doesn't exist."""
    conn = _get_conn()
    with _lock:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                task_id   TEXT PRIMARY KEY,
                platform  TEXT NOT NULL,
                mode      TEXT NOT NULL,
                url       TEXT NOT NULL DEFAULT '',
                status    TEXT NOT NULL DEFAULT 'complete',
                message   TEXT NOT NULL DEFAULT '',
                files     TEXT NOT NULL DEFAULT '[]',
                options   TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_tasks_created
            ON tasks(created_at DESC)
        """)
        conn.commit()


def save_task(
    task_id: str,
    platform: str,
    mode: str,
    url: str,
    status: str,
    message: str = "",
    files: Optional[list[str]] = None,
    options: Optional[dict[str, Any]] = None,
    created_at: Optional[str] = None,
) -> None:
    """Insert or replace a finished task into the database."""
    conn = _get_conn()
    with _lock:
        conn.execute(
            """INSERT OR REPLACE INTO tasks
               (task_id, platform, mode, url, status, message, files, options, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                task_id,
                platform,
                mode,
                url,
                status,
                message,
                json.dumps(files or [], ensure_ascii=False),
                json.dumps(options or {}, ensure_ascii=False),
                created_at or datetime.now().isoformat(),
            ),
        )
        conn.commit()


def get_all_tasks(limit: int = 200) -> list[dict[str, Any]]:
    """Return all tasks, newest first."""
    conn = _get_conn()
    with _lock:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_tasks_by_platform(platform: str, limit: int = 100) -> list[dict[str, Any]]:
    """Return tasks for a specific platform."""
    conn = _get_conn()
    with _lock:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE platform = ? ORDER BY created_at DESC LIMIT ?",
            (platform, limit),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def delete_task(task_id: str) -> bool:
    """Delete a task by id. Returns True if deleted."""
    conn = _get_conn()
    with _lock:
        cur = conn.execute("DELETE FROM tasks WHERE task_id = ?", (task_id,))
        conn.commit()
        return cur.rowcount > 0


def clear_all() -> int:
    """Delete all tasks. Returns count deleted."""
    conn = _get_conn()
    with _lock:
        cur = conn.execute("DELETE FROM tasks")
        conn.commit()
        return cur.rowcount


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    try:
        d["files"] = json.loads(d.get("files", "[]"))
    except (json.JSONDecodeError, TypeError):
        d["files"] = []
    try:
        d["options"] = json.loads(d.get("options", "{}"))
    except (json.JSONDecodeError, TypeError):
        d["options"] = {}
    return d
