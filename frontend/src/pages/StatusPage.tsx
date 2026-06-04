import { useCallback, useEffect, useRef, useState } from "react";

import type { Camera, ChannelStatus } from "../types";

import { fetchAllStatuses } from "../api";

import { formatStatusTime } from "../formatTime";



interface Props {

  cameras: Camera[];

}



type Row = Camera & { status?: ChannelStatus; loading?: boolean };



const emptyStatus = (cameraId: number): ChannelStatus => ({

  camera_id: cameraId,

  status: "disconnected",

  measured_fps: 0,

  latency_ms: 0,

  uptime_sec: 0,

  reconnect_count: 0,

  last_frame_at: null,

  last_error: "Status unavailable",

  connected_at: null,

  disconnected_at: null,

});



export function StatusPage({ cameras }: Props) {

  const [rows, setRows] = useState<Row[]>([]);

  const inFlight = useRef(false);



  const load = useCallback(async () => {

    if (inFlight.current || cameras.length === 0) return;

    inFlight.current = true;

    try {

      const statuses = await fetchAllStatuses();

      const byId = new Map(statuses.map((s) => [s.camera_id, s]));

      setRows(

        cameras.map((c) => ({

          ...c,

          status: byId.get(c.id) ?? emptyStatus(c.id),

          loading: false,

        }))

      );

    } catch {

      setRows((prev) =>

        cameras.map((c) => {

          const existing = prev.find((r) => r.id === c.id);

          return {

            ...c,

            status: existing?.status ?? emptyStatus(c.id),

            loading: false,

          };

        })

      );

    } finally {

      inFlight.current = false;

    }

  }, [cameras]);



  useEffect(() => {

    setRows(

      cameras.map((c) => ({

        ...c,

        loading: true,

      }))

    );

    load().catch(console.error);

    const id = setInterval(() => load().catch(console.error), 3000);

    return () => clearInterval(id);

  }, [load, cameras]);



  return (

    <div className="page panel">

      <h2>Camera status</h2>

      <div className="table-wrap">

        <table className="data-table">

          <thead>

            <tr>

              <th>ID</th>

              <th>Name</th>

              <th>Status</th>

              <th>FPS</th>

              <th>Latency</th>

              <th>Uptime</th>

              <th>Reconnects</th>

              <th>Last frame</th>

              <th>Last error</th>

            </tr>

          </thead>

          <tbody>

            {rows.map((r) => (

              <tr key={r.id}>

                <td>{r.id}</td>

                <td>{r.name}</td>

                <td>

                  <span className={`badge badge--${r.status?.status ?? "disconnected"}`}>

                    {r.loading ? "…" : (r.status?.status ?? "—")}

                  </span>

                </td>

                <td>

                  {r.loading

                    ? "…"

                    : r.status != null

                      ? r.status.measured_fps

                      : "—"}

                </td>

                <td>

                  {r.loading

                    ? "…"

                    : r.status != null

                      ? `${r.status.latency_ms} ms`

                      : "—"}

                </td>

                <td>

                  {r.loading

                    ? "…"

                    : r.status != null

                      ? `${r.status.uptime_sec}s`

                      : "—"}

                </td>

                <td>

                  {r.loading

                    ? "…"

                    : r.status != null

                      ? r.status.reconnect_count

                      : "—"}

                </td>

                <td>

                  {r.loading ? "…" : formatStatusTime(r.status?.last_frame_at)}

                </td>

                <td className="cell__error-inline">

                  {r.loading ? "…" : (r.status?.last_error ?? "—")}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}

