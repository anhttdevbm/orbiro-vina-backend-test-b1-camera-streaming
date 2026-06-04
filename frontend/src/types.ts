export type StreamStatus =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "connecting";

export interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  resolution_width: number;
  resolution_height: number;
  target_fps: number;
  enabled: boolean;
  grid_slot: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelStatus {
  camera_id: number;
  status: StreamStatus;
  measured_fps: number;
  latency_ms: number;
  uptime_sec: number;
  reconnect_count: number;
  last_frame_at: string | null;
  last_error: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
}

export interface FaultEvent {
  id: number;
  camera_id: number;
  event_type: string;
  message: string;
  created_at: string;
}

export type AdminPage = "grid" | "cameras" | "camera-form" | "status" | "events";

export interface SystemMetrics {
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  gpu_percent: number | null;
  gpu_memory_used_mb: number | null;
  gpu_memory_total_mb: number | null;
  gpu_available: boolean;
  active_streams: number;
  timestamp: string;
}
