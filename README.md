# CamStream Manager (ORBRO B1)

Multi-channel camera management and video monitoring for the ORBRO B1 assignment. The stack simulates IP cameras with **local RTSP** (MediaMTX + FFmpeg), ingests streams on the server (OpenCV), and serves a React admin dashboard with live preview, per-channel FPS control, status monitoring, auto-reconnect events, and system metrics (CPU/RAM/GPU). Designed to scale up to **32 channels**.

---

## Prerequisites

| Component | Version / notes |
|-----------|-----------------|
| **Docker Desktop** | Required for the recommended one-command run (Linux containers enabled) |
| **Python** | 3.11+ (local backend dev only) |
| **Node.js** | 18+ (local frontend dev only) |
| **Sample video** | `b1_streaming/far.mp4` from company `Video_BE.zip` |

Place the sample file before starting:

```text
camstream-manager/
  b1_streaming/
    far.mp4    ← required for RTSP publishers
```

---

## Quick start (Docker — recommended)

Graders should use this path to reproduce the full system.

### 1. Clone and prepare video

```powershell
cd camstream-manager
# Ensure b1_streaming/far.mp4 exists (see above)
```

### 2. Start the stack

```powershell
docker compose up -d --build
```

First build may take several minutes. Wait **30–60 seconds** after containers are up for the backend health check, seed job, and stream workers to connect.

Alternative helper script:

```powershell
.\scripts\docker-up.ps1 -Build
```

### 3. Open the dashboard

| Service | URL |
|---------|-----|
| **Dashboard (UI)** | http://localhost:8080 |
| **API (Swagger)** | http://localhost:8000/docs |
| **RTSP (VLC / ffplay on host)** | `rtsp://127.0.0.1:8554/cam1` … `cam4` |

The one-shot **`seed`** service registers four demo cameras automatically. Each camera uses:

`rtsp://mediamtx:8554/camN` (Docker internal hostname — **not** `127.0.0.1` inside the backend container).

### 4. Useful commands

```powershell
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

---

## Verify the installation

Use this checklist after `docker compose up -d --build`:

| Check | How |
|-------|-----|
| **4 live videos** | Tab **Video grid** → layout **4** → four cells show moving video |
| **Per-cell FPS** | Change FPS dropdown on a cell → stream rate updates without full reconnect |
| **Status table** | Tab **Status** → connected / FPS / latency / uptime / reconnects |
| **Events log** | Tab **Events** → entries after reconnect tests |
| **System metrics** | Header bar → CPU, RAM, GPU (GPU may show N/A without NVIDIA) |
| **CRUD cameras** | Tab **Cameras** or Swagger `POST/PUT/DELETE /api/cameras` |

### Optional: reconnect demo

```powershell
docker compose stop rtsp-pub-1
# Observe grid/status → reconnecting + Events log
docker compose start rtsp-pub-1
```

---

## Adding cameras manually

When creating a camera in the UI or API:

| Environment | RTSP URL example |
|-------------|------------------|
| **Backend in Docker** (default) | `rtsp://mediamtx:8554/cam1` … `cam4` |
| **Backend on host**, RTSP in Docker | `rtsp://127.0.0.1:8554/cam1` … `cam4` |

Only **`cam1`–`cam4`** have active FFmpeg publishers in `docker-compose.yml`. Paths like `cam5` will fail until you add another publisher.

Re-seed demo cameras (local dev / if seed was skipped):

```powershell
.\scripts\seed-demo-cameras.ps1
```

---

## Local development (without Docker for app)

### Install dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt

cd ..\frontend
npm install
```

### Start RTSP only (Docker)

```powershell
docker compose up -d mediamtx rtsp-pub-1 rtsp-pub-2 rtsp-pub-3 rtsp-pub-4
```

### Run backend and frontend

```powershell
# Terminal 1 — backend
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

| Dev UI | http://localhost:5173 |
| API | http://localhost:8000/docs |

Use `rtsp://127.0.0.1:8554/camN` in camera URLs when the backend runs on the host and port **8554** is published by MediaMTX.

---

## Performance benchmark (for report)

With the stack running and four streams active:

```powershell
.\scripts\benchmark-metrics.ps1 -Channels 4 -DurationSec 30 -TargetFps 10
```

Output JSON is written under `docs/benchmark-results/`. Copy summarized numbers into `docs/REPORT.md`.

---

## Features (B1 scope)

- **Camera management** — CRUD, enable/disable, grid slot, target FPS
- **RTSP ingestion** — OpenCV pull, server-side FPS throttle, JPEG over WebSocket
- **Video grid** — layouts 4 / 8 / 16 / 32
- **FPS control** — hot reload per channel without tearing down RTSP
- **Stream status** — connected / reconnecting / disconnected, FPS, latency, uptime
- **Auto reconnect** — exponential backoff, fault events API
- **System resources** — CPU, RAM, GPU (NVIDIA via `nvidia-smi` / `pynvml` fallback)
- **Admin UI** — grid, cameras, status table, events log, metrics sparklines

