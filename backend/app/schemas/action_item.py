from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.people import ParticipantOut


class ActionItemOut(ORMModel):
    id: int
    meeting_id: int
    text: str
    is_completed: bool
    due_date: date | None
    start_ms: int | None
    assignee: ParticipantOut | None
    created_at: datetime


class TaskOut(ActionItemOut):
    """Action item plus its meeting title, for the cross-meeting Tasks page."""

    meeting_title: str


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    assignee_id: int | None = None
    due_date: date | None = None
    start_ms: int | None = Field(default=None, ge=0)


class ActionItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=2000)
    assignee_id: int | None = None
    due_date: date | None = None
    is_completed: bool | None = None
