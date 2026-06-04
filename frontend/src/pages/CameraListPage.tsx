import type { Camera } from "../types";
import { deleteCamera } from "../api";

interface Props {
  cameras: Camera[];
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (id: number) => void;
}

export function CameraListPage({ cameras, onRefresh, onAdd, onEdit }: Props) {
  const remove = async (id: number) => {
    if (!confirm(`Delete camera #${id}?`)) return;
    await deleteCamera(id);
    onRefresh();
  };

  return (
    <div className="page panel">
      <div className="page-header">
        <h2>Camera list</h2>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          + Add camera
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>RTSP URL</th>
              <th>Resolution</th>
              <th>FPS</th>
              <th>Slot</th>
              <th>On</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cameras.length === 0 ? (
              <tr>
                <td colSpan={8} className="page-muted">
                  No cameras registered.
                </td>
              </tr>
            ) : (
              cameras.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td className="mono">{c.rtsp_url}</td>
                  <td>
                    {c.resolution_width}×{c.resolution_height}
                  </td>
                  <td>{c.target_fps}</td>
                  <td>{c.grid_slot ?? "—"}</td>
                  <td>{c.enabled ? "yes" : "no"}</td>
                  <td className="data-table__actions">
                    <button type="button" className="btn btn--sm" onClick={() => onEdit(c.id)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
