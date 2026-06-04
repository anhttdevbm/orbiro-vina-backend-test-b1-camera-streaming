import { useCallback, useEffect, useState } from "react";
import { fetchCameras } from "./api";
import type { AdminPage, Camera } from "./types";
import { MetricsBar } from "./components/MetricsBar";
import { AppNav } from "./components/AppNav";
import { CameraForm } from "./components/CameraForm";
import { GridViewPage } from "./pages/GridViewPage";
import { CameraListPage } from "./pages/CameraListPage";
import { StatusPage } from "./pages/StatusPage";
import { EventsPage } from "./pages/EventsPage";
import { GRID_SIZE_OPTIONS, type GridSize } from "./gridConfig";

const GRID_SIZE_KEY = "camstream-grid-size";

function loadGridSize(): GridSize {
  try {
    const raw = localStorage.getItem(GRID_SIZE_KEY);
    const n = raw ? Number(raw) : 4;
    if (GRID_SIZE_OPTIONS.includes(n as GridSize)) return n as GridSize;
  } catch {
    /* ignore */
  }
  return 4;
}

export default function App() {
  const [page, setPage] = useState<AdminPage>("grid");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [gridSize, setGridSize] = useState<GridSize>(loadGridSize);

  const load = useCallback(async () => {
    setCameras(await fetchCameras());
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const changeGridSize = (size: GridSize) => {
    setGridSize(size);
    localStorage.setItem(GRID_SIZE_KEY, String(size));
  };

  const goCameras = () => {
    setEditingId(null);
    setPage("cameras");
  };

  const renderPage = () => {
    if (page === "camera-form") {
      return (
        <CameraForm
          cameraId={editingId}
          onSaved={() => {
            load();
            goCameras();
          }}
          onCancel={goCameras}
        />
      );
    }
    if (page === "cameras") {
      return (
        <CameraListPage
          cameras={cameras}
          onRefresh={load}
          onAdd={() => {
            setEditingId(null);
            setPage("camera-form");
          }}
          onEdit={(id) => {
            setEditingId(id);
            setPage("camera-form");
          }}
        />
      );
    }
    if (page === "status") return <StatusPage cameras={cameras} />;
    if (page === "events") return <EventsPage />;
    return (
      <GridViewPage
        cameras={cameras}
        gridSize={gridSize}
        onGridSizeChange={changeGridSize}
        onRefresh={load}
      />
    );
  };

  return (
    <div className="app">
      <header>
        <h1>CamStream Manager</h1>
        <p>B1 — Camera admin & multi-channel monitoring</p>
        <MetricsBar />
        <AppNav
          page={page}
          onNavigate={(p) => {
            if (p === "cameras") goCameras();
            else setPage(p);
          }}
        />
      </header>
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}
