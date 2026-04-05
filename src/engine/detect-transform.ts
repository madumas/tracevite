/**
 * Detect transformation in undo/redo state diff.
 * Used to replay animation on Redo for pedagogical demonstrations.
 */

import type { ConstructionState } from '@/model/types';
import type { TransformAnimData } from './transform-animation';
import {
  computeRotationAnimData,
  computeTranslationAnimData,
  computeReflectionAnimData,
  computeHomothetyAnimData,
} from './transform-animation';

export interface TransformDetection {
  readonly type: 'rotation' | 'reflection' | 'reproduce' | 'scale';
  readonly opId: string;
  /** Original point IDs (in pre-transform state). */
  readonly originalPointIds: readonly string[];
  /** Original segment IDs (in pre-transform state). */
  readonly originalSegmentIds: readonly string[];
  /** New point IDs created by the transform. */
  readonly newPointIds: readonly string[];
  /** New segment IDs created by the transform. */
  readonly newSegmentIds: readonly string[];
  /** New circle IDs created by the transform. */
  readonly newCircleIds: readonly string[];
}

/**
 * Detect if a Redo would restore a transformation.
 * Compares current state with the next future state.
 */
export function detectTransformInRedo(
  current: ConstructionState,
  future: ConstructionState,
): TransformDetection | null {
  const currentPointIds = new Set(current.points.map((p) => p.id));
  const newPoints = future.points.filter((p) => !currentPointIds.has(p.id));
  if (newPoints.length === 0) return null;

  // All new points should share the same transformOperation
  const opId = newPoints[0]?.transformOperation;
  if (!opId) return null;

  const type = opId.split('-')[0] as TransformDetection['type'];
  // Skip frieze (too complex for animation replay)
  if (type !== 'rotation' && type !== 'reflection' && type !== 'reproduce' && type !== 'scale')
    return null;

  const currentSegmentIds = new Set(current.segments.map((s) => s.id));
  const newSegments = future.segments.filter((s) => !currentSegmentIds.has(s.id));
  const currentCircleIds = new Set(current.circles.map((c) => c.id));
  const newCircles = future.circles.filter((c) => !currentCircleIds.has(c.id));

  // Use transformSourceId to find original point IDs
  const originalPointIdSet = new Set<string>();
  for (const p of newPoints) {
    if (p.transformSourceId) originalPointIdSet.add(p.transformSourceId);
  }

  // Find original segments (those connecting original points)
  const originalSegmentIds = current.segments
    .filter((s) => originalPointIdSet.has(s.startPointId) && originalPointIdSet.has(s.endPointId))
    .map((s) => s.id);

  return {
    type,
    opId,
    originalPointIds: [...originalPointIdSet],
    originalSegmentIds,
    newPointIds: newPoints.map((p) => p.id),
    newSegmentIds: newSegments.map((s) => s.id),
    newCircleIds: newCircles.map((c) => c.id),
  };
}

/**
 * Compute animation data for a detected transformation.
 * Uses the pre-transformation state (current) and the positions of new points in future state.
 */
