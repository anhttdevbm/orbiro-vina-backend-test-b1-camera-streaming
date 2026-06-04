import { useEffect, useState } from "react";
import type { Camera } from "../types";
import { createCamera, fetchCamera, updateCamera } from "../api";

interface Props {
  cameraId: number | null;
  onSaved: () => void;
  onCancel: () => void;
}

const RTSP_DOCKER_DEFAULT = "rtsp://mediamtx:8554/cam1";

const empty = {
  name: "",
  rtsp_url: RTSP_DOCKER_DEFAULT,
  resolution_width: 640,
  resolution_height: 360,
  target_fps: 10,
  enabled: true,
  grid_slot: null as number | null,
};

export function CameraForm({ cameraId, onSaved, onCancel }: Props) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!cameraId);

  useEffect(() => {
    if (!cameraId) {
      setForm(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchCamera(cameraId)
      .then((c) => {
        setForm({
          name: c.name,
          rtsp_url: c.rtsp_url,
          resolution_width: c.resolution_width,
          resolution_height: c.resolution_height,
          target_fps: c.target_fps,
          enabled: c.enabled,
          grid_slot: c.grid_slot,
        });
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [cameraId]);

  const rtspHint =
    form.rtsp_url.includes("127.0.0.1") || form.rtsp_url.includes("localhost")
      ? "Backend trong Docker không kết nối được tới 127.0.0.1 — dùng hostname mediamtx."
      : /\/cam([5-9]|[1-9]\d+)\b/i.test(form.rtsp_url)
        ? "Chỉ cam1–cam4 có luồng demo (FFmpeg publisher). Dùng cam1–cam4 hoặc thêm publisher."
        : null;

  const submit = async () => {
    setError("");
    try {
      const body = {
        name: form.name,
        rtsp_url: form.rtsp_url,
        resolution_width: form.resolution_width,
        resolution_height: form.resolution_height,
        target_fps: form.target_fps,
        enabled: form.enabled,
        grid_slot: form.grid_slot,
      };
      if (cameraId) {
        await updateCamera(cameraId, body);
      } else {
        await createCamera(body as Partial<Camera>);
      }
      onSaved();
    } catch (e) {
      setError(String(e));
    }
  };

  if (loading) return <p className="page-muted">Loading…</p>;

  return (
    <div className="page panel">
      <h2>{cameraId ? `Edit camera #${cameraId}` : "Add camera"}</h2>
      <div className="form-grid">
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="form-grid__wide">
          RTSP URL
          <input
            value={form.rtsp_url}
            onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })}
            placeholder={RTSP_DOCKER_DEFAULT}
          />
          <span className="page-muted form-hint">
            Docker: <code>rtsp://mediamtx:8554/cam1</code> … <code>cam4</code>.
            VLC trên máy host: <code>rtsp://127.0.0.1:8554/cam1</code>.
          </span>
          {rtspHint && <span className="error form-hint">{rtspHint}</span>}
        </label>
        <label>
          Width
          <input
            type="number"
            value={form.resolution_width}
            onChange={(e) =>
              setForm({ ...form, resolution_width: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Height
          <input
            type="number"
            value={form.resolution_height}
            onChange={(e) =>
              setForm({ ...form, resolution_height: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Target FPS
          <input
            type="number"
            min={1}
            max={30}
            value={form.target_fps}
            onChange={(e) =>
              setForm({ ...form, target_fps: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Grid slot (0–31)
          <input
            type="number"
            min={0}
            max={31}
            value={form.grid_slot ?? ""}
            placeholder="auto"
            onChange={(e) =>
              setForm({
                ...form,
                grid_slot: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="form-grid__check">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--primary" onClick={submit}>
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
