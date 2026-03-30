/**
 * Pure geometric computation functions.
 * All inputs and outputs are in millimeters.
 */

/** Euclidean distance between two points. */
export function distance(
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Midpoint of two points. */
export function midpoint(
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/** Snap a coordinate to the nearest grid point. */
export function nearestGridPoint(
  x: number,
  y: number,
  gridSizeMm: number,
): { x: number; y: number } {
  return {
    x: Math.round(x / gridSizeMm) * gridSizeMm,
    y: Math.round(y / gridSizeMm) * gridSizeMm,
  };
}

/**
 * Angle between two rays sharing a vertex, in degrees [0, 180].
 * Returns the smaller of the two possible angles.
 */
export function angleBetweenSegments(
  vertex: { readonly x: number; readonly y: number },
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
): number {
  const dx1 = p1.x - vertex.x;
  const dy1 = p1.y - vertex.y;
  const dx2 = p2.x - vertex.x;
  const dy2 = p2.y - vertex.y;

  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);

  let diff = Math.abs(angle2 - angle1);
  if (diff > Math.PI) {
    diff = 2 * Math.PI - diff;
  }

  return diff * (180 / Math.PI);
}

/**
 * Project a point onto a segment (p1→p2), returning the closest
 * point on the segment and the distance from the original point.
 */
export function pointOnSegmentProjection(
  point: { readonly x: number; readonly y: number },
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
): { projection: { x: number; y: number }; distance: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return { projection: { x: p1.x, y: p1.y }, distance: distance(point, p1) };
  }

  // Parameter t along the segment [0, 1]
  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };

  return {
    projection,
    distance: distance(point, projection),
  };
}

/**
 * Check if a point is near a segment body (within tolerance).
 * Does NOT include proximity to endpoints — that's handled by point snap.
 */
export function isPointNearSegment(
  point: { readonly x: number; readonly y: number },
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
  toleranceMm: number,
): boolean {
  const { distance: dist } = pointOnSegmentProjection(point, p1, p2);
  return dist <= toleranceMm;
}

/**
 * Angle of a segment from horizontal, in degrees [0, 360).
 */
export function segmentAngle(
  p1: { readonly x: number; readonly y: number },
  p2: { readonly x: number; readonly y: number },
): number {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  return ((angle % 360) + 360) % 360;
}
