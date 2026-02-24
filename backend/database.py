"""SQLite database for upload history tracking."""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "po_history.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the uploads table if it doesn't exist."""
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
    conn.commit()
    conn.close()


def save_upload(filename: str, parsed_data: dict) -> int:
    """Save a parsed upload and return the new record ID."""
    conn = get_connection()
    cur = conn.execute(
        "INSERT INTO uploads (filename, upload_date, parsed_data) VALUES (?, ?, ?)",
        (filename, datetime.now().isoformat(), json.dumps(parsed_data)),
    )
    conn.commit()
    upload_id = cur.lastrowid
    conn.close()
    return upload_id


def get_all_uploads() -> list[dict]:
    """Return all upload records (without full parsed data)."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, filename, upload_date FROM uploads ORDER BY upload_date DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_upload(upload_id: int) -> dict | None:
    """Return a single upload with full parsed data."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, filename, upload_date, parsed_data FROM uploads WHERE id = ?",
        (upload_id,),
    ).fetchone()
    conn.close()
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
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


# Auto-initialize on import
init_db()
