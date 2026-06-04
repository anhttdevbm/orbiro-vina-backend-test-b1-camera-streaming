# CamStream Manager (ORBRO B1)

Hệ thống quản lý camera và streaming video: RTSP ingest, giám sát đa kênh trên web, CRUD camera, trạng thái/FPS/latency, metrics CPU/RAM/GPU. Thiết kế mở rộng tới **32 kênh**.

## Yêu cầu

| Thành phần | Phiên bản |
|------------|-----------|
| Docker Desktop | Chạy engine (Linux containers) |
| Python | 3.11+ |
| Node.js | 18+ |
| Video mẫu | `b1_streaming/far.mp4` (từ `Video_BE.zip`) |

## Chạy bằng Docker (khuyến nghị — một lệnh)

**Yêu cầu:** Docker Desktop đang chạy, file `b1_streaming/far.mp4` có sẵn.

```powershell
cd E:\Project\camstream-manager
docker compose up -d --build
```

Đợi ~30–60 giây (build lần đầu lâu hơn). Service `seed` tự đăng ký 4 camera.

| Dịch vụ | URL |
|---------|-----|
| **Dashboard** | http://localhost:8080 |
| API Swagger | http://localhost:8000/docs |
| RTSP (VLC) | `rtsp://127.0.0.1:8554/cam1` … `cam4` |

```powershell
docker compose ps          # trạng thái container
docker compose logs -f backend frontend
docker compose down          # dừng toàn bộ
```

Hoặc: `.\scripts\docker-up.ps1 -Build`

> **Lưu ý:** Camera trong DB dùng URL `rtsp://mediamtx:8554/camN` (mạng Docker). Backend container đọc RTSP qua hostname `mediamtx`.

---

## Chạy local (dev — không Docker cho app)

### Cài đặt

```powershell
cd backend && python -m venv .venv && .\.venv\Scripts\pip install -r requirements.txt
cd ..\frontend && npm install
```

### RTSP only

```powershell
docker compose up -d mediamtx rtsp-pub-1 rtsp-pub-2 rtsp-pub-3 rtsp-pub-4
```

### Backend + Frontend

```powershell
# terminal 1
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend
npm run dev
```

UI dev: http://localhost:5173 — seed: `.\scripts\seed-demo-cameras.ps1` (RTSP URL `mediamtx` nếu backend trong Docker; `127.0.0.1` nếu backend trên host và RTSP port map 8554)

## Đo hiệu năng (cho báo cáo)

```powershell
# Hệ thống + 4 camera đang chạy
.\scripts\benchmark-metrics.ps1 -Channels 4 -DurationSec 30 -TargetFps 10
```

Kết quả JSON: `docs/benchmark-results/` → copy vào `docs/REPORT.md`.

## Xác nhận nhanh

| Kiểm tra | Cách |
|----------|------|
| 4 video | Tab Video grid, layout 4 |
| FPS từng ô | Dropdown → hot-reload |
| Reconnect | Tắt 1 publisher Docker → Events/Status |
| Metrics | Header CPU/RAM/GPU |
| CRUD | Tab Cameras hoặc Swagger |

## Cấu trúc repo

```
camstream-manager/
├── docker-compose.yml      # MediaMTX + FFmpeg publishers
├── b1_streaming/far.mp4
├── backend/app/              # FastAPI, ingest, metrics
├── frontend/src/             # React admin + grid
├── scripts/
│   ├── seed-demo-cameras.ps1
│   └── benchmark-metrics.ps1
├── docs/
│   ├── REPORT.md             # Báo cáo nộp (≤2 trang A4 phần chính)
│   ├── ARCHITECTURE.md
│   ├── SUBMISSION_CHECKLIST.md
│   └── demo/                 # screenshots + video
├── ai/                       # AI_USAGE_LOG, AI_RETROSPECTIVE
└── REFERENCES.md
```

## API

- `POST/GET/PUT/DELETE /api/cameras`
- `GET /api/cameras/{id}/status`
- `GET /api/metrics/system` · `GET /api/metrics/history`
- `GET /api/events?camera_id=1&limit=20`
- `WS /ws/streams/{camera_id}`

## Cấu hình (`backend/.env`)

```env
CAMSTREAM_DATABASE_URL=sqlite:///./data/camstream.db
CAMSTREAM_MAX_CHANNELS=32
CAMSTREAM_FRAME_TIMEOUT_SEC=5
CAMSTREAM_RECONNECT_BASE_SEC=1
CAMSTREAM_RECONNECT_MAX_SEC=30
```

## Tài liệu nộp bài ORBRO

| Tài liệu | Đường dẫn |
|----------|-----------|
| README | `README.md` (file này) |
| Báo cáo + đo lường | `docs/REPORT.md` |
| Kiến trúc chi tiết | `docs/ARCHITECTURE.md` |
| Checklist nộp | `docs/SUBMISSION_CHECKLIST.md` |
| Screenshot / video | `docs/demo/README.md` |
| AI log | `ai/AI_USAGE_LOG.md` |
| AI retrospective | `ai/AI_RETROSPECTIVE.md` |
| References | `REFERENCES.md` |

## Troubleshooting

| Vấn đề | Gợi ý |
|--------|--------|
| `docker compose` lỗi pipe | Bật Docker Desktop |
| Backend lỗi PostgreSQL | Dùng prefix `CAMSTREAM_` (xem `.env`) |
| Grid không video | RTSP chạy? Đã seed camera? Backend port 8000? |
| GPU N/A | Bình thường nếu không có NVIDIA / `nvidia-smi` |

## English summary

Local RTSP is simulated by looping `far.mp4` via Docker (MediaMTX + FFmpeg). FastAPI ingests RTSP with per-channel FPS throttling and health monitoring; React provides a multi-layout grid, admin pages, and system metrics (psutil + NVIDIA tools), designed for up to 32 channels.