export function computeRedoAnimData(
  detection: TransformDetection,
  current: ConstructionState,
  future: ConstructionState,
): TransformAnimData | null {
  const { type, originalPointIds, originalSegmentIds } = detection;

  if (originalPointIds.length === 0) return null;

  // Match original→image points via transformSourceId
  const pairs = matchOriginalToImage(current, future, detection.newPointIds);
  if (pairs.length === 0) return null;

  switch (type) {
    case 'reproduce': {
      // Translation: offset from any matched pair
      const [orig0, img0] = pairs[0]!;
      const offsetX = img0.x - orig0.x;
      const offsetY = img0.y - orig0.y;
      return computeTranslationAnimData(
        originalPointIds,
        originalSegmentIds,
        current,
        offsetX,
        offsetY,
      );
    }

    case 'reflection': {
      // Axis = perpendicular bisector of any original→image pair
      const [rOrig0, rImg0] = pairs[0]!;
      const midX = (rOrig0.x + rImg0.x) / 2;
      const midY = (rOrig0.y + rImg0.y) / 2;

      let axisP1: { x: number; y: number };
      let axisP2: { x: number; y: number };

      if (pairs.length >= 2) {
        const [rOrig1, rImg1] = pairs[1]!;
        const mid2X = (rOrig1.x + rImg1.x) / 2;
        const mid2Y = (rOrig1.y + rImg1.y) / 2;
        axisP1 = { x: midX, y: midY };
        axisP2 = { x: mid2X, y: mid2Y };
      } else {
        const dx = rImg0.x - rOrig0.x;
        const dy = rImg0.y - rOrig0.y;
        axisP1 = { x: midX - dy, y: midY + dx };
        axisP2 = { x: midX + dy, y: midY - dx };
      }

      return computeReflectionAnimData(
        originalPointIds,
        originalSegmentIds,
        current,
        axisP1,
        axisP2,
      );
    }

    case 'rotation': {
      // Reconstruct center and angle from two original→image pairs
      if (pairs.length < 2) return null;

      const [p1, p1i] = pairs[0]!;
      const [p2, p2i] = pairs[1]!;

      // Center = intersection of perpendicular bisectors of (p1, p1i) and (p2, p2i)
      const center = circumcenterFromTwoPairs(p1, p1i, p2, p2i);
      if (!center) return null;

      // Angle from center→p1 to center→p1i using atan2
      const angle1 = Math.atan2(p1.y - center.y, p1.x - center.x);
      const angle2 = Math.atan2(p1i.y - center.y, p1i.x - center.x);
      let angleDeg = ((angle2 - angle1) * 180) / Math.PI;
      // Normalize to [-180, 180] to avoid wrapping issues
      while (angleDeg > 180) angleDeg -= 360;
      while (angleDeg < -180) angleDeg += 360;

      return computeRotationAnimData(
        originalPointIds,
        originalSegmentIds,
        current,
        center,
        angleDeg,
      );
    }

    case 'scale': {
      // Reconstruct center and factor from two pairs
      if (pairs.length < 2) return null;

      const [s1, s1i] = pairs[0]!;
      const [s2, s2i] = pairs[1]!;

      // Center = intersection of lines (s1→s1i) and (s2→s2i)
      const center = lineIntersection(s1, s1i, s2, s2i);
      if (!center) return null;

      // Factor = distance(center, s1i) / distance(center, s1)
      const d1 = Math.sqrt((s1.x - center.x) ** 2 + (s1.y - center.y) ** 2);
      const d1i = Math.sqrt((s1i.x - center.x) ** 2 + (s1i.y - center.y) ** 2);
      const factor = d1 > 0.01 ? d1i / d1 : 1;

      return computeHomothetyAnimData(
        originalPointIds,
        originalSegmentIds,
        detection.newCircleIds,
        current,
        center,
        factor,
      );
    }
  }
}

/**
 * Match original points to their transformed images via transformSourceId.
 */
function matchOriginalToImage(
  current: ConstructionState,
  future: ConstructionState,
  newPointIds: readonly string[],
): [{ x: number; y: number }, { x: number; y: number }][] {
  const pairs: [{ x: number; y: number }, { x: number; y: number }][] = [];
  for (const newPt of future.points) {
    if (!newPointIds.includes(newPt.id) || !newPt.transformSourceId) continue;
    const origPt = current.points.find((p) => p.id === newPt.transformSourceId);
    if (origPt) pairs.push([origPt, newPt]);
  }
  return pairs;
}

/** Intersection of perpendicular bisectors of segments (a,b) and (c,d). */
function circumcenterFromTwoPairs(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): { x: number; y: number } | null {
  // Midpoints
  const m1x = (a.x + b.x) / 2;
  const m1y = (a.y + b.y) / 2;
  const m2x = (c.x + d.x) / 2;
  const m2y = (c.y + d.y) / 2;

  // Perpendicular directions (rotated 90°)
  const d1x = -(b.y - a.y);
  const d1y = b.x - a.x;
  const d2x = -(d.y - c.y);
  const d2y = d.x - c.x;

  // Solve: m1 + t*d1 = m2 + s*d2
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((m2x - m1x) * d2y - (m2y - m1y) * d2x) / denom;
  return { x: m1x + t * d1x, y: m1y + t * d1y };
}

/** Intersection of two lines defined by points (a→b) and (c→d). */
function lineIntersection(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): { x: number; y: number } | null {
  const dx1 = b.x - a.x;
  const dy1 = b.y - a.y;
  const dx2 = d.x - c.x;
  const dy2 = d.y - c.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((c.x - a.x) * dy2 - (c.y - a.y) * dx2) / denom;
  return { x: a.x + t * dx1, y: a.y + t * dy1 };
}
