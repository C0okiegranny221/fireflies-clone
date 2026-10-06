from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Meeting, User
from app.services import meeting_service
from app.services.llm import LLMClient, get_llm
from app.services.rate_limit import LLMBudget

DbSession = Annotated[Session, Depends(get_db)]

_llm_budget = LLMBudget(
    per_client_per_hour=settings.llm_requests_per_hour_per_client,
    per_day=settings.llm_requests_per_day,
)


class LLMAccess:
    """
    Request-scoped access to the LLM. Budget is only spent when a handler actually asks for
    the client; over budget (or with AI disabled) it returns None and callers fall back to
    the offline heuristics.
    """

    def __init__(self, client_key: str) -> None:
        self._client_key = client_key
        self._granted: bool | None = None

    def client(self) -> LLMClient | None:
        llm = get_llm()
        if llm is None:
            return None
        if self._granted is None:
            self._granted = _llm_budget.try_acquire(self._client_key)
        return llm if self._granted else None


def _client_key(request: Request) -> str:
    # Behind a proxy (Render, Vercel) the caller is the first X-Forwarded-For entry.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _llm_access(request: Request) -> LLMAccess:
    return LLMAccess(_client_key(request))


def _current_user(db: DbSession) -> User:
    try:
        return meeting_service.get_current_user(db)
    except meeting_service.NotFoundError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc


def _meeting_or_404(meeting_id: int, db: DbSession) -> Meeting:
    try:
        return meeting_service.get_meeting(db, meeting_id)
    except meeting_service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


CurrentUser = Annotated[User, Depends(_current_user)]
MeetingDep = Annotated[Meeting, Depends(_meeting_or_404)]
LLMDep = Annotated[LLMAccess, Depends(_llm_access)]
