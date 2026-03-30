import { hitTestPoint, hitTestSegment, hitTestCircle, hitTestElement } from './hit-test';
import { createInitialState, addPoint, addSegment } from '@/model/state';

describe('hitTestPoint', () => {
  const points = [
    { id: 'p1', x: 50, y: 50, label: 'A', locked: false },
    { id: 'p2', x: 100, y: 100, label: 'B', locked: false },
  ];

  it('returns closest point within tolerance', () => {
    expect(hitTestPoint({ x: 52, y: 51 }, points, 7)).toBe('p1');
  });

  it('returns null when nothing in range', () => {
    expect(hitTestPoint({ x: 200, y: 200 }, points, 7)).toBeNull();
  });

  it('returns closest when multiple in range', () => {
    expect(hitTestPoint({ x: 53, y: 53 }, points, 10)).toBe('p1');
  });

  it('returns null for empty points', () => {
    expect(hitTestPoint({ x: 50, y: 50 }, [], 7)).toBeNull();
  });
});

describe('hitTestSegment', () => {
  const points = [
    { id: 'p1', x: 0, y: 0, label: 'A', locked: false },
    { id: 'p2', x: 100, y: 0, label: 'B', locked: false },
  ];
  const segments = [{ id: 's1', startPointId: 'p1', endPointId: 'p2', lengthMm: 100 }];

  it('hits segment body near midpoint', () => {
    expect(hitTestSegment({ x: 50, y: 3 }, segments, points, 5)).toBe('s1');
  });

  it('misses segment when too far', () => {
    expect(hitTestSegment({ x: 50, y: 10 }, segments, points, 5)).toBeNull();
  });

  it('hits at exact tolerance boundary', () => {
    expect(hitTestSegment({ x: 50, y: 5 }, segments, points, 5)).toBe('s1');
  });
});

describe('hitTestCircle', () => {
  const points = [{ id: 'p1', x: 50, y: 50, label: 'A', locked: false }];
  const circles = [{ id: 'c1', centerPointId: 'p1', radiusMm: 30 }];

  it('hits circle circumference', () => {
    // Point at (80, 50) is exactly on circumference (30mm from center)
    expect(hitTestCircle({ x: 82, y: 50 }, circles, points, 5)).toBe('c1');
  });

  it('misses when far from circumference', () => {
    expect(hitTestCircle({ x: 50, y: 50 }, circles, points, 5)).toBeNull();
  });
});

describe('hitTestElement', () => {
  it('prioritizes point over segment', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 100, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    // Click near p1 (within point tolerance AND near segment start)
    const result = hitTestElement({ x: 3, y: 2 }, state);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('point');
    expect(result!.id).toBe(p1.pointId);
  });

  it('hits segment when no point near', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 100, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    // Click at midpoint of segment, away from endpoints
    const result = hitTestElement({ x: 50, y: 3 }, state);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('segment');
    expect(result!.id).toBe(seg!.segmentId);
  });

  it('returns null for empty canvas', () => {
    const result = hitTestElement({ x: 50, y: 50 }, createInitialState());
    expect(result).toBeNull();
  });
});
