"""Global search: meetings by title/people/topics, and transcript lines via FTS5."""

import re
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import String, cast, or_, select, text
from sqlalchemy.orm import Session

from app.models import Meeting, MeetingParticipant, Participant, Summary

MAX_TERMS = 8
# Markers FTS5's snippet() wraps around matches; the frontend renders them as highlights.
HIGHLIGHT_OPEN, HIGHLIGHT_CLOSE = "[[", "]]"


@dataclass
class TranscriptHit:
    segment_id: int
    start_ms: int
    speaker: str
    snippet: str


@dataclass
class MeetingResult:
    id: int
    title: str
    started_at: datetime
    duration_sec: int
    matched_meeting: bool = False
    hits: list[TranscriptHit] = field(default_factory=list)


def to_fts_query(query: str) -> str | None:
    """User text → safe FTS5 query: every word must appear, each as a prefix match."""
    words = re.findall(r"\w+", query.lower())[:MAX_TERMS]
    return " ".join(f'"{w}"*' for w in words) or None


def search(db: Session, query: str, limit: int = 50) -> list[MeetingResult]:
    """Meetings ordered by best transcript match, then meetings matching only by metadata."""
    results: dict[int, MeetingResult] = {}

    fts = to_fts_query(query)
    if fts:
        rows = db.execute(
            text(
                """
                SELECT s.id, s.meeting_id, s.start_ms, p.name,
                       snippet(transcript_fts, 0, :open, :close, '…', 14)
                FROM transcript_fts
                JOIN transcript_segments s ON s.id = transcript_fts.rowid
                JOIN participants p ON p.id = s.participant_id
                WHERE transcript_fts MATCH :q
                ORDER BY bm25(transcript_fts)
                LIMIT :limit
                """
            ),
            {"q": fts, "open": HIGHLIGHT_OPEN, "close": HIGHLIGHT_CLOSE, "limit": limit},
        ).all()
        meetings = _meetings_by_id(db, {r[1] for r in rows})
        for seg_id, meeting_id, start_ms, speaker, snippet in rows:
            result = results.get(meeting_id) or _result(meetings[meeting_id])
            result.hits.append(TranscriptHit(seg_id, start_ms, speaker, snippet))
            results[meeting_id] = result
        for result in results.values():
            result.hits.sort(key=lambda h: h.start_ms)

    like = f"%{query.strip()}%"
    metadata_matches = db.scalars(
        select(Meeting)
        .outerjoin(Summary)
        .where(
            or_(
                Meeting.title.ilike(like),
                # keywords is a JSON array stored as text in SQLite.
                cast(Summary.keywords, String).ilike(like),
                Meeting.id.in_(
                    select(MeetingParticipant.meeting_id)
                    .join(Participant)
                    .where(Participant.name.ilike(like))
                ),
            )
        )
        .order_by(Meeting.started_at.desc())
    ).all()
    for meeting in metadata_matches:
        result = results.setdefault(meeting.id, _result(meeting))
        result.matched_meeting = True

    return list(results.values())


def _meetings_by_id(db: Session, ids: set[int]) -> dict[int, Meeting]:
    if not ids:
        return {}
    return {m.id: m for m in db.scalars(select(Meeting).where(Meeting.id.in_(ids)))}


def _result(m: Meeting) -> MeetingResult:
    return MeetingResult(m.id, m.title, m.started_at, m.duration_sec)
