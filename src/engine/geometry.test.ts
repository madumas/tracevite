import {
  distance,
  midpoint,
  nearestGridPoint,
  angleBetweenSegments,
  pointOnSegmentProjection,
  isPointNearSegment,
  segmentAngle,
  segmentIntersection,
  perpendicularDirection,
  parallelDirection,
  projectOntoConstrainedLine,
} from './geometry';

describe('distance', () => {
  it('returns 0 for identical points', () => {
    expect(distance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
  });

  it('computes horizontal distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 50, y: 0 })).toBe(50);
  });

  it('computes vertical distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 30 })).toBe(30);
  });

  it('computes diagonal distance (3-4-5 triangle)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50);
  });

  it('handles negative coordinates', () => {
    expect(distance({ x: -10, y: -10 }, { x: 20, y: 30 })).toBeCloseTo(50);
  });
});

describe('midpoint', () => {
  it('returns midpoint of horizontal segment', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 50, y: 0 });
  });

  it('returns midpoint of diagonal segment', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 40, y: 60 })).toEqual({ x: 20, y: 30 });
  });

  it('returns same point for zero-length segment', () => {
    expect(midpoint({ x: 15, y: 25 }, { x: 15, y: 25 })).toEqual({ x: 15, y: 25 });
  });
});

describe('nearestGridPoint', () => {
  it('snaps to exact grid intersection', () => {
    expect(nearestGridPoint(10, 20, 10)).toEqual({ x: 10, y: 20 });
  });

  it('snaps to nearest 5mm grid', () => {
    expect(nearestGridPoint(12, 13, 5)).toEqual({ x: 10, y: 15 });
  });

  it('snaps at exact midpoint (rounds up)', () => {
    expect(nearestGridPoint(7.5, 2.5, 5)).toEqual({ x: 10, y: 5 });
  });

  it('handles 20mm grid', () => {
    expect(nearestGridPoint(25, 35, 20)).toEqual({ x: 20, y: 40 });
  });

  it('handles origin', () => {
    expect(nearestGridPoint(2, 3, 10)).toEqual({ x: 0, y: 0 });
  });
});

