# AI Retrospective (ORBRO B1)

## Tiếng Việt (300–500 từ)

AI (Cursor agent) đóng vai trò **accelerator** trong toàn bộ bài B1, không thay thế hiểu biết và kiểm chứng của người làm bài.

**Hỗ trợ hiệu quả:** Phân tích đề ban đầu giúp map nhanh yêu cầu ORBRO sang các module (RTSP loop, CRUD, ingest, grid, FPS, reconnect, metrics) và tránh sai hướng như đọc file MP4 trực tiếp thay vì RTSP. Scaffold ban đầu (Docker Compose MediaMTX/FFmpeg, FastAPI `StreamWorker`, React dashboard) tiết kiệm nhiều giờ boilerplate và giữ cấu trúc thống nhất. Các lần “review module” theo checklist đề tạo bảng đối chiếu rõ phần đã đạt / còn thiếu — từ đó quyết định có cần sửa (grid 32 kênh, hot-reload FPS, timestamp disconnect, event log) hay chỉ ghi hạn chế trong báo cáo.

**Tự kiểm chứng bắt buộc:** Mọi đoạn code AI đều cần chạy lại trên máy local. Ví dụ: biến môi trường `DATABASE_URL` global trên Windows khiến SQLAlchemy trỏ nhầm PostgreSQL — phải tự phát hiện và đổi sang prefix `CAMSTREAM_`. Docker Desktop không chạy thì `docker compose` fail — AI không thể thay người bật engine. Metric latency được implement là **processing latency** (encode JPEG), không phải end-to-end RTSP; nếu không đọc worker, dễ ghi sai trong báo cáo. FPS hot-reload ban đầu gây reconnect không mong muốn — chỉ sau khi đọc flow `update_config` mới tách `update_fps_only`.

**Thiếu sót / giới hạn AI:** Số đo hiệu năng trong báo cáo AI **không thể** tin được nếu chưa chạy `benchmark-metrics.ps1` trên hardware thật. Gợi ý scale 32 kênh về mặt UI không đồng nghĩa đã load-test 32 decode đồng thời. Một số câu chữ trong log/event có thể trùng khi status đổi nhanh — cần review khi demo.

**Kết luận:** AI phù hợp cho thiết kế khung, implement nhanh, và review theo đề; phần giá trị nộp bài nằm ở reproduce (README), số đo thật, screenshot/video, và khả năng giải thích trade-off (WebSocket JPEG vs WebRTC, thread-per-camera vs pool) trong phỏng vấn.

---

## English summary (optional)

The agent accelerated B1 delivery via requirements mapping, scaffolding, and per-module reviews. Manual verification remained essential (environment conflicts, Docker, metric semantics, hot-reload behavior). Reported performance numbers require running the provided benchmark script on real hardware; AI-generated estimates alone are not acceptable for submission.
