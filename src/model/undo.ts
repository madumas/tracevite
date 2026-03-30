/**
 * Immutable undo/redo manager using complete snapshots.
 * Spec §15: snapshots include geometric state but parameter
 * changes (grid, level, unit) do NOT push to the stack.
 */

import type { ConstructionState } from './types';
import { MAX_UNDO_LEVELS } from '@/config/accessibility';

export interface UndoManager {
  /** Past states (oldest first). Does NOT include current. */
  readonly past: readonly ConstructionState[];
  /** Current state. */
  readonly current: ConstructionState;
  /** Future states (for redo, oldest first). */
  readonly future: readonly ConstructionState[];
}

export function createUndoManager(initial: ConstructionState): UndoManager {
  return { past: [], current: initial, future: [] };
}

export function canUndo(manager: UndoManager): boolean {
  return manager.past.length > 0;
}

export function canRedo(manager: UndoManager): boolean {
  return manager.future.length > 0;
}

/**
 * Push a new state onto the undo stack.
 * Truncates redo (future) stack. Caps past at MAX_UNDO_LEVELS.
 */
export function pushState(manager: UndoManager, state: ConstructionState): UndoManager {
  const past = [...manager.past, manager.current];
  // Cap history
  const trimmedPast =
    past.length > MAX_UNDO_LEVELS ? past.slice(past.length - MAX_UNDO_LEVELS) : past;

  return {
    past: trimmedPast,
    current: state,
    future: [], // truncate redo on new action
  };
}

/** Undo: move current to future, restore previous from past. */
export function undo(manager: UndoManager): UndoManager {
  if (!canUndo(manager)) return manager;

  const past = [...manager.past];
  const previous = past.pop()!;

  return {
    past,
    current: previous,
    future: [manager.current, ...manager.future],
  };
}

/** Redo: move current to past, restore next from future. */
export function redo(manager: UndoManager): UndoManager {
  if (!canRedo(manager)) return manager;

  const future = [...manager.future];
  const next = future.shift()!;

  return {
    past: [...manager.past, manager.current],
    current: next,
    future,
  };
}

/**
 * Update the current state WITHOUT pushing to undo.
 * Used for parameter changes (grid, level, unit, tool).
 */
export function updateCurrent(manager: UndoManager, state: ConstructionState): UndoManager {
  return { ...manager, current: state };
}
