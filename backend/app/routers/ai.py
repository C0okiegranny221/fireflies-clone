from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import DbSession, LLMDep, MeetingDep
from app.schemas.ai import (
    AppInfo,
    AskRequest,
    AskResponse,
    Citation,
    SearchResponse,
    SearchResultOut,
    TranscriptHitOut,
)
from app.services import ask_service, search_service
from app.services.llm import get_llm

router = APIRouter(tags=["ai & search"])


@router.post("/meetings/{meeting_id}/ask", response_model=AskResponse)
def ask_about_meeting(body: AskRequest, meeting: MeetingDep, llm: LLMDep) -> AskResponse:
    """AskFred: answer a question about this meeting, citing transcript lines."""
    history = [ask_service.ChatTurn(t.role, t.content) for t in body.history]
    answer = ask_service.ask(meeting, body.question.strip(), history, llm.client())
    return AskResponse(
        answer=answer.text,
        citations=[
            Citation(segment_id=s.id, start_ms=s.start_ms, speaker=s.speaker.name, text=s.text)
            for s in answer.segments
        ],
        source=answer.source,
        model=answer.model,
    )


@router.get("/search", response_model=SearchResponse)
def search(
    db: DbSession,
    q: Annotated[str, Query(min_length=1, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> SearchResponse:
    """Search every meeting: titles, participants and topics, plus full-text transcript hits."""
    results = search_service.search(db, q, limit)
    return SearchResponse(
        query=q,
        results=[
            SearchResultOut(
                meeting_id=r.id,
                title=r.title,
                started_at=r.started_at,
                duration_sec=r.duration_sec,
                matched_meeting=r.matched_meeting,
                hits=[TranscriptHitOut(**vars(h)) for h in r.hits],
            )
            for r in results
        ],
    )


@router.get("/app-info", response_model=AppInfo)
def app_info() -> AppInfo:
    llm = get_llm()
    return AppInfo(ai_enabled=llm is not None, ai_model=llm.label if llm else None)
