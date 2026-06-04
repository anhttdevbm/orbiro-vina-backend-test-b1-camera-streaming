import logging
import subprocess
from collections import deque
from datetime import datetime, timezone

import psutil

from app.schemas import SystemMetricsResponse
from app.stream.manager import stream_manager

logger = logging.getLogger(__name__)

_METRICS_HISTORY: deque[SystemMetricsResponse] = deque(maxlen=120)
_nvml_initialized = False

_GPU_SOURCE: str = "none"  # nvidia-smi | pynvml | none


def get_gpu_source() -> str:
    return _GPU_SOURCE


def _gpu_stats_nvidia_smi() -> tuple[bool, float | None, float | None, float | None]:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=utilization.gpu,memory.used,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return False, None, None, None
        line = result.stdout.strip().split("\n")[0]
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 3:
            return False, None, None, None
        return True, float(parts[0]), float(parts[1]), float(parts[2])
    except (FileNotFoundError, subprocess.TimeoutExpired, ValueError):
        return False, None, None, None


def _gpu_stats_pynvml() -> tuple[bool, float | None, float | None, float | None]:
    global _nvml_initialized
    try:
        import pynvml  # nvidia-ml-py

        if not _nvml_initialized:
            pynvml.nvmlInit()
            _nvml_initialized = True
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        util = pynvml.nvmlDeviceGetUtilizationRates(handle)
        mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
        return (
            True,
            float(util.gpu),
            mem.used / (1024 * 1024),
            mem.total / (1024 * 1024),
        )
    except Exception as e:
        logger.debug("pynvml unavailable: %s", e)
        return False, None, None, None


def _gpu_stats() -> tuple[bool, float | None, float | None, float | None]:
    global _GPU_SOURCE
    ok, pct, used, total = _gpu_stats_nvidia_smi()
    if ok and pct is not None:
        _GPU_SOURCE = "nvidia-smi"
        return ok, pct, used, total
    ok, pct, used, total = _gpu_stats_pynvml()
    if ok and pct is not None:
        _GPU_SOURCE = "pynvml"
        return ok, pct, used, total
    _GPU_SOURCE = "none"
    return False, None, None, None


def collect_system_metrics() -> SystemMetricsResponse:
    mem = psutil.virtual_memory()
    gpu_ok, gpu_pct, gpu_used, gpu_total = _gpu_stats()
    active = stream_manager.active_stream_count()
    metrics = SystemMetricsResponse(
        cpu_percent=psutil.cpu_percent(interval=0.1),
        memory_percent=mem.percent,
        memory_used_mb=mem.used / (1024 * 1024),
        memory_total_mb=mem.total / (1024 * 1024),
        gpu_percent=gpu_pct,
        gpu_memory_used_mb=gpu_used,
        gpu_memory_total_mb=gpu_total,
        gpu_available=gpu_ok and gpu_pct is not None,
        active_streams=active,
        timestamp=datetime.now(timezone.utc),
    )
    _METRICS_HISTORY.append(metrics)
    return metrics


def get_metrics_history(limit: int = 60) -> list[SystemMetricsResponse]:
    limit = max(1, min(limit, len(_METRICS_HISTORY) or 1))
    return list(_METRICS_HISTORY)[-limit:]
