/**
 * Angle detection and classification.
 * Pure functions — no React, no side effects.
 */

import type { ConstructionState, AngleInfo, AngleClassification, DisplayMode } from '@/model/types';
import { CLUTTER_THRESHOLDS, RIGHT_ANGLE_TOLERANCE_DEG } from '@/config/accessibility';

const FLAT_TOL = RIGHT_ANGLE_TOLERANCE_DEG; // same ±0.5° convention for "plat"

/**
 * Classify an angle in degrees using spec priority:
 * right [90 ± t] > flat [180 ± t] > acute ]0, 90 − t[ > obtuse ]90 + t, 180 − t[
 * (t = RIGHT_ANGLE_TOLERANCE_DEG = 0.5°)
 *
 * Input is expected in [0, 180] (classifyAngle never receives reflex angles —
 * detectAnglesAtVertex normalizes to ≤180°). Values > 180 would indicate a bug
 * in the caller; we still map them to 'obtus' as a conservative fallback.
 */
export function classifyAngle(degrees: number): AngleClassification {
  if (degrees >= 90 - RIGHT_ANGLE_TOLERANCE_DEG && degrees <= 90 + RIGHT_ANGLE_TOLERANCE_DEG)
    return 'droit';
  if (degrees >= 180 - FLAT_TOL && degrees <= 180 + FLAT_TOL) return 'plat';
  if (degrees > 0 && degrees < 90 - RIGHT_ANGLE_TOLERANCE_DEG) return 'aigu';
  if (degrees > 90 + RIGHT_ANGLE_TOLERANCE_DEG) return 'obtus';
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
    // Filter parasitic near-zero angles (jitter from imperfect snap on near-parallel
    // segments). 0.5° aligns with the droit/plat tolerances and matches typical TDC
    // motor jitter characteristics; any angle below that is noise.
    if (degrees < 0.5) return [];
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
    if (degrees < 0.5) continue;

    // Angle rentrant (reflex > 180°) — out of primary curriculum, skip entirely.
    // detectAnglesAtVertex at 3+ ray junctions can produce these; the 2-ray path
    // already normalizes to ≤180°.
    if (degrees > 180 + FLAT_TOL) continue;

    angles.push({
      vertexPointId: vertexId,
      ray1PointId: ray1.pointId,
      ray2PointId: ray2.pointId,
      degrees,
      classification: classifyAngle(degrees),
    });
  }

  // Filter parasitic flat angles (180°) in 3+ ray junctions —
  // they are collinearity artifacts, not meaningful geometry.
  return angles.filter((a) => a.classification !== 'plat');
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
 * Determine if canvas labels should be hidden due to visual clutter.
 * Uses user-configured threshold if set (>0), otherwise mode-dependent defaults.
 */
export function isAngleCluttered(state: ConstructionState, displayMode: DisplayMode): boolean {
  const threshold =
    state.clutterThreshold > 0
      ? state.clutterThreshold
      : CLUTTER_THRESHOLDS[displayMode === 'simplifie' ? 'simplifie' : 'complet'];
  return state.segments.length > threshold;
}
