# B1. Camera Management and Video Streaming System

**Candidate:** Truong Tuan Anh (Trương Tuấn Anh)  
**Date:** 2026-06-05
**Repository:** camstream-manager  

> Main body targets **≤2 printed A4 pages**. Code, screenshots, demo video, AI log, and references are **outside** this limit.  
> Detailed architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Reproduction steps: [`../README.md`](../README.md).

---

## 1. Problem Understanding

ORBRO assignment **B1** requires a system that:

- Manages IP-style cameras via **RTSP URLs** (CRUD, enable/disable, grid placement, target FPS).
- Displays **multiple live video channels** on a web dashboard (minimum 4; design toward 32).
- Monitors each channel: **connection status**, measured **FPS**, **latency**, uptime, reconnect count, last frame time, and last error.
- Surfaces **system resources**: CPU, RAM, and GPU where available.
- Handles **stream loss** with detection and **automatic reconnect**, with an observable event log.

Constraints for this submission: use company sample video (`far.mp4`), simulate cameras with **local RTSP** (not cloud), and make the stack **reproducible** with `docker compose up -d --build`.

---

## 2. System Architecture

End-to-end data path:

```text
b1_streaming/far.mp4
    → FFmpeg (-stream_loop, libx264) × N publishers
    → MediaMTX (RTSP :8554, paths cam1..cam32)
    → FastAPI StreamWorker per camera (OpenCV RTSP read)
    → resize + JPEG encode + ChannelState metrics
    → WebSocket /ws/streams/{id} → React grid cells
```

Supporting services:

| Layer | Technology | Role |
|-------|------------|------|
| RTSP simulation | Docker, FFmpeg, MediaMTX | Loop MP4 to `rtsp://mediamtx:8554/camN` |
| Persistence | SQLite + SQLAlchemy | Camera configuration |
| Runtime state | In-memory `ChannelState` | FPS, latency, status, reconnect counters |
| API | FastAPI | CRUD, status, metrics, events |
| UI | React + Vite (nginx in Docker) | Grid 4/8/16/32, admin, status table, events |

The **seed** container registers four demo cameras on first startup. Backend containers must use hostname **`mediamtx`**, not `127.0.0.1`, to reach RTSP.

---

## 3. Core Design Decisions

### 3.1 Local RTSP via FFmpeg and MediaMTX

**Why:** Matches the assignment (real RTSP ingest, not direct file read in the worker). One command brings up publishers and the RTSP server; reviewers can verify with VLC (`rtsp://127.0.0.1:8554/cam1`).

### 3.2 One worker thread per stream

**Why:** Simple isolation—one camera failure does not block others; maps cleanly to camera ID and status APIs. **Trade-off:** 32 threads decoding on one host is CPU-heavy; acceptable for demo, not for 80 production cameras without pooling or hardware decode.

### 3.3 RTSP to browser-viewable format

**Choice:** Server-side decode (OpenCV) → resize to configured resolution → **JPEG** frames over **WebSocket**, plus JSON meta (FPS, latency).

**Why:** Fast to implement, full control of **per-channel FPS throttle** on the server. **Trade-off:** Higher bandwidth than WebRTC/HLS at scale.

### 3.4 Per-cell FPS control

`target_fps` sets `emit_interval = 1 / target_fps`. On update, **`update_fps_only()`** changes the throttle **without** closing the RTSP session (no extra reconnect).

### 3.5 Connection loss detection

- No frame within **`CAMSTREAM_FRAME_TIMEOUT_SEC`** (default 5s) → fault, status moves to reconnecting/disconnected.
- `last_frame_at`, `last_error`, and `disconnected_at` exposed via status API.

### 3.6 Auto reconnect

Exponential backoff between **`CAMSTREAM_RECONNECT_BASE_SEC`** and **`CAMSTREAM_RECONNECT_MAX_SEC`** (1–30s). `reconnect_count` increments; events logged via `GET /api/events`.

---

## 4. Implementation Details

| Module | Implementation |
|--------|----------------|
| **Camera CRUD** | `POST/GET/PUT/DELETE /api/cameras`; `StreamManager.apply_camera_update()` starts/stops workers |
| **Stream status** | `ChannelState.snapshot()`; `GET /api/cameras/{id}/status` and `GET /api/cameras/status/all` |
| **Grid (4 channels)** | `GridViewPage` + `StreamCell`; WebSocket per camera; layouts 4/8/16/32 |
| **Scale to 32** | `CAMSTREAM_MAX_CHANNELS=32`; MediaMTX paths in `mediamtx.yml`; UI grid slots 0–31 |
| **CPU / RAM / GPU** | `psutil`; GPU via `nvidia-smi` then `pynvml`; `/api/metrics/system` + history for sparklines |

---

## 5. Measurement Results

Measured on the submitter’s machine with four streams **connected** in the dashboard.  
**Command:** `.\scripts\benchmark-metrics.ps1 -Channels 4 -DurationSec 30 -TargetFps 10`  
**Raw data:** `docs/benchmark-results/benchmark-4-ch-20260604-214146.json` (captured 2026-06-04T14:42:17Z)

### 5.1 Test environment

| Item | Value |
|------|--------|
| OS | Windows 11 (build 26200) |
| CPU | 12th Gen Intel Core i7-12650H |
| RAM | 32 GB system RAM |
| Host GPU | NVIDIA GeForce RTX 4050 Laptop GPU + Intel UHD Graphics |
| Docker | 29.2.0 |
| Git commit | `a90433d` |

