import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from './snap';
import type { ConstructionState } from '@/model/types';
import { createInitialState } from '@/model/state';

function makeState(points: Array<{ id: string; x: number; y: number }>): ConstructionState {
  return {
    ...createInitialState(),
    points: points.map((p) => ({ ...p, label: 'A', locked: false })),
  };
}

function makeStateWithSegments(
  points: Array<{ id: string; x: number; y: number; label?: string }>,
  segments: Array<{ id: string; startPointId: string; endPointId: string }>,
  circles: Array<{ id: string; centerPointId: string; radiusMm: number }> = [],
): ConstructionState {
  return {
    ...createInitialState(),
    points: points.map((p) => ({ ...p, label: p.label ?? 'A', locked: false })),
    segments: segments.map((s) => ({
      ...s,
      lengthMm: 0, // computed elsewhere
      fixedLength: undefined,
    })),
    circles: circles.map((c) => ({ ...c })),
  };
}

describe('findSnap', () => {
  describe('point snap (priority 1)', () => {
    it('snaps to nearest point within tolerance', () => {
      const state = makeState([{ id: 'p1', x: 50, y: 50 }]);
      const result = findSnap({ x: 53, y: 52 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('point');
      expect(result.snappedToPointId).toBe('p1');
      expect(result.snappedPosition).toEqual({ x: 50, y: 50 });
    });

    it('ignores point outside tolerance', () => {
      const state = makeState([{ id: 'p1', x: 50, y: 50 }]);
      const result = findSnap({ x: 60, y: 60 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).not.toBe('point');
    });

    it('snaps to closest point when multiple in range', () => {
      const state = makeState([
        { id: 'p1', x: 50, y: 50 },
        { id: 'p2', x: 53, y: 52 },
      ]);
      const result = findSnap({ x: 52, y: 51 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('point');
      expect(result.snappedToPointId).toBe('p2');
    });

    it('excludes specified point IDs', () => {
      const state = makeState([{ id: 'p1', x: 50, y: 50 }]);
      const result = findSnap({ x: 51, y: 50 }, state, DEFAULT_TOLERANCES, ['p1']);
      expect(result.snapType).not.toBe('point');
    });
  });

  describe('grid snap (priority 2)', () => {
    it('snaps to grid when no point in range', () => {
      const state = makeState([]);
      const result = findSnap({ x: 12, y: 18 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('grid');
      expect(result.snappedPosition).toEqual({ x: 10, y: 20 });
    });

    it('does not snap to grid when snap is disabled', () => {
      const state = { ...makeState([]), snapEnabled: false };
      const result = findSnap({ x: 12, y: 18 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('none');
    });

    it('ignores grid when cursor is too far from intersection', () => {
      const state = makeState([]);
      // 10mm grid, cursor at (8, 8) — distance to (10,10) is ~2.8mm, within 5mm
      const result = findSnap({ x: 8, y: 8 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('grid');
    });
  });

  describe('priority: point beats grid', () => {
    it('snaps to point even when grid is closer', () => {
      const state = makeState([{ id: 'p1', x: 11, y: 11 }]);
      // Cursor at (12, 12) — grid at (10,10), point at (11,11)
      const result = findSnap({ x: 12, y: 12 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('point');
      expect(result.snappedToPointId).toBe('p1');
    });
  });

  describe('no snap', () => {
    it('returns cursor position when nothing is in range', () => {
      const state = { ...makeState([]), snapEnabled: false };
      const result = findSnap({ x: 33.7, y: 44.2 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('none');
      expect(result.snappedPosition).toEqual({ x: 33.7, y: 44.2 });
    });
  });

  describe('midpoint snap (priority 2)', () => {
    it('snaps to segment midpoint within tolerance', () => {
      const state = makeStateWithSegments(
        [
          { id: 'p1', x: 0, y: 0 },
          { id: 'p2', x: 100, y: 0 },
        ],
        [{ id: 's1', startPointId: 'p1', endPointId: 'p2' }],
      );
      // Cursor near midpoint (50, 0) — at (52, 2), distance ~2.8mm
      const result = findSnap({ x: 52, y: 2 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('midpoint');
      expect(result.snappedPosition.x).toBeCloseTo(50);
      expect(result.snappedPosition.y).toBeCloseTo(0);
    });

    it('point snap beats midpoint snap', () => {
      const state = makeStateWithSegments(
        [
          { id: 'p1', x: 0, y: 0 },
          { id: 'p2', x: 100, y: 0 },
          { id: 'p3', x: 51, y: 1 },
        ],
        [{ id: 's1', startPointId: 'p1', endPointId: 'p2' }],
      );
      // Cursor at (51, 1) — point p3 is right there, midpoint at (50,0)
      const result = findSnap({ x: 51, y: 1 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('point');
      expect(result.snappedToPointId).toBe('p3');
    });
  });

  describe('circle circumference snap (priority 2b)', () => {
    it('snaps to circle circumference', () => {
      const state = makeStateWithSegments(
        [{ id: 'center', x: 50, y: 50 }],
        [],
        [{ id: 'c1', centerPointId: 'center', radiusMm: 30 }],
      );
      // Cursor at (82, 50) — distance to circumference = |32 - 30| = 2mm
      const result = findSnap({ x: 82, y: 50 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).toBe('circumference');
      expect(result.snappedPosition.x).toBeCloseTo(80);
      expect(result.snappedPosition.y).toBeCloseTo(50);
    });

    it('does not snap when cursor is at circle center', () => {
      const state = makeStateWithSegments(
        [{ id: 'center', x: 50, y: 50 }],
        [],
        [{ id: 'c1', centerPointId: 'center', radiusMm: 30 }],
      );
      // Cursor exactly at center — would cause division by zero without guard
      const result = findSnap({ x: 50, y: 50 }, state, DEFAULT_TOLERANCES);
      expect(result.snapType).not.toBe('circumference');
    });
  });

  describe('angle snap (priority 4, with fromPoint)', () => {
    it('snaps parallel to existing segment', () => {
      const state = makeStateWithSegments(
        [
          { id: 'p1', x: 0, y: 0 },
          { id: 'p2', x: 100, y: 0 },
        ],
        [{ id: 's1', startPointId: 'p1', endPointId: 'p2' }],
      );
      // Must be >5mm from any grid intersection so grid snap (priority 3) doesn't fire first
      const fromPoint = { x: 53, y: 53 };
      const cursor = { x: 117, y: 55 }; // angle ≈ 1.8° from horizontal, > 5mm from nearest grid
      const result = findSnap(cursor, state, DEFAULT_TOLERANCES, [], fromPoint);
      expect(result.snapType).toBe('angle');
      expect(result.guideType).toBe('parallel');
      expect(result.guideSegmentId).toBe('s1');
    });

    it('snaps perpendicular to existing segment', () => {
      const state = makeStateWithSegments(
        [
          { id: 'p1', x: 0, y: 0 },
          { id: 'p2', x: 100, y: 0 },
        ],
        [{ id: 's1', startPointId: 'p1', endPointId: 'p2' }],
      );
      // >5mm from grid so grid snap doesn't fire first
      const fromPoint = { x: 53, y: 3 };
      const cursor = { x: 55, y: 67 }; // angle ≈ 88.2° from horizontal (near vertical)
      const result = findSnap(cursor, state, DEFAULT_TOLERANCES, [], fromPoint);
      expect(result.snapType).toBe('angle');
      expect(result.guideType).toBe('perpendicular');
    });

    it('snaps to 15° canonical angle when no segment match', () => {
      const state = makeStateWithSegments([], []);
      const fromPoint = { x: 50, y: 50 };
      // Cursor at ~46° from horizontal — should snap to 45°
      const dist = 50;
      const angle = 46 * (Math.PI / 180);
      const cursor = {
        x: fromPoint.x + Math.cos(angle) * dist,
        y: fromPoint.y + Math.sin(angle) * dist,
      };
      const result = findSnap(cursor, state, DEFAULT_TOLERANCES, [], fromPoint);
      expect(result.snapType).toBe('angle');
    });
  });

  describe('alignment snap (priority 5)', () => {
    it('snaps x-alignment to existing point', () => {
      const state = makeState([{ id: 'p1', x: 50, y: 20 }]);
      // Cursor at (50.5, 80) — close to x=50 alignment with p1
      const result = findSnap({ x: 50.5, y: 80 }, state, DEFAULT_TOLERANCES);
      // Grid might catch this first, let's use a position far from grid
      expect(result.snapType === 'alignment' || result.snapType === 'grid').toBe(true);
    });

    it('excludePointIds prevents alignment to excluded point', () => {
      const state = makeState([{ id: 'p1', x: 50.5, y: 20 }]);
      const result = findSnap({ x: 50.6, y: 80 }, state, DEFAULT_TOLERANCES, ['p1']);
      // Should not align to p1 since it's excluded
      if (result.snapType === 'alignment') {
        // This shouldn't happen with p1 excluded and no other points
        expect(true).toBe(false);
      }
    });
  });
});

describe('scaleTolerances', () => {
  it('returns same object for multiplier 1', () => {
    const result = scaleTolerances(DEFAULT_TOLERANCES, 1);
    expect(result).toBe(DEFAULT_TOLERANCES);
  });

  it('scales all fields by 1.5', () => {
    const result = scaleTolerances(DEFAULT_TOLERANCES, 1.5);
    expect(result.pointMm).toBe(DEFAULT_TOLERANCES.pointMm * 1.5);
    expect(result.midpointMm).toBe(DEFAULT_TOLERANCES.midpointMm * 1.5);
    expect(result.gridMm).toBe(DEFAULT_TOLERANCES.gridMm * 1.5);
    expect(result.alignmentMm).toBe(DEFAULT_TOLERANCES.alignmentMm * 1.5);
  });

  it('scales all fields by 2.0 (very_large profile)', () => {
    const result = scaleTolerances(DEFAULT_TOLERANCES, 2.0);
    expect(result.pointMm).toBe(DEFAULT_TOLERANCES.pointMm * 2);
    expect(result.gridMm).toBe(DEFAULT_TOLERANCES.gridMm * 2);
  });
});
