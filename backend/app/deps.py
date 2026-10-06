from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Meeting, User
from app.services import meeting_service

DbSession = Annotated[Session, Depends(get_db)]


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
