/**
 * Construction reducer — single source of truth for action types.
 * Geometric actions push to undo. Parameter changes do not.
 */

import type { GridSize, SchoolLevel, DisplayUnit, ToolType } from './types';
import type { UndoManager } from './undo';
import * as State from './state';
import * as Undo from './undo';

// ── Action types ──────────────────────────────────────────

export type ConstructionAction =
  | {
      type: 'CREATE_SEGMENT';
      start: { x: number; y: number; existingPointId?: string };
      end: { x: number; y: number; existingPointId?: string };
    }
  | { type: 'REMOVE_ELEMENT'; elementId: string }
  | { type: 'UPDATE_POINT_POSITION'; pointId: string; x: number; y: number }
  | { type: 'FIX_SEGMENT_LENGTH'; segmentId: string; lengthMm: number }
  | { type: 'SPLIT_SEGMENT'; segmentId: string; x: number; y: number }
  | { type: 'SET_GRID_SIZE'; gridSizeMm: GridSize }
  | { type: 'SET_SCHOOL_LEVEL'; schoolLevel: SchoolLevel }
  | { type: 'SET_DISPLAY_UNIT'; displayUnit: DisplayUnit }
  | { type: 'SET_ACTIVE_TOOL'; activeTool: ToolType }
  | { type: 'SET_SNAP_ENABLED'; snapEnabled: boolean }
  | { type: 'SET_SELECTED_ELEMENT'; elementId: string | null }
  | { type: 'TOGGLE_POINT_LOCK'; pointId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'NEW_CONSTRUCTION' };

/** Result of a reducer dispatch. */
export interface ReducerState {
  readonly undoManager: UndoManager;
}

/** Reduce an action, returning updated undo manager. */
export function reduce(state: ReducerState, action: ConstructionAction): ReducerState {
  const { undoManager } = state;
  const current = undoManager.current;

  switch (action.type) {
    // ── Geometric actions (push to undo) ──────────────
    case 'CREATE_SEGMENT': {
      const result = State.createSegment(current, action.start, action.end);
      if (!result) return state; // silently reject
      return { undoManager: Undo.pushState(undoManager, result.state) };
    }

    case 'REMOVE_ELEMENT': {
      const newState = State.removeElement(current, action.elementId);
      if (newState === current) return state;
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'UPDATE_POINT_POSITION': {
      const newState = State.updatePointPosition(current, action.pointId, action.x, action.y);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'FIX_SEGMENT_LENGTH': {
      const newState = State.fixSegmentLength(current, action.segmentId, action.lengthMm);
      if (newState === current) return state;
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    case 'SPLIT_SEGMENT': {
      const result = State.splitSegmentAtPoint(current, action.segmentId, action.x, action.y);
      if (!result) return state;
      return { undoManager: Undo.pushState(undoManager, result.state) };
    }

    // ── Parameter changes (no undo push) ──────────────
    case 'SET_GRID_SIZE':
      return {
        undoManager: Undo.updateCurrent(undoManager, State.setGridSize(current, action.gridSizeMm)),
      };

    case 'SET_SCHOOL_LEVEL':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setSchoolLevel(current, action.schoolLevel),
        ),
      };

    case 'SET_DISPLAY_UNIT':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setDisplayUnit(current, action.displayUnit),
        ),
      };

    case 'SET_ACTIVE_TOOL':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setActiveTool(current, action.activeTool),
        ),
      };

    case 'SET_SNAP_ENABLED':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setSnapEnabled(current, action.snapEnabled),
        ),
      };

    case 'SET_SELECTED_ELEMENT':
      return {
        undoManager: Undo.updateCurrent(
          undoManager,
          State.setSelectedElement(current, action.elementId),
        ),
      };

    case 'TOGGLE_POINT_LOCK': {
      const newState = State.togglePointLock(current, action.pointId);
      return { undoManager: Undo.pushState(undoManager, newState) };
    }

    // ── Undo/Redo ─────────────────────────────────────
    case 'UNDO':
      return { undoManager: Undo.undo(undoManager) };

    case 'REDO':
      return { undoManager: Undo.redo(undoManager) };

    // ── New construction ──────────────────────────────
    case 'NEW_CONSTRUCTION':
      return { undoManager: Undo.createUndoManager(State.createInitialState()) };
  }
}
