import type { ConstructionState, SnapResult } from '@/model/types';
import {
  distance,
  nearestGridPoint,
  midpoint,
  segmentAngle,
  pointOnSegmentProjection,
  segmentGridCrossings,
} from './geometry';
import {
  SNAP_TOLERANCE_POINT_MM,
  SNAP_TOLERANCE_MIDPOINT_MM,
  SNAP_TOLERANCE_GRID_MM,
  SNAP_TOLERANCE_ALIGNMENT_MM,
  SNAP_TOLERANCE_ANGLE_DEG,
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
 * Scale tolerances by a multiplier (tolerance profile).
 * Angle tolerance and drag threshold are NOT scaled (spec §7.1).
 */
export function scaleTolerances(base: SnapTolerances, multiplier: number): SnapTolerances {
  if (multiplier === 1) return base;
  return {
    pointMm: base.pointMm * multiplier,
    midpointMm: base.midpointMm * multiplier,
    gridMm: base.gridMm * multiplier,
    alignmentMm: base.alignmentMm * multiplier,
  };
}

/**
 * Find the best snap target for a cursor position.
 * Priority order (spec §7):
 *   1. Existing points (7mm)
 *   2. Segment midpoints (5mm)
 *   3. Grid intersections (5mm)
 *   4. Angle snap ±5° (only during segment construction, when fromPoint provided)
 *   5. Alignment H/V with existing points (2mm)
 *   6. No snap
 */
export function findSnap(
  cursor: { readonly x: number; readonly y: number },
  state: ConstructionState,
  tolerances: SnapTolerances = DEFAULT_TOLERANCES,
  excludePointIds: readonly string[] = [],
  /** If provided, enables angle snap from this anchor point. */
  fromPoint?: { readonly x: number; readonly y: number },
  /** When true, forces angle snap to nearest 15° (Shift constraint, spec §14). */
  strictAngleSnap: boolean = false,
): SnapResult {
  const excludeSet = new Set(excludePointIds);

  if (!state.snapEnabled) {
    return { snappedPosition: { x: cursor.x, y: cursor.y }, snapType: 'none' };
  }

  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  // Priority 1: Existing points
  // Tolerance must be at least gridSize * 1.5 so points between grid lines are reachable
  const effectivePointTolerance = Math.max(tolerances.pointMm, state.gridSizeMm * 1.5);
  let bestPointDist = Infinity;
  let bestPointId: string | undefined;
  let bestPointPos: { x: number; y: number } | undefined;

  for (const point of state.points) {
    if (excludeSet.has(point.id)) continue;
    const dist = distance(cursor, point);
    if (dist <= effectivePointTolerance && dist < bestPointDist) {
      bestPointDist = dist;
      bestPointId = point.id;
      bestPointPos = { x: point.x, y: point.y };
    }
  }

  if (bestPointPos && bestPointId) {
    return { snappedPosition: bestPointPos, snapType: 'point', snappedToPointId: bestPointId };
  }

  // Priority 2: Segment midpoints
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

  // Priority 2b: Circle circumference (primed over grid, spec §7.1)
  let bestCircleDist = Infinity;
  let bestCirclePos: { x: number; y: number } | undefined;

  for (const circle of state.circles) {
    const center = pointMap.get(circle.centerPointId);
    if (!center) continue;
    const distToCenter = distance(cursor, center);
    if (distToCenter === 0) continue;
    const distToCircumference = Math.abs(distToCenter - circle.radiusMm);
    if (distToCircumference <= tolerances.midpointMm && distToCircumference < bestCircleDist) {
      bestCircleDist = distToCircumference;
      // Project cursor onto circumference
      const ratio = circle.radiusMm / distToCenter;
      bestCirclePos = {
        x: center.x + (cursor.x - center.x) * ratio,
        y: center.y + (cursor.y - center.y) * ratio,
      };
    }
  }

  if (bestCirclePos) {
    return { snappedPosition: bestCirclePos, snapType: 'circumference' };
  }

  // Priority 2c: Segment body projection (nearest point on segment)
  // Ensures T-junction points are placed exactly on the segment, no kink.
  let bestSegDist = Infinity;
  let bestSegPos: { x: number; y: number } | undefined;
  let bestSegSeg: { start: { x: number; y: number }; end: { x: number; y: number } } | undefined;

  for (const seg of state.segments) {
    const start = pointMap.get(seg.startPointId);
    const end = pointMap.get(seg.endPointId);
    if (!start || !end) continue;

    const { projection, distance: dist } = pointOnSegmentProjection(cursor, start, end);
    // Skip if projection is at an endpoint (already covered by point snap)
    if (dist <= tolerances.midpointMm && dist < bestSegDist) {
      const distToStart = distance(projection, start);
      const distToEnd = distance(projection, end);
      if (distToStart > tolerances.pointMm && distToEnd > tolerances.pointMm) {
        bestSegDist = dist;
        bestSegPos = projection;
        bestSegSeg = { start, end };
      }
    }
  }

  // Priority 3: Grid
  const gridPoint = nearestGridPoint(cursor.x, cursor.y, state.gridSizeMm);
  const gridDist = distance(cursor, gridPoint);

  if (bestSegPos && bestSegSeg) {
    // If the cursor is closer to a grid point than to the segment, prefer grid
    if (gridDist <= tolerances.gridMm && gridDist < bestSegDist) {
      return { snappedPosition: gridPoint, snapType: 'grid' };
    }
    // Quantize projection to nearest grid crossing on the segment
    const crossings = segmentGridCrossings(bestSegSeg.start, bestSegSeg.end, state.gridSizeMm);
    if (crossings.length > 0) {
      let nearest = crossings[0]!;
      let nearestDist = distance(bestSegPos, nearest);
      for (let i = 1; i < crossings.length; i++) {
        const d = distance(bestSegPos, crossings[i]!);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = crossings[i]!;
        }
      }
      return { snappedPosition: nearest, snapType: 'segment' };
    }
    // Short segment with no grid crossings — use raw projection
    return { snappedPosition: bestSegPos, snapType: 'segment' };
  }
  if (gridDist <= tolerances.gridMm) {
    return { snappedPosition: gridPoint, snapType: 'grid' };
  }

  // Priority 4: Angle snap (when constructing from a point)
  // Includes parallel/perpendicular detection to existing segments (spec §7.1, §6.1)
  if (fromPoint) {
    const dx = cursor.x - fromPoint.x;
    const dy = cursor.y - fromPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const currentAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

      // Check parallel/perpendicular to existing segments first (higher semantic value)
      let bestGuideAngle: number | undefined;
      const angleTolerance = strictAngleSnap ? 180 : SNAP_TOLERANCE_ANGLE_DEG;
      let bestGuideDiff = angleTolerance;
      let bestGuideType: 'parallel' | 'perpendicular' | undefined;
      let bestGuideSegId: string | undefined;

      for (const seg of state.segments) {
        const sp = pointMap.get(seg.startPointId);
        const ep = pointMap.get(seg.endPointId);
        if (!sp || !ep) continue;

        const segAngle = segmentAngle(sp, ep); // [0, 360)

        // Check parallel (same direction or opposite)
        for (const offset of [0, 180]) {
          const targetAngle = segAngle + offset;
          let diff = currentAngleDeg - targetAngle;
          // Normalize to [-180, 180]
          diff = ((diff + 540) % 360) - 180;
          const absDiff = Math.abs(diff);
          if (absDiff <= bestGuideDiff && absDiff > 0.01) {
            bestGuideDiff = absDiff;
            bestGuideAngle = targetAngle;
            bestGuideType = 'parallel';
            bestGuideSegId = seg.id;
          }
        }

        // Check perpendicular (±90°)
        for (const offset of [90, -90, 270]) {
          const targetAngle = segAngle + offset;
          let diff = currentAngleDeg - targetAngle;
          diff = ((diff + 540) % 360) - 180;
          const absDiff = Math.abs(diff);
          if (absDiff <= bestGuideDiff && absDiff > 0.01) {
            bestGuideDiff = absDiff;
            bestGuideAngle = targetAngle;
            bestGuideType = 'perpendicular';
            bestGuideSegId = seg.id;
          }
        }
      }

      if (bestGuideAngle !== undefined && bestGuideType && bestGuideSegId) {
        const radians = (bestGuideAngle * Math.PI) / 180;
        return {
          snappedPosition: {
            x: fromPoint.x + Math.cos(radians) * dist,
            y: fromPoint.y + Math.sin(radians) * dist,
          },
          snapType: 'angle',
          guideType: bestGuideType,
          guideSegmentId: bestGuideSegId,
        };
      }

      // Fall back to canonical angle snap (15° increments)
      const step = 15;
      const nearestCanonical = Math.round(currentAngleDeg / step) * step;
      const diff = Math.abs(currentAngleDeg - nearestCanonical);
      if (diff <= angleTolerance && diff > 0.01) {
        const radians = (nearestCanonical * Math.PI) / 180;
        return {
          snappedPosition: {
            x: fromPoint.x + Math.cos(radians) * dist,
            y: fromPoint.y + Math.sin(radians) * dist,
          },
          snapType: 'angle',
        };
      }
    }
  }

  // Priority 5: Alignment (H/V with existing points)
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
