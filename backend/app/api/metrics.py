from fastapi import APIRouter

from app.metrics import collect_system_metrics, get_metrics_history
from app.schemas import SystemMetricsResponse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/system", response_model=SystemMetricsResponse)
def system_metrics():
    return collect_system_metrics()


@router.get("/history", response_model=list[SystemMetricsResponse])
def metrics_history(limit: int = 60):
    """Recent system samples (filled by GET /system polls)."""
    return get_metrics_history(limit)
