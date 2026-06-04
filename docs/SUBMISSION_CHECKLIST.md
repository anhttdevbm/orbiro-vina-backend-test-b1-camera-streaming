# Checklist nộp bài ORBRO (B1)

Đánh dấu khi hoàn tất. Đính kèm link GitHub hoặc file zip.

## Bắt buộc

- [ ] **README** — `README.md` (cài đặt, chạy, reproduce)
- [ ] **Báo cáo** — `docs/REPORT.md` (≤2 trang A4 phần chính, đã điền số đo thật)
- [ ] **Code** — repo đầy đủ hoặc zip
- [ ] **Ảnh dashboard** — `docs/demo/screenshots/` (xem `docs/demo/README.md`)
- [ ] **Video demo 4 luồng** — `docs/demo/video/` (30–90 giây, thấy 4 video + metrics)
- [ ] **AI Usage Log** — `ai/AI_USAGE_LOG.md` (≥5 hội thoại)
- [ ] **AI Retrospective** — `ai/AI_RETROSPECTIVE.md` (300–500 từ)
- [ ] **References** — `REFERENCES.md` (URL + ngày truy cập)

## Trước khi quay video / chụp ảnh

1. `docker compose up -d`
2. Backend + frontend chạy
3. `.\scripts\seed-demo-cameras.ps1`
4. Tab **Video grid** — layout 4 kênh, video chuyển động
5. Tab **Status**, **Events** — có dữ liệu
6. Header — CPU/RAM/GPU + sparkline

## Đo số liệu báo cáo

```powershell
.\scripts\benchmark-metrics.ps1 -Channels 4 -DurationSec 30 -TargetFps 10
# Kết quả: docs/benchmark-results/*.json → copy vào docs/REPORT.md
```

## Phản hồi ORBRO (email)

- Ngày dự kiến nộp: _(điền)_
- Ngôn ngữ báo cáo: Tiếng Việt + English abstract trong `docs/REPORT.md`
