import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from app.schemas import StreamStatus

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ChannelState:
    camera_id: int
    status: StreamStatus = StreamStatus.disconnected
    measured_fps: float = 0.0
    latency_ms: float = 0.0
    uptime_sec: float = 0.0
    reconnect_count: int = 0
    last_frame_at: Optional[datetime] = None
    last_error: Optional[str] = None
    connected_at: Optional[datetime] = None
    disconnected_at: Optional[datetime] = None
    connected_since: Optional[float] = None
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def snapshot(self) -> dict:
        with self._lock:
            uptime = 0.0
            if self.status == StreamStatus.connected and self.connected_since:
                uptime = time.time() - self.connected_since
            return {
                "camera_id": self.camera_id,
                "status": self.status,
                "measured_fps": round(self.measured_fps, 2),
                "latency_ms": round(self.latency_ms, 2),
                "uptime_sec": round(uptime, 1),
                "reconnect_count": self.reconnect_count,
                "last_frame_at": self.last_frame_at,
                "last_error": self.last_error,
                "connected_at": self.connected_at,
                "disconnected_at": self.disconnected_at,
            }

    def _emit_status_log(self) -> None:
        if self.status == StreamStatus.connected:
            message = "Stream connected"
        elif self.last_error:
            message = self.last_error
        else:
            message = self.status.value

        try:
            from app.api.events import log_fault

            log_fault(self.camera_id, self.status.value, message)
        except Exception:
            pass
        logger.info(
            "Camera %s status=%s reconnects=%s %s",
            self.camera_id,
            self.status.value,
            self.reconnect_count,
            message,
        )

    def update(
        self,
        *,
        status: Optional[StreamStatus] = None,
        measured_fps: Optional[float] = None,
        latency_ms: Optional[float] = None,
        last_frame_at: Optional[datetime] = None,
        last_error: Optional[str] = None,
        bump_reconnect: bool = False,
    ) -> None:
        with self._lock:
            status_changed = status is not None and status != self.status

            if status_changed:
                prev = self.status
                if status == StreamStatus.connected and prev != StreamStatus.connected:
                    self.connected_at = _utc_now()
                    self.connected_since = time.time()
                if prev == StreamStatus.connected and status in (
                    StreamStatus.disconnected,
                    StreamStatus.reconnecting,
                ):
                    self.disconnected_at = _utc_now()
                    self.connected_since = None
                if status == StreamStatus.disconnected and prev == StreamStatus.connecting:
                    self.disconnected_at = _utc_now()
                self.status = status
            elif status is not None:
                self.status = status

            if measured_fps is not None:
                self.measured_fps = measured_fps
            if latency_ms is not None:
                self.latency_ms = latency_ms
            if last_frame_at is not None:
                self.last_frame_at = last_frame_at
            if last_error is not None:
                self.last_error = last_error
            if bump_reconnect:
                self.reconnect_count += 1

            if status_changed:
                self._emit_status_log()
