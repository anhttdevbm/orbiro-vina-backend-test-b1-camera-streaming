from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="CAMSTREAM_",
        extra="ignore",
    )

    database_url: str = "sqlite:///./data/camstream.db"
    max_channels: int = 32
    frame_timeout_sec: float = 5.0
    reconnect_base_sec: float = 1.0
    reconnect_max_sec: float = 30.0
    default_width: int = 640
    default_height: int = 360
    jpeg_quality: int = 75
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


settings = Settings()
