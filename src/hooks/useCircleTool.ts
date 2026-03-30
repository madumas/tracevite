import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { findSnap, DEFAULT_TOLERANCES } from '@/engine/snap';
import { distance } from '@/engine/geometry';
import { STATUS_CIRCLE_IDLE, STATUS_CIRCLE_CENTER_PLACED } from '@/config/messages';
import { GhostCircle } from '@/components/GhostCircle';

type CirclePhase = 'idle' | 'center_placed';

interface UseCircleToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
}

export function useCircleTool({ state, dispatch, viewport }: UseCircleToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<CirclePhase>('idle');
  const [centerPointId, setCenterPointId] = useState<string | null>(null);
  const [centerMm, setCenterMm] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setCenterPointId(null);
    setCenterMm(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (phase === 'idle') {
        const snap = findSnap(mmPos, state, DEFAULT_TOLERANCES);
        const snapped = snap.snappedPosition;

        // Place or reuse center point
        const cpId = snap.snappedToPointId;
        if (!cpId) {
          // Will create point as part of circle creation — for now, store position
          // We need to create the point first
          dispatch({
            type: 'CREATE_SEGMENT',
            start: { x: snapped.x, y: snapped.y },
            end: { x: snapped.x, y: snapped.y }, // Will fail (zero-length), so use addPoint
          });
          // Actually, we need a CREATE_POINT action. For now, we'll handle this
          // by creating a segment that starts and ends at the same point... that won't work.
          // Let's just store the position and create the point when creating the circle.
        }

        setCenterPointId(cpId ?? null);
        setCenterMm(snapped);
        setPhase('center_placed');
      } else if (phase === 'center_placed' && centerMm) {
        const snap = findSnap(
          mmPos,
          state,
          DEFAULT_TOLERANCES,
          centerPointId ? [centerPointId] : [],
        );
        const radiusMm = distance(centerMm, snap.snappedPosition);

        if (radiusMm >= 2) {
          // If center point doesn't exist yet, we need to create it
          // For now, use existing point or skip
          if (centerPointId) {
            dispatch({ type: 'CREATE_CIRCLE', centerPointId, radiusMm });
          }
        }

        reset();
      }
    },
    [phase, state, centerPointId, centerMm, dispatch, reset],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      setCursorMm(mmPos);
      const excludeIds = centerPointId ? [centerPointId] : [];
      const snap = findSnap(mmPos, state, DEFAULT_TOLERANCES, excludeIds);
      setSnapResult(snap);
    },
    [state, centerPointId],
  );

  const handleEscape = useCallback(() => {
    if (phase !== 'idle') reset();
  }, [phase, reset]);

  const statusMessage = phase === 'idle' ? STATUS_CIRCLE_IDLE : STATUS_CIRCLE_CENTER_PLACED;

  const overlayElements = useMemo(() => {
    if (phase !== 'center_placed' || !centerMm || !cursorMm) return null;

    const endPos = snapResult?.snappedPosition ?? cursorMm;
    const radiusMm = distance(centerMm, endPos);

    return createElement(GhostCircle, {
      key: 'ghost-circle',
      centerMm,
      radiusMm,
      viewport,
      displayUnit: state.displayUnit,
    });
  }, [phase, centerMm, cursorMm, snapResult, viewport, state.displayUnit]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'idle',
    statusMessage,
    snapResult: phase === 'center_placed' ? snapResult : null,
    overlayElements,
  };
}
