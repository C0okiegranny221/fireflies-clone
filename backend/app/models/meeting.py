from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin
from app.models.user import Participant, User

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.summary import Summary
    from app.models.transcript import TranscriptSegment


class MeetingSource(enum.StrEnum):
    """How the meeting was captured — drives the source icon in the library."""

    NOTETAKER = "notetaker"
    UPLOAD = "upload"
    MANUAL = "manual"


class ParticipantRole(enum.StrEnum):
    HOST = "host"
    ATTENDEE = "attendee"


meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Channel(Base):
    """A folder of meetings (Fireflies 'Channels')."""

    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    is_private: Mapped[bool] = mapped_column(default=False)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class Meeting(TimestampMixin, Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[MeetingSource] = mapped_column(
        Enum(MeetingSource, native_enum=False, length=20), default=MeetingSource.MANUAL
    )
    media_url: Mapped[str | None] = mapped_column(String(500))
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    channel_id: Mapped[int | None] = mapped_column(
        ForeignKey("channels.id", ondelete="SET NULL"), index=True
    )

    host: Mapped[User] = relationship()
    channel: Mapped[Channel | None] = relationship()
    participant_links: Mapped[list[MeetingParticipant]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="MeetingParticipant.position",
    )
    segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TranscriptSegment.start_ms",
    )
    summary: Mapped[Summary | None] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    action_items: Mapped[list[ActionItem]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ActionItem.position",
    )
    tags: Mapped[list[Tag]] = relationship(secondary=meeting_tags, order_by="Tag.name")


class MeetingParticipant(Base):
    """Association between a meeting and a participant, with per-meeting stats."""

    __tablename__ = "meeting_participants"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[ParticipantRole] = mapped_column(
        Enum(ParticipantRole, native_enum=False, length=20), default=ParticipantRole.ATTENDEE
    )
    talk_time_sec: Mapped[int] = mapped_column(Integer, default=0)
    position: Mapped[int] = mapped_column(Integer, default=0)

    meeting: Mapped[Meeting] = relationship(back_populates="participant_links")
    participant: Mapped[Participant] = relationship()
