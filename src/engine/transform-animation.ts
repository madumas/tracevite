/**
 * Transform animation data — pure functions.
 * Computes construction lines and interpolation for animated transformations.
 */

import type { ConstructionState } from '@/model/types';
import { rotatePoint } from './rotation';
import { scalePoint } from './homothety';
import { reflectPoint } from './reflection';

export interface ConstructionLine {
  readonly type: 'line' | 'arc';
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  /** Arc-specific: center of the circle. */
  readonly center?: { x: number; y: number };
  /** Arc-specific: radius. */
  readonly radius?: number;
  /** Arc-specific: angle in degrees (for SVG arc direction). */
  readonly angleDeg?: number;
}

export interface TransformAnimData {
  /** Construction lines to render (dashed guides). */
  readonly constructionLines: ConstructionLine[];
  /** Get interpolated position for a point at time t ∈ [0, 1]. */
  readonly interpolatePosition: (pointId: string, t: number) => { x: number; y: number };
  /** Point IDs involved in the animation. */
  readonly pointIds: readonly string[];
  /** Segment IDs involved in the animation. */
  readonly segmentIds: readonly string[];
  /** Circle IDs involved in the animation. */
  readonly circleIds: readonly string[];
  /** Get interpolated radius for a circle at time t (for homothety). Returns original radius if unchanged. */
  readonly interpolateRadius: (circleId: string, t: number) => number;
}

/** Compute animation data for a rotation. */
export function computeRotationAnimData(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  state: ConstructionState,
  center: { x: number; y: number },
  angleDeg: number,
): TransformAnimData {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const constructionLines: ConstructionLine[] = [];

  for (const pid of pointIds) {
    const pt = pointMap.get(pid);
    if (!pt) continue;
    const img = rotatePoint(pt, center, angleDeg);
    const dx = pt.x - center.x;
    const dy = pt.y - center.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    if (radius > 0.5) {
      // Radius line: center → original
      constructionLines.push({ type: 'line', from: center, to: pt });
      // Arc: original → image
      constructionLines.push({
        type: 'arc',
        from: pt,
        to: img,
        center,
        radius,
        angleDeg,
      });
    }
  }

  return {
    constructionLines,
    interpolatePosition: (pid, t) => {
      const pt = pointMap.get(pid);
      if (!pt) return { x: 0, y: 0 };
      return rotatePoint(pt, center, angleDeg * t);
    },
    pointIds,
    segmentIds,
    circleIds: [],
    interpolateRadius: (_cid, _t) => 0,
  };
}

/** Compute animation data for a translation (or reproduce). */
export function computeTranslationAnimData(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  state: ConstructionState,
  offsetX: number,
  offsetY: number,
): TransformAnimData {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const constructionLines: ConstructionLine[] = [];

  for (const pid of pointIds) {
    const pt = pointMap.get(pid);
    if (!pt) continue;
    constructionLines.push({
      type: 'line',
      from: pt,
      to: { x: pt.x + offsetX, y: pt.y + offsetY },
    });
  }

  return {
    constructionLines,
    interpolatePosition: (pid, t) => {
      const pt = pointMap.get(pid);
      if (!pt) return { x: 0, y: 0 };
      return { x: pt.x + offsetX * t, y: pt.y + offsetY * t };
    },
    pointIds,
    segmentIds,
    circleIds: [],
    interpolateRadius: (_cid, _t) => 0,
  };
}

/** Compute animation data for a homothety (scale). */
export function computeHomothetyAnimData(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  state: ConstructionState,
  center: { x: number; y: number },
  factor: number,
): TransformAnimData {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const constructionLines: ConstructionLine[] = [];

  for (const pid of pointIds) {
    const pt = pointMap.get(pid);
    if (!pt) continue;
    const img = scalePoint(pt, center, factor);
    // Ray from center through original to image
    constructionLines.push({ type: 'line', from: center, to: img });
  }

  return {
    constructionLines,
    interpolatePosition: (pid, t) => {
      const pt = pointMap.get(pid);
      if (!pt) return { x: 0, y: 0 };
      const currentFactor = 1 + (factor - 1) * t;
      return scalePoint(pt, center, currentFactor);
    },
    pointIds,
    segmentIds,
    circleIds: [],
    interpolateRadius: (cid, t) => {
      const circle = state.circles.find((c) => c.id === cid);
      if (!circle) return 0;
      return circle.radiusMm * (1 + (factor - 1) * t);
    },
  };
}

/** Compute animation data for a reflection. */
export function computeReflectionAnimData(
  pointIds: readonly string[],
  segmentIds: readonly string[],
  state: ConstructionState,
  axisP1: { x: number; y: number },
  axisP2: { x: number; y: number },
): TransformAnimData {
  const pointMap = new Map(state.points.map((p) => [p.id, p]));
  const constructionLines: ConstructionLine[] = [];

  // Compute projection foot for each point
  const dx = axisP2.x - axisP1.x;
  const dy = axisP2.y - axisP1.y;
  const lenSq = dx * dx + dy * dy;

  for (const pid of pointIds) {
    const pt = pointMap.get(pid);
    if (!pt) continue;

    // Foot of perpendicular onto axis
    const t = lenSq > 0 ? ((pt.x - axisP1.x) * dx + (pt.y - axisP1.y) * dy) / lenSq : 0;
    const foot = { x: axisP1.x + t * dx, y: axisP1.y + t * dy };
    const img = reflectPoint(pt, axisP1, axisP2);

    // Line: original → foot
    constructionLines.push({ type: 'line', from: pt, to: foot });
    // Line: foot → image
    constructionLines.push({ type: 'line', from: foot, to: img });
  }

  return {
    constructionLines,
    interpolatePosition: (pid, t) => {
      const pt = pointMap.get(pid);
      if (!pt) return { x: 0, y: 0 };
      const img = reflectPoint(pt, axisP1, axisP2);
      return { x: pt.x + (img.x - pt.x) * t, y: pt.y + (img.y - pt.y) * t };
    },
    pointIds,
    segmentIds,
    circleIds: [],
    interpolateRadius: (_cid, _t) => 0,
  };
}
