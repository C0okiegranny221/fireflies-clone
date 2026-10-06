"""
Email/password accounts and cookie sessions.

Passwords are hashed with scrypt (stdlib, memory-hard, per-password salt). Sessions are
random 256-bit tokens; the database stores only their SHA-256, and lookups compare hashes,
so neither a database leak nor a timing side channel reveals usable tokens.
"""

import base64
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuthSession, User
from app.models.base import utcnow
from app.services.meeting_service import SPEAKER_COLORS, get_or_create_participants

# scrypt cost parameters (n=2^14, r=8 → 16 MiB per hash): OWASP's minimum recommendation.
_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**14, 8, 1
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


class AuthError(Exception):
    pass


class EmailTakenError(AuthError):
    pass


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=32
    )
    b64 = base64.b64encode
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${b64(salt).decode()}${b64(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, digest_b64 = stored.split("$")
    except ValueError:
        return False
    if scheme != "scrypt":
        return False
    expected = base64.b64decode(digest_b64)
    actual = hashlib.scrypt(
        password.encode(),
        salt=base64.b64decode(salt_b64),
        n=int(n),
        r=int(r),
        p=int(p),
        dklen=len(expected),
    )
    return hmac.compare_digest(actual, expected)


# Checked when the email is unknown, so a failed login takes the same time either way and
# response timing doesn't reveal which emails have accounts.
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_new_account(name: str, email: str, password: str) -> None:
    if not name.strip():
        raise AuthError("Please enter your name")
    if not _EMAIL.match(email):
        raise AuthError("Please enter a valid email address")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise AuthError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")


def create_user(db: Session, name: str, email: str, password: str) -> User:
    email = normalize_email(email)
    validate_new_account(name, email, password)
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise EmailTakenError("An account with this email already exists")

    last_id = db.scalar(select(User.id).order_by(User.id.desc()).limit(1)) or 0
    user = User(
        name=name.strip(),
        email=email,
        password_hash=hash_password(password),
        avatar_color=SPEAKER_COLORS[last_id % len(SPEAKER_COLORS)],
    )
    db.add(user)
    db.flush()
    # The user is also a meeting participant (host of what they create, assignable in tasks).
    participant = get_or_create_participants(db, [user.name])[user.name]
    if participant.user_id is None:
        participant.user_id = user.id
        participant.email = participant.email or user.email
        participant.color = user.avatar_color
    db.flush()
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return None
    return user if verify_password(password, user.password_hash) else None


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> str:
    """Start a session and return the raw token (sent to the browser, never stored)."""
    token = secrets.token_urlsafe(32)
    now = utcnow()
    db.add(
        AuthSession(
            token_hash=_token_hash(token),
            user_id=user.id,
            created_at=now,
            expires_at=now + timedelta(days=settings.session_days),
        )
    )
    # Opportunistic cleanup keeps the table small without a background job.
    db.execute(delete(AuthSession).where(AuthSession.expires_at < now))
    db.flush()
    return token


def user_for_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == _token_hash(token)))
    if session is None or session.expires_at <= utcnow():
        return None
    return session.user


def revoke_session(db: Session, token: str | None) -> None:
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == _token_hash(token)))
