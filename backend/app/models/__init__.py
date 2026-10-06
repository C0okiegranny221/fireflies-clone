"""Import every model so Base.metadata knows all tables before create_all()."""

from app.models.action_item import ActionItem
from app.models.meeting import (
    Channel,
    Meeting,
    MeetingParticipant,
    MeetingSource,
    ParticipantRole,
    Tag,
    meeting_tags,
)
from app.models.summary import Chapter, Summary, SummarySource
from app.models.transcript import TranscriptSegment
from app.models.user import Participant, User

__all__ = [
    "ActionItem",
    "Channel",
    "Chapter",
    "Meeting",
    "MeetingParticipant",
    "MeetingSource",
    "Participant",
    "ParticipantRole",
    "Summary",
    "SummarySource",
    "Tag",
    "TranscriptSegment",
    "User",
    "meeting_tags",
]
