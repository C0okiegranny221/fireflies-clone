"""Domain logic for meetings: creation from transcripts, participants, summaries, queries."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingParticipant,
    MeetingSource,
    Participant,
    ParticipantRole,
    Summary,
    Tag,
    TranscriptSegment,
    User,
)
from app.models.base import utcnow
from app.services.llm import LLMClient
from app.services.summarizer import SummaryDraft, summarize
from app.services.transcript_parser import ParsedSegment

# Avatar colors in the spirit of Fireflies' speaker palette.
SPEAKER_COLORS = [
    "#7C5CFC", "#F25C54", "#2BB673", "#F7A928", "#1E9BF0",
    "#E05BC7", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
]  # fmt: skip


class NotFoundError(Exception):
    pass


def get_current_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.is_current.is_(True)))
    if user is None:
        raise NotFoundError("No current user; run the seed script")
    return user


# ------------------------------------------------------------------ participants


def get_or_create_participants(db: Session, names: list[str]) -> dict[str, Participant]:
    """Resolve names to participants case-insensitively, creating any that are new."""
    wanted = list(dict.fromkeys(n.strip() for n in names if n.strip()))
    if not wanted:
        return {}
    existing = db.scalars(
        select(Participant).where(func.lower(Participant.name).in_([n.lower() for n in wanted]))
    ).all()
    by_lower = {p.name.lower(): p for p in existing}
    count = db.scalar(select(func.count(Participant.id))) or 0

    result: dict[str, Participant] = {}
    for name in wanted:
        participant = by_lower.get(name.lower())
        if participant is None:
            participant = Participant(name=name, color=SPEAKER_COLORS[count % len(SPEAKER_COLORS)])
            db.add(participant)
            by_lower[name.lower()] = participant
            count += 1
        result[name] = participant
    db.flush()
    return result


def set_participants(db: Session, meeting: Meeting, names: list[str]) -> None:
    """Replace the attendee list, keeping stats for people who stay and anyone who spoke."""
    people = get_or_create_participants(db, names)
    speaker_ids = {s.participant_id for s in meeting.segments}
    current = {link.participant_id: link for link in meeting.participant_links}
    keep_ids = [p.id for p in people.values()] + [
        pid for pid in current if pid in speaker_ids and pid not in {p.id for p in people.values()}
    ]

    meeting.participant_links = [
        current.get(pid) or MeetingParticipant(participant_id=pid) for pid in keep_ids
    ]
    for position, link in enumerate(meeting.participant_links):
        link.position = position


def recompute_talk_time(meeting: Meeting) -> None:
    talk_ms: dict[int, int] = defaultdict(int)
    for seg in meeting.segments:
        talk_ms[seg.participant_id] += max(0, seg.end_ms - seg.start_ms)
    for link in meeting.participant_links:
        link.talk_time_sec = round(talk_ms.get(link.participant_id, 0) / 1000)


# -------------------------------------------------------------------------- tags


def get_or_create_tags(db: Session, names: list[str]) -> list[Tag]:
    wanted = list(dict.fromkeys(n.strip().lower() for n in names if n.strip()))
    if not wanted:
        return []
    existing = {t.name: t for t in db.scalars(select(Tag).where(Tag.name.in_(wanted)))}
    tags = []
    for name in wanted:
        if name not in existing:
            existing[name] = Tag(name=name)
            db.add(existing[name])
        tags.append(existing[name])
    return tags


# ---------------------------------------------------------------------- creation


@dataclass
class NewMeeting:
    title: str
    host: User
    started_at: datetime | None = None
    duration_sec: int | None = None
    source: MeetingSource = MeetingSource.MANUAL
    participants: tuple[str, ...] = ()
    segments: tuple[ParsedSegment, ...] = ()
    channel_id: int | None = None
    tags: tuple[str, ...] = ()
    media_url: str | None = None
    # Pre-written notes (seed data). When None, notes are generated from the transcript.
    summary: SummaryDraft | None = None


def create_meeting(db: Session, data: NewMeeting, llm: LLMClient | None = None) -> Meeting:
    speakers = [s.speaker for s in data.segments]
    people = get_or_create_participants(db, [data.host.name, *data.participants, *speakers])
    host_participant = people[data.host.name]
    if host_participant.user_id is None:
        host_participant.user_id = data.host.id

    last_end_ms = max((s.end_ms or 0 for s in data.segments), default=0)
    meeting = Meeting(
        title=data.title.strip(),
        host_id=data.host.id,
        started_at=data.started_at or utcnow(),
        duration_sec=data.duration_sec if data.duration_sec is not None else last_end_ms // 1000,
        source=data.source,
        channel_id=data.channel_id,
        media_url=data.media_url,
        tags=get_or_create_tags(db, list(data.tags)),
    )
    meeting.participant_links = [
        MeetingParticipant(
            participant_id=p.id,
            role=ParticipantRole.HOST if p is host_participant else ParticipantRole.ATTENDEE,
            position=i,
        )
        for i, p in enumerate(people.values())
    ]
    meeting.segments = [
        TranscriptSegment(
            participant_id=people[s.speaker].id,
            start_ms=s.start_ms or 0,
            end_ms=s.end_ms or s.start_ms or 0,
            text=s.text,
        )
        for s in data.segments
    ]
    recompute_talk_time(meeting)
    db.add(meeting)
    db.flush()

    draft = data.summary
    if draft is None and data.segments:
        draft = summarize(meeting.title, list(data.segments), llm)
    if draft is not None:
        apply_summary(db, meeting, draft, include_action_items=True)
    return meeting


def apply_summary(
    db: Session, meeting: Meeting, draft: SummaryDraft, *, include_action_items: bool
) -> Summary:
    """Write (or replace) the meeting's notes. Action items are only added on first creation
    so that regenerating notes never discards tasks the user has edited or completed."""
    summary = meeting.summary or Summary(meeting_id=meeting.id, generated_by=draft.source)
    summary.overview = draft.overview
    summary.keywords = draft.keywords
    summary.generated_by = draft.source
    summary.model = draft.model
    summary.updated_at = utcnow()
    summary.chapters = [
        Chapter(title=c.title, start_ms=c.start_ms, bullets=c.bullets, position=i)
        for i, c in enumerate(draft.chapters)
    ]
    meeting.summary = summary

    if include_action_items and draft.action_items:
        assignees = get_or_create_participants(
            db, [a.assignee for a in draft.action_items if a.assignee]
        )
        start = len(meeting.action_items)
        meeting.action_items.extend(
            ActionItem(
                text=a.text,
                assignee_id=assignees[a.assignee].id if a.assignee else None,
                start_ms=a.start_ms,
                position=start + i,
            )
            for i, a in enumerate(draft.action_items)
        )
    db.flush()
    return summary


def regenerate_summary(db: Session, meeting: Meeting, llm: LLMClient | None = None) -> Summary:
    segments = [
        ParsedSegment(s.speaker.name, s.text, s.start_ms, s.end_ms) for s in meeting.segments
    ]
    if not segments:
        raise ValueError("Meeting has no transcript to summarize")
    draft = summarize(meeting.title, segments, llm)
    return apply_summary(db, meeting, draft, include_action_items=False)


# ----------------------------------------------------------------------- queries

SORTS = {
    "-started_at": Meeting.started_at.desc(),
    "started_at": Meeting.started_at.asc(),
    "title": Meeting.title.asc(),
    "-duration": Meeting.duration_sec.desc(),
    "duration": Meeting.duration_sec.asc(),
}


@dataclass
class MeetingFilters:
    q: str | None = None
    participant_ids: tuple[int, ...] = ()
    date_from: date | None = None
    date_to: date | None = None
    min_duration_min: int | None = None
    max_duration_min: int | None = None
    channel_id: int | None = None
    tag: str | None = None
    source: MeetingSource | None = None
    host_id: int | None = None


def _filtered(filters: MeetingFilters) -> Select[tuple[Meeting]]:
    stmt = select(Meeting)
    if filters.q:
        like = f"%{filters.q.strip()}%"
        participant_match = (
            select(MeetingParticipant.meeting_id)
            .join(Participant)
            .where(or_(Participant.name.ilike(like), Participant.email.ilike(like)))
        )
        stmt = stmt.where(or_(Meeting.title.ilike(like), Meeting.id.in_(participant_match)))
    for pid in filters.participant_ids:
        # Meetings must include *every* selected participant.
        stmt = stmt.where(
            Meeting.id.in_(
                select(MeetingParticipant.meeting_id).where(
                    MeetingParticipant.participant_id == pid
                )
            )
        )
    if filters.date_from:
        stmt = stmt.where(Meeting.started_at >= datetime.combine(filters.date_from, time.min))
    if filters.date_to:
        next_day = datetime.combine(filters.date_to + timedelta(days=1), time.min)
        stmt = stmt.where(Meeting.started_at < next_day)
    if filters.min_duration_min is not None:
        stmt = stmt.where(Meeting.duration_sec >= filters.min_duration_min * 60)
    if filters.max_duration_min is not None:
        stmt = stmt.where(Meeting.duration_sec <= filters.max_duration_min * 60)
    if filters.channel_id is not None:
        stmt = stmt.where(Meeting.channel_id == filters.channel_id)
    if filters.tag:
        stmt = stmt.where(Meeting.tags.any(Tag.name == filters.tag.lower()))
    if filters.source:
        stmt = stmt.where(Meeting.source == filters.source)
    if filters.host_id is not None:
        stmt = stmt.where(Meeting.host_id == filters.host_id)
    return stmt


def list_meetings(
    db: Session, filters: MeetingFilters, sort: str, page: int, page_size: int
) -> tuple[list[Meeting], int]:
    base = _filtered(filters)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    meetings = db.scalars(
        base.options(
            selectinload(Meeting.host),
            selectinload(Meeting.channel),
            selectinload(Meeting.tags),
            selectinload(Meeting.summary),
            selectinload(Meeting.participant_links).selectinload(MeetingParticipant.participant),
        )
        .order_by(SORTS.get(sort, SORTS["-started_at"]), Meeting.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return list(meetings), total


def action_item_counts(db: Session, meeting_ids: list[int]) -> dict[int, int]:
    if not meeting_ids:
        return {}
    rows = db.execute(
        select(ActionItem.meeting_id, func.count(ActionItem.id))
        .where(ActionItem.meeting_id.in_(meeting_ids))
        .group_by(ActionItem.meeting_id)
    ).all()
    return dict(rows)


def get_meeting(db: Session, meeting_id: int) -> Meeting:
    meeting = db.scalar(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.host),
            selectinload(Meeting.channel),
            selectinload(Meeting.tags),
            selectinload(Meeting.summary).selectinload(Summary.chapters),
            selectinload(Meeting.participant_links).selectinload(MeetingParticipant.participant),
            selectinload(Meeting.action_items).selectinload(ActionItem.assignee),
        )
    )
    if meeting is None:
        raise NotFoundError(f"Meeting {meeting_id} not found")
    return meeting
