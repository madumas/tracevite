/**
 * Measure/Fix tool — spec §6.8.
 * Click on a segment → select it + open length input for fixing exact length.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment } from '@/engine/hit-test';
import { STATUS_MEASURE_IDLE } from '@/config/messages';

interface UseMeasureToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useMeasureTool({
  state,
  dispatch,
  isActive = true,
}: UseMeasureToolOptions): ToolHookResult {
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const segId = hitTestSegment(mmPos, state.segments, state.points);
      if (segId) {
        dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: segId });
      }
    },
    [isActive, state.segments, state.points, dispatch],
  );

  const handleCursorMove = useCallback(
    (_mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setSnapResult(null);
    },
    [isActive],
  );

  const handleEscape = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
  }, [dispatch]);

  const reset = useCallback(() => {
    setSnapResult(null);
  }, []);

  return useMemo(
    () => ({
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      isIdle: false, // Measure tool captures all clicks (no cross-cutting selection)
      statusMessage: STATUS_MEASURE_IDLE,
      snapResult,
      overlayElements: null,
    }),
    [handleClick, handleCursorMove, handleEscape, reset, snapResult],
  );
}
