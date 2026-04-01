/**
 * Reflection geometry — pure functions.
 */

import type { Point, ConstructionState } from '@/model/types';
import { generateId } from '@/model/id';
import { distance } from './geometry';

/**
 * Reflect a point across an axis defined by two points.
 * Standard formula: project point onto axis, then reflect.
 */
export function reflectPoint(
  point: { x: number; y: number },
  axisP1: { x: number; y: number },
  axisP2: { x: number; y: number },
): { x: number; y: number } {
  const dx = axisP2.x - axisP1.x;
  const dy = axisP2.y - axisP1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: point.x, y: point.y };

  // Project point onto axis line
  const t = ((point.x - axisP1.x) * dx + (point.y - axisP1.y) * dy) / lenSq;
  const projX = axisP1.x + t * dx;
  const projY = axisP1.y + t * dy;

  // Reflect: move same distance on other side
  return {
    x: 2 * projX - point.x,
    y: 2 * projY - point.y,
  };
}

/**
 * Generate prime label: "A" → "A'", "A'" → "A''", etc.
 * Prime notation reserved for reflections (spec §6.6).
 */
export function generatePrimeLabel(label: string, existingLabels: readonly string[]): string {
  let candidate = label + "'";
  const used = new Set(existingLabels);
  while (used.has(candidate)) {
    candidate += "'";
  }
  return candidate;
}

/**
 * Constrain axis angle to permitted orientations in 2e cycle:
 * vertical (90°), horizontal (0°), 45° diagonal (45°, 135°).
 * Returns the constrained second point.
 */
export function constrainAxisAngle(
  axisP1: { x: number; y: number },
  axisP2: { x: number; y: number },
): { x: number; y: number } {
  const dx = axisP2.x - axisP1.x;
  const dy = axisP2.y - axisP1.y;
  const angle = Math.atan2(dy, dx);

  // Permitted angles: 0, π/4, π/2, 3π/4, π, -π/4, -π/2, -3π/4
  const permitted = [
    0,
    Math.PI / 4,
    Math.PI / 2,
    (3 * Math.PI) / 4,
    Math.PI,
    -Math.PI / 4,
    -Math.PI / 2,
    -(3 * Math.PI) / 4,
  ];

  let closestAngle = permitted[0]!;
  let minDiff = Infinity;
  for (const pa of permitted) {
    let diff = Math.abs(angle - pa);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = pa;
    }
  }

  const len = distance(axisP1, axisP2);
  return {
    x: axisP1.x + Math.cos(closestAngle) * len,
    y: axisP1.y + Math.sin(closestAngle) * len,
  };
}

/**
 * Reflect a set of points and their segments across an axis.
 * Returns new points and segments (independent copies with prime labels).
 */
export function reflectConstruction(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  state: ConstructionState,
  axisP1: { x: number; y: number },
  axisP2: { x: number; y: number },
): {
  points: Point[];
  segments: Array<{ id: string; startPointId: string; endPointId: string; lengthMm: number }>;
  pointIdMap: Map<string, string>;
} {
  const existingLabels = state.points.map((p) => p.label);
  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  // Map old point ID → new reflected point
  const reflectedPointMap = new Map<string, Point>();

  for (const pid of pointIds) {
    const original = pointMap.get(pid);
    if (!original) continue;

    const reflected = reflectPoint(original, axisP1, axisP2);
    const label = generatePrimeLabel(original.label, [
      ...existingLabels,
      ...Array.from(reflectedPointMap.values()).map((p) => p.label),
    ]);

    reflectedPointMap.set(pid, {
      id: generateId(),
      x: reflected.x,
      y: reflected.y,
      label,
      locked: false,
    });
  }

  // Create reflected segments
  const newSegments: Array<{
    id: string;
    startPointId: string;
    endPointId: string;
    lengthMm: number;
  }> = [];

  for (const sid of segmentIds) {
    const original = state.segments.find((s) => s.id === sid);
    if (!original) continue;

    const newStart = reflectedPointMap.get(original.startPointId);
    const newEnd = reflectedPointMap.get(original.endPointId);
    if (!newStart || !newEnd) continue;

    newSegments.push({
      id: generateId(),
      startPointId: newStart.id,
      endPointId: newEnd.id,
      lengthMm: original.lengthMm, // Reflection preserves distances
    });
  }

  // Build old ID → new ID mapping for caller use (e.g. circle reflection)
  const pointIdMap = new Map<string, string>();
  for (const [oldId, newPoint] of reflectedPointMap) {
    pointIdMap.set(oldId, newPoint.id);
  }

  return {
    points: Array.from(reflectedPointMap.values()),
    segments: newSegments,
    pointIdMap,
  };
}

