from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_validator

from app.models import MeetingSource
from app.schemas.action_item import ActionItemOut
from app.schemas.common import ORMModel
from app.schemas.people import ChannelOut, MeetingParticipantOut, TagOut, UserOut
from app.schemas.summary import SummaryOut


class MeetingListItem(ORMModel):
    id: int
    title: str
    started_at: datetime
    duration_sec: int
    source: MeetingSource
    host: UserOut
    channel: ChannelOut | None
    participants: list[MeetingParticipantOut]
    tags: list[TagOut]
    overview: str | None = None
    action_item_count: int = 0


class MeetingDetail(MeetingListItem):
    media_url: str | None
    summary: SummaryOut | None
    action_items: list[ActionItemOut]
    created_at: datetime
    updated_at: datetime


class MeetingCreate(BaseModel):
    """Create a meeting from a form, optionally with pasted transcript text."""

    title: str = Field(min_length=1, max_length=255)
    started_at: datetime | None = None
    duration_sec: int | None = Field(default=None, ge=0)
    participants: list[str] = Field(default_factory=list, description="Participant names")
    transcript_text: str | None = None
    channel_id: int | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("started_at")
    @classmethod
    def _to_naive_utc(cls, value: datetime | None) -> datetime | None:
        """Datetimes are stored as naive UTC; convert any offset the client sent."""
        if value is not None and value.tzinfo is not None:
            return value.astimezone(UTC).replace(tzinfo=None)
        return value


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    participants: list[str] | None = None
    channel_id: int | None = None
    tags: list[str] | None = None
