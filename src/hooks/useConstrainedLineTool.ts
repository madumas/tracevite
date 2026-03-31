/**
 * Constrained line tool — shared hook for Perpendicular and Parallel tools.
 * State machine: idle → reference_selected → drawing
 *
 * The geometry callback determines the constraint direction:
 * - Perpendicular: 90° rotation of reference segment direction
 * - Parallel: same direction as reference segment
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import {
  perpendicularDirection,
  parallelDirection,
  projectOntoConstrainedLine,
  distance,
} from '@/engine/geometry';
import { MIN_POINT_DISTANCE_MM } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_GUIDE } from '@/config/theme';

type ConstrainedPhase = 'select_reference' | 'place_start' | 'place_end';

interface UseConstrainedLineToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
  toolType: 'perpendicular' | 'parallel';
}

export function useConstrainedLineTool({
  state,
  dispatch,
  viewport,
  isActive = true,
  toolType,
}: UseConstrainedLineToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<ConstrainedPhase>('select_reference');
  const [refSegId, setRefSegId] = useState<string | null>(null);
  const [direction, setDirection] = useState<{ dx: number; dy: number } | null>(null);
  const [startPoint, setStartPoint] = useState<{
    mm: { x: number; y: number };
    existingId?: string;
  } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const isPerpendicular = toolType === 'perpendicular';
  const toolLabel = isPerpendicular ? 'Perpendiculaire' : 'Parallèle';

  const reset = useCallback(() => {
    setPhase('select_reference');
    setRefSegId(null);
    setDirection(null);
    setStartPoint(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;

      if (phase === 'select_reference') {
        const segId = hitTestSegment(mmPos, state.segments, state.points);
        if (!segId) return;

        const seg = state.segments.find((s) => s.id === segId);
        if (!seg) return;

        const pointMap = new Map(state.points.map((p) => [p.id, p]));
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) return;

        const dir = isPerpendicular
          ? perpendicularDirection(start, end)
          : parallelDirection(start, end);

        setRefSegId(segId);
        setDirection(dir);
        setPhase('place_start');
      } else if (phase === 'place_start') {
        const snap = findSnap(mmPos, state, tolerances);
        setStartPoint({
          mm: snap.snappedPosition,
          existingId: snap.snappedToPointId,
        });
        setPhase('place_end');
      } else if (phase === 'place_end' && startPoint && direction) {
        // Project cursor onto constrained line, then snap to nearby points
        const projected = projectOntoConstrainedLine(mmPos, startPoint.mm, direction);
        const endSnap = findSnap(
          projected,
          state,
          tolerances,
          startPoint.existingId ? [startPoint.existingId] : [],
        );
        const finalEnd = endSnap.snappedToPointId ? endSnap.snappedPosition : projected;
        const segDist = distance(startPoint.mm, finalEnd);

        if (segDist < MIN_POINT_DISTANCE_MM) return;

        dispatch({
          type: 'CREATE_SEGMENT',
          start: {
            x: startPoint.mm.x,
            y: startPoint.mm.y,
            existingPointId: startPoint.existingId,
          },
          end: { x: finalEnd.x, y: finalEnd.y, existingPointId: endSnap.snappedToPointId },
        });

        reset();
      }
    },
    [isActive, phase, state, startPoint, direction, dispatch, reset, tolerances, isPerpendicular],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setCursorMm(mmPos);
      const snap = findSnap(mmPos, state, tolerances);
      setSnapResult(snap);
    },
    [isActive, state, tolerances],
  );

  const handleEscape = useCallback(() => {
    if (phase === 'place_end') {
      // Go back to placing start
      setStartPoint(null);
      setPhase('place_start');
    } else if (phase === 'place_start') {
      // Go back to reference selection
      reset();
    }
  }, [phase, reset]);

  // Status message
  let statusMessage: string;
  if (phase === 'select_reference') {
    statusMessage = `${toolLabel} — Clique sur un segment de référence`;
  } else if (phase === 'place_start') {
    statusMessage = `${toolLabel} — Clique pour placer le point de départ`;
  } else {
    statusMessage = `${toolLabel} — Clique pour placer le point d'arrivée`;
  }

  // Overlay: reference highlight + constrained ghost line
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    // Highlight reference segment
    if (refSegId) {
      const seg = state.segments.find((s) => s.id === refSegId);
      if (seg) {
        const pointMap = new Map(state.points.map((p) => [p.id, p]));
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (start && end) {
          elements.push(
            createElement('line', {
              key: 'ref-highlight',
              x1: (start.x - viewport.panX) * pxPerMm,
              y1: (start.y - viewport.panY) * pxPerMm,
              x2: (end.x - viewport.panX) * pxPerMm,
              y2: (end.y - viewport.panY) * pxPerMm,
              stroke: CANVAS_GUIDE,
              strokeWidth: 4,
              opacity: 0.4,
              pointerEvents: 'none',
            }),
          );
        }
      }
    }

    // Ghost constrained line
    if (phase === 'place_end' && startPoint && direction && cursorMm) {
      const projected = projectOntoConstrainedLine(cursorMm, startPoint.mm, direction);
      const sx1 = (startPoint.mm.x - viewport.panX) * pxPerMm;
      const sy1 = (startPoint.mm.y - viewport.panY) * pxPerMm;
      const sx2 = (projected.x - viewport.panX) * pxPerMm;
      const sy2 = (projected.y - viewport.panY) * pxPerMm;

      elements.push(
        createElement('line', {
          key: 'ghost-constrained',
          x1: sx1,
          y1: sy1,
          x2: sx2,
          y2: sy2,
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          strokeDasharray: '6 3',
          opacity: 0.6,
          pointerEvents: 'none',
        }),
      );
    }

    return elements.length > 0 ? elements : null;
  }, [refSegId, phase, startPoint, direction, cursorMm, state, viewport]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'select_reference',
    statusMessage,
    snapResult: phase !== 'select_reference' ? snapResult : null,
    overlayElements,
    isActiveGesture: phase === 'place_end' && !!cursorMm,
  };
}