describe('angleBetweenSegments', () => {
  it('returns 90° for perpendicular rays', () => {
    const vertex = { x: 0, y: 0 };
    expect(angleBetweenSegments(vertex, { x: 10, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90);
  });

  it('returns 0° for collinear same-direction rays', () => {
    const vertex = { x: 0, y: 0 };
    expect(angleBetweenSegments(vertex, { x: 10, y: 0 }, { x: 20, y: 0 })).toBeCloseTo(0);
  });

  it('returns 180° for opposite rays', () => {
    const vertex = { x: 0, y: 0 };
    expect(angleBetweenSegments(vertex, { x: 10, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(180);
  });

  it('returns 45° for diagonal', () => {
    const vertex = { x: 0, y: 0 };
    expect(angleBetweenSegments(vertex, { x: 10, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(45);
  });

  it('returns ≤ 180° always (smaller angle)', () => {
    const vertex = { x: 0, y: 0 };
    const angle = angleBetweenSegments(vertex, { x: 10, y: 0 }, { x: -5, y: 8.66 });
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThanOrEqual(180);
  });
});

describe('pointOnSegmentProjection', () => {
  it('projects onto horizontal segment', () => {
    const result = pointOnSegmentProjection({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(result.projection.x).toBeCloseTo(50);
    expect(result.projection.y).toBeCloseTo(0);
    expect(result.distance).toBeCloseTo(10);
  });

  it('clamps projection to start of segment', () => {
    const result = pointOnSegmentProjection({ x: -10, y: 5 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(result.projection.x).toBeCloseTo(0);
    expect(result.projection.y).toBeCloseTo(0);
  });

  it('clamps projection to end of segment', () => {
    const result = pointOnSegmentProjection({ x: 110, y: 5 }, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(result.projection.x).toBeCloseTo(100);
    expect(result.projection.y).toBeCloseTo(0);
  });

  it('handles zero-length segment', () => {
    const result = pointOnSegmentProjection({ x: 10, y: 10 }, { x: 5, y: 5 }, { x: 5, y: 5 });
    expect(result.projection).toEqual({ x: 5, y: 5 });
    expect(result.distance).toBeCloseTo(distance({ x: 10, y: 10 }, { x: 5, y: 5 }));
  });
});

describe('isPointNearSegment', () => {
  it('returns true for point within tolerance', () => {
    expect(isPointNearSegment({ x: 50, y: 4 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 5)).toBe(true);
  });

  it('returns false for point outside tolerance', () => {
    expect(isPointNearSegment({ x: 50, y: 6 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 5)).toBe(false);
  });

  it('returns true at exact tolerance boundary', () => {
    expect(isPointNearSegment({ x: 50, y: 5 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 5)).toBe(true);
  });
});

describe('segmentAngle', () => {
  it('returns 0° for horizontal right', () => {
    expect(segmentAngle({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
  });

  it('returns 90° for vertical down', () => {
    expect(segmentAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90);
  });

  it('returns 180° for horizontal left', () => {
    expect(segmentAngle({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(180);
  });

  it('returns 270° for vertical up', () => {
    expect(segmentAngle({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(270);
  });
});

describe('segmentIntersection', () => {
  it('returns intersection of crossing X segments', () => {
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    );
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(50);
    expect(result!.y).toBeCloseTo(50);
  });

  it('returns null for parallel segments', () => {
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    );
    expect(result).toBeNull();
  });

  it('returns null for collinear overlapping segments', () => {
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 0 },
      { x: 150, y: 0 },
    );
    expect(result).toBeNull();
  });

  it('returns null when intersection is at endpoint (t=0 or t=1)', () => {
    // L-shape: segments share an endpoint
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    );
    expect(result).toBeNull();
  });

  it('returns null when intersection is too close to endpoint', () => {
    // Cross near endpoint of first segment
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 1, y: -50 },
      { x: 1, y: 50 },
      2, // minDistFromEndpoint
    );
    expect(result).toBeNull();
  });

  it('returns intersection when minDistFromEndpoint=0', () => {
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 1, y: -50 },
      { x: 1, y: 50 },
      0,
    );
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(1);
    expect(result!.y).toBeCloseTo(0);
  });

  it('returns null for T-junction (one endpoint on body of other)', () => {
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 },
      { x: 50, y: 0 }, // touches at (50,0) which is at u=1
    );
    expect(result).toBeNull();
  });

  it('returns null for non-intersecting segments', () => {
    const result = segmentIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    );
    expect(result).toBeNull();
  });
});

describe('perpendicularDirection', () => {
  it('returns perpendicular for horizontal segment', () => {
    const dir = perpendicularDirection({ x: 0, y: 0 }, { x: 10, y: 0 });
    // Formula: {-dy/len, dx/len} = {0, 10/10} = {0, 1}
    expect(dir.dx).toBeCloseTo(0);
    expect(dir.dy).toBeCloseTo(1);
  });

  it('returns perpendicular for vertical segment', () => {
    const dir = perpendicularDirection({ x: 0, y: 0 }, { x: 0, y: 10 });
    // {-10/10, 0} = {-1, 0}
    expect(dir.dx).toBeCloseTo(-1);
    expect(dir.dy).toBeCloseTo(0);
  });

  it('returns fallback for zero-length segment', () => {
    const dir = perpendicularDirection({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(dir).toEqual({ dx: 0, dy: -1 });
  });

  it('returns unit vector for diagonal segment', () => {
    const dir = perpendicularDirection({ x: 0, y: 0 }, { x: 10, y: 10 });
    const len = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
    expect(len).toBeCloseTo(1);
  });
});

describe('parallelDirection', () => {
  it('returns unit vector for horizontal segment', () => {
    const dir = parallelDirection({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(dir.dx).toBeCloseTo(1);
    expect(dir.dy).toBeCloseTo(0);
  });

  it('returns unit vector for 3-4-5 triangle hypotenuse', () => {
    const dir = parallelDirection({ x: 0, y: 0 }, { x: 30, y: 40 });
    expect(dir.dx).toBeCloseTo(0.6);
    expect(dir.dy).toBeCloseTo(0.8);
  });

  it('returns fallback for zero-length segment', () => {
    const dir = parallelDirection({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(dir).toEqual({ dx: 1, dy: 0 });
  });
});

describe('projectOntoConstrainedLine', () => {
  it('projects onto horizontal line', () => {
    const result = projectOntoConstrainedLine({ x: 5, y: 3 }, { x: 0, y: 0 }, { dx: 1, dy: 0 });
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(0);
  });

  it('projects onto vertical line', () => {
    const result = projectOntoConstrainedLine({ x: 3, y: 5 }, { x: 0, y: 0 }, { dx: 0, dy: 1 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(5);
  });

  it('returns cursor position when already on line', () => {
    const result = projectOntoConstrainedLine({ x: 7, y: 0 }, { x: 0, y: 0 }, { dx: 1, dy: 0 });
    expect(result.x).toBeCloseTo(7);
    expect(result.y).toBeCloseTo(0);
  });

  it('projects onto diagonal line', () => {
    const dir = { dx: Math.SQRT1_2, dy: Math.SQRT1_2 };
    const result = projectOntoConstrainedLine({ x: 10, y: 0 }, { x: 0, y: 0 }, dir);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(5);
  });
});
