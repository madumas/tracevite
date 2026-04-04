/**
 * Cross-cutting selection hook.
 * Handles element selection when tool is idle, and hover tracking.
 */

import { useState, useCallback, useRef } from 'react';
import type { ConstructionState, ToolType } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import { hitTestElement, type HitTestResult } from '@/engine/hit-test';

/** Delay before clearing hover state (ms) — compensates for TDC tremors. */
const HOVER_EXIT_DELAY_MS = 300;

/** Tools that create new geometry — midpoint snaps take priority over selection. */
const CONSTRUCTION_TOOLS: readonly ToolType[] = ['segment', 'point', 'circle'];

interface UseSelectionOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  toolIsIdle: boolean;
  activeTool: ToolType;
}

interface SelectionResult {
  hoveredElement: HitTestResult | null;
  /** Try to select an element at the click position. Returns true if selection handled the click. */
  trySelect: (mmPos: { x: number; y: number }) => boolean;
  /** Update hover state from cursor position. */
  updateHover: (mmPos: { x: number; y: number }) => void;
  /** Clear hover state (e.g. on touch pointerup). */
  clearHover: () => void;
  /** Clear selection. */
  clearSelection: () => void;
}

export function useSelection({
  state,
  dispatch,
  toolIsIdle,
  activeTool,
}: UseSelectionOptions): SelectionResult {
  const [hoveredElement, setHoveredElement] = useState<HitTestResult | null>(null);
  const hoverExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateHover = useCallback(
    (mmPos: { x: number; y: number }) => {
      const hit = hitTestElement(mmPos, state);
      if (hit) {
        // Cursor is on an element — cancel any pending exit and update immediately
        if (hoverExitTimer.current) {
          clearTimeout(hoverExitTimer.current);
          hoverExitTimer.current = null;
        }
        setHoveredElement(hit);
      } else if (!hoverExitTimer.current) {
        // Cursor left element — delay clearing to compensate for TDC tremors
        hoverExitTimer.current = setTimeout(() => {
          setHoveredElement(null);
          hoverExitTimer.current = null;
        }, HOVER_EXIT_DELAY_MS);
      }
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

      // Construction tools: clicking on a segment body lets the tool handle it
      // so the user can start/end a segment on an existing segment (T-junction).
      // To select a segment (fix length, etc.), switch to Move tool.
      if (hit?.type === 'segment' && CONSTRUCTION_TOOLS.includes(activeTool)) {
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

  const clearHover = useCallback(() => {
    if (hoverExitTimer.current) {
      clearTimeout(hoverExitTimer.current);
      hoverExitTimer.current = null;
    }
    setHoveredElement(null);
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
  }, [dispatch]);

  return { hoveredElement, trySelect, updateHover, clearHover, clearSelection };
}
