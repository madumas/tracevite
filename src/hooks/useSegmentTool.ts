import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConstructionState, SegmentToolPhase, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import { findSnap, DEFAULT_TOLERANCES } from '@/engine/snap';
import { CHAIN_TIMEOUT_MS, CHAIN_MOVEMENT_THRESHOLD_MM } from '@/config/accessibility';
import { distance } from '@/engine/geometry';

interface UseSegmentToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
}

export interface SegmentToolState {
  phase: SegmentToolPhase;
  firstPointMm: { x: number; y: number } | null;
  firstPointId: string | null; // existing point reused
  cursorMm: { x: number; y: number } | null;
  snapResult: SnapResult | null;
  chainingAnchorId: string | null;
}

export function useSegmentTool({ state, dispatch }: UseSegmentToolOptions) {
  const [phase, setPhase] = useState<SegmentToolPhase>('idle');
  const [firstPoint, setFirstPoint] = useState<{
    mm: { x: number; y: number };
    existingId?: string;
  } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [chainingAnchorId, setChainingAnchorId] = useState<string | null>(null);

  const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveMm = useRef<{ x: number; y: number } | null>(null);

  // Clear chaining timer
  const clearChainTimer = useCallback(() => {
    if (chainTimerRef.current) {
      clearTimeout(chainTimerRef.current);
      chainTimerRef.current = null;
    }
  }, []);

  // Start chaining timer
  const startChainTimer = useCallback(() => {
    clearChainTimer();
    chainTimerRef.current = setTimeout(() => {
      setPhase('idle');
      setFirstPoint(null);
      setChainingAnchorId(null);
    }, CHAIN_TIMEOUT_MS);
  }, [clearChainTimer]);

  // Reset tool to idle
  const reset = useCallback(() => {
    setPhase('idle');
    setFirstPoint(null);
    setChainingAnchorId(null);
    clearChainTimer();
  }, [clearChainTimer]);

  // Handle click on canvas
  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (state.activeTool !== 'segment') return;

      // Snap the click position
      const excludeIds = firstPoint?.existingId ? [firstPoint.existingId] : [];
      const snap = findSnap(mmPos, state, DEFAULT_TOLERANCES, excludeIds);
      const snapped = snap.snappedPosition;

      if (phase === 'idle') {
        // Place first point
        setFirstPoint({
          mm: snapped,
          existingId: snap.snappedToPointId,
        });
        setPhase('first_point_placed');
        clearChainTimer();
      } else if (phase === 'first_point_placed' || phase === 'segment_created') {
        // Place second point → create segment
        if (!firstPoint) return;

        dispatch({
          type: 'CREATE_SEGMENT',
          start: {
            x: firstPoint.mm.x,
            y: firstPoint.mm.y,
            existingPointId: firstPoint.existingId,
          },
          end: {
            x: snapped.x,
            y: snapped.y,
            existingPointId: snap.snappedToPointId,
          },
        });

        // Enter chaining: the endpoint becomes the new start
        const newAnchorId = snap.snappedToPointId;
        // Find the created point (last point in state after dispatch)
        // We set up chaining from the endpoint
        setFirstPoint({
          mm: snapped,
          existingId: newAnchorId,
        });
        setChainingAnchorId(newAnchorId ?? null);
        setPhase('segment_created');
        startChainTimer();
      }
    },
    [state, phase, firstPoint, dispatch, clearChainTimer, startChainTimer],
  );

  // Handle cursor movement
  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      setCursorMm(mmPos);

      // Snap preview
      const excludeIds = firstPoint?.existingId ? [firstPoint.existingId] : [];
      const snap = findSnap(mmPos, state, DEFAULT_TOLERANCES, excludeIds);
      setSnapResult(snap);

      // Reset chaining timer on significant movement
      if (phase === 'segment_created' && lastMoveMm.current) {
        const moved = distance(lastMoveMm.current, mmPos);
        if (moved > CHAIN_MOVEMENT_THRESHOLD_MM) {
          startChainTimer();
        }
      }
      lastMoveMm.current = mmPos;
    },
    [state, phase, firstPoint, startChainTimer],
  );

  // Escape handler
  const handleEscape = useCallback(() => {
    if (phase !== 'idle') {
      reset();
    }
  }, [phase, reset]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearChainTimer();
  }, [clearChainTimer]);

  return {
    phase,
    firstPointMm: firstPoint?.mm ?? null,
    firstPointId: firstPoint?.existingId ?? null,
    cursorMm,
    snapResult,
    chainingAnchorId,
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
  };
}