### 5.2 Results summary

| Metric | Result |
|--------|--------|
| Test device | Intel i7-12650H, 32 GB RAM; RTX 4050 on host (not used by backend container) |
| Concurrent channels | 4 |
| Input stream | RTSP loop from provided `far.mp4` (MediaMTX + FFmpeg publishers) |
| Output display | Web grid (Docker frontend :8080) |
| Average FPS / channel | Ch1 **8.30**, Ch2 **19.68**, Ch3 **8.34**, Ch4 **20.89** (mean **14.20** FPS) |
| Average latency | **~52.8 ms** per channel (server resize + JPEG encode; see note below) |
| CPU usage | **49.81%** average (host, during 30 s sample) |
| Memory usage | **21.16%** (~**3028 MB** used of 32 GB) |
| GPU usage | **Not available** in backend (`gpu_available: false`). Ingest used **CPU decoding only** (OpenCV in Docker without `nvidia-smi` / GPU passthrough). |
| Reconnect timeout | **5 s** without frame (`CAMSTREAM_FRAME_TIMEOUT_SEC`) |
| Auto reconnect | Configured (exponential backoff 1–30 s); stable run showed `reconnect_count: 0` on all four channels during benchmark |

**Per-channel detail (30 s sample, all `connected`):**

| Camera | DB target FPS | Avg measured FPS | Avg latency (ms) | Reconnects |
|--------|---------------|------------------|------------------|------------|
| 1 | 10 | 8.30 | 52.91 | 0 |
| 2 | 30* | 19.68 | 52.73 | 0 |
| 3 | 10 | 8.34 | 52.92 | 0 |
| 4 | 30* | 20.89 | 52.74 | 0 |

\*Channels 2 and 4 were left at **30 FPS** in the database from earlier UI tests; channels 1 and 3 at **10 FPS**. The benchmark script label `TargetFps 10` documents the test intent; measured FPS reflects **actual per-camera `target_fps`**.

**Latency note:** The reported **~53 ms** is **server-side processing latency** (decode → resize → JPEG), not browser glass-to-glass delay. Do not compare it to informal “300–800 ms” end-to-end estimates from other setups.

**GPU note:** The laptop has an RTX 4050, but the **Docker backend does not expose GPU metrics or hardware decode** in this demo stack. Reporting GPU utilization would be misleading; only CPU/RAM metrics from `psutil` inside the container are valid here.

**Manual reconnect check (recommended for demo video):** `docker compose stop rtsp-pub-1` → grid/status show `reconnecting` and Events log entries → `docker compose start rtsp-pub-1` → stream returns to `connected` (typically within a few backoff attempts).

### 5.3 Short analysis

With four concurrent RTSP ingests, average host **CPU ~50%** and **RAM ~3 GB** (~21% of 32 GB) were observed. Channels configured at 10 FPS delivered **~8.3 FPS** measured (slightly below target, likely decode/load overhead); channels at 30 FPS delivered **~20 FPS** measured. Latency was **stable ~53 ms** across channels, consistent with shared JPEG pipeline cost. GPU was **not used** for decode in Docker; scaling beyond demo channel counts would require GPU passthrough, hardware decode, or lower resolution/FPS defaults.

---

## 6. Operational and Scalability Considerations

| Scenario | Current behavior | Scale-out options |
|----------|------------------|-------------------|
| **RTSP loss** | Backoff reconnect, `reconnecting` status, events API | Redundant publishers; health checks on MediaMTX |
| **Decoder hang** | Worker thread blocks; stop/start via camera update or backend restart | Watchdog process; kill + respawn worker; separate ingest process per N cameras |
| **8 → 32 → 80 channels** | CPU decode + JPEG WebSocket dominate | Lower default resolution/FPS; **GPU decode** (NVDEC); **process pool**; dedicated **stream gateway**; split workers by host |
| **WebSocket fan-out** | One encode per camera, N browser clients share path | CDN/HLS for many viewers; WebRTC for low latency |

---

## 7. Limitations

- **Local demo** only: no TLS, no authentication, no multi-tenant isolation.
- **Not validated** at 32 simultaneous decodes on one machine (UI supports 32 slots; compose ships 4 RTSP publishers).
- **Not production-ready** for 80 real cameras on a single node.
- **Latency metric** is processing latency, hardware-dependent.
- **Event log** is in-memory (cleared on backend restart).

---

## 8. Future Improvements

- **WebRTC** or **LL-HLS** for lower latency and better fan-out.
- **Hardware decoding** (NVDEC / QuickSync) and optional GPU encoding.
- **Alerting** (Prometheus rules, PagerDuty) on sustained `reconnecting` or CPU thresholds.
- **Observability**: Prometheus + Grafana dashboards per channel and host.
- **Kubernetes**: horizontal pod autoscaling for ingest workers; MediaMTX as StatefulSet or managed RTSP service.

---

## English abstract

CamStream Manager delivers ORBRO B1: company video is looped to local RTSP (MediaMTX + FFmpeg); FastAPI ingests up to 32 channels with per-channel FPS throttling, health monitoring, and auto-reconnect; a React dashboard provides multi-layout grids, camera administration, status and event views, and CPU/RAM/GPU metrics. Measurements must be recorded on the submitter’s hardware using `scripts/benchmark-metrics.ps1` and inserted in Section 5.
