"""Small reference-data endpoints used to populate filters, pickers and the profile menu."""

from fastapi import APIRouter
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import Channel, Participant, Tag
from app.schemas.people import ChannelOut, ParticipantOut, TagOut, UserOut

router = APIRouter(tags=["lookups"])


@router.get("/users/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.get("/participants", response_model=list[ParticipantOut])
def participants(db: DbSession) -> list[ParticipantOut]:
    people = db.scalars(select(Participant).order_by(Participant.name))
    return [ParticipantOut.model_validate(p) for p in people]


@router.get("/channels", response_model=list[ChannelOut])
def channels(db: DbSession) -> list[ChannelOut]:
    return [ChannelOut.model_validate(c) for c in db.scalars(select(Channel).order_by(Channel.id))]


@router.get("/tags", response_model=list[TagOut])
def tags(db: DbSession) -> list[TagOut]:
    return [TagOut.model_validate(t) for t in db.scalars(select(Tag).order_by(Tag.name))]
