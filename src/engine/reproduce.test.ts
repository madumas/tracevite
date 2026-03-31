import { reproduceElements, reproduceFrieze } from './reproduce';
import { createInitialState, addPoint, addSegment } from '@/model/state';

describe('reproduceElements', () => {
  it('copies points and segments with offset and unique labels', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 30, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = reproduceElements([p1.pointId, p2.pointId], [seg!.segmentId], [], state, 50, 10);

    expect(result.points).toHaveLength(2);
    expect(result.segments).toHaveLength(1);
    expect(result.points[0]!.x).toBe(50);
    expect(result.points[0]!.y).toBe(10);
    expect(result.points[1]!.x).toBe(80);
    expect(result.points[1]!.y).toBe(10);
    // Labels should be unique (not A or B which already exist)
    const existingLabels = state.points.map((p) => p.label);
    for (const pt of result.points) {
      expect(existingLabels).not.toContain(pt.label);
    }
  });

  it('preserves fixedLength on copied segments', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 30, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;
    // Manually set fixedLength
    state = {
      ...state,
      segments: state.segments.map((s) =>
        s.id === seg!.segmentId ? { ...s, fixedLength: 30 } : s,
      ),
    };

    const result = reproduceElements([p1.pointId, p2.pointId], [seg!.segmentId], [], state, 50, 0);

    expect(result.segments[0]!.fixedLength).toBe(30);
  });

  it('uses extraLabels to avoid collisions', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;

    const result = reproduceElements([p1.pointId], [], [], state, 10, 0, ['B', 'C']);

    // A exists in state, B and C in extraLabels, so new label should be D
    expect(result.points[0]!.label).toBe('D');
  });
});

describe('reproduceFrieze', () => {
  it('creates count-1 copies with correct offsets (original excluded)', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 10, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = reproduceFrieze(
      [p1.pointId, p2.pointId],
      [seg!.segmentId],
      [],
      state,
      { dx: 20, dy: 0 },
      3, // 3 total positions → 2 copies (positions 1 and 2)
    );

    expect(result.points).toHaveLength(4); // 2 copies × 2 points
    expect(result.segments).toHaveLength(2); // 2 copies × 1 segment
    // First copy at offset (20, 0)
    expect(result.points[0]!.x).toBe(20);
    expect(result.points[1]!.x).toBe(30);
    // Second copy at offset (40, 0)
    expect(result.points[2]!.x).toBe(40);
    expect(result.points[3]!.x).toBe(50);
  });

  it('generates unique labels across all copies', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 10, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = reproduceFrieze(
      [p1.pointId, p2.pointId],
      [seg!.segmentId],
      [],
      state,
      { dx: 20, dy: 0 },
      4,
    );

    const allLabels = result.points.map((p) => p.label);
    const uniqueLabels = new Set(allLabels);
    expect(uniqueLabels.size).toBe(allLabels.length); // All labels unique
  });

  it('creates a 2D tiling with two vectors', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 10, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = reproduceFrieze(
      [p1.pointId, p2.pointId],
      [seg!.segmentId],
      [],
      state,
      { dx: 20, dy: 0 },
      2,
      { dx: 0, dy: 15 },
      3,
    );

    // 2×3 grid = 6 positions, minus original = 5 copies
    expect(result.points).toHaveLength(10); // 5 copies × 2 points
    expect(result.segments).toHaveLength(5);
  });

  it('count=1 with no second vector produces zero copies', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;

    const result = reproduceFrieze([p1.pointId], [], [], state, { dx: 10, dy: 0 }, 1);

    expect(result.points).toHaveLength(0);
    expect(result.segments).toHaveLength(0);
  });
});
