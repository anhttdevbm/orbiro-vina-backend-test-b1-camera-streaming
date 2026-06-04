"""Optional: stream fault events (bonus)."""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/events", tags=["events"])


class FaultEvent(BaseModel):
    id: int
    camera_id: int
    event_type: str
    message: str
    created_at: datetime


# In-memory ring buffer for demo (persist to DB in production)
_fault_log: list[dict] = []
_MAX_EVENTS = 200
_next_event_id = 0


def log_fault(camera_id: int, event_type: str, message: str) -> None:
    global _next_event_id
    _next_event_id += 1
    entry = {
        "id": _next_event_id,
        "camera_id": camera_id,
        "event_type": event_type,
        "message": message,
        "created_at": datetime.now(timezone.utc),
    }
    _fault_log.append(entry)
    if len(_fault_log) > _MAX_EVENTS:
        del _fault_log[0 : len(_fault_log) - _MAX_EVENTS]


@router.get("", response_model=list[FaultEvent])
def list_events(limit: int = 50, camera_id: int | None = None):
    items = _fault_log
    if camera_id is not None:
        items = [e for e in _fault_log if e["camera_id"] == camera_id]
    return [FaultEvent(**e) for e in reversed(items[-limit:])]
