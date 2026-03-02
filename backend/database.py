"""SQLite database for upload history tracking.
   Optimized with WAL mode, connection pooling, and proper indexing."""

import sqlite3
import json
import os
import threading
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "po_history.db")

# Thread-local storage for connection reuse
_local = threading.local()


def get_connection() -> sqlite3.Connection:
    """Get or create a thread-local database connection with WAL mode."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for concurrent read/write performance
        conn.execute("PRAGMA journal_mode=WAL")
        # Increase cache size for faster queries (2MB)
        conn.execute("PRAGMA cache_size=-2000")
        # Synchronous NORMAL is safe with WAL and faster than FULL
        conn.execute("PRAGMA synchronous=NORMAL")
        _local.conn = conn
    return conn


def init_db():
    """Create the uploads table if it doesn't exist, with proper indexing."""
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            upload_date TEXT NOT NULL,
            parsed_data TEXT NOT NULL
        )
        """
    )
    # Index for faster history queries (sorted by upload_date DESC)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_uploads_date ON uploads (upload_date DESC)"
    )
    conn.commit()


def save_upload(filename: str, parsed_data: dict) -> int:
    """Save a parsed upload and return the new record ID."""
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO uploads (filename, upload_date, parsed_data) VALUES (?, ?, ?)",
        (filename, datetime.now().isoformat(), json.dumps(parsed_data, separators=(',', ':'))),
    )
    conn.commit()
    return cur.lastrowid


def get_all_uploads() -> list[dict]:
    """Return all upload records (without full parsed data)."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, filename, upload_date FROM uploads ORDER BY upload_date DESC"
    ).fetchall()
    return [dict(r) for r in rows]


def get_upload(upload_id: int) -> dict | None:
    """Return a single upload with full parsed data."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, filename, upload_date, parsed_data FROM uploads WHERE id = ?",
        (upload_id,),
    ).fetchone()
    if row is None:
        return None
    result = dict(row)
    result["parsed_data"] = json.loads(result["parsed_data"])
    return result


def delete_upload(upload_id: int) -> bool:
    """Delete an upload record. Returns True if a row was deleted."""
    conn = get_connection()
    cur = conn.execute("DELETE FROM uploads WHERE id = ?", (upload_id,))
    conn.commit()
    return cur.rowcount > 0


# Auto-initialize on import
init_db()
