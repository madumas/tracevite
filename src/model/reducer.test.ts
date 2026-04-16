/**
 * Reducer integration tests — focused on multi-action invariants that are
 * awkward to cover at the engine or state layer alone.
 */

import { reduce, type ConstructionAction, type ReducerState } from './reducer';
import { createInitialState, addPoint, addSegment, createTextBox } from './state';
import { createUndoManager } from './undo';

function makeInitialReducerState(): ReducerState {
  return { undoManager: createUndoManager(createInitialState()) };
}

describe('REFLECT_ELEMENTS with textBoxes', () => {
  it('mirrors textBox position across the axis without modifying the text', () => {
    // Place a textBox at (20, 50) and reflect across the vertical axis x=50.
    let construction = createInitialState();
    const { state: withBox } = createTextBox(construction, 20, 50);
    construction = {
      ...withBox,
      textBoxes: withBox.textBoxes.map((t) => ({ ...t, text: 'Triangle' })),
    };
    const textBoxId = construction.textBoxes[0]!.id;

    const state: ReducerState = { undoManager: createUndoManager(construction) };
    const action: ConstructionAction = {
      type: 'REFLECT_ELEMENTS',
      pointIds: [],
      segmentIds: [],
      textBoxIds: [textBoxId],
      axisP1: { x: 50, y: 0 },
      axisP2: { x: 50, y: 100 },
    };

    const result = reduce(state, action);
    const tbs = result.undoManager.current.textBoxes;
    // Original + reflected
    expect(tbs).toHaveLength(2);
    const reflected = tbs.find((t) => t.id !== textBoxId)!;
    // Position mirrored: 20 → 80 (50 + (50-20))
    expect(reflected.x).toBeCloseTo(80);
    expect(reflected.y).toBeCloseTo(50);
    // Text itself unchanged — NOT reversed or mirrored.
    expect(reflected.text).toBe('Triangle');
  });
});

describe('ROTATE_ELEMENTS with textBoxes', () => {
  it('rotates textBox anchor position but leaves the text readable', () => {
    let construction = createInitialState();
    const { state: withBox } = createTextBox(construction, 100, 50);
    construction = {
      ...withBox,
      textBoxes: withBox.textBoxes.map((t) => ({ ...t, text: 'Carré' })),
    };
    const textBoxId = construction.textBoxes[0]!.id;

    const state: ReducerState = { undoManager: createUndoManager(construction) };
    const result = reduce(state, {
      type: 'ROTATE_ELEMENTS',
      pointIds: [],
      segmentIds: [],
      circleIds: [],
      textBoxIds: [textBoxId],
      center: { x: 50, y: 50 },
      angleDeg: 90,
    });

    const tbs = result.undoManager.current.textBoxes;
    expect(tbs).toHaveLength(2);
    const rotated = tbs.find((t) => t.id !== textBoxId)!;
    expect(rotated.text).toBe('Carré');
    // (100, 50) rotated 90° CCW around (50, 50) → (50, 100) in math coords,
    // which is (50, 100) in screen coords (y-down rotatePoint convention). We
    // only care that the anchor moved to a different spot and the glyph string
    // is preserved.
    expect(rotated.x).not.toBeCloseTo(100);
  });
});

describe('SCALE_ELEMENTS with textBoxes', () => {
  it('scales textBox anchor position without changing the text', () => {
    let construction = createInitialState();
    const { state: withBox } = createTextBox(construction, 100, 100);
    construction = { ...withBox, textBoxes: withBox.textBoxes.map((t) => ({ ...t, text: 'x' })) };
    const textBoxId = construction.textBoxes[0]!.id;

    const state: ReducerState = { undoManager: createUndoManager(construction) };
    const result = reduce(state, {
      type: 'SCALE_ELEMENTS',
      pointIds: [],
      segmentIds: [],
      circleIds: [],
      textBoxIds: [textBoxId],
      center: { x: 0, y: 0 },
      factor: 2,
    });

    const scaled = result.undoManager.current.textBoxes.find((t) => t.id !== textBoxId)!;
    // (100, 100) × 2 about (0, 0) → (200, 200)
    expect(scaled.x).toBeCloseTo(200);
    expect(scaled.y).toBeCloseTo(200);
    expect(scaled.text).toBe('x');
  });
});

