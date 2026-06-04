import type { Camera } from "./types";

export const GRID_SIZE_OPTIONS = [4, 8, 16, 32] as const;
export type GridSize = (typeof GRID_SIZE_OPTIONS)[number];

export const MAX_GRID_CHANNELS = 32;

export function gridColumns(size: GridSize): number {
  switch (size) {
    case 4:
      return 2;
    case 8:
      return 4;
    case 16:
      return 4;
    case 32:
      return 8;
    default:
      return 2;
  }
}

export function isCompactGrid(size: GridSize): boolean {
  return size >= 16;
}

/** Map cameras into fixed slots (by grid_slot, then fill empties). */
export function buildGridSlots(cameras: Camera[], size: number): (Camera | null)[] {
  const slots: (Camera | null)[] = Array.from({ length: size }, () => null);
  const unassigned: Camera[] = [];

  for (const cam of cameras) {
    const slot = cam.grid_slot;
    if (slot != null && slot >= 0 && slot < size && slots[slot] === null) {
      slots[slot] = cam;
    } else {
      unassigned.push(cam);
    }
  }

  for (const cam of unassigned) {
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) break;
    slots[idx] = cam;
  }

  return slots;
}
