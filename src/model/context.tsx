/**
 * React context for construction state.
 * Split into state + dispatch to avoid unnecessary re-renders.
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { ConstructionState } from './types';
import type { UndoManager } from './undo';
import { createUndoManager, canUndo, canRedo } from './undo';
import { createInitialState } from './state';
import { reduce, type ConstructionAction, type ReducerState } from './reducer';

// ── Context types ─────────────────────────────────────────

interface ConstructionStateValue {
  readonly state: ConstructionState;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

type ConstructionDispatch = (action: ConstructionAction) => void;

// ── Contexts ──────────────────────────────────────────────

const StateContext = createContext<ConstructionStateValue | null>(null);
const DispatchContext = createContext<ConstructionDispatch | null>(null);

// ── Reducer wrapper for useReducer ────────────────────────

function constructionReducer(state: ReducerState, action: ConstructionAction): ReducerState {
  return reduce(state, action);
}

// ── Provider ──────────────────────────────────────────────

interface ProviderProps {
  readonly children: ReactNode;
  /** Optional initial state for testing. */
  readonly initialState?: ConstructionState;
}

export function ConstructionProvider({ children, initialState }: ProviderProps) {
  const initial: ReducerState = {
    undoManager: createUndoManager(initialState ?? createInitialState()),
  };

  const [reducerState, dispatch] = useReducer(constructionReducer, initial);

  const stateValue: ConstructionStateValue = {
    state: reducerState.undoManager.current,
    canUndo: canUndo(reducerState.undoManager),
    canRedo: canRedo(reducerState.undoManager),
  };

  return (
    <StateContext.Provider value={stateValue}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────

/** Access current construction state (read-only). */
export function useConstructionState(): ConstructionStateValue {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useConstructionState must be used within ConstructionProvider');
  return ctx;
}

/** Access dispatch function. */
export function useConstructionDispatch(): ConstructionDispatch {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useConstructionDispatch must be used within ConstructionProvider');
  return ctx;
}

// ── Export UndoManager for persistence ────────────────────

export function getUndoManagerFromReducerState(state: ReducerState): UndoManager {
  return state.undoManager;
}
