/**
 * Cross-cutting selection hook.
 * Handles element selection when tool is idle, and hover tracking.
 */

import { useState, useCallback } from 'react';
import type { ConstructionState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import { hitTestElement, type HitTestResult } from '@/engine/hit-test';

interface UseSelectionOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  toolIsIdle: boolean;
}

interface SelectionResult {
  hoveredElement: HitTestResult | null;
  /** Try to select an element at the click position. Returns true if selection handled the click. */
  trySelect: (mmPos: { x: number; y: number }) => boolean;
  /** Update hover state from cursor position. */
  updateHover: (mmPos: { x: number; y: number }) => void;
  /** Clear selection. */
  clearSelection: () => void;
}

export function useSelection({
  state,
  dispatch,
  toolIsIdle,
}: UseSelectionOptions): SelectionResult {
  const [hoveredElement, setHoveredElement] = useState<HitTestResult | null>(null);

  const updateHover = useCallback(
    (mmPos: { x: number; y: number }) => {
      const hit = hitTestElement(mmPos, state);
      setHoveredElement(hit);
    },
    [state],
  );

  const trySelect = useCallback(
    (mmPos: { x: number; y: number }): boolean => {
      if (!toolIsIdle) return false;

      const hit = hitTestElement(mmPos, state);

      // All construction tools act on point clicks when idle — let the tool handle it.
      // Selection only intercepts point clicks for tools that never act on points.
      if (hit?.type === 'point') {
        return false;
      }

      if (hit) {
        dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: hit.id });
        return true;
      }

      // Click on empty space: deselect
      if (state.selectedElementId) {
        dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
        return true;
      }

      return false;
    },
    [state, dispatch, toolIsIdle],
  );

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
  }, [dispatch]);

  return { hoveredElement, trySelect, updateHover, clearSelection };
}
