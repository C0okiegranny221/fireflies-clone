from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.config import settings
from app.deps import (
    SESSION_COOKIE,
    CurrentUser,
    DbSession,
    SessionToken,
    client_key,
    expired_session_cookie_header,
    login_budget,
)
from app.schemas.people import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class LoginRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class DemoAccount(BaseModel):
    email: str
    password: str


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_days * 86_400,
        httponly=True,  # not readable from JavaScript
        secure=settings.session_cookie_secure,
        samesite="lax",  # first-party via the frontend's /api proxy; blocks cross-site POSTs
        path="/",
    )


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response, db: DbSession) -> UserOut:
    try:
        user = auth_service.create_user(db, body.name, body.email, body.password)
    except auth_service.EmailTakenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except auth_service.AuthError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    _set_session_cookie(response, auth_service.create_session(db, user))
    db.commit()
    return UserOut.model_validate(user)


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, request: Request, response: Response, db: DbSession) -> UserOut:
    if not login_budget.try_acquire(client_key(request)):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many login attempts. Try again later."
        )
    user = auth_service.authenticate(db, body.email, body.password)
    if user is None:
        # Same message for unknown email and wrong password.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    _set_session_cookie(response, auth_service.create_session(db, user))
    db.commit()
    return UserOut.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(db: DbSession, token: SessionToken = None) -> Response:
    auth_service.revoke_session(db, token)
    db.commit()
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"Set-Cookie": expired_session_cookie_header()},
    )


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.get("/demo", response_model=DemoAccount)
def demo_account() -> DemoAccount:
    """Public demo credentials, so the login page's "Try the demo" button stays in sync."""
    return DemoAccount(email=settings.demo_email, password=settings.demo_password)
