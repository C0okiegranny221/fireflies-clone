from datetime import date
from pathlib import PurePath
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status

from app.deps import CurrentUser, DbSession, MeetingDep
from app.models import Channel, MeetingSource
from app.schemas.common import Page
from app.schemas.meeting import MeetingCreate, MeetingDetail, MeetingListItem, MeetingUpdate
from app.schemas.summary import SummaryOut
from app.serializers import meeting_detail, meeting_list_item
from app.services import meeting_service as svc
from app.services.transcript_parser import TranscriptParseError, parse_transcript

router = APIRouter(prefix="/meetings", tags=["meetings"])

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_EXTENSIONS = {".txt", ".vtt", ".json"}


@router.get("", response_model=Page[MeetingListItem])
def list_meetings(
    db: DbSession,
    q: str | None = None,
    participant_id: Annotated[list[int] | None, Query()] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    min_duration: Annotated[int | None, Query(ge=0, description="Minutes")] = None,
    max_duration: Annotated[int | None, Query(ge=0, description="Minutes")] = None,
    channel_id: int | None = None,
    tag: str | None = None,
    source: MeetingSource | None = None,
    host_id: int | None = None,
    sort: Annotated[str, Query(pattern="^-?(started_at|title|duration)$")] = "-started_at",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> Page[MeetingListItem]:
    filters = svc.MeetingFilters(
        q=q,
        participant_ids=tuple(participant_id or ()),
        date_from=date_from,
        date_to=date_to,
        min_duration_min=min_duration,
        max_duration_min=max_duration,
        channel_id=channel_id,
        tag=tag,
        source=source,
        host_id=host_id,
    )
    meetings, total = svc.list_meetings(db, filters, sort, page, page_size)
    counts = svc.action_item_counts(db, [m.id for m in meetings])
    return Page(
        items=[meeting_list_item(m, counts.get(m.id, 0)) for m in meetings],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(body: MeetingCreate, db: DbSession, user: CurrentUser) -> MeetingDetail:
    _check_channel(db, body.channel_id)
    segments = []
    if body.transcript_text and body.transcript_text.strip():
        segments = _parse_or_422("pasted.txt", body.transcript_text)
    meeting = svc.create_meeting(
        db,
        svc.NewMeeting(
            title=body.title,
            host=user,
            started_at=body.started_at,
            duration_sec=body.duration_sec,
            source=MeetingSource.MANUAL,
            participants=tuple(body.participants),
            segments=tuple(segments),
            channel_id=body.channel_id,
            tags=tuple(body.tags),
        ),
    )
    db.commit()
    return meeting_detail(svc.get_meeting(db, meeting.id))


@router.post("/upload", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
async def upload_meeting(
    db: DbSession,
    user: CurrentUser,
    file: Annotated[UploadFile, File(description=".txt, .vtt or .json transcript")],
    title: Annotated[str | None, Form()] = None,
    channel_id: Annotated[int | None, Form()] = None,
) -> MeetingDetail:
    filename = file.filename or "transcript.txt"
    if PurePath(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a .txt, .vtt or .json transcript"
        )
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Transcript exceeds 2 MB")
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Transcript must be UTF-8 text"
        ) from exc

    _check_channel(db, channel_id)
    segments = _parse_or_422(filename, content)
    meeting = svc.create_meeting(
        db,
        svc.NewMeeting(
            title=(title or "").strip() or PurePath(filename).stem.replace("_", " ").title(),
            host=user,
            source=MeetingSource.UPLOAD,
            segments=tuple(segments),
            channel_id=channel_id,
        ),
    )
    db.commit()
    return meeting_detail(svc.get_meeting(db, meeting.id))


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting: MeetingDep) -> MeetingDetail:
    return meeting_detail(meeting)


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(body: MeetingUpdate, meeting: MeetingDep, db: DbSession) -> MeetingDetail:
    if body.title is not None:
        meeting.title = body.title.strip()
    if body.participants is not None:
        svc.set_participants(db, meeting, body.participants)
        svc.recompute_talk_time(meeting)
    if "channel_id" in body.model_fields_set:
        _check_channel(db, body.channel_id)
        meeting.channel_id = body.channel_id
    if body.tags is not None:
        meeting.tags = svc.get_or_create_tags(db, body.tags)
    db.commit()
    return meeting_detail(svc.get_meeting(db, meeting.id))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting: MeetingDep, db: DbSession) -> Response:
    db.delete(meeting)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{meeting_id}/summary", response_model=SummaryOut)
def get_summary(meeting: MeetingDep) -> SummaryOut:
    if meeting.summary is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting has no summary yet")
    return SummaryOut.model_validate(meeting.summary)


@router.post("/{meeting_id}/summary/regenerate", response_model=SummaryOut)
def regenerate_summary(meeting: MeetingDep, db: DbSession) -> SummaryOut:
    try:
        summary = svc.regenerate_summary(db, meeting)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    db.commit()
    return SummaryOut.model_validate(summary)


def _parse_or_422(filename: str, content: str):
    try:
        return parse_transcript(filename, content)
    except TranscriptParseError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc


def _check_channel(db: DbSession, channel_id: int | None) -> None:
    if channel_id is not None and db.get(Channel, channel_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown channel")
