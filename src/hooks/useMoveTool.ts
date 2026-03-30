import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestPoint } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES } from '@/engine/snap';
import { STATUS_MOVE_IDLE, STATUS_MOVE_PICKED } from '@/config/messages';
import { MovePreview } from '@/components/MovePreview';

type MovePhase = 'idle' | 'point_picked';

interface UseMoveToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
}

export function useMoveTool({ state, dispatch, viewport }: UseMoveToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<MovePhase>('idle');
  const [pickedPointId, setPickedPointId] = useState<string | null>(null);
  const [_originalPosition, setOriginalPosition] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setPickedPointId(null);
    setOriginalPosition(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (phase === 'idle') {
        // Try to pick up a point
        const pointId = hitTestPoint(mmPos, state.points);
        if (!pointId) return;

        const point = state.points.find((p) => p.id === pointId);
        if (!point || point.locked) return; // Can't move locked points

        setPickedPointId(pointId);
        setOriginalPosition({ x: point.x, y: point.y });
        setPhase('point_picked');
      } else if (phase === 'point_picked' && pickedPointId) {
        // Put down the point
        const snap = findSnap(mmPos, state, DEFAULT_TOLERANCES, [pickedPointId]);
        const target = snap.snappedPosition;

        dispatch({ type: 'MOVE_POINT', pointId: pickedPointId, x: target.x, y: target.y });
        reset();
      }
    },
    [phase, state, pickedPointId, dispatch, reset],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      setCursorMm(mmPos);
      if (pickedPointId) {
        const snap = findSnap(mmPos, state, DEFAULT_TOLERANCES, [pickedPointId]);
        setSnapResult(snap);
      }
    },
    [state, pickedPointId],
  );

  const handleEscape = useCallback(() => {
    if (phase === 'point_picked') {
      // Return to original position (cancel move)
      reset();
    }
  }, [phase, reset]);

  // Status message
  const pickedLabel = pickedPointId
    ? (state.points.find((p) => p.id === pickedPointId)?.label ?? '?')
    : '';
  const statusMessage = phase === 'idle' ? STATUS_MOVE_IDLE : STATUS_MOVE_PICKED(pickedLabel);

  // Overlay: show the point at cursor position during pick-up
  const overlayElements = useMemo(() => {
    if (phase !== 'point_picked' || !pickedPointId || !cursorMm) return null;

    const snappedPos = snapResult?.snappedPosition ?? cursorMm;
    const point = state.points.find((p) => p.id === pickedPointId);
    if (!point) return null;

    return createElement(MovePreview, {
      key: 'move-preview',
      point,
      previewPosition: snappedPos,
      state,
      viewport,
    });
  }, [phase, pickedPointId, cursorMm, snapResult, state, viewport]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'idle',
    statusMessage,
    snapResult: phase === 'point_picked' ? snapResult : null,
    overlayElements,
  };
}
