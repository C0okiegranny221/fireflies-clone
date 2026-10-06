"""Map ORM objects to response schemas where the shapes differ (flattened participants)."""

from app.models import ActionItem, Meeting, MeetingParticipant
from app.schemas.action_item import ActionItemOut, TaskOut
from app.schemas.meeting import MeetingDetail, MeetingListItem
from app.schemas.people import MeetingParticipantOut


def participant_out(link: MeetingParticipant) -> MeetingParticipantOut:
    p = link.participant
    return MeetingParticipantOut(
        id=p.id,
        name=p.name,
        email=p.email,
        color=p.color,
        role=link.role,
        talk_time_sec=link.talk_time_sec,
    )


def _common(meeting: Meeting) -> dict:
    return {
        "id": meeting.id,
        "title": meeting.title,
        "started_at": meeting.started_at,
        "duration_sec": meeting.duration_sec,
        "source": meeting.source,
        "host": meeting.host,
        "channel": meeting.channel,
        "participants": [participant_out(link) for link in meeting.participant_links],
        "tags": meeting.tags,
        "overview": meeting.summary.overview if meeting.summary else None,
    }


def meeting_list_item(meeting: Meeting, action_item_count: int) -> MeetingListItem:
    return MeetingListItem.model_validate(
        {**_common(meeting), "action_item_count": action_item_count}
    )


def meeting_detail(meeting: Meeting) -> MeetingDetail:
    return MeetingDetail.model_validate(
        {
            **_common(meeting),
            "action_item_count": len(meeting.action_items),
            "media_url": meeting.media_url,
            "summary": meeting.summary,
            "action_items": meeting.action_items,
            "created_at": meeting.created_at,
            "updated_at": meeting.updated_at,
        }
    )


def task_out(item: ActionItem) -> TaskOut:
    base = ActionItemOut.model_validate(item)
    return TaskOut(**base.model_dump(), meeting_title=item.meeting.title)
