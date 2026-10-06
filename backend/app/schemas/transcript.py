from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class SegmentOut(ORMModel):
    id: int
    participant_id: int
    start_ms: int
    end_ms: int
    text: str


class TranscriptOut(BaseModel):
    meeting_id: int
    segments: list[SegmentOut]
    # When ?q= is given: ids of segments containing the query, in order.
    match_segment_ids: list[int] = []


class SegmentUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    participant_id: int | None = None
