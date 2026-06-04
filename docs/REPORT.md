# Báo cáo B1 — Hệ thống quản lý camera và streaming video

**Ứng viên:** _(điền họ tên)_  
**Ngày:** _(điền)_  
**Repository:** camstream-manager  

> Phần thân báo cáo ≤2 trang A4 khi in. Code, AI log, references, screenshot, video **không** tính vào giới hạn.

---

## 1. Bài tập và phạm vi

Chọn **B1 (Camera management & video streaming)** theo đề ORBRO. Hệ thống:

- Phát lặp video mẫu thành RTSP local (FFmpeg + MediaMTX).
- API CRUD camera; ingest RTSP; dashboard grid tối thiểu 4 kênh, thiết kế tới 32.
- Trạng thái kênh, FPS/latency, auto-reconnect, metrics CPU/RAM/GPU.

## 2. Kiến trúc (tóm tắt)

```
far.mp4 → FFmpeg (-stream_loop) → MediaMTX → OpenCV ingest → JPEG → WebSocket → React grid
                ↑                              ↑
         docker compose                  FastAPI + SQLite
```

Chi tiết: `docs/ARCHITECTURE.md`.

## 3. Quyết định thiết kế cốt lõi

| Hạng mục | Lựa chọn | Lý do |
|----------|----------|-------|
| RTSP local | MediaMTX + 4 publisher Docker | Tái lập một lệnh `docker compose` |
| Web | WebSocket + JPEG | Throttle FPS phía server; phù hợp demo |
| Đồng thời | 1 worker thread / camera | Đơn giản, debug từng kênh |
| FPS grid | `emit_interval = 1/target_fps` | Giảm CPU khi nhiều kênh |
| Health | Frame timeout 5s + reconnect backoff | Đúng yêu cầu giám sát |
| Hot FPS | `update_fps_only` | Bonus: không ngắt RTSP |

## 4. Kết quả đo lường

> **Bắt buộc:** Điền số liệu từ môi trường thật. Chạy `.\scripts\benchmark-metrics.ps1 -Channels 4` (và 8 nếu có đủ RTSP).

### 4.1 Môi trường thực thi

| Hạng mục | Giá trị |
|----------|---------|
| OS | _(vd. Windows 11)_ |
| CPU | _(vd. Intel i7-12700, 12 core)_ |
| RAM | _(vd. 16 GB)_ |
| GPU | _(có/không, model)_ |
| Docker | _(version)_ |
| Commit / tag | _(git rev)_ |

### 4.2 Bảng đo (điền sau benchmark)

| Kênh active | Target FPS | FPS đo (TB) | Latency ms (TB) | CPU % (TB) | RAM % (TB) |
|-------------|------------|-------------|-----------------|------------|------------|
| 4 | 10 | | | | |
| 8 | 5 | | | | |

*TB = trung bình trong 30s sampling (`scripts/benchmark-metrics.ps1`).*

**Ghi chú latency:** Đo thời gian resize + JPEG encode trên server (+ offset cố định), **không** phải độ trễ glass-to-glass RTSP.

### 4.3 Nhận xét ngắn

_(2–3 câu: ví dụ CPU tăng tuyến tính theo kênh; FPS gần target khi 4 kênh; …)_

## 5. Vận hành và mở rộng

- **Đứt stream:** `reconnecting` + backoff; `reconnect_count` và events API.
- **Decoder treo:** Có thể thêm watchdog kill subprocess OpenCV.
- **Bottleneck 8→80 kênh:** CPU decode trước, sau đó băng thông WebSocket JPEG; giải pháp: HW decode, WebRTC relay, giảm FPS/resolution mặc định.

## 6. Hạn chế

- Latency metric là processing latency.
- Chưa load-test đủ 32 kênh video đồng thời trên một máy (UI hỗ trợ 32 ô).
- Event log in-memory (mất khi restart backend).

---

## English abstract

CamStream Manager implements ORBRO assignment B1: company video is looped to local RTSP via MediaMTX and FFmpeg; a FastAPI backend ingests up to 32 channels with per-channel FPS throttling, health monitoring, and auto-reconnect; a React dashboard provides multi-layout grids, camera admin, status tables, and system metrics (CPU/RAM/GPU via psutil and NVIDIA tools). Measurements must be taken on the submitter’s hardware using the provided benchmark script.
