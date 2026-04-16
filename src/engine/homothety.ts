/**
 * Homothety (dilation/scaling) geometry — pure functions.
 */

import type { Point, Segment, Circle, ConstructionState } from '@/model/types';
import { generateId, nextLabel } from '@/model/id';
import { distance } from './geometry';

/**
 * Allowed homothety factor range (QA 3.22). Factor=0 collapses the figure to
 * the center (pedagogical nonsense); |factor| > 10 drags geometry off-canvas.
 * Negative factor is intentionally accepted — it produces a rotation of 180°.
 */
export const MIN_HOMOTHETY_FACTOR = 0.1;
export const MAX_HOMOTHETY_FACTOR = 10;

export function isValidHomothetyFactor(factor: number): boolean {
  if (!Number.isFinite(factor)) return false;
  const abs = Math.abs(factor);
  return abs >= MIN_HOMOTHETY_FACTOR && abs <= MAX_HOMOTHETY_FACTOR;
}

/**
 * Scale a point relative to a center by the given factor.
 * factor > 1 = agrandissement, 0 < factor < 1 = réduction.
 */
export function scalePoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
  factor: number,
): { x: number; y: number } {
  return {
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  };
}

export interface ScaleResult {
  readonly points: Point[];
  readonly segments: Segment[];
  readonly circles: Circle[];
}

/**
 * Scale a set of points, segments, and circles relative to a center.
 * Returns new elements with fresh IDs and labels.
 */
export function scaleConstruction(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  circleIds: readonly string[],
  state: ConstructionState,
  center: { x: number; y: number },
  factor: number,
  transformOperation?: string,
): ScaleResult {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const existingLabels = state.points.map((p) => p.label);

  const newPointMap = new Map<string, Point>();
  const allNewLabels: string[] = [];

  for (const pid of pointIds) {
    const original = pointMap.get(pid);
    if (!original) continue;

    const scaled = scalePoint(original, center, factor);
    const label = nextLabel([...existingLabels, ...allNewLabels]);
    allNewLabels.push(label);

    newPointMap.set(pid, {
      id: generateId(),
      x: scaled.x,
      y: scaled.y,
      label,
      locked: false,
      ...(transformOperation ? { transformOperation, transformSourceId: pid } : {}),
    });
  }

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
      fixedLength: original.fixedLength ? original.fixedLength * Math.abs(factor) : undefined,
      isTransformed: true,
      ...(transformOperation ? { transformOperation } : {}),
    });
  }

  const newCircles: Circle[] = [];
  for (const cid of circleIds) {
    const original = state.circles.find((c) => c.id === cid);
    if (!original) continue;

    const newCenter = newPointMap.get(original.centerPointId);
    if (!newCenter) continue;

    newCircles.push({
      id: generateId(),
      centerPointId: newCenter.id,
      radiusMm: original.radiusMm * Math.abs(factor),
    });
  }

  return {
    points: Array.from(newPointMap.values()),
    segments: newSegments,
    circles: newCircles,
  };
}
