import { scalePoint, scaleConstruction } from './homothety';
import { createInitialState, addPoint, addSegment } from '@/model/state';

describe('scalePoint', () => {
  it('scales by factor 2 from origin', () => {
    const result = scalePoint({ x: 10, y: 5 }, { x: 0, y: 0 }, 2);
    expect(result.x).toBeCloseTo(20);
    expect(result.y).toBeCloseTo(10);
  });

  it('scales by factor 0.5 (reduction)', () => {
    const result = scalePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 0.5);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(0);
  });

  it('scales from non-origin center', () => {
    // Point (20, 10), center (10, 10), factor 3 → (40, 10)
    const result = scalePoint({ x: 20, y: 10 }, { x: 10, y: 10 }, 3);
    expect(result.x).toBeCloseTo(40);
    expect(result.y).toBeCloseTo(10);
  });

  it('point at center stays in place', () => {
    const result = scalePoint({ x: 5, y: 5 }, { x: 5, y: 5 }, 3);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(5);
  });

  it('factor 1 returns same point', () => {
    const result = scalePoint({ x: 7, y: 3 }, { x: 0, y: 0 }, 1);
    expect(result.x).toBeCloseTo(7);
    expect(result.y).toBeCloseTo(3);
  });
});

describe('scaleConstruction', () => {
  it('scales a segment by factor 2', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 10, 0);
    state = p1.state;
    const p2 = addPoint(state, 60, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = scaleConstruction(
      [p1.pointId, p2.pointId],
      [state.segments[0]!.id],
      [],
      state,
      { x: 0, y: 0 },
      2,
    );

    expect(result.points).toHaveLength(2);
    expect(result.segments).toHaveLength(1);

    // (10,0) × 2 from origin → (20,0)
    expect(result.points[0]!.x).toBeCloseTo(20);
    // (60,0) × 2 from origin → (120,0)
    expect(result.points[1]!.x).toBeCloseTo(120);

    // New segment length should be 100 (was 50, factor 2)
    expect(result.segments[0]!.lengthMm).toBeCloseTo(100);
  });

  it('scales fixedLength by abs(factor)', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;
    state = {
      ...state,
      segments: state.segments.map((s) => ({ ...s, fixedLength: 50 })),
    };

    const result = scaleConstruction(
      [p1.pointId, p2.pointId],
      [state.segments[0]!.id],
      [],
      state,
      { x: 0, y: 0 },
      2,
    );

    expect(result.segments[0]!.fixedLength).toBe(100);
  });

  it('uses fresh labels', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    const result = scaleConstruction([p1.pointId, p2.pointId], [], [], state, { x: 0, y: 0 }, 2);

    const labels = result.points.map((p) => p.label);
    expect(labels).toContain('C');
    expect(labels).toContain('D');
  });

  it('scales circle radius by factor', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 50, 50);
    state = p1.state;
    state = {
      ...state,
      circles: [{ id: 'c1', centerPointId: p1.pointId, radiusMm: 30 }],
    };

    const result = scaleConstruction([p1.pointId], [], ['c1'], state, { x: 0, y: 0 }, 2);

    expect(result.circles).toHaveLength(1);
    expect(result.circles[0]!.radiusMm).toBeCloseTo(60);
  });
});
