import logging
import threading
import time
from datetime import datetime, timezone
from typing import Callable, Optional

import cv2
import numpy as np

from app.config import settings
from app.schemas import StreamStatus
from app.stream.channel_state import ChannelState

logger = logging.getLogger(__name__)


class StreamWorker:
    """Pull RTSP, throttle FPS server-side, broadcast JPEG to subscribers."""

    def __init__(
        self,
        camera_id: int,
        rtsp_url: str,
        width: int,
        height: int,
        target_fps: float,
        state: ChannelState,
        on_frame: Callable[[bytes, dict], None],
        stop_event: threading.Event,
    ):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.width = width
        self.height = height
        self.target_fps = max(1.0, min(target_fps, 30.0))
        self.state = state
        self.on_frame = on_frame
        self.stop_event = stop_event
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame_times: list[float] = []
        self._config_version = 0

    def update_fps_only(self, target_fps: float) -> None:
        """Hot-reload FPS without closing RTSP or incrementing reconnect_count."""
        self.target_fps = max(1.0, min(target_fps, 30.0))
        logger.info("Camera %s target_fps -> %s (live)", self.camera_id, self.target_fps)

    def update_config(
        self, rtsp_url: str, width: int, height: int, target_fps: float
    ) -> None:
        self.rtsp_url = rtsp_url
        self.width = width
        self.height = height
        self.target_fps = max(1.0, min(target_fps, 30.0))
        self._config_version += 1
        self._release_cap()

    def _release_cap(self) -> None:
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None

    def _open_cap(self) -> bool:
        self._release_cap()
        self.state.update(status=StreamStatus.connecting, last_error=None)
        cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            self.state.update(
                status=StreamStatus.disconnected,
                last_error="Failed to open RTSP stream",
            )
            return False
        self._cap = cap
        self.state.update(status=StreamStatus.connected, last_error=None)
        return True

    def _encode_frame(self, frame: np.ndarray) -> bytes:
        resized = cv2.resize(frame, (self.width, self.height))
        ok, buf = cv2.imencode(
            ".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), settings.jpeg_quality]
        )
        if not ok:
            raise RuntimeError("JPEG encode failed")
        return buf.tobytes()

    def _measure_fps(self) -> float:
        now = time.time()
        self._frame_times = [t for t in self._frame_times if now - t < 2.0]
        if len(self._frame_times) < 2:
            return 0.0
        return (len(self._frame_times) - 1) / (self._frame_times[-1] - self._frame_times[0])

    def run(self) -> None:
        backoff = settings.reconnect_base_sec
        local_config_ver = self._config_version

        while not self.stop_event.is_set():
            if local_config_ver != self._config_version:
                local_config_ver = self._config_version
                backoff = settings.reconnect_base_sec

            if not self._open_cap():
                self.state.update(status=StreamStatus.reconnecting, bump_reconnect=True)
                time.sleep(min(backoff, settings.reconnect_max_sec))
                backoff = min(backoff * 2, settings.reconnect_max_sec)
                continue

            backoff = settings.reconnect_base_sec
            last_emit = 0.0
            last_ok_frame = time.time()
            config_reload = False

            while not self.stop_event.is_set():
                if local_config_ver != self._config_version:
                    config_reload = True
                    break

                if self._cap is None or not self._cap.isOpened():
                    break

                ok, frame = self._cap.read()
                now = time.time()

                if not ok or frame is None:
                    if now - last_ok_frame > settings.frame_timeout_sec:
                        self.state.update(
                            status=StreamStatus.disconnected,
                            last_error="No frames within timeout",
                        )
                        break
                    continue

                last_ok_frame = now
                emit_interval = 1.0 / self.target_fps
                if now - last_emit < emit_interval:
                    continue

                last_emit = now
                capture_ts = time.time()
                try:
                    jpeg = self._encode_frame(frame)
                except Exception as e:
                    self.state.update(last_error=str(e))
                    continue

                latency_ms = (time.time() - capture_ts) * 1000.0 + 50.0
                self._frame_times.append(now)
                fps = self._measure_fps()
                self.state.update(
                    status=StreamStatus.connected,
                    measured_fps=fps,
                    latency_ms=latency_ms,
                    last_frame_at=datetime.now(timezone.utc),
                )
                meta = {
                    "camera_id": self.camera_id,
                    "fps": round(fps, 2),
                    "latency_ms": round(latency_ms, 1),
                    "ts": int(now * 1000),
                }
                self.on_frame(jpeg, meta)

            self._release_cap()
            if not self.stop_event.is_set():
                if config_reload:
                    local_config_ver = self._config_version
                    continue
                self.state.update(status=StreamStatus.reconnecting, bump_reconnect=True)
                time.sleep(min(backoff, settings.reconnect_max_sec))
                backoff = min(backoff * 2, settings.reconnect_max_sec)

        self._release_cap()
        self.state.update(status=StreamStatus.disconnected)