describe('NEW_CONSTRUCTION preserves accessibility settings', () => {
  it('keeps toleranceProfile, fontScale, hideProperties across a fresh canvas', () => {
    const construction = {
      ...createInitialState(),
      toleranceProfile: 'very_large' as const,
      fontScale: 1.5 as const,
      hideProperties: false,
      hidePropertiesUserSet: true,
      estimationMode: true,
    };

    // Place something so the state is dirty, then start over.
    const withPoint = addPoint(construction, 10, 10).state;
    const state: ReducerState = { undoManager: createUndoManager(withPoint) };
    const result = reduce(state, { type: 'NEW_CONSTRUCTION' });
    const next = result.undoManager.current;

    expect(next.points).toHaveLength(0);
    expect(next.toleranceProfile).toBe('very_large');
    expect(next.fontScale).toBe(1.5);
    expect(next.hideProperties).toBe(false);
    expect(next.hidePropertiesUserSet).toBe(true);
    expect(next.estimationMode).toBe(true);
    // Consigne intentionally NOT preserved — teacher assignment resets.
    expect(next.consigne).toBeNull();
  });
});

describe('SET_DISPLAY_MODE respects the user toggle', () => {
  it('applies mode default only until hideProperties has been explicitly set', () => {
    let state: ReducerState = makeInitialReducerState();

    // Initially Simplifié with default hideProperties=true, userSet=false.
    expect(state.undoManager.current.hideProperties).toBe(true);
    expect(state.undoManager.current.hidePropertiesUserSet).toBe(false);

    // Switching to Complet should flip the default (false) because the user
    // never toggled.
    state = reduce(state, { type: 'SET_DISPLAY_MODE', displayMode: 'complet' });
    expect(state.undoManager.current.hideProperties).toBe(false);

    // User explicitly hides in Complet.
    state = reduce(state, { type: 'SET_HIDE_PROPERTIES', hide: true });
    expect(state.undoManager.current.hidePropertiesUserSet).toBe(true);

    // Switching back to Simplifié must not overwrite the user's choice.
    state = reduce(state, { type: 'SET_DISPLAY_MODE', displayMode: 'simplifie' });
    expect(state.undoManager.current.hideProperties).toBe(true);

    // And back to Complet — still honors the explicit toggle.
    state = reduce(state, { type: 'SET_DISPLAY_MODE', displayMode: 'complet' });
    expect(state.undoManager.current.hideProperties).toBe(true);
  });
});

describe('SET_SELECTED_ELEMENT rejects phantom ids', () => {
  it('ignores the action when the id does not exist', () => {
    let state: ReducerState = makeInitialReducerState();
    state = reduce(state, { type: 'SET_SELECTED_ELEMENT', elementId: 'does-not-exist' });
    expect(state.undoManager.current.selectedElementId).toBeNull();
  });

  it('accepts the action for a valid point id', () => {
    let construction = createInitialState();
    const { state: withP, pointId } = addPoint(construction, 0, 0);
    construction = withP;
    let state: ReducerState = { undoManager: createUndoManager(construction) };
    state = reduce(state, { type: 'SET_SELECTED_ELEMENT', elementId: pointId });
    expect(state.undoManager.current.selectedElementId).toBe(pointId);
  });
});

describe('UNDO/REDO preserves activeTool from the current state', () => {
  it('does not resurrect a tool from a historical snapshot', () => {
    let construction = createInitialState();
    const { state: s1, pointId: p1 } = addPoint(construction, 0, 0);
    construction = s1;
    const { state: s2, pointId: p2 } = addPoint(construction, 10, 0);
    construction = s2;
    construction = addSegment(construction, p1, p2)!.state;

    let state: ReducerState = { undoManager: createUndoManager(construction) };
    // User switches to 'circle' mid-session.
    state = reduce(state, { type: 'SET_ACTIVE_TOOL', activeTool: 'circle' });
    // Add another action so undo has something to roll back.
    state = reduce(state, { type: 'CREATE_POINT', x: 20, y: 0 });

    state = reduce(state, { type: 'UNDO' });
    expect(state.undoManager.current.activeTool).toBe('circle');
    expect(state.undoManager.current.selectedElementId).toBeNull();
  });
});
