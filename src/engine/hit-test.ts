/**
 * Pure hit-testing functions for element detection under cursor.
 * All inputs/outputs in mm. Priority: point > segment > circle.
 */

import type { Point, Segment, Circle, TextBox, ConstructionState } from '@/model/types';
import { distance } from './geometry';
import { pointOnSegmentProjection } from './geometry';
import { SNAP_TOLERANCE_POINT_MM, SEGMENT_HIT_ZONE_MM } from '@/config/accessibility';

export interface HitTestResult {
  readonly type: 'point' | 'segment' | 'circle' | 'textbox';
  readonly id: string;
}

/** Find the closest point within tolerance. */
export function hitTestPoint(
  cursor: { readonly x: number; readonly y: number },
  points: readonly Point[],
  toleranceMm: number = SNAP_TOLERANCE_POINT_MM,
): string | null {
  let bestDist = Infinity;
  let bestId: string | null = null;

  for (const point of points) {
    const dist = distance(cursor, point);
    if (dist <= toleranceMm && dist < bestDist) {
      bestDist = dist;
      bestId = point.id;
    }
  }

  return bestId;
}

/** Find the closest segment body within tolerance (excludes endpoints). */
export function hitTestSegment(
  cursor: { readonly x: number; readonly y: number },
  segments: readonly Segment[],
  points: readonly Point[],
  toleranceMm: number = SEGMENT_HIT_ZONE_MM,
): string | null {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  let bestDist = Infinity;
  let bestId: string | null = null;

  for (const segment of segments) {
    const start = pointMap.get(segment.startPointId);
    const end = pointMap.get(segment.endPointId);
    if (!start || !end) continue;

    const { distance: dist } = pointOnSegmentProjection(cursor, start, end);
    if (dist <= toleranceMm && dist < bestDist) {
      bestDist = dist;
      bestId = segment.id;
    }
  }

  return bestId;
}

/** Find the closest circle circumference within tolerance. */
export function hitTestCircle(
  cursor: { readonly x: number; readonly y: number },
  circles: readonly Circle[],
  points: readonly Point[],
  toleranceMm: number = SEGMENT_HIT_ZONE_MM,
): string | null {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  let bestDist = Infinity;
  let bestId: string | null = null;

  for (const circle of circles) {
    const center = pointMap.get(circle.centerPointId);
    if (!center) continue;

    const distToCenter = distance(cursor, center);
    // Accept clicks on circumference OR inside the circle
    const distToCircumference = Math.abs(distToCenter - circle.radiusMm);
    const isInside = distToCenter <= circle.radiusMm;
    if ((distToCircumference <= toleranceMm || isInside) && distToCenter < bestDist) {
      bestDist = distToCenter;
      bestId = circle.id;
    }
  }

  return bestId;
}

/**
 * Combined hit-test with priority: point > segment > circle.
 * Returns the best hit or null if nothing is under the cursor.
 */
export function hitTestElement(
  cursor: { readonly x: number; readonly y: number },
  state: ConstructionState,
): HitTestResult | null {
  // Priority 1: Points
  const pointId = hitTestPoint(cursor, state.points);
  if (pointId) return { type: 'point', id: pointId };

  // Priority 2: Segments
  const segmentId = hitTestSegment(cursor, state.segments, state.points);
  if (segmentId) return { type: 'segment', id: segmentId };

  // Priority 3: Circles
  const circleId = hitTestCircle(cursor, state.circles, state.points);
  if (circleId) return { type: 'circle', id: circleId };

  // Priority 4: TextBoxes (bounding box hit test)
  const textBoxId = hitTestTextBox(cursor, state.textBoxes);
  if (textBoxId) return { type: 'textbox', id: textBoxId };

  return null;
}

/** Hit-test text boxes by bounding rectangle (approximate width from text length). */
export function hitTestTextBox(
  cursor: { readonly x: number; readonly y: number },
  textBoxes: readonly TextBox[],
): string | null {
  const FONT_SIZE_MM = 3.5;
  const PADDING_MM = 3;
  for (let i = textBoxes.length - 1; i >= 0; i--) {
    const tb = textBoxes[i]!;
    const lines = (tb.text || '…').split('\n');
    const longest = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
    const w = Math.max(30, longest.length * FONT_SIZE_MM * 0.55 + 6) + PADDING_MM * 2;
    const h = lines.length * FONT_SIZE_MM * 1.4 + PADDING_MM * 2;
    if (
      cursor.x >= tb.x - PADDING_MM &&
      cursor.x <= tb.x - PADDING_MM + w &&
      cursor.y >= tb.y - PADDING_MM &&
      cursor.y <= tb.y - PADDING_MM + h
    ) {
      return tb.id;
    }
  }
  return null;
}
