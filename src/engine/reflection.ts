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

/** Max number of trailing primes before switching to numeric subscripts. */
const MAX_PRIMES = 2;
/** Unicode subscript digits 1-9 (0 is only needed past 10 transformations). */
const SUBSCRIPT_DIGITS = [
  '\u2080',
  '\u2081',
  '\u2082',
  '\u2083',
  '\u2084',
  '\u2085',
  '\u2086',
  '\u2087',
  '\u2088',
  '\u2089',
] as const;

function toSubscript(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUBSCRIPT_DIGITS[parseInt(d, 10)] ?? d)
    .join('');
}

/** Base label without any primes or numeric subscripts (e.g. "A''" → "A", "A₁" → "A"). */
function stripDecoration(label: string): string {
  let base = label;
  while (base.endsWith("'")) base = base.slice(0, -1);
  // Trim trailing subscript digits.
  while (base.length > 0 && SUBSCRIPT_DIGITS.includes(base[base.length - 1] as never)) {
    base = base.slice(0, -1);
  }
  return base;
}

/**
 * Generate a transformation label:
 *   A  → A'
 *   A' → A''
 *   A''→ A₁  (overflow — readability limit, avoids A'''… mush)
 *   A₁ → A₂, A₂ → A₃, ...
 *
 * Rationale (neuropsy review): ≥ 3 primes are hard to count visually for
 * students with DCD / working-memory deficits. Numeric subscripts are also
 * the standard notation used later in secondary school, so they prepare
 * the curriculum transition.
 */
export function generatePrimeLabel(label: string, existingLabels: readonly string[]): string {
  const used = new Set(existingLabels);
  const base = stripDecoration(label);

  // Try prime notation up to MAX_PRIMES trailing primes.
  for (let n = 1; n <= MAX_PRIMES; n++) {
    const candidate = base + "'".repeat(n);
    if (!used.has(candidate)) return candidate;
  }

  // All primes exhausted — switch to numeric subscript: find smallest free Nᵢ.
  for (let i = 1; i <= 99; i++) {
    const candidate = base + toSubscript(i);
    if (!used.has(candidate)) return candidate;
  }

  // Last-resort fallback: legacy behavior.
  let fallback = label + "'";
  while (used.has(fallback)) fallback += "'";
  return fallback;
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
  transformOperation?: string,
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
      ...(transformOperation ? { transformOperation, transformSourceId: pid } : {}),
    });
  }

  // Create reflected segments
  const newSegments: Array<{
    id: string;
    startPointId: string;
    endPointId: string;
    lengthMm: number;
    isTransformed?: boolean;
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
      isTransformed: true,
      ...(transformOperation ? { transformOperation } : {}),
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

  // Verify bijection: each matchedId must be unique. When the naive greedy
  // pass collides (e.g. an isocèle triangle with the axis near one of the
  // non-symmetric vertices), try all permutations to see if any valid
  // matching exists within tolerance before declaring failure. Brute force
  // is fine for primary-school figures (n ≤ 8 → 40 320 cases). (QA 3.14)
  if (isSymmetric) {
    const matchedIds = new Set<string>();
    let collision = false;
    for (const corr of correspondences) {
      if (matchedIds.has(corr.matchedId)) {
        collision = true;
        break;
      }
      matchedIds.add(corr.matchedId);
    }
    if (collision) {
      const recovered = tryPermutationMatching(targetPoints, axisP1, axisP2, toleranceMm);
      if (recovered) {
        correspondences.length = 0;
        maxDeviation = 0;
        for (const { originalId, matchedId, deviationMm } of recovered) {
          correspondences.push({ originalId, matchedId, deviationMm });
          if (deviationMm > maxDeviation) maxDeviation = deviationMm;
        }
      } else {
        isSymmetric = false;
      }
    }
  }

  // Cumulative-deviation guard (QA 3.17): even when each individual point
  // fits within tolerance, a large total deviation indicates a visually non-
  // symmetric figure (e.g. 10 points each off by 0.9 mm). Reject when the
  // average deviation uses more than half of the budget.
  if (isSymmetric && targetPoints.length > 0) {
    const sumDev = correspondences.reduce((s, c) => s + c.deviationMm, 0);
    if (sumDev > toleranceMm * 0.5 * targetPoints.length) {
      isSymmetric = false;
    }
  }

  // Verify circles: only check circles whose center is in the checked pointIds
  const pointIdSet = new Set(pointIds);
  const relevantCircles = state.circles.filter((c) => pointIdSet.has(c.centerPointId));
  if (isSymmetric && relevantCircles.length > 0) {
    for (const circle of relevantCircles) {
      const center = pointMap.get(circle.centerPointId);
      if (!center) continue;
      const reflectedCenter = reflectPoint(center, axisP1, axisP2);
      // Find a circle whose center is near the reflected position with same radius
      const match = relevantCircles.find((c) => {
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

/**
 * Brute-force every permutation of target points → reflected points to find a
 * valid bijective matching within tolerance. Falls back gracefully for n > 8
 * where enumerating 40 320+ permutations is too expensive. (QA 3.14)
 */
function tryPermutationMatching(
  targetPoints: readonly Point[],
  axisP1: { x: number; y: number },
  axisP2: { x: number; y: number },
  toleranceMm: number,
): Array<{ originalId: string; matchedId: string; deviationMm: number }> | null {
  const n = targetPoints.length;
  if (n === 0 || n > 8) return null;

  const reflected = targetPoints.map((p) => reflectPoint(p, axisP1, axisP2));
  const indices = Array.from({ length: n }, (_, i) => i);
  let best: Array<{ originalId: string; matchedId: string; deviationMm: number }> | null = null;
  let bestMax = Infinity;

  const permute = (arr: number[], start: number) => {
    if (start === arr.length) {
      let ok = true;
      let maxDev = 0;
      const result: Array<{ originalId: string; matchedId: string; deviationMm: number }> = [];
      for (let i = 0; i < n; i++) {
        const d = distance(reflected[i]!, targetPoints[arr[i]!]!);
        if (d > toleranceMm) {
          ok = false;
          break;
        }
        if (d > maxDev) maxDev = d;
        result.push({
          originalId: targetPoints[i]!.id,
          matchedId: targetPoints[arr[i]!]!.id,
          deviationMm: d,
        });
      }
      if (ok && maxDev < bestMax) {
        best = result;
        bestMax = maxDev;
      }
      return;
    }
    for (let i = start; i < arr.length; i++) {
      [arr[start]!, arr[i]!] = [arr[i]!, arr[start]!];
      permute(arr, start + 1);
      [arr[start]!, arr[i]!] = [arr[i]!, arr[start]!];
    }
  };

  permute(indices, 0);
  return best;
}
