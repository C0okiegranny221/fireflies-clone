from app.models import ParticipantRole
from app.schemas.common import ORMModel


class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_color: str


class ParticipantOut(ORMModel):
    id: int
    name: str
    email: str | None
    color: str


class MeetingParticipantOut(ParticipantOut):
    role: ParticipantRole
    talk_time_sec: int


class ChannelOut(ORMModel):
    id: int
    name: str
    is_private: bool


class TagOut(ORMModel):
    id: int
    name: str
