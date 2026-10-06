from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.deps import DbSession, MeetingDep
from app.models import ActionItem, Meeting, Participant
from app.schemas.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate, TaskOut
from app.serializers import task_out

router = APIRouter(tags=["action items"])


@router.get("/meetings/{meeting_id}/action-items", response_model=list[ActionItemOut])
def list_meeting_action_items(meeting: MeetingDep) -> list[ActionItemOut]:
    return [ActionItemOut.model_validate(a) for a in meeting.action_items]


@router.post(
    "/meetings/{meeting_id}/action-items",
    response_model=ActionItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(body: ActionItemCreate, meeting: MeetingDep, db: DbSession) -> ActionItemOut:
    _check_assignee(db, body.assignee_id)
    next_position = db.scalar(
        select(func.coalesce(func.max(ActionItem.position), -1) + 1).where(
            ActionItem.meeting_id == meeting.id
        )
    )
    item = ActionItem(meeting_id=meeting.id, position=next_position, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item, ["assignee"])
    return ActionItemOut.model_validate(item)


@router.get("/action-items", response_model=list[TaskOut])
def list_tasks(db: DbSession, completed: bool | None = None) -> list[TaskOut]:
    """All action items across meetings (the Tasks page), newest meetings first."""
    stmt = (
        select(ActionItem)
        .join(Meeting)
        .options(selectinload(ActionItem.assignee), selectinload(ActionItem.meeting))
        .order_by(Meeting.started_at.desc(), ActionItem.position)
    )
    if completed is not None:
        stmt = stmt.where(ActionItem.is_completed.is_(completed))
    return [task_out(item) for item in db.scalars(stmt)]


@router.patch("/action-items/{item_id}", response_model=ActionItemOut)
def update_action_item(item_id: int, body: ActionItemUpdate, db: DbSession) -> ActionItemOut:
    item = _item_or_404(db, item_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("text") is None:
        changes.pop("text", None)
    if changes.get("is_completed") is None:
        changes.pop("is_completed", None)
    if "assignee_id" in changes:
        _check_assignee(db, changes["assignee_id"])
    for field, value in changes.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item, ["assignee"])
    return ActionItemOut.model_validate(item)


@router.delete("/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: int, db: DbSession) -> Response:
    db.delete(_item_or_404(db, item_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _item_or_404(db: DbSession, item_id: int) -> ActionItem:
    item = db.get(ActionItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action item not found")
    return item


def _check_assignee(db: DbSession, assignee_id: int | None) -> None:
    if assignee_id is not None and db.get(Participant, assignee_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown assignee")
