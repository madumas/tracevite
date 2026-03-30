/**
 * Point tool — spec §6.2.
 * Simple click → place a free point on the canvas.
 * Hidden by default, activable in settings.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { STATUS_POINT_IDLE } from '@/config/messages';

interface UsePointToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
}

export function usePointTool({ state, dispatch }: UsePointToolOptions): ToolHookResult {
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      const snap = findSnap(mmPos, state, tolerances);
      const pos = snap.snappedPosition;
      dispatch({ type: 'CREATE_POINT', x: pos.x, y: pos.y });
    },
    [state, tolerances, dispatch],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      const snap = findSnap(mmPos, state, tolerances);
      setSnapResult(snap);
    },
    [state, tolerances],
  );

  const handleEscape = useCallback(() => {
    // Nothing to cancel
  }, []);

  const reset = useCallback(() => {
    setSnapResult(null);
  }, []);

  return useMemo(
    () => ({
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      isIdle: true,
      statusMessage: STATUS_POINT_IDLE,
      snapResult,
      overlayElements: null,
    }),
    [handleClick, handleCursorMove, handleEscape, reset, snapResult],
  );
}
