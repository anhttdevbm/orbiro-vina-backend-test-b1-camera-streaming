from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Camera
from app.schemas import (
    CameraCreate,
    CameraResponse,
    CameraUpdate,
    ChannelStatusResponse,
    StreamStatus,
)
from app.stream.manager import stream_manager

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


def _to_response(cam: Camera) -> CameraResponse:
    return CameraResponse.model_validate(cam)


def _channel_status(camera_id: int, state=None) -> ChannelStatusResponse:
    if not state:
        return ChannelStatusResponse(
            camera_id=camera_id,
            status=StreamStatus.disconnected,
            measured_fps=0,
            latency_ms=0,
            uptime_sec=0,
            reconnect_count=0,
            last_frame_at=None,
            last_error="Stream not started",
            connected_at=None,
            disconnected_at=None,
        )
    return ChannelStatusResponse(**state.snapshot())


@router.post("", response_model=CameraResponse, status_code=201)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    count = db.query(Camera).count()
    if count >= settings.max_channels:
        raise HTTPException(400, f"Maximum {settings.max_channels} cameras allowed")
    cam = Camera(**payload.model_dump())
    db.add(cam)
    db.commit()
    db.refresh(cam)
    stream_manager.apply_camera_update(cam)
    return _to_response(cam)


@router.get("", response_model=list[CameraResponse])
def list_cameras(db: Session = Depends(get_db)):
    return [_to_response(c) for c in db.query(Camera).order_by(Camera.id).all()]


@router.get("/status/all", response_model=list[ChannelStatusResponse])
def all_camera_status(db: Session = Depends(get_db)):
    cameras = db.query(Camera).order_by(Camera.id).all()
    return [
        _channel_status(cam.id, stream_manager.get_state(cam.id)) for cam in cameras
    ]


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    cam = db.get(Camera, camera_id)
    if not cam:
        raise HTTPException(404, "Camera not found")
    return _to_response(cam)


@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: int, payload: CameraUpdate, db: Session = Depends(get_db)
):
    cam = db.get(Camera, camera_id)
    if not cam:
        raise HTTPException(404, "Camera not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(cam, key, value)
    db.commit()
    db.refresh(cam)
    fps_only = set(changes.keys()) == {"target_fps"}
    stream_manager.apply_camera_update(cam, fps_only=fps_only)
    return _to_response(cam)


@router.delete("/{camera_id}", status_code=204)
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    cam = db.get(Camera, camera_id)
    if not cam:
        raise HTTPException(404, "Camera not found")
    stream_manager.stop_camera(camera_id)
    db.delete(cam)
    db.commit()


@router.get("/{camera_id}/status", response_model=ChannelStatusResponse)
def camera_status(camera_id: int, db: Session = Depends(get_db)):
    cam = db.get(Camera, camera_id)
    if not cam:
        raise HTTPException(404, "Camera not found")
    return _channel_status(camera_id, stream_manager.get_state(camera_id))
