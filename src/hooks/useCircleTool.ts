import { useState, useCallback, useMemo, useEffect, useRef, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { distance } from '@/engine/geometry';
import { STATUS_CIRCLE_IDLE, STATUS_CIRCLE_CENTER_PLACED } from '@/config/messages';
import { GhostCircle } from '@/components/GhostCircle';

type CirclePhase = 'idle' | 'center_placed';

interface UseCircleToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useCircleTool({
  state,
  dispatch,
  viewport,
  isActive = true,
}: UseCircleToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<CirclePhase>('idle');
  const [centerPointId, setCenterPointId] = useState<string | null>(null);
  const [centerMm, setCenterMm] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  // Track pending center creation (point created, waiting for state update to get ID)
  const [pendingCenterMm, setPendingCenterMm] = useState<{ x: number; y: number } | null>(null);
  // Track last created circle for RadiusInput auto-show (spec §6.3)
  const [lastCreatedCircleId, setLastCreatedCircleId] = useState<string | null>(null);
  const circlesCountRef = useRef(state.circles.length);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setCenterPointId(null);
    setCenterMm(null);
    setCursorMm(null);
    setSnapResult(null);
    setPendingCenterMm(null);
  }, []);

  // Resolve pending center point ID after dispatch
  useEffect(() => {
    if (phase === 'center_placed' && pendingCenterMm && !centerPointId) {
      const match = state.points.find(
        (p) => p.x === pendingCenterMm.x && p.y === pendingCenterMm.y,
      );
      if (match) {
        setCenterPointId(match.id);
        setPendingCenterMm(null);
      }
    }
  }, [phase, pendingCenterMm, centerPointId, state.points]);

  // Detect newly created circle for RadiusInput auto-show
  useEffect(() => {
    if (state.circles.length > circlesCountRef.current) {
      const newCircle = state.circles[state.circles.length - 1];
      if (newCircle) setLastCreatedCircleId(newCircle.id);
    }
    circlesCountRef.current = state.circles.length;
  }, [state.circles]);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      if (phase === 'idle') {
        const snap = findSnap(mmPos, state, tolerances);
        const snapped = snap.snappedPosition;

        if (snap.snappedToPointId) {
          // Reuse existing point
          setCenterPointId(snap.snappedToPointId);
          setCenterMm(snapped);
          setPhase('center_placed');
        } else {
          // Create a new point for the center
          dispatch({ type: 'CREATE_POINT', x: snapped.x, y: snapped.y });
          setCenterMm(snapped);
          setPendingCenterMm(snapped);
          setPhase('center_placed');
        }
      } else if (phase === 'center_placed' && centerMm && centerPointId) {
        const snap = findSnap(mmPos, state, tolerances, [centerPointId]);
        const radiusMm = distance(centerMm, snap.snappedPosition);

        if (radiusMm >= 2) {
          circlesCountRef.current = state.circles.length;
          dispatch({ type: 'CREATE_CIRCLE', centerPointId, radiusMm });
        }

        reset();
      }
    },
    [isActive, phase, state, centerPointId, centerMm, dispatch, reset],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setCursorMm(mmPos);
      const excludeIds = centerPointId ? [centerPointId] : [];
      const snap = findSnap(mmPos, state, tolerances, excludeIds);
      setSnapResult(snap);
    },
    [isActive, state, centerPointId, tolerances],
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
    isActiveGesture: phase === 'center_placed' && !!centerMm && !!cursorMm,
    lastCreatedCircleId,
  };
}
