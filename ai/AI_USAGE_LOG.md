# AI Usage Log — CamStream Manager (B1)

| Tool | Model | Version / date | Purpose |
|------|-------|----------------|---------|
| Cursor IDE | Auto (agent) | Session 2026-06-03 | Phân tích đề, scaffold, review module, tài liệu nộp bài |

---

## Hội thoại chính (≥5)

### 1. Phân tích đề B1

- **Prompt:** Gửi toàn bộ đề ORBRO B1/B2; yêu cầu phân tích theo hướng B1.
- **Output dùng:** Checklist module (RTSP, CRUD, ingest, grid, FPS, status, metrics); lộ trình 7 ngày; map tiêu chí chấm điểm.
- **Tự kiểm chứng:** Đối chiếu lại từng bullet đề với repo sau khi scaffold; xác nhận bắt buộc RTSP thật (không đọc file trực tiếp trên UI).

### 2. Scaffold dự án B1

- **Prompt:** Chọn B1 — triển khai project (docker, backend, frontend, README).
- **Output dùng:** `docker-compose.yml`, FastAPI workers, React grid, `seed-demo-cameras.ps1`.
- **Tự kiểm chứng:** `pip install`, `npm run build`; sửa conflict `DATABASE_URL` hệ thống → prefix `CAMSTREAM_`; Docker phải bật thủ công trên máy dev.

### 3. Review module RTSP local

- **Prompt:** Kiểm tra module RTSP (FFmpeg + MediaMTX) đạt yêu cầu chưa.
- **Output dùng:** Bảng đối chiếu; gợi ý verify VLC + `docker compose logs`.
- **Tự kiểm chứng:** Đọc lại `docker-compose.yml` path `cam1..cam4` khớp seed script; ghi chú tên path `cam1` vs `camera1` trong báo cáo.

### 4. Stream ingest, FPS hot-reload, status timestamps

- **Prompt:** Lần lượt review Stream Ingestion, FPS Control, Status Monitoring, Auto Reconnect; yêu cầu sửa khi trả lời "có".
- **Output dùng:** `update_fps_only`, `connected_at`/`disconnected_at`, `log_fault` + Events UI.
- **Tự kiểm chứng:** Trace `ChannelState.update()` và worker loop; test chuyển status bằng script Python; build frontend sau mỗi đợt sửa.

### 5. Frontend Admin + System metrics

- **Prompt:** Grid 4/8/16/32; Admin tabs; pynvml + sparkline charts.
- **Output dùng:** `AppNav`, các `pages/*`, `metrics/history`, `MetricsSparkline`.
- **Tự kiểm chứng:** `npm run build` pass; kiểm tra API proxy `/ws` trong `vite.config.ts`.

### 6. Tài liệu nộp bài (lần này)

- **Prompt:** Module Report & Documentation — chuẩn bị README, báo cáo, benchmark, demo, AI log.
- **Output dùng:** `docs/REPORT.md`, `ARCHITECTURE.md`, `benchmark-metrics.ps1`, checklist, demo README.
- **Tự kiểm chứng:** _(điền sau khi chạy benchmark và chụp ảnh trên máy bạn)_.

---

## Chỉnh sửa thủ công sau AI (checklist)

- [ ] Chạy `docker compose up -d` và xác nhận RTSP trong VLC
- [ ] Chạy `benchmark-metrics.ps1`, điền số thật vào `docs/REPORT.md`
- [ ] Chụp 6 screenshot + quay video 4 kênh
- [ ] Điền tên ứng viên, ngày nộp, môi trường phần cứng
- [ ] Rà soát `AI_RETROSPECTIVE.md` — nội dung trung thực với quá trình làm bài
- [ ] Cập nhật ngày truy cập trong `REFERENCES.md`
