/**
 * Text tool — place free-form text boxes on the canvas.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ConstructionState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';

interface UseTextToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  isActive?: boolean;
}

export function useTextTool({
  state: _state,
  dispatch,
  isActive = true,
}: UseTextToolOptions): ToolHookResult {
  const [idle, setIdle] = useState(true);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      dispatch({ type: 'CREATE_TEXT_BOX', x: mmPos.x, y: mmPos.y });
    },
    [isActive, dispatch],
  );

  const handleCursorMove = useCallback(() => {}, []);

  const handleEscape = useCallback(() => {
    setIdle(true);
  }, []);

  const reset = useCallback(() => {
    setIdle(true);
  }, []);

  return useMemo(
    () => ({
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      isIdle: idle,
      statusMessage: 'Texte — Clique sur la grille pour placer une zone de texte',
      snapResult: null,
      overlayElements: null,
    }),
    [handleClick, handleCursorMove, handleEscape, reset, idle],
  );
}
