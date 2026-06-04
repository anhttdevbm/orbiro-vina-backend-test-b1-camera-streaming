import json
import logging
import threading
from collections import defaultdict
from typing import Callable, Optional

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Camera
from app.stream.channel_state import ChannelState
from app.stream.worker import StreamWorker

logger = logging.getLogger(__name__)


class StreamManager:
    def __init__(self) -> None:
        self._workers: dict[int, StreamWorker] = {}
        self._threads: dict[int, threading.Thread] = {}
        self._stop_events: dict[int, threading.Event] = {}
        self._states: dict[int, ChannelState] = {}
        self._subscribers: dict[int, list[Callable[[bytes, dict], None]]] = defaultdict(list)
        self._ws_clients: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = threading.Lock()
        self._latest_frame: dict[int, bytes] = {}
        self._latest_meta: dict[int, dict] = {}

    def get_state(self, camera_id: int) -> Optional[ChannelState]:
        return self._states.get(camera_id)

    def active_stream_count(self) -> int:
        return sum(1 for t in self._threads.values() if t.is_alive())

    def _broadcast(self, camera_id: int, jpeg: bytes, meta: dict) -> None:
        self._latest_frame[camera_id] = jpeg
        self._latest_meta[camera_id] = meta
        for cb in list(self._subscribers[camera_id]):
            try:
                cb(jpeg, meta)
            except Exception:
                pass

    def start_camera(self, camera: Camera) -> None:
        with self._lock:
            if camera.id in self._threads and self._threads[camera.id].is_alive():
                return
            if not camera.enabled:
                return

            stop_evt = threading.Event()
            state = ChannelState(camera_id=camera.id)
            self._states[camera.id] = state
            self._stop_events[camera.id] = stop_evt

            worker = StreamWorker(
                camera_id=camera.id,
                rtsp_url=camera.rtsp_url,
                width=camera.resolution_width,
                height=camera.resolution_height,
                target_fps=camera.target_fps,
                state=state,
                on_frame=lambda j, m, cid=camera.id: self._broadcast(cid, j, m),
                stop_event=stop_evt,
            )
            self._workers[camera.id] = worker
            thread = threading.Thread(
                target=worker.run,
                name=f"stream-{camera.id}",
                daemon=True,
            )
            self._threads[camera.id] = thread
            thread.start()
            logger.info("Started stream worker for camera %s", camera.id)

    def stop_camera(self, camera_id: int) -> None:
        with self._lock:
            stop_evt = self._stop_events.pop(camera_id, None)
            if stop_evt:
                stop_evt.set()
            thread = self._threads.pop(camera_id, None)
            self._workers.pop(camera_id, None)
        if thread and thread.is_alive():
            thread.join(timeout=5.0)
        self._states.pop(camera_id, None)
        self._latest_frame.pop(camera_id, None)
        self._latest_meta.pop(camera_id, None)
        logger.info("Stopped stream worker for camera %s", camera_id)

    def restart_camera(self, camera: Camera) -> None:
        self.stop_camera(camera.id)
        if camera.enabled:
            self.start_camera(camera)

    def reload_from_db(self, db: Session) -> None:
        cameras = db.query(Camera).filter(Camera.enabled.is_(True)).all()
        active_ids = {c.id for c in cameras}
        for cid in list(self._threads.keys()):
            if cid not in active_ids:
                self.stop_camera(cid)
        for cam in cameras:
            if len(self._threads) >= settings.max_channels:
                logger.warning("Max channels %s reached", settings.max_channels)
                break
            if cam.id not in self._threads or not self._threads[cam.id].is_alive():
                self.start_camera(cam)
            else:
                worker = self._workers.get(cam.id)
                if worker:
                    worker.update_config(
                        cam.rtsp_url,
                        cam.resolution_width,
                        cam.resolution_height,
                        cam.target_fps,
                    )

    def apply_camera_update(self, camera: Camera, *, fps_only: bool = False) -> None:
        if not camera.enabled:
            self.stop_camera(camera.id)
            return
        if camera.id in self._threads and self._threads[camera.id].is_alive():
            worker = self._workers.get(camera.id)
            if worker:
                if fps_only:
                    worker.update_fps_only(camera.target_fps)
                else:
                    worker.update_config(
                        camera.rtsp_url,
                        camera.resolution_width,
                        camera.resolution_height,
                        camera.target_fps,
                    )
        else:
            self.start_camera(camera)

    async def register_ws(self, camera_id: int, ws: WebSocket) -> None:
        self._ws_clients[camera_id].add(ws)
        if camera_id in self._latest_frame:
            await ws.send_bytes(self._latest_frame[camera_id])
            if camera_id in self._latest_meta:
                await ws.send_text(json.dumps({"type": "meta", **self._latest_meta[camera_id]}))

    def unregister_ws(self, camera_id: int, ws: WebSocket) -> None:
        self._ws_clients[camera_id].discard(ws)

    async def push_to_ws(self, camera_id: int, jpeg: bytes, meta: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._ws_clients.get(camera_id, [])):
            try:
                await ws.send_bytes(jpeg)
                await ws.send_text(json.dumps({"type": "meta", **meta}))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.unregister_ws(camera_id, ws)


stream_manager = StreamManager()
