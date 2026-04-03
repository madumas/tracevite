import { rotatePoint, rotateConstruction } from './rotation';
import { createInitialState, addPoint, addSegment } from '@/model/state';

describe('rotatePoint', () => {
  it('rotates 90° around origin (y-down: clockwise)', () => {
    const result = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(10);
  });

  it('rotates 180° around origin', () => {
    const result = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 180);
    expect(result.x).toBeCloseTo(-10);
    expect(result.y).toBeCloseTo(0);
  });

  it('rotates 270° around origin', () => {
    const result = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 270);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-10);
  });

  it('rotates around non-origin center', () => {
    // Point (20, 10), center (10, 10), 90° → (10, 20)
    const result = rotatePoint({ x: 20, y: 10 }, { x: 10, y: 10 }, 90);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(20);
  });

  it('rotation by 0° returns same point', () => {
    const result = rotatePoint({ x: 5, y: 7 }, { x: 0, y: 0 }, 0);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(7);
  });

  it('negative angle rotates counter-clockwise in y-down', () => {
    const result = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, -90);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-10);
  });

  it('point at center stays in place', () => {
    const result = rotatePoint({ x: 5, y: 5 }, { x: 5, y: 5 }, 90);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(5);
  });
});

describe('rotateConstruction', () => {
  it('rotates a segment 90° and creates new elements', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = rotateConstruction(
      [p1.pointId, p2.pointId],
      [state.segments[0]!.id],
      [],
      state,
      { x: 0, y: 0 },
      90,
    );

    expect(result.points).toHaveLength(2);
    expect(result.segments).toHaveLength(1);

    // First point (0,0) stays near origin after 90° rotation
    const rp1 = result.points[0]!;
    expect(rp1.x).toBeCloseTo(0);
    expect(rp1.y).toBeCloseTo(0);

    // Second point (50,0) → (0,50) after 90° rotation
    const rp2 = result.points[1]!;
    expect(rp2.x).toBeCloseTo(0);
    expect(rp2.y).toBeCloseTo(50);
  });

  it('uses fresh labels (not prime notation)', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    const result = rotateConstruction([p1.pointId, p2.pointId], [], [], state, { x: 0, y: 0 }, 90);

    // Labels should be C, D (next after A, B)
    const labels = result.points.map((p) => p.label);
    expect(labels).toContain('C');
    expect(labels).toContain('D');
    expect(labels.some((l) => l.includes("'"))).toBe(false);
  });

  it('preserves fixedLength on rotation (isometry)', () => {
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

    const result = rotateConstruction(
      [p1.pointId, p2.pointId],
      [state.segments[0]!.id],
      [],
      state,
      { x: 0, y: 0 },
      90,
    );

    expect(result.segments[0]!.fixedLength).toBe(50);
  });
});
