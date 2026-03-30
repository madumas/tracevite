import {
  reflectPoint,
  generatePrimeLabel,
  constrainAxisAngle,
  reflectConstruction,
} from './reflection';
import { createInitialState, addPoint, addSegment } from '@/model/state';

describe('reflectPoint', () => {
  it('reflects across vertical axis', () => {
    const result = reflectPoint({ x: 30, y: 50 }, { x: 50, y: 0 }, { x: 50, y: 100 });
    expect(result.x).toBeCloseTo(70);
    expect(result.y).toBeCloseTo(50);
  });

  it('reflects across horizontal axis', () => {
    const result = reflectPoint({ x: 50, y: 30 }, { x: 0, y: 50 }, { x: 100, y: 50 });
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(70);
  });

  it('point on axis stays in place', () => {
    const result = reflectPoint({ x: 50, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 100 });
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(50);
  });

  it('reflects across 45° diagonal', () => {
    // Point (10, 0) reflected across y=x should give (0, 10)
    const result = reflectPoint({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 50, y: 50 });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(10);
  });
});

describe('generatePrimeLabel', () => {
  it('adds prime to simple label', () => {
    expect(generatePrimeLabel('A', [])).toBe("A'");
  });

  it('adds double prime when single exists', () => {
    expect(generatePrimeLabel('A', ["A'"])).toBe("A''");
  });

  it('adds triple prime when double exists', () => {
    expect(generatePrimeLabel('A', ["A'", "A''"])).toBe("A'''");
  });
});

describe('constrainAxisAngle', () => {
  it('snaps near-horizontal to horizontal', () => {
    const result = constrainAxisAngle({ x: 0, y: 0 }, { x: 100, y: 5 });
    expect(result.y).toBeCloseTo(0, 0);
  });

  it('snaps near-vertical to vertical', () => {
    const result = constrainAxisAngle({ x: 50, y: 0 }, { x: 52, y: 100 });
    expect(result.x).toBeCloseTo(50, 0);
  });

  it('snaps near-45° to 45°', () => {
    const result = constrainAxisAngle({ x: 0, y: 0 }, { x: 100, y: 95 });
    expect(result.x).toBeCloseTo(result.y, 0);
  });
});

describe('reflectConstruction', () => {
  it('reflects a segment across vertical axis', () => {
    let state = createInitialState();
    const a = addPoint(state, 20, 50);
    state = a.state;
    const b = addPoint(state, 40, 50);
    state = b.state;
    state = addSegment(state, a.pointId, b.pointId)!.state;

    const result = reflectConstruction(
      [a.pointId, b.pointId],
      [state.segments[0]!.id],
      state,
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    );

    expect(result.points).toHaveLength(2);
    expect(result.segments).toHaveLength(1);

    // Reflected points should be on the other side of x=50
    const reflectedA = result.points.find((p) => p.label === "A'");
    const reflectedB = result.points.find((p) => p.label === "B'");
    expect(reflectedA).toBeDefined();
    expect(reflectedB).toBeDefined();
    expect(reflectedA!.x).toBeCloseTo(80); // 50 + (50-20)
    expect(reflectedB!.x).toBeCloseTo(60); // 50 + (50-40)

    // Length preserved
    expect(result.segments[0]!.lengthMm).toBeCloseTo(20);
  });
});
