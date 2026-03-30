import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ConstructionState, SegmentToolPhase, SnapResult, ViewportState } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { CHAIN_MOVEMENT_THRESHOLD_MM, MIN_POINT_DISTANCE_MM } from '@/config/accessibility';
import { distance } from '@/engine/geometry';
import {
  STATUS_SEGMENT_IDLE,
  STATUS_SEGMENT_FIRST_PLACED,
  STATUS_SEGMENT_CHAINING,
  HINT_SEGMENT_TOO_SHORT,
} from '@/config/messages';
import { GhostSegment } from '@/components/GhostSegment';
import { ChainingIndicator } from '@/components/ChainingIndicator';
import { createElement } from 'react';

interface UseSegmentToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  shiftConstraintActive?: boolean;
}

export function useSegmentTool({
  state,
  dispatch,
  viewport,
  shiftConstraintActive = false,
}: UseSegmentToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<SegmentToolPhase>('idle');
  const [firstPoint, setFirstPoint] = useState<{
    mm: { x: number; y: number };
    existingId?: string;
  } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [chainingAnchorId, setChainingAnchorId] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveMm = useRef<{ x: number; y: number } | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const clearChainTimer = useCallback(() => {
    if (chainTimerRef.current) {
      clearTimeout(chainTimerRef.current);
      chainTimerRef.current = null;
    }
  }, []);

  const startChainTimer = useCallback(() => {
    clearChainTimer();
    if (state.chainTimeoutMs === 0) return; // disabled
    chainTimerRef.current = setTimeout(() => {
      setPhase('idle');
      setFirstPoint(null);
      setChainingAnchorId(null);
    }, state.chainTimeoutMs);
  }, [clearChainTimer, state.chainTimeoutMs]);

  const reset = useCallback(() => {
    setPhase('idle');
    setFirstPoint(null);
    setChainingAnchorId(null);
    setCursorMm(null);
    setSnapResult(null);
    setHintMessage(null);
    clearChainTimer();
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, [clearChainTimer]);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      const excludeIds = firstPoint?.existingId ? [firstPoint.existingId] : [];
      // Enable angle snap when a first point is placed
      const fromPt = firstPoint?.mm ?? undefined;
      const snap = findSnap(mmPos, state, tolerances, excludeIds, fromPt, shiftConstraintActive);
      const snapped = snap.snappedPosition;

      if (phase === 'idle') {
        setFirstPoint({ mm: snapped, existingId: snap.snappedToPointId });
        setPhase('first_point_placed');
        clearChainTimer();
      } else if (phase === 'first_point_placed' || phase === 'segment_created') {
        if (!firstPoint) return;

        // Check minimum distance before creating (spec §17)
        const segDist = distance(firstPoint.mm, snapped);
        if (segDist < MIN_POINT_DISTANCE_MM) {
          // Show hint message for 3s
          setHintMessage(HINT_SEGMENT_TOO_SHORT);
          if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
          hintTimerRef.current = setTimeout(() => setHintMessage(null), 3000);
          return;
        }

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

        setFirstPoint({ mm: snapped, existingId: snap.snappedToPointId });
        setChainingAnchorId(snap.snappedToPointId ?? null);
        setPhase('segment_created');
        startChainTimer();
      }
    },
    [
      state,
      phase,
      firstPoint,
      dispatch,
      clearChainTimer,
      startChainTimer,
      tolerances,
      shiftConstraintActive,
    ],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      setCursorMm(mmPos);
      const excludeIds = firstPoint?.existingId ? [firstPoint.existingId] : [];
      const fromPt = firstPoint?.mm ?? undefined;
      const snap = findSnap(mmPos, state, tolerances, excludeIds, fromPt, shiftConstraintActive);
      setSnapResult(snap);

      if (phase === 'segment_created' && lastMoveMm.current) {
        const moved = distance(lastMoveMm.current, mmPos);
        if (moved > CHAIN_MOVEMENT_THRESHOLD_MM) {
          startChainTimer();
        }
      }
      lastMoveMm.current = mmPos;
    },
    [state, phase, firstPoint, startChainTimer, tolerances, shiftConstraintActive],
  );

  const handleEscape = useCallback(() => {
    if (phase !== 'idle') {
      reset();
    }
  }, [phase, reset]);

  // Resolve chaining anchor after dispatch
  useEffect(() => {
    if (phase === 'segment_created' && firstPoint && !firstPoint.existingId) {
      const match = state.points.find((p) => p.x === firstPoint.mm.x && p.y === firstPoint.mm.y);
      if (match) {
        setFirstPoint({ mm: firstPoint.mm, existingId: match.id });
        setChainingAnchorId(match.id);
      }
    }
  }, [phase, firstPoint, state.points]);

  useEffect(() => {
    return () => clearChainTimer();
  }, [clearChainTimer]);

  // Status message
  const chainingLabel = chainingAnchorId
    ? (state.points.find((p) => p.id === chainingAnchorId)?.label ?? '?')
    : '?';

  const statusMessage =
    hintMessage ??
    (phase === 'idle'
      ? STATUS_SEGMENT_IDLE
      : phase === 'first_point_placed'
        ? STATUS_SEGMENT_FIRST_PLACED
        : STATUS_SEGMENT_CHAINING(chainingLabel));

  // Overlay elements
  const chainingAnchor = chainingAnchorId
    ? state.points.find((p) => p.id === chainingAnchorId)
    : undefined;

  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    if (firstPoint?.mm && cursorMm) {
      const endMm = snapResult?.snappedPosition ?? cursorMm;
      // Derive guide segment label (e.g. "AB") from guideSegmentId
      let guideSegLabel: string | undefined;
      if (snapResult?.guideSegmentId) {
        const guideSeg = state.segments.find((s) => s.id === snapResult.guideSegmentId);
        if (guideSeg) {
          const startPt = state.points.find((p) => p.id === guideSeg.startPointId);
          const endPt = state.points.find((p) => p.id === guideSeg.endPointId);
          if (startPt && endPt) guideSegLabel = startPt.label + endPt.label;
        }
      }
      elements.push(
        createElement(GhostSegment, {
          key: 'ghost',
          startMm: firstPoint.mm,
          endMm,
          viewport,
          displayUnit: state.displayUnit,
          isChaining: phase === 'segment_created',
          guideType: snapResult?.guideType,
          guideSegmentLabel: guideSegLabel,
        }),
      );
    }

    if (chainingAnchor && phase === 'segment_created') {
      elements.push(
        createElement(ChainingIndicator, {
          key: 'chaining',
          point: chainingAnchor,
          viewport,
        }),
      );
    }

    return elements.length > 0 ? elements : null;
  }, [firstPoint, cursorMm, snapResult, viewport, state.displayUnit, phase, chainingAnchor]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'idle',
    statusMessage,
    snapResult,
    overlayElements,
  };
}
