/**
 * Isometric figure comparison by translation (spec v2).
 * Compares two closed figures by aligning centroids and finding
 * the best cyclic vertex correspondence.
 */

import { distance } from './geometry';
import type { Point } from '@/model/types';

export interface VertexCorrespondence {
  readonly figureAPointId: string;
  readonly figureBPointId: string;
  readonly deviationMm: number;
}

export interface ComparisonResult {
  readonly isIsometric: boolean;
  readonly maxDeviationMm: number;
  readonly correspondences: readonly VertexCorrespondence[];
  readonly translationVector: { x: number; y: number };
}

/**
 * Compare two closed figures by translation only (no rotation).
 * Aligns centroids, then tries all cyclic rotations + reversed
 * ordering of figure B vertices to find the best match.
 *
 * @param pointIdsA - ordered vertex IDs of figure A (from face detection)
 * @param pointIdsB - ordered vertex IDs of figure B (from face detection)
 * @param points - all points in the construction
 * @returns ComparisonResult with correspondences and deviation
 */
export function compareFiguresByTranslation(
  pointIdsA: readonly string[],
  pointIdsB: readonly string[],
  points: readonly Point[],
): ComparisonResult {
  const pointMap = new Map(points.map((p) => [p.id, p]));
  // Filter out stale ids (point removed between figure capture and comparison —
  // otherwise distance() crashes on undefined). (QA 3.23)
  const ptsA = pointIdsA.map((id) => pointMap.get(id)).filter((p): p is Point => !!p);
  const ptsB = pointIdsB.map((id) => pointMap.get(id)).filter((p): p is Point => !!p);
  const n = ptsA.length;

  // Different vertex count → not isometric, but compute translation for ghost overlay
  if (n !== ptsB.length || n === 0) {
    const tx = n > 0 && ptsB.length > 0 ? centroid(ptsB).x - centroid(ptsA).x : 0;
    const ty = n > 0 && ptsB.length > 0 ? centroid(ptsB).y - centroid(ptsA).y : 0;
    return {
      isIsometric: false,
      maxDeviationMm: Infinity,
      correspondences: [],
      translationVector: { x: tx, y: ty },
    };
  }

  // Compute centroids
  const centroidA = centroid(ptsA);
  const centroidB = centroid(ptsB);
  const tx = centroidB.x - centroidA.x;
  const ty = centroidB.y - centroidA.y;

  // Translate A vertices to align with B
  const translatedA = ptsA.map((p) => ({ x: p.x + tx, y: p.y + ty }));

  // Try all cyclic rotations of B (forward and reversed winding)
  let bestTotal = Infinity;
  let bestCorrespondences: VertexCorrespondence[] = [];

  const orderings = [pointIdsB, [...pointIdsB].reverse()];
  for (const ordering of orderings) {
    const orderedPts = ordering.map((id) => pointMap.get(id)!);
    for (let rot = 0; rot < n; rot++) {
      let total = 0;
      const corrs: VertexCorrespondence[] = [];
      for (let i = 0; i < n; i++) {
        const bIdx = (i + rot) % n;
        const dev = distance(translatedA[i]!, orderedPts[bIdx]!);
        total += dev;
        corrs.push({
          figureAPointId: pointIdsA[i]!,
          figureBPointId: ordering[bIdx]!,
          deviationMm: dev,
        });
      }
      if (total < bestTotal) {
        bestTotal = total;
        bestCorrespondences = corrs;
      }
    }
  }

  const maxDev = Math.max(...bestCorrespondences.map((c) => c.deviationMm));

  return {
    isIsometric: maxDev <= 1.0,
    maxDeviationMm: maxDev,
    correspondences: bestCorrespondences,
    translationVector: { x: tx, y: ty },
  };
}

function centroid(pts: readonly { x: number; y: number }[]): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}
