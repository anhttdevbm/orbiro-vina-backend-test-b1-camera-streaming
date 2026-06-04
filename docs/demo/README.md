# Demo artifacts (screenshots & video)

Thư mục này dùng cho **tài liệu nộp bài**, không ảnh hưởng runtime.

## Screenshots (bắt buộc)

Lưu PNG vào `docs/demo/screenshots/`:

| File gợi ý | Nội dung |
|------------|----------|
| `01-grid-4ch.png` | Tab **Video grid**, 4 ô có video + FPS/latency |
| `02-cameras-list.png` | Tab **Cameras**, bảng danh sách |
| `03-camera-form.png` | Form thêm hoặc sửa camera |
| `04-status.png` | Tab **Status**, bảng trạng thái |
| `05-events.png` | Tab **Events**, log reconnect |
| `06-metrics.png` | Header CPU/RAM/GPU + sparkline |

**Cách chụp:** Windows `Win+Shift+S` hoặc Snipping Tool — full browser http://localhost:5173.

## Video demo 4 luồng (bắt buộc)

Lưu file vào `docs/demo/video/` (ví dụ `demo-4channels.mp4`).

**Nội dung tối thiểu (30–90 giây):**

1. Mở grid 4 kênh — thấy 4 video loop.
2. Đổi FPS một ô (10 → 5) — stream chậm hơn.
3. (Tùy chọn) Tắt một container RTSP → trạng thái reconnect → bật lại.
4. Hiện header metrics CPU/RAM.

**Công cụ gợi ý:** OBS Studio, Xbox Game Bar (`Win+G`), hoặc ShareX.

## Ghi trong báo cáo

Trong `docs/REPORT.md` mục demo, thêm:

- Đường dẫn ảnh/video trong repo, hoặc
- Link cloud (Google Drive) nếu file video quá lớn cho Git.
