/**
 * Angle detection and classification.
 * Pure functions — no React, no side effects.
 */

import type { ConstructionState, AngleInfo, AngleClassification, SchoolLevel } from '@/model/types';

/**
 * Classify an angle in degrees using spec priority:
 * right [89.5, 90.5] > flat [179.5, 180.5] > acute ]0, 89.5[ > obtuse ]90.5, 179.5[
 */
export function classifyAngle(degrees: number): AngleClassification {
  if (degrees >= 89.5 && degrees <= 90.5) return 'droit';
  if (degrees >= 179.5 && degrees <= 180.5) return 'plat';
  if (degrees > 0 && degrees < 89.5) return 'aigu';
  if (degrees > 90.5 && degrees < 179.5) return 'obtus';
  if (degrees > 180.5) return 'reflex';
  return 'aigu'; // fallback for ~0°
}

/**
 * Detect all angles at a specific vertex.
 * When N segments meet at a vertex, sort by direction (atan2) and compute
 * the N angles between adjacent pairs. (spec §21.2 case 3)
 */
export function detectAnglesAtVertex(vertexId: string, state: ConstructionState): AngleInfo[] {
  // Find all segments connected to this vertex
  const connectedSegments = state.segments.filter(
    (s) => s.startPointId === vertexId || s.endPointId === vertexId,
  );

  if (connectedSegments.length < 2) return [];

  const vertex = state.points.find((p) => p.id === vertexId);
  if (!vertex) return [];

  // For each connected segment, find the other endpoint and compute direction angle
  const rays: Array<{ pointId: string; angle: number }> = [];

  for (const seg of connectedSegments) {
    const otherId = seg.startPointId === vertexId ? seg.endPointId : seg.startPointId;
    const other = state.points.find((p) => p.id === otherId);
    if (!other) continue;

    const dx = other.x - vertex.x;
    const dy = other.y - vertex.y;
    const angle = Math.atan2(dy, dx);
    rays.push({ pointId: otherId, angle });
  }

  if (rays.length < 2) return [];

  // Sort by angle (ascending)
  rays.sort((a, b) => a.angle - b.angle);

  // For exactly 2 rays: return single angle (the smaller one, ≤180°)
  if (rays.length === 2) {
    const ray1 = rays[0]!;
    const ray2 = rays[1]!;
    let diff = ray2.angle - ray1.angle;
    if (diff < 0) diff += 2 * Math.PI;
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const degrees = diff * (180 / Math.PI);
    if (degrees < 0.1) return [];
    return [
      {
        vertexPointId: vertexId,
        ray1PointId: ray1.pointId,
        ray2PointId: ray2.pointId,
        degrees,
        classification: classifyAngle(degrees),
      },
    ];
  }

  // For 3+ rays: compute N adjacent angles (sum to 360°)
  const angles: AngleInfo[] = [];
  for (let i = 0; i < rays.length; i++) {
    const ray1 = rays[i]!;
    const ray2 = rays[(i + 1) % rays.length]!;

    let diff = ray2.angle - ray1.angle;
    if (diff < 0) diff += 2 * Math.PI;

    const degrees = diff * (180 / Math.PI);
    if (degrees < 0.1) continue;

    angles.push({
      vertexPointId: vertexId,
      ray1PointId: ray1.pointId,
      ray2PointId: ray2.pointId,
      degrees,
      classification: classifyAngle(degrees),
    });
  }

  return angles;
}

/**
 * Detect all angles in the construction.
 * Iterates over all points that have 2+ connected segments.
 */
export function detectAllAngles(state: ConstructionState): AngleInfo[] {
  const angles: AngleInfo[] = [];
  const processedVertices = new Set<string>();

  for (const point of state.points) {
    if (processedVertices.has(point.id)) continue;
    processedVertices.add(point.id);

    const vertexAngles = detectAnglesAtVertex(point.id, state);
    angles.push(...vertexAngles);
  }

  return angles;
}

/**
 * Check if an angle represents aligned points (≈180°) in 2e cycle.
 * Spec §8.4: display "Points alignés" instead of "angle plat" in 2e cycle,
 * unless the points are part of a closed figure.
 */
export function isAlignedAngle(angle: AngleInfo): boolean {
  return angle.classification === 'plat';
}

/**
 * Determine the angle clutter threshold for the current state.
 * Spec: hide angle labels after 5 segments (2e) / 6 segments (3e).
 */
export function isAngleCluttered(state: ConstructionState, schoolLevel: SchoolLevel): boolean {
  const threshold = schoolLevel === '2e_cycle' ? 5 : 6;
  return state.segments.length > threshold;
}
