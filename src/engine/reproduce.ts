/**
 * Reproduce (isometric copy) — spec §19 v2.
 * Duplicates a set of points/segments/circles with an offset vector.
 * All new elements get fresh IDs and incremented labels.
 */

import type { Point, Segment, Circle, ConstructionState } from '@/model/types';
import { generateId, nextLabel } from '@/model/id';
import { distance } from './geometry';

export interface ReproduceResult {
  readonly points: Point[];
  readonly segments: Segment[];
  readonly circles: Circle[];
}

/**
 * Find all segments and points connected to a given segment (flood-fill via shared points).
 * Returns the connected subgraph of points and segments.
 */
export function findConnectedElements(
  startSegmentId: string,
  state: ConstructionState,
): { pointIds: string[]; segmentIds: string[] } {
  const visitedSegments = new Set<string>();
  const visitedPoints = new Set<string>();
  const queue: string[] = [startSegmentId];

  while (queue.length > 0) {
    const segId = queue.pop()!;
    if (visitedSegments.has(segId)) continue;
    visitedSegments.add(segId);

    const seg = state.segments.find((s) => s.id === segId);
    if (!seg) continue;

    visitedPoints.add(seg.startPointId);
    visitedPoints.add(seg.endPointId);

    // Find other segments connected to these points
    for (const otherSeg of state.segments) {
      if (visitedSegments.has(otherSeg.id)) continue;
      if (visitedPoints.has(otherSeg.startPointId) || visitedPoints.has(otherSeg.endPointId)) {
        queue.push(otherSeg.id);
      }
    }
  }

  return {
    pointIds: Array.from(visitedPoints),
    segmentIds: Array.from(visitedSegments),
  };
}

/**
 * Reproduce a set of elements with an offset vector.
 * Creates new points, segments, and circles at the translated positions.
 */
export function reproduceElements(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  circleIds: readonly string[],
  state: ConstructionState,
  offsetX: number,
  offsetY: number,
  extraLabels: readonly string[] = [],
  groupIndex?: number,
  transformOperation?: string,
): ReproduceResult {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const existingLabels = [...state.points.map((p) => p.label), ...extraLabels];

  // Map old point ID → new point
  const newPointMap = new Map<string, Point>();
  const allNewLabels: string[] = [];

  for (const pid of pointIds) {
    const original = pointMap.get(pid);
    if (!original) continue;

    const label = nextLabel([...existingLabels, ...allNewLabels]);
    allNewLabels.push(label);

    newPointMap.set(pid, {
      id: generateId(),
      x: original.x + offsetX,
      y: original.y + offsetY,
      label,
      locked: false,
      ...(transformOperation ? { transformOperation } : {}),
      ...(groupIndex != null ? { transformGroupIndex: groupIndex } : {}),
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
      isTransformed: true,
      ...(groupIndex != null ? { transformGroupIndex: groupIndex } : {}),
      ...(transformOperation ? { transformOperation } : {}),
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

/**
 * Produce a frieze (1D) or tiling (2D) by repeating a figure along one or two vectors.
 * Returns all copies accumulated. Each copy uses offsets from the original positions.
 * Labels are accumulated across iterations to avoid collisions.
 */
export function reproduceFrieze(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  circleIds: readonly string[],
  state: ConstructionState,
  vector1: { dx: number; dy: number },
  count1: number,
  vector2?: { dx: number; dy: number },
  count2?: number,
  transformOperation?: string,
): ReproduceResult {
  const allPoints: Point[] = [];
  const allSegments: Segment[] = [];
  const allCircles: Circle[] = [];
  const accumulatedLabels: string[] = [];

  const rows = count2 != null && vector2 ? count2 : 1;

  let copyIndex = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < count1; i++) {
      // Skip (0,0) — that's the original figure
      if (i === 0 && j === 0) continue;

      const ox = i * vector1.dx + (vector2 ? j * vector2.dx : 0);
      const oy = i * vector1.dy + (vector2 ? j * vector2.dy : 0);

      const result = reproduceElements(
        pointIds,
        segmentIds,
        circleIds,
        state,
        ox,
        oy,
        accumulatedLabels,
        copyIndex,
        transformOperation,
      );
      copyIndex++;

      allPoints.push(...result.points);
      allSegments.push(...result.segments);
      allCircles.push(...result.circles);
      accumulatedLabels.push(...result.points.map((p) => p.label));
    }
  }

  return { points: allPoints, segments: allSegments, circles: allCircles };
}
