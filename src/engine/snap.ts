import type { ConstructionState, SnapResult } from '@/model/types';
import { distance, nearestGridPoint, midpoint } from './geometry';
import {
  SNAP_TOLERANCE_POINT_MM,
  SNAP_TOLERANCE_MIDPOINT_MM,
  SNAP_TOLERANCE_GRID_MM,
  SNAP_TOLERANCE_ALIGNMENT_MM,
} from '@/config/accessibility';

/** Snap tolerances in physical mm. */
export interface SnapTolerances {
  readonly pointMm: number;
  readonly midpointMm: number;
  readonly gridMm: number;
  readonly alignmentMm: number;
}

/** Default tolerances (1x profile). */
export const DEFAULT_TOLERANCES: SnapTolerances = {
  pointMm: SNAP_TOLERANCE_POINT_MM,
  midpointMm: SNAP_TOLERANCE_MIDPOINT_MM,
  gridMm: SNAP_TOLERANCE_GRID_MM,
  alignmentMm: SNAP_TOLERANCE_ALIGNMENT_MM,
};

/**
 * Find the best snap target for a cursor position.
 * Priority order (spec §7):
 *   1. Existing points (7mm)
 *   2. Segment midpoints (5mm)
 *   3. Grid intersections (5mm)
 *   4. Alignment H/V with existing points (2mm)
 *   5. No snap
 *
 * Angle snap (priority 4 in spec) added separately during segment construction.
 */
export function findSnap(
  cursor: { readonly x: number; readonly y: number },
  state: ConstructionState,
  tolerances: SnapTolerances = DEFAULT_TOLERANCES,
  excludePointIds: readonly string[] = [],
): SnapResult {
  const excludeSet = new Set(excludePointIds);

  if (!state.snapEnabled) {
    return { snappedPosition: { x: cursor.x, y: cursor.y }, snapType: 'none' };
  }

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
    return { snappedPosition: bestPointPos, snapType: 'point', snappedToPointId: bestPointId };
  }

  // Priority 2: Segment midpoints
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  let bestMidDist = Infinity;
  let bestMidPos: { x: number; y: number } | undefined;

  for (const seg of state.segments) {
    const start = pointMap.get(seg.startPointId);
    const end = pointMap.get(seg.endPointId);
    if (!start || !end) continue;

    const mid = midpoint(start, end);
    const dist = distance(cursor, mid);
    if (dist <= tolerances.midpointMm && dist < bestMidDist) {
      bestMidDist = dist;
      bestMidPos = mid;
    }
  }

  if (bestMidPos) {
    return { snappedPosition: bestMidPos, snapType: 'midpoint' };
  }

  // Priority 3: Grid
  const gridPoint = nearestGridPoint(cursor.x, cursor.y, state.gridSizeMm);
  const gridDist = distance(cursor, gridPoint);
  if (gridDist <= tolerances.gridMm) {
    return { snappedPosition: gridPoint, snapType: 'grid' };
  }

  // Priority 4: Alignment (H/V with existing points)
  let alignX: number | null = null;
  let alignY: number | null = null;
  let bestAlignDistX = tolerances.alignmentMm;
  let bestAlignDistY = tolerances.alignmentMm;

  for (const point of state.points) {
    if (excludeSet.has(point.id)) continue;
    const dx = Math.abs(cursor.x - point.x);
    const dy = Math.abs(cursor.y - point.y);

    if (dx < bestAlignDistX) {
      bestAlignDistX = dx;
      alignX = point.x;
    }
    if (dy < bestAlignDistY) {
      bestAlignDistY = dy;
      alignY = point.y;
    }
  }

  if (alignX !== null || alignY !== null) {
    return {
      snappedPosition: {
        x: alignX ?? cursor.x,
        y: alignY ?? cursor.y,
      },
      snapType: 'alignment',
    };
  }

  // No snap
  return { snappedPosition: { x: cursor.x, y: cursor.y }, snapType: 'none' };
}
