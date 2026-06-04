# AI Usage Log

**Submitter:** Truong Tuan Anh  
**Assignment:** ORBRO B1 — Camera Management and Video Streaming System

---

## Tool Information

- **Tool:** ChatGPT (and Cursor IDE for in-repo implementation sessions)
- **Model:** GPT-5.5 Thinking (ChatGPT); Cursor Auto agent for code edits
- **Date range:** 2026-06-03 — 2026-06-04
- **Purpose:** Architecture design, API design, RTSP/stream debugging, report writing support, submission documentation

> Five main conversations below. I did **not** paste full transcripts. Each section includes **My Verification / Modification** to show what I (Truong Tuan Anh) checked or changed myself.

---

## Conversation 1: Architecture Design

**Prompt:**

> I pasted the ORBRO B1 assignment and asked: analyze requirements, choose B1, propose a reproducible architecture (local RTSP from `far.mp4`, backend ingest, web grid, status and system metrics), and suggest a delivery order.

**AI Output Summary:**

- Suggested stack: **FFmpeg loop → MediaMTX → FastAPI + OpenCV workers → WebSocket JPEG → React dashboard**.
- Split **camera configuration (SQLite)** vs **runtime channel state (in-memory)**.
- Listed modules: Docker, CRUD API, 4-channel grid (extend to 32), FPS/latency per channel, CPU/RAM/GPU, auto-reconnect, README and report.

**My Verification / Modification (Truong Tuan Anh):**

- I re-read every B1 bullet in the company brief and ticked them against my repo before considering the design “done.”
- I **decided** to use WebSocket + JPEG instead of WebRTC/HLS because I needed a one-command Docker demo for reviewers; I wrote that trade-off myself in `docs/ARCHITECTURE.md` and `docs/REPORT.md`.
- On my Windows laptop, backend failed until I found a global `DATABASE_URL` pointing to PostgreSQL — **I** renamed settings to the **`CAMSTREAM_`** prefix; AI had not warned me about that.
- I kept MediaMTX paths `cam1`–`cam32` in config but only deployed **four** FFmpeg publishers in compose; I stated that limit honestly in the report instead of claiming 32 live RTSP sources.

---

## Conversation 2: RTSP Local Streaming

**Prompt:**

> How should I loop `b1_streaming/far.mp4` to local RTSP for the assignment, and what URL should the backend use inside Docker vs on the host?

**AI Output Summary:**

- `docker-compose.yml` with MediaMTX and four FFmpeg containers publishing to `rtsp://mediamtx:8554/cam1`–`cam4`.
- `mediamtx.yml` with many paths; seed service to register cameras in the API.

**My Verification / Modification (Truong Tuan Anh):**

- I ran `docker compose up -d --build` on my machine and opened **`rtsp://127.0.0.1:8554/cam1` in VLC** to confirm video before trusting the grid.
- When I added “Demo Cam 5,” the stream failed — **I** traced it to `rtsp://mediamtx:8554/cam5` (no publisher) and an earlier wrong default `127.0.0.1` in the form; **I** changed `CameraForm.tsx` to default `mediamtx` and added UI hints.
- I wrote the English README note myself: **host** uses `127.0.0.1`, **backend container** uses hostname `mediamtx`.
- I chose not to add a fifth FFmpeg service for the demo; I documented that `cam5+` needs an extra publisher.

---

## Conversation 3: Camera CRUD API

**Prompt:**

> Design FastAPI CRUD for cameras and hook create/update/delete to start or stop stream workers.

**AI Output Summary:**

- REST `/api/cameras`, SQLAlchemy model, `StreamManager.apply_camera_update()` starting `StreamWorker` per camera.
- Docker volume for SQLite; seed job for four demo cameras.

**My Verification / Modification (Truong Tuan Anh):**

- I tested **every** CRUD operation in Swagger and in the **Cameras** tab of my UI — not only AI’s claim that it works.
- I noticed changing FPS via PUT restarted RTSP and increased `reconnect_count`; **I** asked for a fix and verified **`update_fps_only()`** so only `target_fps` changes throttle without reconnect.
- I confirmed `CAMSTREAM_MAX_CHANNELS=32` and grid slots 0–31 match the assignment scale target.
- After backend changes, **I** ran `docker compose build` and checked the grid still loads video through nginx proxy.

---

## Conversation 4: Auto Reconnect Logic

**Prompt:**

> Does my reconnect and health monitoring meet B1? Frame timeout, reconnecting status, backoff, event log.

**AI Output Summary:**

- `ChannelState` for status, errors, timestamps; worker timeout 5 s; backoff 1–30 s.
- `GET /api/events` and Events page; per-camera status API (later bulk status for the table).

**My Verification / Modification (Truong Tuan Anh):**

- **I** ran the reconnect test: `docker compose stop rtsp-pub-1`, watched **RECONNECTING** on the grid and new rows in **Events**, then `start rtsp-pub-1` and confirmed **connected** again.
- When the Status tab showed only dashes, **I** reported the bug; after the bulk status API and polling fix, **I** re-opened the page and confirmed FPS, latency, and uptime populate.
- **I** read `worker.py` to understand latency is **server JPEG processing**, not full RTSP glass-to-glass delay — and **I** wrote that clearly in `docs/REPORT.md` so reviewers are not misled.
- **I** accepted that events are in-memory and noted restart data loss in report §7 — my decision to ship demo scope.

---

## Conversation 5: Benchmark and Report

**Prompt:**

> Help structure README and REPORT (≤2 pages), benchmark script, and how to report GPU when Docker has no GPU metrics.

**AI Output Summary:**

- English README with Docker quick start; REPORT sections 1–8; `benchmark-metrics.ps1` sampling metrics and status for 30 s.
- Reminder not to invent GPU numbers if `gpu_available` is false.

**My Verification / Modification (Truong Tuan Anh):**

- **I** ran the benchmark myself:  
  `.\scripts\benchmark-metrics.ps1 -Channels 4 -DurationSec 30 -TargetFps 10`  
  → `docs/benchmark-results/benchmark-4-ch-20260604-214146.json`.
- The script crashed on my PowerShell 5.1 (`Join-Path` with three paths) — **I** fixed the script with `Resolve-Path` and re-ran until it succeeded.
- **I** copied only **measured** numbers into `docs/REPORT.md` §5: CPU **49.81%**, RAM **21.16%**, FPS **8.3 / 19.68 / 8.34 / 20.89**, latency **~53 ms**; **I** explained Cam 2 and 4 were still at 30 FPS in the database.
- My laptop has an RTX 4050, but the backend reported **`gpu_available: false`** — **I** wrote “CPU decoding only” and did **not** copy any AI example GPU percentage.
- **I** collected hardware details with `Get-CimInstance` (i7-12650H, 32 GB RAM) for the environment table.

---

## Submission checklist (Truong Tuan Anh)

| Item | Status |
|------|--------|
| Docker + 4 streams verified by me | Done |
| Benchmark + REPORT §5 real numbers | Done |
| `docs/ai-log.md` (this file) | Done |
| `docs/ai-retrospective.md` | Done |
| `docs/references.md` | Done |
| Screenshots `docs/demo/screenshots/` | Pending |
| Demo video `docs/demo/video/` | Pending |
| Name/date on `docs/REPORT.md` header | Truong Tuan Anh — _(fill submission date)_ |

---

## Related files

| File | Role |
|------|------|
| `docs/ai-retrospective.md` | My 300–500 word reflection (English) |
| `docs/REPORT.md` | Technical report with my measurements |
| `docs/references.md` | URLs and access dates |
