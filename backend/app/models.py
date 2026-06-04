from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    rtsp_url: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_width: Mapped[int] = mapped_column(Integer, default=640)
    resolution_height: Mapped[int] = mapped_column(Integer, default=360)
    target_fps: Mapped[float] = mapped_column(Float, default=10.0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    grid_slot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
