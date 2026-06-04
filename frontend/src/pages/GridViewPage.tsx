import type { Camera } from "../types";
import { StreamCell } from "../components/StreamCell";
import { GridPlaceholder } from "../components/GridPlaceholder";
import {
  GRID_SIZE_OPTIONS,
  type GridSize,
  buildGridSlots,
  gridColumns,
  isCompactGrid,
} from "../gridConfig";

interface Props {
  cameras: Camera[];
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  onRefresh: () => void;
}

export function GridViewPage({
  cameras,
  gridSize,
  onGridSizeChange,
  onRefresh,
}: Props) {
  const enabled = cameras.filter((c) => c.enabled);
  const slots = buildGridSlots(enabled, gridSize);
  const activeCount = slots.filter(Boolean).length;
  const cols = gridColumns(gridSize);
  const compact = isCompactGrid(gridSize);

  return (
    <div className="page">
      <div className="grid-toolbar">
        <label>
          Grid layout
          <select
            value={gridSize}
            onChange={(e) => onGridSizeChange(Number(e.target.value) as GridSize)}
          >
            {GRID_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} channels ({gridColumns(n)}×{n / gridColumns(n)})
              </option>
            ))}
          </select>
        </label>
        <span className="grid-toolbar__hint">
          Showing {activeCount} / {gridSize} slots
        </span>
      </div>
      <section
        className={`grid grid--${gridSize}${compact ? " grid--compact" : ""}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {activeCount === 0 && (
          <p className="grid-hint">
            No enabled cameras — add cameras in the Cameras tab.
          </p>
        )}
        {slots.map((cam, index) =>
          cam ? (
            <StreamCell
              key={cam.id}
              camera={cam}
              slotIndex={index}
              compact={compact}
              onRefresh={onRefresh}
            />
          ) : (
            <GridPlaceholder key={`empty-${index}`} slotIndex={index} />
          )
        )}
      </section>
    </div>
  );
}
