from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChatTurnIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    history: list[ChatTurnIn] = Field(default_factory=list, max_length=12)


class Citation(BaseModel):
    segment_id: int
    start_ms: int
    speaker: str
    text: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    source: Literal["llm", "retrieval"]
    model: str | None


class TranscriptHitOut(BaseModel):
    segment_id: int
    start_ms: int
    speaker: str
    snippet: str = Field(description="Excerpt with matches wrapped in [[ ]]")


class SearchResultOut(BaseModel):
    meeting_id: int
    title: str
    started_at: datetime
    duration_sec: int
    matched_meeting: bool = Field(description="Title, participant or topic matched")
    hits: list[TranscriptHitOut]


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultOut]


class AppInfo(BaseModel):
    ai_enabled: bool
    ai_model: str | None
