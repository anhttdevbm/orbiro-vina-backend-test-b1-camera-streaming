import { useEffect, useState } from "react";
import type { FaultEvent } from "../types";
import { fetchEvents } from "../api";
import { formatStatusTime } from "../formatTime";

export function EventsPage() {
  const [events, setEvents] = useState<FaultEvent[]>([]);
  const [filterCam, setFilterCam] = useState("");

  const load = async () => {
    const trimmed = filterCam.trim();
    const camId = trimmed ? Number(trimmed) : undefined;
    if (camId !== undefined && Number.isNaN(camId)) return;
    setEvents(await fetchEvents(80, camId));
  };

  useEffect(() => {
    load().catch(console.error);
    const id = setInterval(() => load().catch(console.error), 3000);
    return () => clearInterval(id);
  }, [filterCam]);

  return (
    <div className="page panel">
      <div className="page-header">
        <h2>Recent events</h2>
        <label>
          Camera ID
          <input
            className="filter-input"
            placeholder="all"
            value={filterCam}
            onChange={(e) => setFilterCam(e.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Camera</th>
              <th>Type</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="page-muted">
                  No events yet (appear on connect/disconnect/reconnect).
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id}>
                  <td>{formatStatusTime(e.created_at)}</td>
                  <td>{e.camera_id}</td>
                  <td>
                    <span className={`badge badge--${e.event_type}`}>
                      {e.event_type}
                    </span>
                  </td>
                  <td>{e.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
