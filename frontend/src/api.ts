import type { Camera, ChannelStatus, FaultEvent, SystemMetrics } from "./types";

const API = "/api";

export async function fetchCameras(): Promise<Camera[]> {
  const r = await fetch(`${API}/cameras`);
  if (!r.ok) throw new Error("Failed to load cameras");
  return r.json();
}

export async function fetchStatus(id: number): Promise<ChannelStatus> {
  const r = await fetch(`${API}/cameras/${id}/status`);
  if (!r.ok) throw new Error("Failed to load status");
  return r.json();
}

export async function fetchAllStatuses(): Promise<ChannelStatus[]> {
  const r = await fetch(`${API}/cameras/status/all`);
  if (!r.ok) throw new Error("Failed to load statuses");
  return r.json();
}

export async function fetchMetrics(): Promise<SystemMetrics> {
  const r = await fetch(`${API}/metrics/system`);
  if (!r.ok) throw new Error("Failed to load metrics");
  return r.json();
}

export async function fetchMetricsHistory(
  limit = 60
): Promise<SystemMetrics[]> {
  const r = await fetch(`${API}/metrics/history?limit=${limit}`);
  if (!r.ok) throw new Error("Failed to load metrics history");
  return r.json();
}

export async function createCamera(body: Partial<Camera>): Promise<Camera> {
  const r = await fetch(`${API}/cameras`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateCamera(
  id: number,
  body: Partial<Camera>
): Promise<Camera> {
  const r = await fetch(`${API}/cameras/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteCamera(id: number): Promise<void> {
  const r = await fetch(`${API}/cameras/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Delete failed");
}

export async function fetchCamera(id: number): Promise<Camera> {
  const r = await fetch(`${API}/cameras/${id}`);
  if (!r.ok) throw new Error("Camera not found");
  return r.json();
}

export async function fetchEvents(
  limit = 50,
  cameraId?: number
): Promise<FaultEvent[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (cameraId != null) q.set("camera_id", String(cameraId));
  const r = await fetch(`${API}/events?${q}`);
  if (!r.ok) throw new Error("Failed to load events");
  return r.json();
}