/**
 * Check if a set of points is symmetric about a given axis.
 * For each point, finds its reflection and checks if a matching point exists
 * within the given tolerance.
 *
 * Returns symmetry info with correspondences or deviation data.
 */
export interface SymmetryResult {
  readonly isSymmetric: boolean;
  readonly maxDeviationMm: number;
  readonly correspondences: readonly {
    originalId: string;
    matchedId: string;
    deviationMm: number;
  }[];
}

export function checkSymmetry(
  pointIds: readonly string[],
  state: ConstructionState,
  axisP1: { x: number; y: number },
  axisP2: { x: number; y: number },
  toleranceMm: number = 1,
): SymmetryResult {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const targetPoints = pointIds.map((id) => pointMap.get(id)).filter(Boolean) as Point[];

  const correspondences: { originalId: string; matchedId: string; deviationMm: number }[] = [];
  let maxDeviation = 0;
  let isSymmetric = true;

  for (const point of targetPoints) {
    const reflected = reflectPoint(point, axisP1, axisP2);

    // Find the closest target point to the reflected position
    let bestMatch: Point | null = null;
    let bestDist = Infinity;

    for (const candidate of targetPoints) {
      const d = distance(reflected, candidate);
      if (d < bestDist) {
        bestDist = d;
        bestMatch = candidate;
      }
    }

    console.log(
      `[checkSymmetry] ${point.label}(${point.x.toFixed(1)},${point.y.toFixed(1)}) → reflected(${reflected.x.toFixed(1)},${reflected.y.toFixed(1)}) → closest=${bestMatch?.label} dist=${bestDist.toFixed(2)} tol=${toleranceMm}`,
    );

    if (!bestMatch || bestDist > toleranceMm) {
      // Check if this point is on the circumference of a symmetric circle
      // A point on a circle's circumference is symmetric if the circle's center
      // reflects to itself (circle centered on/near axis)
      const onSymmetricCircle = state.circles.some((circle) => {
        const center = pointMap.get(circle.centerPointId);
        if (!center) return false;
        const distToCircumference = Math.abs(distance(point, center) - circle.radiusMm);
        if (distToCircumference > toleranceMm) return false; // point not on this circle
        // Check if the circle's center reflects to itself (on the axis)
        const reflectedCenter = reflectPoint(center, axisP1, axisP2);
        return distance(reflectedCenter, center) <= toleranceMm;
      });

      if (!onSymmetricCircle) {
        isSymmetric = false;
      }
      correspondences.push({
        originalId: point.id,
        matchedId: bestMatch?.id ?? point.id,
        deviationMm: onSymmetricCircle ? 0 : bestDist === Infinity ? toleranceMm * 2 : bestDist,
      });
      if (!onSymmetricCircle && bestDist !== Infinity && bestDist > maxDeviation)
        maxDeviation = bestDist;
    } else {
      correspondences.push({
        originalId: point.id,
        matchedId: bestMatch.id,
        deviationMm: bestDist,
      });
      if (bestDist > maxDeviation) maxDeviation = bestDist;
    }
  }

  // Verify bijection: each matchedId must be unique
  if (isSymmetric) {
    const matchedIds = new Set<string>();
    for (const corr of correspondences) {
      if (matchedIds.has(corr.matchedId)) {
        isSymmetric = false;
        break;
      }
      matchedIds.add(corr.matchedId);
    }
  }

  // Verify circles: each circle's reflected center must match another circle with same radius
  if (isSymmetric && state.circles.length > 0) {
    for (const circle of state.circles) {
      const center = pointMap.get(circle.centerPointId);
      if (!center) continue;
      const reflectedCenter = reflectPoint(center, axisP1, axisP2);
      // Find a circle whose center is near the reflected position with same radius
      const match = state.circles.find((c) => {
        if (c.id === circle.id) {
          // Self-match: circle is on the axis (center reflects to itself)
          const d = distance(reflectedCenter, center);
          return d <= toleranceMm && Math.abs(c.radiusMm - circle.radiusMm) <= toleranceMm;
        }
        const otherCenter = pointMap.get(c.centerPointId);
        if (!otherCenter) return false;
        const d = distance(reflectedCenter, otherCenter);
        return d <= toleranceMm && Math.abs(c.radiusMm - circle.radiusMm) <= toleranceMm;
      });
      if (!match) {
        isSymmetric = false;
        break;
      }
    }
  }

  return { isSymmetric, maxDeviationMm: maxDeviation, correspondences };
}
