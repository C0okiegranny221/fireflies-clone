from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    """A workspace member. Auth is out of scope, so exactly one user has is_current=True."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str] = mapped_column(String(9), default="#7C5CFC")
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)


class Participant(Base):
    """
    A person who speaks in or attends meetings. Kept separate from User because most
    speakers (customers, candidates, guests) are not workspace members; user_id links
    the two when they are.
    """

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    color: Mapped[str] = mapped_column(String(9))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    user: Mapped[User | None] = relationship()
