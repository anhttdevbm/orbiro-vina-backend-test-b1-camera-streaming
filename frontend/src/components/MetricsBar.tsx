import { useEffect, useState } from "react";
import { fetchMetrics, fetchMetricsHistory } from "../api";
import type { SystemMetrics } from "../types";
import { MetricsSparkline } from "./MetricsSparkline";

export function MetricsBar() {
  const [m, setM] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<SystemMetrics[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const current = await fetchMetrics();
        const hist = await fetchMetricsHistory(60);
        setM(current);
        setHistory(hist);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  if (!m) return <div className="metrics">Loading metrics…</div>;

  return (
    <div className="metrics-panel">
      <div className="metrics">
        <span>CPU {m.cpu_percent.toFixed(1)}%</span>
        <span>
          RAM {m.memory_percent.toFixed(1)}% ({m.memory_used_mb.toFixed(0)} /{" "}
          {m.memory_total_mb.toFixed(0)} MB)
        </span>
        {m.gpu_available && m.gpu_percent != null ? (
          <span>
            GPU {m.gpu_percent.toFixed(0)}% · VRAM {m.gpu_memory_used_mb?.toFixed(0)}{" "}
            / {m.gpu_memory_total_mb?.toFixed(0)} MB
          </span>
        ) : (
          <span>GPU N/A (CPU decode)</span>
        )}
        <span>Active streams: {m.active_streams}</span>
      </div>
      <div className="metrics-charts">
        <MetricsSparkline
          label="CPU %"
          history={history}
          field="cpu_percent"
          color="#3d8bfd"
        />
        <MetricsSparkline
          label="RAM %"
          history={history}
          field="memory_percent"
          color="#3dd68c"
        />
      </div>
    </div>
  );
}
