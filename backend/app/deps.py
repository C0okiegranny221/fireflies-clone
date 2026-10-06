from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Meeting, User
from app.services import auth_service, meeting_service
from app.services.llm import LLMClient, get_llm
from app.services.rate_limit import RateBudget

DbSession = Annotated[Session, Depends(get_db)]

SESSION_COOKIE = "ff_session"

_llm_budget = RateBudget(
    per_client_per_hour=settings.llm_requests_per_hour_per_client,
    per_day=settings.llm_requests_per_day,
)
login_budget = RateBudget(
    per_client_per_hour=settings.login_attempts_per_hour_per_client,
    per_day=100_000,
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


def client_key(request: Request) -> str:
    # Behind a proxy (Render, Vercel) the caller is the first X-Forwarded-For entry.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _llm_access(request: Request) -> LLMAccess:
    return LLMAccess(client_key(request))


SessionToken = Annotated[str | None, Cookie(alias=SESSION_COOKIE, include_in_schema=False)]


def expired_session_cookie_header() -> str:
    """A Set-Cookie header value that deletes the session cookie."""
    response = Response()
    response.delete_cookie(
        SESSION_COOKIE, path="/", secure=settings.session_cookie_secure, httponly=True
    )
    return response.headers["set-cookie"]


def current_user(db: DbSession, token: SessionToken = None) -> User:
    """The logged-in user, from the session cookie; 401 when missing, expired or revoked."""
    user = auth_service.user_for_token(db, token)
    if user is None:
        headers = {"WWW-Authenticate": "Cookie"}
        if token:
            # Clear a dead cookie: the frontend's route guard only checks that the cookie
            # exists, so leaving it would bounce the user between /login and /home forever.
            headers["Set-Cookie"] = expired_session_cookie_header()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in", headers=headers)
    return user


def _meeting_or_404(meeting_id: int, db: DbSession) -> Meeting:
    try:
        return meeting_service.get_meeting(db, meeting_id)
    except meeting_service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


CurrentUser = Annotated[User, Depends(current_user)]
MeetingDep = Annotated[Meeting, Depends(_meeting_or_404)]
LLMDep = Annotated[LLMAccess, Depends(_llm_access)]
