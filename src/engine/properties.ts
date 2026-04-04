/**
 * Property detection: parallelism, perpendicularity, equal lengths.
 * Pure functions — all tolerances from spec.
 */

import type { Point, Segment, Circle, DetectedProperty, ConstructionState } from '@/model/types';
import { segmentAngle, distance } from './geometry';
import { checkSymmetry } from './reflection';
import type { Figure } from './figures';

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

/**
 * Group parallel properties transitively: if A//B and B//C, produce one group A//B//C.
 * Uses union-find to merge connected segment IDs.
 */
export function groupParallelProperties(
  props: DetectedProperty[],
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  const parallel = props.filter((p) => p.type === 'parallel');
  const other = props.filter((p) => p.type !== 'parallel');
  if (parallel.length <= 1) return props;

  // Union-find
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  for (const p of parallel) {
    const ids = p.involvedIds;
    for (let i = 1; i < ids.length; i++) {
      union(ids[0]!, ids[i]!);
    }
  }

  // Collect groups
  const groups = new Map<string, Set<string>>();
  for (const p of parallel) {
    for (const id of p.involvedIds) {
      const root = find(id);
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root)!.add(id);
    }
  }

  // Build grouped properties
  const pointMap = new Map(points.map((pt) => [pt.id, pt]));
  const segMap = new Map(segments.map((s) => [s.id, s]));
  const grouped: DetectedProperty[] = [];

  for (const memberIds of groups.values()) {
    const ids = [...memberIds];
    const labels = ids.map((id) => {
      const seg = segMap.get(id);
      if (!seg) return '??';
      const s = pointMap.get(seg.startPointId);
      const e = pointMap.get(seg.endPointId);
      return s && e ? `${s.label}${e.label}` : '??';
    });
    grouped.push({
      type: 'parallel',
      involvedIds: ids,
      label: labels.join(' // '),
    });
  }

  return [...grouped, ...other];
}

/**
 * Group equal-length properties transitively: if AB=CD and CD=EF, produce one group AB=CD=EF.
 * Uses union-find to merge connected segment IDs.
 */
export function groupEqualLengthProperties(
  props: DetectedProperty[],
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  const equal = props.filter((p) => p.type === 'equal_length');
  const other = props.filter((p) => p.type !== 'equal_length');
  if (equal.length <= 1) return props;

  // Union-find
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };

  for (const p of equal) {
    const ids = p.involvedIds;
    for (let i = 1; i < ids.length; i++) {
      union(ids[0]!, ids[i]!);
    }
  }

  // Collect groups
  const groups = new Map<string, Set<string>>();
  for (const p of equal) {
    for (const id of p.involvedIds) {
      const root = find(id);
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root)!.add(id);
    }
  }

  // Build grouped properties
  const pointMap = new Map(points.map((pt) => [pt.id, pt]));
  const segMap = new Map(segments.map((s) => [s.id, s]));
  const grouped: DetectedProperty[] = [];

  for (const memberIds of groups.values()) {
    const ids = [...memberIds];
    const labels = ids.map((id) => {
      const seg = segMap.get(id);
      if (!seg) return '??';
      const s = pointMap.get(seg.startPointId);
      const e = pointMap.get(seg.endPointId);
      return s && e ? `${s.label}${e.label}` : '??';
    });
    grouped.push({
      type: 'equal_length',
      involvedIds: ids,
      label: labels.join(' = '),
    });
  }

  return [...other, ...grouped];
}

/** Detect segments that are chords of a circle (both endpoints on circumference). */
function detectChords(
  segments: readonly Segment[],
  points: readonly Point[],
  circles: readonly Circle[],
): DetectedProperty[] {
  if (circles.length === 0) return [];
  const pointMap = new Map(points.map((p) => [p.id, p]));
  const results: DetectedProperty[] = [];

  for (const seg of segments) {
    const startPt = pointMap.get(seg.startPointId);
    const endPt = pointMap.get(seg.endPointId);
    if (!startPt || !endPt) continue;

    for (const circle of circles) {
      // Skip if either endpoint is the center
      if (seg.startPointId === circle.centerPointId || seg.endPointId === circle.centerPointId)
        continue;

      const center = pointMap.get(circle.centerPointId);
      if (!center) continue;

      const distStart = Math.abs(distance(startPt, center) - circle.radiusMm);
      const distEnd = Math.abs(distance(endPt, center) - circle.radiusMm);

      if (distStart <= EQUAL_LENGTH_TOLERANCE_MM && distEnd <= EQUAL_LENGTH_TOLERANCE_MM) {
        results.push({
          type: 'chord',
          involvedIds: [seg.id, circle.id],
          label: `${startPt.label}${endPt.label} : corde du cercle centré en ${center.label}`,
        });
      }
    }
  }
  return results;
}

