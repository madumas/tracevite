import {
  distance,
  midpoint,
  nearestGridPoint,
  angleBetweenSegments,
  pointOnSegmentProjection,
  isPointNearSegment,
  segmentAngle,
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
