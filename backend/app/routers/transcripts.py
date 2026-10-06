from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import DbSession, MeetingDep
from app.models import MeetingParticipant, Participant, TranscriptSegment
from app.schemas.transcript import SegmentOut, SegmentUpdate, TranscriptOut
from app.services import meeting_service as svc

router = APIRouter(tags=["transcript"])


@router.get("/meetings/{meeting_id}/transcript", response_model=TranscriptOut)
def get_transcript(meeting: MeetingDep, q: str | None = None) -> TranscriptOut:
    segments = meeting.segments
    needle = (q or "").strip().lower()
    matches = [s.id for s in segments if needle and needle in s.text.lower()]
    return TranscriptOut(
        meeting_id=meeting.id,
        segments=[SegmentOut.model_validate(s) for s in segments],
        match_segment_ids=matches,
    )


@router.patch("/segments/{segment_id}", response_model=SegmentOut)
def update_segment(segment_id: int, body: SegmentUpdate, db: DbSession) -> SegmentOut:
    segment = db.get(TranscriptSegment, segment_id)
    if segment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Segment not found")
    if body.text is not None:
        segment.text = body.text.strip()
    if body.participant_id is not None and body.participant_id != segment.participant_id:
        if db.get(Participant, body.participant_id) is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown participant")
        segment.participant_id = body.participant_id
        _ensure_attendee(db, segment.meeting_id, body.participant_id)
        db.flush()
        svc.recompute_talk_time(svc.get_meeting(db, segment.meeting_id))
    db.commit()
    return SegmentOut.model_validate(segment)


def _ensure_attendee(db: DbSession, meeting_id: int, participant_id: int) -> None:
    exists = db.scalar(
        select(MeetingParticipant).where(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.participant_id == participant_id,
        )
    )
    if exists is None:
        link = MeetingParticipant(meeting_id=meeting_id, participant_id=participant_id, position=99)
        db.add(link)
