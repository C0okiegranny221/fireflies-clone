"""
Seed the database with a default user, channels and realistic meetings.

    python -m app.seed.seed            # reset the database and seed it
    python -m app.seed.seed --if-empty # seed only when there are no users (used on deploy)
"""

import argparse
import json
from datetime import datetime, time, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers all tables)
from app.db import Base, SessionLocal, engine
from app.models import Channel, MeetingSource, SummarySource, User
from app.models.base import utcnow
from app.services import meeting_service as svc
from app.services.summarizer import ActionItemDraft, ChapterDraft, SummaryDraft
from app.services.transcript_parser import MS_PER_WORD, ParsedSegment

DATA_DIR = Path(__file__).parent / "data"
CHANNELS = ["Engineering", "Sales", "Hiring", "Product"]
CURRENT_USER = {"name": "Alex Rivera", "email": "alex@nimbus.io", "avatar_color": "#7C5CFC"}


def _ms(clock: str) -> int:
    minutes, seconds = clock.split(":")
    return (int(minutes) * 60 + int(seconds)) * 1000


def _segments(rows: list[list[str]]) -> list[ParsedSegment]:
    """Each segment runs until the next one starts; the last runs for its estimated length."""
    segments = [ParsedSegment(speaker, text, _ms(start)) for start, speaker, text in rows]
    for seg, nxt in zip(segments, [*segments[1:], None], strict=True):
        assert seg.start_ms is not None
        seg.end_ms = nxt.start_ms if nxt else seg.start_ms + len(seg.text.split()) * MS_PER_WORD
    return segments


def _summary(data: dict) -> SummaryDraft:
    s = data["summary"]
    return SummaryDraft(
        overview=s["overview"],
        keywords=s["keywords"],
        chapters=[ChapterDraft(c["title"], _ms(c["start"]), c["bullets"]) for c in s["chapters"]],
        action_items=[
            ActionItemDraft(a["text"], a["assignee"], _ms(a["at"])) for a in data["action_items"]
        ],
        source=SummarySource.SEED,
    )


def seed(db: Session) -> None:
    user = User(**CURRENT_USER, is_current=True)
    db.add(user)
    channels = {name: Channel(name=name) for name in CHANNELS}
    db.add_all(channels.values())
    db.flush()

    host = svc.get_or_create_participants(db, [user.name])[user.name]
    host.email, host.user_id, host.color = user.email, user.id, user.avatar_color

    # Register participants with emails up front so they're reused across meetings.
    files = sorted(DATA_DIR.glob("*.json"))
    meetings_data = [json.loads(f.read_text()) for f in files]
    for data in meetings_data:
        for person in data["participants"]:
            participant = svc.get_or_create_participants(db, [person["name"]])[person["name"]]
            participant.email = participant.email or person["email"]

    today = utcnow().date()
    for data in meetings_data:
        hour, minute = map(int, data["time"].split(":"))
        started_at = datetime.combine(today - timedelta(days=data["days_ago"]), time(hour, minute))
        # Keep "today" meetings in the past regardless of when the seed runs.
        started_at = min(started_at, utcnow().replace(second=0, microsecond=0) - timedelta(hours=1))
        segments = _segments(data["segments"])
        meeting = svc.create_meeting(
            db,
            svc.NewMeeting(
                title=data["title"],
                host=user,
                started_at=started_at,
                source=MeetingSource(data["source"]),
                participants=tuple(p["name"] for p in data["participants"]),
                segments=tuple(segments),
                channel_id=channels[data["channel"]].id if data["channel"] else None,
                tags=tuple(data["tags"]),
                summary=_summary(data),
            ),
        )
        for item, spec in zip(meeting.action_items, data["action_items"], strict=True):
            item.is_completed = spec.get("done", False)
    db.commit()


def reset_and_seed() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)


def seed_if_empty() -> bool:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(User.id).limit(1)) is not None:
            return False
        seed(db)
        return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--if-empty", action="store_true", help="Only seed an empty database")
    args = parser.parse_args()
    if args.if_empty:
        print("Seeded." if seed_if_empty() else "Database already has data; skipped.")
    else:
        reset_and_seed()
        print(f"Seeded {len(list(DATA_DIR.glob('*.json')))} meetings.")
