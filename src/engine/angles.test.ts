import { classifyAngle, detectAnglesAtVertex, detectAllAngles, isAngleCluttered } from './angles';
import { createInitialState, addPoint, addSegment } from '@/model/state';

describe('classifyAngle', () => {
  it('classifies right angle at 90°', () => {
    expect(classifyAngle(90)).toBe('droit');
  });

  it('classifies right angle at lower boundary 89.5°', () => {
    expect(classifyAngle(89.5)).toBe('droit');
  });

  it('classifies right angle at upper boundary 90.5°', () => {
    expect(classifyAngle(90.5)).toBe('droit');
  });

  it('classifies acute at 89.4°', () => {
    expect(classifyAngle(89.4)).toBe('aigu');
  });

  it('classifies obtuse at 90.6°', () => {
    expect(classifyAngle(90.6)).toBe('obtus');
  });

  it('classifies flat at 180°', () => {
    expect(classifyAngle(180)).toBe('plat');
  });

  it('classifies flat at boundaries', () => {
    expect(classifyAngle(179.5)).toBe('plat');
    expect(classifyAngle(180.5)).toBe('plat');
  });

  it('classifies acute at 45°', () => {
    expect(classifyAngle(45)).toBe('aigu');
  });

  it('classifies obtuse at 120°', () => {
    expect(classifyAngle(120)).toBe('obtus');
  });

  it('classifies reflex at 270°', () => {
    expect(classifyAngle(270)).toBe('reflex');
  });
});

describe('detectAnglesAtVertex', () => {
  it('returns empty for vertex with 0-1 segments', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;

    expect(detectAnglesAtVertex(p1.pointId, state)).toEqual([]);
  });

  it('detects one angle for 2 segments at a vertex', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const p3 = addPoint(state, 0, 50);
    state = p3.state;

    const s1 = addSegment(state, p1.pointId, p2.pointId);
    state = s1!.state;
    const s2 = addSegment(state, p1.pointId, p3.pointId);
    state = s2!.state;

    const angles = detectAnglesAtVertex(p1.pointId, state);
    expect(angles).toHaveLength(1);
    expect(angles[0]!.degrees).toBeCloseTo(90);
    expect(angles[0]!.classification).toBe('droit');
  });

  it('detects 3 adjacent angles for 3 segments at a vertex', () => {
    let state = createInitialState();
    const center = addPoint(state, 50, 50);
    state = center.state;
    const p1 = addPoint(state, 100, 50); // right
    state = p1.state;
    const p2 = addPoint(state, 50, 0); // up
    state = p2.state;
    const p3 = addPoint(state, 0, 50); // left
    state = p3.state;

    const s1 = addSegment(state, center.pointId, p1.pointId);
    state = s1!.state;
    const s2 = addSegment(state, center.pointId, p2.pointId);
    state = s2!.state;
    const s3 = addSegment(state, center.pointId, p3.pointId);
    state = s3!.state;

    const angles = detectAnglesAtVertex(center.pointId, state);
    // 3 rays: right(0°), up(90°), left(180°) → angles: 90°, 90°
    // The 180° (plat) angle is filtered out in 3+ ray junctions (parasitic collinearity)
    expect(angles).toHaveLength(2);

    // No reflex or flat angles should be returned in 3+ ray junctions
    for (const a of angles) {
      expect(a.classification).not.toBe('reflex');
      expect(a.classification).not.toBe('plat');
    }

    // Both angles should be ~90°
    for (const a of angles) {
      expect(a.degrees).toBeCloseTo(90);
    }
  });
});

describe('detectAllAngles', () => {
  it('detects angles at all vertices', () => {
    // Triangle: 3 vertices, each with 1 angle
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const p3 = addPoint(state, 0, 50);
    state = p3.state;

    state = addSegment(state, p1.pointId, p2.pointId)!.state;
    state = addSegment(state, p2.pointId, p3.pointId)!.state;
    state = addSegment(state, p3.pointId, p1.pointId)!.state;

    const angles = detectAllAngles(state);
    expect(angles).toHaveLength(3);

    // Sum of triangle angles ≈ 180°
    const sum = angles.reduce((s, a) => s + a.degrees, 0);
    expect(sum).toBeCloseTo(180);
  });
});

describe('isAngleCluttered', () => {
  it('returns false below threshold', () => {
    const state = createInitialState();
    expect(isAngleCluttered(state, 'simplifie')).toBe(false);
  });

  it('returns true above threshold for simplifie mode (5 segments)', () => {
    let state = createInitialState();
    // Create 6 segments (> 5 threshold)
    for (let i = 0; i < 7; i++) {
      const p = addPoint(state, i * 20, 0);
      state = p.state;
    }
    for (let i = 0; i < 6; i++) {
      const seg = addSegment(state, state.points[i]!.id, state.points[i + 1]!.id);
      if (seg) state = seg.state;
    }
    expect(isAngleCluttered(state, 'simplifie')).toBe(true);
  });
});
