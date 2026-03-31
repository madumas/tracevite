import {
  createInitialState,
  addPoint,
  addSegment,
  createSegment,
  removeElement,
  updatePointPosition,
  movePointWithConstraints,
  fixSegmentLength,
  unfixSegmentLength,
  splitSegmentAtPoint,
  togglePointLock,
  setGridSize,
  setDisplayMode,
  setDisplayUnit,
  setActiveTool,
  setSnapEnabled,
  setSelectedElement,
} from './state';

describe('createInitialState', () => {
  it('returns empty state with defaults', () => {
    const state = createInitialState();
    expect(state.points).toEqual([]);
    expect(state.segments).toEqual([]);
    expect(state.circles).toEqual([]);
    expect(state.gridSizeMm).toBe(10);
    expect(state.snapEnabled).toBe(true);
    expect(state.activeTool).toBe('segment');
    expect(state.displayMode).toBe('simplifie');
    expect(state.displayUnit).toBe('cm');
    expect(state.selectedElementId).toBeNull();
    expect(state.consigne).toBeNull();
  });
});

describe('addPoint', () => {
  it('adds a point with auto-generated id and label', () => {
    const state = createInitialState();
    const result = addPoint(state, 50, 100);
    expect(result.state.points).toHaveLength(1);
    expect(result.state.points[0]!.x).toBe(50);
    expect(result.state.points[0]!.y).toBe(100);
    expect(result.state.points[0]!.label).toBe('A');
    expect(result.pointId).toBeTruthy();
  });

  it('assigns sequential labels', () => {
    let state = createInitialState();
    state = addPoint(state, 0, 0).state;
    state = addPoint(state, 10, 10).state;
    expect(state.points[0]!.label).toBe('A');
    expect(state.points[1]!.label).toBe('B');
  });

  it('does not mutate original state', () => {
    const original = createInitialState();
    addPoint(original, 50, 100);
    expect(original.points).toHaveLength(0);
  });
});

describe('addSegment', () => {
  it('creates a segment between two points', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    const result = addSegment(state, p1.pointId, p2.pointId);
    expect(result).not.toBeNull();
    expect(result!.state.segments).toHaveLength(1);
    expect(result!.state.segments[0]!.lengthMm).toBe(50);
  });

  it('rejects zero-length segment', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 50, 50);
    state = p1.state;
    const p2 = addPoint(state, 50.5, 50.5);
    state = p2.state;

    const result = addSegment(state, p1.pointId, p2.pointId);
    expect(result).toBeNull();
  });

  it('rejects duplicate segment', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    const seg1 = addSegment(state, p1.pointId, p2.pointId);
    state = seg1!.state;

    const seg2 = addSegment(state, p1.pointId, p2.pointId);
    expect(seg2).toBeNull();
  });

  it('rejects duplicate segment in reverse order', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    const seg1 = addSegment(state, p1.pointId, p2.pointId);
    state = seg1!.state;

    const seg2 = addSegment(state, p2.pointId, p1.pointId);
    expect(seg2).toBeNull();
  });
});

describe('createSegment', () => {
  it('creates points and segment atomically', () => {
    const state = createInitialState();
    const result = createSegment(state, { x: 0, y: 0 }, { x: 50, y: 0 });
    expect(result).not.toBeNull();
    expect(result!.state.points).toHaveLength(2);
    expect(result!.state.segments).toHaveLength(1);
  });

  it('reuses existing point', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;

    const result = createSegment(
      state,
      { x: 0, y: 0, existingPointId: p1.pointId },
      { x: 50, y: 0 },
    );
    expect(result).not.toBeNull();
    expect(result!.state.points).toHaveLength(2); // p1 reused + 1 new
    expect(result!.startPointId).toBe(p1.pointId);
  });
});

describe('removeElement', () => {
  it('removes a point and its connected segments', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = removeElement(state, p1.pointId);
    expect(state.points).toHaveLength(1);
    expect(state.segments).toHaveLength(0); // cascaded
  });

  it('removes only the segment, keeping points', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = removeElement(state, seg!.segmentId);
    expect(state.points).toHaveLength(2);
    expect(state.segments).toHaveLength(0);
  });

  it('clears selection if removed element was selected', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = { ...p1.state, selectedElementId: p1.pointId };

    state = removeElement(state, p1.pointId);
    expect(state.selectedElementId).toBeNull();
  });

  it('returns same state for unknown ID', () => {
    const state = createInitialState();
    expect(removeElement(state, 'nonexistent')).toBe(state);
  });
});

describe('updatePointPosition', () => {
  it('moves a point and recomputes segment lengths', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = updatePointPosition(state, p2.pointId, 30, 40);
    expect(state.points.find((p) => p.id === p2.pointId)!.x).toBe(30);
    expect(state.segments[0]!.lengthMm).toBe(50); // 3-4-5 triangle
  });
});

