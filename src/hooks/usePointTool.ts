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
import { detectAllFaces } from '@/engine/figures';

interface UsePointToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function usePointTool({
  state,
  dispatch,
  isActive = true,
}: UsePointToolOptions): ToolHookResult {
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      const pos = snap.snappedPosition;
      dispatch({ type: 'CREATE_POINT', x: pos.x, y: pos.y });
    },
    [isActive, state, tolerances, dispatch],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      setSnapResult(snap);
    },
    [isActive, state, tolerances],
  );

  const handleEscape = useCallback(() => {
    // Nothing to cancel
  }, []);

  const reset = useCallback(() => {
    setSnapResult(null);
  }, []);

  // Context-sensitive « Sommet » vs « Point » (QA 4.1): as soon as at least one
  // closed figure exists, new clicks are more likely « sommets » in PFEQ parlance.
  const inFigureContext = useMemo(() => detectAllFaces(state).length > 0, [state]);

  return useMemo(
    () => ({
      handleClick,
      handleCursorMove,
      handleEscape,
      reset,
      isIdle: true,
      statusMessage: STATUS_POINT_IDLE(inFigureContext),
      snapResult,
      overlayElements: null,
    }),
    [handleClick, handleCursorMove, handleEscape, reset, snapResult, inFigureContext],
  );
}
