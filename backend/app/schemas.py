from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class StreamStatus(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    reconnecting = "reconnecting"
    connecting = "connecting"


class CameraCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    rtsp_url: str = Field(..., min_length=8)
    resolution_width: int = Field(640, ge=160, le=3840)
    resolution_height: int = Field(360, ge=120, le=2160)
    target_fps: float = Field(10.0, ge=1.0, le=30.0)
    enabled: bool = True
    grid_slot: Optional[int] = Field(None, ge=0, le=31)


class CameraUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    rtsp_url: Optional[str] = Field(None, min_length=8)
    resolution_width: Optional[int] = Field(None, ge=160, le=3840)
    resolution_height: Optional[int] = Field(None, ge=120, le=2160)
    target_fps: Optional[float] = Field(None, ge=1.0, le=30.0)
    enabled: Optional[bool] = None
    grid_slot: Optional[int] = Field(None, ge=0, le=31)


class CameraResponse(BaseModel):
    id: int
    name: str
    rtsp_url: str
    resolution_width: int
    resolution_height: int
    target_fps: float
    enabled: bool
    grid_slot: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChannelStatusResponse(BaseModel):
    camera_id: int
    status: StreamStatus
    measured_fps: float
    latency_ms: float
    uptime_sec: float
    reconnect_count: int
    last_frame_at: Optional[datetime]
    last_error: Optional[str]
    connected_at: Optional[datetime] = None
    disconnected_at: Optional[datetime] = None


class SystemMetricsResponse(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    gpu_percent: Optional[float] = None
    gpu_memory_used_mb: Optional[float] = None
    gpu_memory_total_mb: Optional[float] = None
    gpu_available: bool
    active_streams: int
    timestamp: datetime