describe('movePointWithConstraints', () => {
  it('moves a free point normally', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = movePointWithConstraints(state, p2.pointId, 30, 40);
    const moved = state.points.find((p) => p.id === p2.pointId)!;
    expect(moved.x).toBe(30);
    expect(moved.y).toBe(40);
  });

  it('pivots other endpoint when fixedLength segment', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    state = addSegment(state, p1.pointId, p2.pointId)!.state;
    state = fixSegmentLength(state, state.segments[0]!.id, 50);

    // Move p1 to (0, 50) — p2 should pivot to maintain 50mm
    state = movePointWithConstraints(state, p1.pointId, 0, 50);
    const p2After = state.points.find((p) => p.id === p2.pointId)!;
    const p1After = state.points.find((p) => p.id === p1.pointId)!;
    const dist = Math.sqrt((p2After.x - p1After.x) ** 2 + (p2After.y - p1After.y) ** 2);
    expect(dist).toBeCloseTo(50);
  });

  it('constrains moved point to circle when other endpoint is locked + fixedLength', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;

    state = addSegment(state, p1.pointId, p2.pointId)!.state;
    state = fixSegmentLength(state, state.segments[0]!.id, 50);
    state = togglePointLock(state, p2.pointId); // Lock p2

    // Move p1 far away — should be constrained to circle r=50 around p2
    state = movePointWithConstraints(state, p1.pointId, 200, 200);
    const p1After = state.points.find((p) => p.id === p1.pointId)!;
    const p2Pos = state.points.find((p) => p.id === p2.pointId)!;
    const dist = Math.sqrt((p1After.x - p2Pos.x) ** 2 + (p1After.y - p2Pos.y) ** 2);
    expect(dist).toBeCloseTo(50);
  });
});

describe('fixSegmentLength', () => {
  it('adjusts endpoint to match target length', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = fixSegmentLength(state, seg!.segmentId, 100);
    const endPoint = state.points.find((p) => p.id === p2.pointId)!;
    expect(endPoint.x).toBeCloseTo(100);
    expect(endPoint.y).toBeCloseTo(0);
    expect(state.segments[0]!.fixedLength).toBe(100);
  });
});

describe('unfixSegmentLength', () => {
  it('removes fixedLength from a fixed segment', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = fixSegmentLength(state, seg!.segmentId, 100);
    expect(state.segments[0]!.fixedLength).toBe(100);

    state = unfixSegmentLength(state, seg!.segmentId);
    expect(state.segments[0]!.fixedLength).toBeUndefined();
  });

  it('returns same state when segment has no fixedLength', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = unfixSegmentLength(state, seg!.segmentId);
    expect(result).toBe(state); // same reference
  });

  it('returns same state for nonexistent segment id', () => {
    const state = createInitialState();
    const result = unfixSegmentLength(state, 'nonexistent');
    expect(result).toBe(state);
  });

  it('allows free movement after unfix', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 50, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    state = fixSegmentLength(state, seg!.segmentId, 50);
    state = unfixSegmentLength(state, seg!.segmentId);

    // Move p1 — p2 should NOT pivot (no constraint)
    state = movePointWithConstraints(state, p1.pointId, 0, 50);
    const p2After = state.points.find((p) => p.id === p2.pointId)!;
    expect(p2After.x).toBeCloseTo(50);
    expect(p2After.y).toBeCloseTo(0);
  });
});

describe('splitSegmentAtPoint', () => {
  it('splits segment into two at junction point', () => {
    let state = createInitialState();
    const p1 = addPoint(state, 0, 0);
    state = p1.state;
    const p2 = addPoint(state, 100, 0);
    state = p2.state;
    const seg = addSegment(state, p1.pointId, p2.pointId);
    state = seg!.state;

    const result = splitSegmentAtPoint(state, seg!.segmentId, 50, 0);
    expect(result).not.toBeNull();
    expect(result!.state.points).toHaveLength(3);
    expect(result!.state.segments).toHaveLength(2);

    // Original segment is gone
    expect(result!.state.segments.find((s) => s.id === seg!.segmentId)).toBeUndefined();
  });
});

describe('parameter changes (no undo push)', () => {
  it('sets grid size', () => {
    expect(setGridSize(createInitialState(), 5).gridSizeMm).toBe(5);
  });

  it('sets display mode', () => {
    expect(setDisplayMode(createInitialState(), 'complet').displayMode).toBe('complet');
  });

  it('sets display unit', () => {
    expect(setDisplayUnit(createInitialState(), 'mm').displayUnit).toBe('mm');
  });

  it('sets active tool', () => {
    expect(setActiveTool(createInitialState(), 'move').activeTool).toBe('move');
  });

  it('sets snap enabled', () => {
    expect(setSnapEnabled(createInitialState(), false).snapEnabled).toBe(false);
  });

  it('sets selected element', () => {
    expect(setSelectedElement(createInitialState(), 'abc').selectedElementId).toBe('abc');
  });
});
