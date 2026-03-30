/**
 * Property detection: parallelism, perpendicularity, equal lengths.
 * Pure functions — all tolerances from spec.
 */

import type { Point, Segment, DetectedProperty } from '@/model/types';
import { segmentAngle } from './geometry';

const PARALLEL_TOLERANCE_DEG = 0.5;
const PERPENDICULAR_TOLERANCE_DEG = 0.5; // [89.5, 90.5]
const EQUAL_LENGTH_TOLERANCE_MM = 1;

/**
 * Normalized direction in [0, 180) — AB and BA give same value.
 */
function normalizedDirection(start: Point, end: Point): number {
  const angle = segmentAngle(start, end);
  return angle >= 180 ? angle - 180 : angle;
}

/**
 * Minimum angle between two directions in [0, 180).
 * Result is in [0, 90] — accounts for equivalence at 0° and 180°.
 */
function directionAngleDiff(dir1: number, dir2: number): number {
  let diff = Math.abs(dir1 - dir2);
  if (diff > 90) diff = 180 - diff;
  return diff;
}

/** Detect pairs of parallel segments (direction diff < 0.5°). */
export function detectParallelSegments(
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const properties: DetectedProperty[] = [];

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i]!;
      const s2 = segments[j]!;

      const s1Start = pointMap.get(s1.startPointId);
      const s1End = pointMap.get(s1.endPointId);
      const s2Start = pointMap.get(s2.startPointId);
      const s2End = pointMap.get(s2.endPointId);
      if (!s1Start || !s1End || !s2Start || !s2End) continue;

      // Skip segments that share an endpoint
      if (
        s1.startPointId === s2.startPointId ||
        s1.startPointId === s2.endPointId ||
        s1.endPointId === s2.startPointId ||
        s1.endPointId === s2.endPointId
      )
        continue;

      const diff = directionAngleDiff(
        normalizedDirection(s1Start, s1End),
        normalizedDirection(s2Start, s2End),
      );

      if (diff < PARALLEL_TOLERANCE_DEG) {
        properties.push({
          type: 'parallel',
          involvedIds: [s1.id, s2.id],
          label: `${s1Start.label}${s1End.label} // ${s2Start.label}${s2End.label}`,
        });
      }
    }
  }

  return properties;
}

/** Detect pairs of perpendicular segments (direction diff in [89.5°, 90.5°]). */
export function detectPerpendicularSegments(
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const properties: DetectedProperty[] = [];

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i]!;
      const s2 = segments[j]!;

      const s1Start = pointMap.get(s1.startPointId);
      const s1End = pointMap.get(s1.endPointId);
      const s2Start = pointMap.get(s2.startPointId);
      const s2End = pointMap.get(s2.endPointId);
      if (!s1Start || !s1End || !s2Start || !s2End) continue;

      const diff = directionAngleDiff(
        normalizedDirection(s1Start, s1End),
        normalizedDirection(s2Start, s2End),
      );

      if (diff >= 90 - PERPENDICULAR_TOLERANCE_DEG && diff <= 90 + PERPENDICULAR_TOLERANCE_DEG) {
        properties.push({
          type: 'perpendicular',
          involvedIds: [s1.id, s2.id],
          label: `${s1Start.label}${s1End.label} ⊥ ${s2Start.label}${s2End.label}`,
        });
      }
    }
  }

  return properties;
}

/** Detect pairs of segments with equal lengths (±1mm). */
export function detectEqualLengths(
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const properties: DetectedProperty[] = [];

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i]!;
      const s2 = segments[j]!;

      if (Math.abs(s1.lengthMm - s2.lengthMm) <= EQUAL_LENGTH_TOLERANCE_MM) {
        const s1Start = pointMap.get(s1.startPointId);
        const s1End = pointMap.get(s1.endPointId);
        const s2Start = pointMap.get(s2.startPointId);
        const s2End = pointMap.get(s2.endPointId);
        if (!s1Start || !s1End || !s2Start || !s2End) continue;

        properties.push({
          type: 'equal_length',
          involvedIds: [s1.id, s2.id],
          label: `${s1Start.label}${s1End.label} = ${s2Start.label}${s2End.label}`,
        });
      }
    }
  }

  return properties;
}

/** Detect all properties in the construction. */
export function detectAllProperties(
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  return [
    ...detectParallelSegments(segments, points),
    ...detectPerpendicularSegments(segments, points),
    ...detectEqualLengths(segments, points),
  ];
}
