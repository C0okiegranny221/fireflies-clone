"""
SQLite FTS5 full-text index over transcript text, used by global search.

`transcript_fts` is an external-content table: it stores only the index and reads text
from transcript_segments. Triggers keep it in sync on insert/update/delete, including the
deletes cascaded from a deleted meeting.
"""

from sqlalchemy import Engine, text

_STATEMENTS = [
    """CREATE VIRTUAL TABLE IF NOT EXISTS transcript_fts USING fts5(
        text, content='transcript_segments', content_rowid='id',
        tokenize='porter unicode61'
    )""",
    """CREATE TRIGGER IF NOT EXISTS transcript_fts_ai AFTER INSERT ON transcript_segments BEGIN
        INSERT INTO transcript_fts(rowid, text) VALUES (new.id, new.text);
    END""",
    """CREATE TRIGGER IF NOT EXISTS transcript_fts_ad AFTER DELETE ON transcript_segments BEGIN
        INSERT INTO transcript_fts(transcript_fts, rowid, text) VALUES ('delete', old.id, old.text);
    END""",
    """CREATE TRIGGER IF NOT EXISTS transcript_fts_au AFTER UPDATE OF text ON transcript_segments
    BEGIN
        INSERT INTO transcript_fts(transcript_fts, rowid, text) VALUES ('delete', old.id, old.text);
        INSERT INTO transcript_fts(rowid, text) VALUES (new.id, new.text);
    END""",
]


def ensure_search_index(engine: Engine) -> None:
    """Create the index and triggers if missing; backfill when the index is new."""
    with engine.begin() as conn:
        existed = conn.execute(
            text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='transcript_fts'")
        ).first()
        for statement in _STATEMENTS:
            conn.execute(text(statement))
        if not existed:
            conn.execute(text("INSERT INTO transcript_fts(transcript_fts) VALUES ('rebuild')"))


def drop_search_index(engine: Engine) -> None:
    """Drop the index (its triggers go with transcript_segments when that table is dropped)."""
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS transcript_fts"))
