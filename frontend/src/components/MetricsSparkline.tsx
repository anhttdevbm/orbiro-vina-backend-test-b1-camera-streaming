import type { SystemMetrics } from "../types";

interface Props {
  label: string;
  history: SystemMetrics[];
  field: "cpu_percent" | "memory_percent";
  color: string;
}

export function MetricsSparkline({ label, history, field, color }: Props) {
  const values = history.map((h) => h[field]);
  const max = Math.max(100, ...values, 1);

  return (
    <div className="metrics-spark">
      <span className="metrics-spark__label">{label}</span>
      <div className="metrics-spark__bars" role="img" aria-label={`${label} history`}>
        {values.length === 0 ? (
          <span className="metrics-spark__empty">—</span>
        ) : (
          values.map((v, i) => (
            <div
              key={`${field}-${i}`}
              className="metrics-spark__bar"
              style={{
                height: `${(v / max) * 100}%`,
                backgroundColor: color,
              }}
              title={`${v.toFixed(1)}%`}
            />
          ))
        )}
      </div>
    </div>
  );
}
