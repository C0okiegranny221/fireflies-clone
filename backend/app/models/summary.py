from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class SummarySource(enum.StrEnum):
    SEED = "seed"
    LLM = "llm"
    HEURISTIC = "heuristic"


class Summary(TimestampMixin, Base):
    """AI notes for a meeting (one-to-one). Regenerating replaces it in place."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True
    )
    overview: Mapped[str] = mapped_column(Text, default="")
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    generated_by: Mapped[SummarySource] = mapped_column(
        Enum(SummarySource, native_enum=False, length=20)
    )
    # Which provider/model wrote LLM summaries, e.g. "Groq · llama-3.3-70b-versatile".
    model: Mapped[str | None] = mapped_column(String(120))

    meeting: Mapped[Meeting] = relationship(back_populates="summary")
    chapters: Mapped[list[Chapter]] = relationship(
        back_populates="summary",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Chapter.position",
    )


class Chapter(Base):
    """An outline entry: a titled section of the meeting with bullet notes."""

    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    summary_id: Mapped[int] = mapped_column(
        ForeignKey("summaries.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    start_ms: Mapped[int] = mapped_column(Integer, default=0)
    bullets: Mapped[list[str]] = mapped_column(JSON, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)

    summary: Mapped[Summary] = relationship(back_populates="chapters")
