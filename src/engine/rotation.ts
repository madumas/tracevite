/**
 * Rotation geometry — pure functions.
 */

import type { Point, Segment, Circle, ConstructionState } from '@/model/types';
import { generateId } from '@/model/id';
import { nextLabel } from '@/model/id';
import { distance } from './geometry';

/**
 * Rotate a point around a center by the given angle (in degrees).
 * Positive angle = counter-clockwise in standard math,
 * but clockwise in screen coords (y-down).
 */
export function rotatePoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export interface RotateResult {
  readonly points: Point[];
  readonly segments: Segment[];
  readonly circles: Circle[];
}

/**
 * Rotate a set of points, segments, and circles around a center.
 * Returns new elements with fresh IDs and labels (not prime notation).
 */
export function rotateConstruction(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  circleIds: readonly string[],
  state: ConstructionState,
  center: { x: number; y: number },
  angleDeg: number,
): RotateResult {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const existingLabels = state.points.map((p) => p.label);

  // Map old point ID → new point
  const newPointMap = new Map<string, Point>();
  const allNewLabels: string[] = [];

  for (const pid of pointIds) {
    const original = pointMap.get(pid);
    if (!original) continue;

    const rotated = rotatePoint(original, center, angleDeg);
    const label = nextLabel([...existingLabels, ...allNewLabels]);
    allNewLabels.push(label);

    newPointMap.set(pid, {
      id: generateId(),
      x: rotated.x,
      y: rotated.y,
      label,
      locked: false,
    });
  }

  // Create new segments
  const newSegments: Segment[] = [];
  for (const sid of segmentIds) {
    const original = state.segments.find((s) => s.id === sid);
    if (!original) continue;

    const newStart = newPointMap.get(original.startPointId);
    const newEnd = newPointMap.get(original.endPointId);
    if (!newStart || !newEnd) continue;

    newSegments.push({
      id: generateId(),
      startPointId: newStart.id,
      endPointId: newEnd.id,
      lengthMm: distance(newStart, newEnd),
      fixedLength: original.fixedLength,
    });
  }

  // Create new circles
  const newCircles: Circle[] = [];
  for (const cid of circleIds) {
    const original = state.circles.find((c) => c.id === cid);
    if (!original) continue;

    const newCenter = newPointMap.get(original.centerPointId);
    if (!newCenter) continue;

    newCircles.push({
      id: generateId(),
      centerPointId: newCenter.id,
      radiusMm: original.radiusMm,
    });
  }

  return {
    points: Array.from(newPointMap.values()),
    segments: newSegments,
    circles: newCircles,
  };
}