/** Detect segments that are axes of symmetry of closed figures. */
export function detectSymmetryAxes(
  segments: readonly Segment[],
  points: readonly Point[],
  figures: readonly Figure[],
  state: ConstructionState,
): DetectedProperty[] {
  // Performance guard: skip if too many combinations
  const eligibleFigures = figures.filter(
    (f) => f.pointIds.length >= 3 && f.pointIds.length <= 6 && !f.selfIntersecting,
  );
  if (segments.length * eligibleFigures.length > 200) return [];

  const pointMap = new Map(points.map((p) => [p.id, p]));
  const results: DetectedProperty[] = [];

  for (const fig of eligibleFigures) {
    for (const seg of segments) {
      const startPt = pointMap.get(seg.startPointId);
      const endPt = pointMap.get(seg.endPointId);
      if (!startPt || !endPt) continue;

      const result = checkSymmetry(fig.pointIds, state, startPt, endPt);
      if (result.isSymmetric) {
        results.push({
          type: 'symmetry_axis',
          involvedIds: [seg.id, fig.id],
          label: `Axe de symétrie du ${fig.name.charAt(0).toLowerCase() + fig.name.slice(1)}`,
        });
      }
    }
  }
  return results;
}

/**
 * Group perpendicular properties by segment: AB ⊥ EF, AB ⊥ BH → AB ⊥ {EF, BH}.
 * Groups by the first segment in each pair.
 */
export function groupPerpendicularProperties(
  props: DetectedProperty[],
  segments: readonly Segment[],
  points: readonly Point[],
): DetectedProperty[] {
  const perp = props.filter((p) => p.type === 'perpendicular');
  const other = props.filter((p) => p.type !== 'perpendicular');
  if (perp.length <= 1) return props;

  const pointMap = new Map(points.map((pt) => [pt.id, pt]));
  const segMap = new Map(segments.map((s) => [s.id, s]));

  const segLabel = (id: string) => {
    const seg = segMap.get(id);
    if (!seg) return '??';
    const s = pointMap.get(seg.startPointId);
    const e = pointMap.get(seg.endPointId);
    return s && e ? `${s.label}${e.label}` : '??';
  };

  // Group by first segment ID
  const groups = new Map<string, Set<string>>();
  for (const p of perp) {
    const [a, b] = p.involvedIds;
    if (!a || !b) continue;
    if (!groups.has(a)) groups.set(a, new Set());
    groups.get(a)!.add(b);
  }

  // Merge: if a segment appears only as "other" in groups, skip its own group
  const consumed = new Set<string>();
  const grouped: DetectedProperty[] = [];

  for (const [srcId, targets] of groups) {
    if (consumed.has(srcId)) continue;
    const allIds = [srcId, ...targets];
    const targetLabels = [...targets].map(segLabel);
    grouped.push({
      type: 'perpendicular',
      involvedIds: allIds,
      label: `${segLabel(srcId)} ⊥ ${targetLabels.join(', ')}`,
    });
    consumed.add(srcId);
  }

  return [...other, ...grouped];
}

/** Detect all properties in the construction. */
export function detectAllProperties(
  segments: readonly Segment[],
  points: readonly Point[],
  circles?: readonly Circle[],
): DetectedProperty[] {
  const raw = [
    ...detectParallelSegments(segments, points),
    ...detectPerpendicularSegments(segments, points),
    ...detectEqualLengths(segments, points),
    ...(circles ? detectChords(segments, points, circles) : []),
  ];
  const grouped = groupParallelProperties(raw, segments, points);
  const grouped2 = groupEqualLengthProperties(grouped, segments, points);
  return groupPerpendicularProperties(grouped2, segments, points);
}
