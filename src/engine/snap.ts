import type { ConstructionState, SnapResult } from '@/model/types';
import { distance, nearestGridPoint } from './geometry';

/** Snap tolerances in physical mm. */
export interface SnapTolerances {
  readonly pointMm: number;
  readonly gridMm: number;
}

/** Default tolerances (1x profile). */
export const DEFAULT_TOLERANCES: SnapTolerances = {
  pointMm: 7,
  gridMm: 5,
};

/**
 * Find the best snap target for a cursor position.
 * Priority order (spec §7):
 *   1. Existing points (7mm)
 *   2. Grid intersections (5mm)
 *   3. No snap
 *
 * Midpoint, angle, and alignment snap are Milestone B.
 */
export function findSnap(
  cursor: { readonly x: number; readonly y: number },
  state: ConstructionState,
  tolerances: SnapTolerances = DEFAULT_TOLERANCES,
  excludePointIds: readonly string[] = [],
): SnapResult {
  const excludeSet = new Set(excludePointIds);

  // Priority 1: Existing points
  let bestPointDist = Infinity;
  let bestPointId: string | undefined;
  let bestPointPos: { x: number; y: number } | undefined;

  for (const point of state.points) {
    if (excludeSet.has(point.id)) continue;
    const dist = distance(cursor, point);
    if (dist <= tolerances.pointMm && dist < bestPointDist) {
      bestPointDist = dist;
      bestPointId = point.id;
      bestPointPos = { x: point.x, y: point.y };
    }
  }

  if (bestPointPos && bestPointId) {
    return {
      snappedPosition: bestPointPos,
      snapType: 'point',
      snappedToPointId: bestPointId,
    };
  }

  // Priority 2: Grid
  if (state.snapEnabled) {
    const gridPoint = nearestGridPoint(cursor.x, cursor.y, state.gridSizeMm);
    const gridDist = distance(cursor, gridPoint);
    if (gridDist <= tolerances.gridMm) {
      return {
        snappedPosition: gridPoint,
        snapType: 'grid',
      };
    }
  }

  // No snap
  return {
    snappedPosition: { x: cursor.x, y: cursor.y },
    snapType: 'none',
  };
}
