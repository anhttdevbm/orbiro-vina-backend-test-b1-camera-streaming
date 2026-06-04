import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import cameras, events, metrics
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.stream.manager import stream_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    loop = asyncio.get_running_loop()
    app.state.loop = loop

    original_broadcast = stream_manager._broadcast  # noqa: SLF001

    def broadcast_with_ws(camera_id: int, jpeg: bytes, meta: dict) -> None:
        original_broadcast(camera_id, jpeg, meta)
        asyncio.run_coroutine_threadsafe(
            stream_manager.push_to_ws(camera_id, jpeg, meta), loop
        )

    stream_manager._broadcast = broadcast_with_ws  # noqa: SLF001

    db = SessionLocal()
    try:
        stream_manager.reload_from_db(db)
    finally:
        db.close()

    yield

    for cid in list(stream_manager._threads.keys()):  # noqa: SLF001
        stream_manager.stop_camera(cid)


app = FastAPI(
    title="CamStream Manager",
    description="B1 — Camera management and video streaming",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cameras.router)
app.include_router(metrics.router)
app.include_router(events.router)


@app.get("/health")
def health():
    return {"status": "ok", "max_channels": settings.max_channels}


@app.websocket("/ws/streams/{camera_id}")
async def stream_websocket(websocket: WebSocket, camera_id: int):
    await websocket.accept()
    await stream_manager.register_ws(camera_id, websocket)
    try:
        while True:
            # Keep connection alive; frames pushed from ingest workers
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    finally:
        stream_manager.unregister_ws(camera_id, websocket)
