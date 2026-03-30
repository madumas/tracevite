import { createUndoManager, pushState, undo, redo, canUndo, canRedo, updateCurrent } from './undo';
import { createInitialState, addPoint } from './state';

describe('UndoManager', () => {
  const initial = createInitialState();

  it('starts with no undo/redo available', () => {
    const mgr = createUndoManager(initial);
    expect(canUndo(mgr)).toBe(false);
    expect(canRedo(mgr)).toBe(false);
  });

  it('can undo after push', () => {
    const mgr = createUndoManager(initial);
    const state2 = addPoint(initial, 10, 20).state;
    const mgr2 = pushState(mgr, state2);
    expect(canUndo(mgr2)).toBe(true);
    expect(mgr2.current).toBe(state2);
  });

  it('undo restores previous state', () => {
    const mgr = createUndoManager(initial);
    const state2 = addPoint(initial, 10, 20).state;
    const mgr2 = pushState(mgr, state2);
    const mgr3 = undo(mgr2);
    expect(mgr3.current).toBe(initial);
    expect(canRedo(mgr3)).toBe(true);
  });

  it('redo restores undone state', () => {
    const mgr = createUndoManager(initial);
    const state2 = addPoint(initial, 10, 20).state;
    const mgr2 = pushState(mgr, state2);
    const mgr3 = undo(mgr2);
    const mgr4 = redo(mgr3);
    expect(mgr4.current).toBe(state2);
  });

  it('push truncates redo stack', () => {
    const mgr = createUndoManager(initial);
    const state2 = addPoint(initial, 10, 20).state;
    const state3 = addPoint(state2, 30, 40).state;

    let m = pushState(mgr, state2);
    m = pushState(m, state3);
    m = undo(m); // back to state2
    expect(canRedo(m)).toBe(true);

    const state4 = addPoint(state2, 50, 60).state;
    m = pushState(m, state4); // should truncate redo
    expect(canRedo(m)).toBe(false);
    expect(m.current).toBe(state4);
  });

  it('caps history at 100 levels', () => {
    let mgr = createUndoManager(initial);
    let currentState = initial;

    for (let i = 0; i < 120; i++) {
      const result = addPoint(currentState, i, i);
      currentState = result.state;
      mgr = pushState(mgr, currentState);
    }

    expect(mgr.past.length).toBeLessThanOrEqual(100);
    // Should still be able to undo 100 times
    let undoCount = 0;
    let m = mgr;
    while (canUndo(m)) {
      m = undo(m);
      undoCount++;
    }
    expect(undoCount).toBe(100);
  });

  it('undo on empty stack is a no-op', () => {
    const mgr = createUndoManager(initial);
    const mgr2 = undo(mgr);
    expect(mgr2).toBe(mgr);
  });

  it('redo on empty stack is a no-op', () => {
    const mgr = createUndoManager(initial);
    const mgr2 = redo(mgr);
    expect(mgr2).toBe(mgr);
  });

  it('updateCurrent does not push to undo', () => {
    const mgr = createUndoManager(initial);
    const modified = { ...initial, gridSizeMm: 5 as const };
    const mgr2 = updateCurrent(mgr, modified);
    expect(mgr2.current.gridSizeMm).toBe(5);
    expect(canUndo(mgr2)).toBe(false); // no push happened
  });
});
