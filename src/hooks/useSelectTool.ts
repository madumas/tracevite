/**
 * Select tool — explicit element selection for properties and actions.
 * Especially useful on tablets where hover is unavailable.
 * Always idle, no multi-step workflow.
 */

import { useCallback, useMemo } from 'react';
import type { ConstructionState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestElement } from '@/engine/hit-test';
import { STATUS_SELECT_IDLE } from '@/config/messages';

interface UseSelectToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  isActive?: boolean;
}

export function useSelectTool({
  state,
  dispatch,
  isActive = true,
}: UseSelectToolOptions): ToolHookResult {
  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const hit = hitTestElement(mmPos, state);
      dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: hit?.id ?? null });
    },
    [isActive, state, dispatch],
  );

  const handleCursorMove = useCallback(() => {
    // No snap feedback for select tool
  }, []);

  const handleEscape = useCallback(() => {
    if (state.selectedElementId) {
      dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
    }
  }, [state.selectedElementId, dispatch]);

  const reset = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
  }, [dispatch]);

  return useMemo(
    () => ({
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      isIdle: true,
      statusMessage: STATUS_SELECT_IDLE,
      snapResult: null,
      overlayElements: null,
    }),
    [handleClick, handleCursorMove, handleEscape, reset],
  );
}
