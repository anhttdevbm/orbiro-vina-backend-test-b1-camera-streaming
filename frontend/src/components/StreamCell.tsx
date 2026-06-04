import { useEffect, useRef, useState } from "react";
import type { Camera, ChannelStatus } from "../types";
import { fetchStatus, updateCamera } from "../api";
import { formatStatusTime } from "../formatTime";

interface Props {
  camera: Camera;
  slotIndex?: number;
  compact?: boolean;
  onRefresh: () => void;
}

const WS_BASE =
  (location.protocol === "https:" ? "wss:" : "ws:") +
  "//" +
  location.host +
  "/ws/streams/";

export function StreamCell({ camera, slotIndex, compact, onRefresh }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [meta, setMeta] = useState<{ fps?: number; latency_ms?: number }>({});

  useEffect(() => {
    let ws: WebSocket | null = null;
    let blobUrl: string | null = null;

    const connect = () => {
      ws = new WebSocket(`${WS_BASE}${camera.id}`);
      ws.binaryType = "arraybuffer";

      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") {
          try {
            const parsed = JSON.parse(ev.data);
            if (parsed.type === "meta") {
              setMeta({ fps: parsed.fps, latency_ms: parsed.latency_ms });
            }
          } catch {
            /* ignore */
          }
          return;
        }
        const blob = new Blob([ev.data], { type: "image/jpeg" });
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = URL.createObjectURL(blob);
        if (imgRef.current) imgRef.current.src = blobUrl;
      };

      ws.onclose = () => {
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      ws?.close();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [camera.id]);

  useEffect(() => {
    const tick = async () => {
      try {
        const s = await fetchStatus(camera.id);
        setStatus(s);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [camera.id]);

  const changeFps = async (fps: number) => {
    await updateCamera(camera.id, { target_fps: fps });
    onRefresh();
  };

  const st = status?.status ?? "disconnected";

  return (
    <div className={`cell cell--${st}${compact ? " cell--compact" : ""}`}>
      <div className="cell__header">
        <span className="cell__title">
          {slotIndex != null && (
            <span className="cell__slot">#{slotIndex + 1} </span>
          )}
          {camera.name}
        </span>
        <span className={`badge badge--${st}`}>{st}</span>
      </div>
      <div className="cell__video">
        <img ref={imgRef} alt={camera.name} />
      </div>
      <div className="cell__footer">
        <label>
          FPS
          <select
            value={camera.target_fps}
            onChange={(e) => changeFps(Number(e.target.value))}
          >
            {[5, 10, 15, 20, 25, 30].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <span>
          {meta.fps ?? status?.measured_fps ?? 0} fps ·{" "}
          {meta.latency_ms ?? status?.latency_ms ?? 0} ms
        </span>
        <span
          className="cell__frame-at"
          title="Last emitted frame (local time)"
        >
          frame {formatStatusTime(status?.last_frame_at)}
        </span>
        <span className="cell__times" title="Last connected / last disconnected (local time)">
          ↑ {formatStatusTime(status?.connected_at)} · ↓{" "}
          {formatStatusTime(status?.disconnected_at)}
        </span>
        {!compact && (
          <span>
            up {status?.uptime_sec ?? 0}s · ↻ {status?.reconnect_count ?? 0}
          </span>
        )}
        {status?.last_error && st !== "connected" && (
          <span className="cell__error" title={status.last_error}>
            {status.last_error}
          </span>
        )}
      </div>
    </div>
  );
}