---

## Project structure

```text
camstream-manager/
├── docker-compose.yml       # MediaMTX, FFmpeg publishers, backend, frontend, seed
├── mediamtx.yml             # RTSP paths cam1–cam32
├── b1_streaming/far.mp4     # Sample video (not in git — add locally)
├── backend/app/             # FastAPI, StreamManager, metrics, events
├── frontend/src/            # React admin + grid + WebSocket cells
├── scripts/
│   ├── docker-up.ps1
│   ├── seed-demo-cameras.ps1
│   └── benchmark-metrics.ps1
├── docs/
│   ├── REPORT.md            # Submission report (≤2 pages main body)
│   ├── ARCHITECTURE.md
│   ├── SUBMISSION_CHECKLIST.md
│   └── demo/                # screenshots/ + video/ for submission
├── ai/
│   ├── AI_USAGE_LOG.md       # index → docs/ai-log.md
│   └── AI_RETROSPECTIVE.md
└── REFERENCES.md
```

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cameras` | Create camera |
| `GET` | `/api/cameras` | List cameras |
| `GET` | `/api/cameras/{id}` | Get camera |
| `PUT` | `/api/cameras/{id}` | Update camera |
| `DELETE` | `/api/cameras/{id}` | Delete camera |
| `GET` | `/api/cameras/{id}/status` | Single channel status |
| `GET` | `/api/cameras/status/all` | All channel statuses (status page) |
| `GET` | `/api/metrics/system` | Current CPU/RAM/GPU |
| `GET` | `/api/metrics/history` | Metrics history for sparklines |
| `GET` | `/api/events` | Fault / reconnect event log |
| `WS` | `/ws/streams/{camera_id}` | JPEG frames + JSON meta |

Interactive docs: http://localhost:8000/docs

---

## Configuration

Environment variables use the prefix **`CAMSTREAM_`** (avoids clashes with host tools such as PostgreSQL `DATABASE_URL`).

Example `backend/.env`:

```env
CAMSTREAM_DATABASE_URL=sqlite:///./data/camstream.db
CAMSTREAM_MAX_CHANNELS=32
CAMSTREAM_FRAME_TIMEOUT_SEC=5
CAMSTREAM_RECONNECT_BASE_SEC=1
CAMSTREAM_RECONNECT_MAX_SEC=30
CAMSTREAM_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Docker Compose sets these for the backend container automatically.

---

## Submission documents (ORBRO)

| Document | Path |
|----------|------|
| **README (this file)** | `README.md` |
| Report + measurements | `docs/REPORT.md` |
| Architecture detail | `docs/ARCHITECTURE.md` |
| Submission checklist | `docs/SUBMISSION_CHECKLIST.md` |
| Screenshots / demo video | `docs/demo/README.md` |
| AI usage log | `docs/ai-log.md` (index: `ai/AI_USAGE_LOG.md`) |
| AI retrospective | `docs/ai-retrospective.md` (index: `ai/AI_RETROSPECTIVE.md`) |
| References | `docs/references.md` (index: `REFERENCES.md`) |

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| `docker compose` pipe / engine error | Start **Docker Desktop** and wait until it is running |
| Backend fails on DB URL | Use `CAMSTREAM_` prefix; see `backend/.env` |
| Grid shows black / “Failed to open RTSP stream” | Confirm `far.mp4` exists; RTSP publishers running; camera URL uses **`mediamtx`** inside Docker, not `127.0.0.1` |
| New camera on `cam5` fails | Only `cam1`–`cam4` are published by default |
| Status table shows only dashes | Rebuild after README fix: `docker compose up -d --build backend frontend` |
| GPU shows N/A | Normal without NVIDIA GPU or `nvidia-smi` in the backend image |
| Seed skipped / empty camera list | Run `.\scripts\seed-demo-cameras.ps1` or `POST /api/cameras` via Swagger |

---

## Architecture (short)

```text
far.mp4 → FFmpeg (×4) → MediaMTX :8554/cam1..4
                              ↓ RTSP
                    FastAPI StreamWorker (per camera)
                              ↓ WebSocket JPEG
                    React dashboard (grid + admin)
```

Full diagrams and design notes: `docs/ARCHITECTURE.md`.

---

## License / assignment

Built for the ORBRO technical assignment **B1 — Camera management & multi-channel streaming**. For questions about submission format, refer to the assignment brief and `docs/SUBMISSION_CHECKLIST.md`.
