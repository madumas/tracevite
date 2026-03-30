import { findSnap, DEFAULT_TOLERANCES } from './snap';
import type { ConstructionState } from '@/model/types';

function makeState(points: Array<{ id: string; x: number; y: number }>): ConstructionState {
  return {
    points: points.map((p) => ({ ...p, label: 'A', locked: false })),
    segments: [],
    circles: [],
    gridSizeMm: 10,
    snapEnabled: true,
    activeTool: 'segment',
    schoolLevel: '2e_cycle',
    displayUnit: 'cm',
    selectedElementId: null,
    consigne: null,
    hideProperties: false,
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
});
