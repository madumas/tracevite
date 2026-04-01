/**
 * Symmetry verification tool — read-only.
 * Two entry modes:
 *   1. Click on an existing segment → use it as axis
 *   2. Click on empty space → define axis with 2 clicks
 * Then shows green/red circles on all vertices.
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle } from '@/engine/hit-test';
import { findConnectedElements } from '@/engine/reproduce';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { checkSymmetry, type SymmetryResult } from '@/engine/reflection';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_GUIDE } from '@/config/theme';

type SymmetryPhase = 'choose_axis' | 'axis_second_point' | 'select_figure' | 'showing_result';

interface UseSymmetryToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useSymmetryTool({
  state,
  dispatch: _dispatch,
  viewport,
  isActive = true,
}: UseSymmetryToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<SymmetryPhase>('choose_axis');
  const [axisP1, setAxisP1] = useState<{ x: number; y: number } | null>(null);
  const [axisP2, setAxisP2] = useState<{ x: number; y: number } | null>(null);
  const [result, setResult] = useState<SymmetryResult | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('choose_axis');
    setAxisP1(null);
    setAxisP2(null);
    setResult(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const runCheck = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }, figurePointIds?: string[]) => {
      const pointIds = figurePointIds ?? state.points.map((p) => p.id);
      if (pointIds.length === 0) return;
      const res = checkSymmetry(pointIds, state, p1, p2);
      setAxisP1(p1);
      setAxisP2(p2);
      setResult(res);
      setPhase('showing_result');
    },
    [state],
  );

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;

      if (phase === 'showing_result') {
        reset();
        return;
      }

      if (phase === 'choose_axis') {
        // Check if clicking near an existing point → prefer manual axis (2 clicks)
        const snap = findSnap(mmPos, state, tolerances);
        const clickedOnPoint = snap.snapType === 'point';

        if (!clickedOnPoint) {
          // Try to hit an existing segment → use as axis
          const segId = hitTestSegment(mmPos, state.segments, state.points);
          if (segId) {
            const seg = state.segments.find((s) => s.id === segId);
            if (seg) {
              const sp = state.points.find((p) => p.id === seg.startPointId);
              const ep = state.points.find((p) => p.id === seg.endPointId);
              if (sp && ep) {
                setAxisP1(sp);
                setAxisP2(ep);
                setPhase('select_figure');
                return;
              }
            }
          }
        }
        // Manual axis: use snapped position as first point
        setAxisP1(snap.snappedPosition);
        setPhase('axis_second_point');
      } else if (phase === 'axis_second_point' && axisP1) {
        const snap = findSnap(mmPos, state, tolerances);
        const p2 = snap.snappedPosition;
        setAxisP2(p2);
        setPhase('select_figure');
      } else if (phase === 'select_figure' && axisP1 && axisP2) {
        // Click on a segment or circle to select the figure to verify
        const segId = hitTestSegment(mmPos, state.segments, state.points);
        const circleHitId = !segId ? hitTestCircle(mmPos, state.circles, state.points) : null;

        if (segId || circleHitId) {
          // Find connected figure
          let pointIds: string[];
          if (segId) {
            const connected = findConnectedElements(segId, state);
            pointIds = connected.pointIds;
          } else {
            const circle = state.circles.find((c) => c.id === circleHitId);
            pointIds = circle ? [circle.centerPointId] : [];
            // Add points connected via segments to the center
            const centerSegs = state.segments.filter(
              (s) =>
                s.startPointId === circle?.centerPointId || s.endPointId === circle?.centerPointId,
            );
            for (const seg of centerSegs) {
              if (!pointIds.includes(seg.startPointId)) pointIds.push(seg.startPointId);
              if (!pointIds.includes(seg.endPointId)) pointIds.push(seg.endPointId);
            }
          }
          runCheck(axisP1, axisP2, pointIds);
        } else {
          // Clicked on empty space → check ALL points (legacy behavior)
          runCheck(axisP1, axisP2);
        }
      }
    },
    [isActive, phase, state, axisP1, tolerances, runCheck, reset],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setCursorMm(mmPos);
      if (phase === 'choose_axis' || phase === 'axis_second_point') {
        const snap = findSnap(mmPos, state, tolerances);
        setSnapResult(snap);
      } else {
        setSnapResult(null);
      }
    },
    [isActive, phase, state, tolerances],
  );

  const handleEscape = useCallback(() => {
    if (phase === 'showing_result') {
      reset();
    } else if (phase === 'select_figure') {
      setAxisP1(null);
      setAxisP2(null);
      setPhase('choose_axis');
    } else if (phase === 'axis_second_point') {
      setAxisP1(null);
      setPhase('choose_axis');
    }
  }, [phase, reset]);

  // Status message
  let statusMessage: string;
  if (phase === 'choose_axis') {
    statusMessage =
      'Symétrie — Clique sur un segment (axe) ou clique deux points pour tracer l\u2019axe';
  } else if (phase === 'axis_second_point') {
    statusMessage = 'Symétrie — Clique pour placer le deuxième point de l\u2019axe';
  } else if (phase === 'select_figure') {
    statusMessage = 'Symétrie — Clique sur la figure à vérifier';
  } else if (result?.isSymmetric) {
    statusMessage = 'Symétrie — La figure est symétrique par rapport à cet axe!';
  } else {
    statusMessage =
      'Symétrie — La figure n\u2019est pas symétrique par rapport à cet axe. Clique pour recommencer.';
  }

  // Overlay
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
    const toSx = (x: number) => (x - viewport.panX) * pxPerMm;
    const toSy = (y: number) => (y - viewport.panY) * pxPerMm;

    // Axis preview while drawing (second point follows cursor)
    if (phase === 'axis_second_point' && axisP1 && cursorMm) {
      const snapped = snapResult?.snappedPosition ?? cursorMm;
      elements.push(
        createElement('line', {
          key: 'axis-preview',
          x1: toSx(axisP1.x),
          y1: toSy(axisP1.y),
          x2: toSx(snapped.x),
          y2: toSy(snapped.y),
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          strokeDasharray: '6 3',
          opacity: 0.7,
          pointerEvents: 'none',
        }),
      );
    }

    // Defined axis (solid) — visible during figure selection AND result
    if ((phase === 'select_figure' || phase === 'showing_result') && axisP1 && axisP2) {
      elements.push(
        createElement('line', {
          key: 'axis',
          x1: toSx(axisP1.x),
          y1: toSy(axisP1.y),
          x2: toSx(axisP2.x),
          y2: toSy(axisP2.y),
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          strokeDasharray: '8 4',
          opacity: 0.9,
          pointerEvents: 'none',
        }),
      );
    }

    // Green/red circles on vertices
    if (phase === 'showing_result' && result) {
      for (const corr of result.correspondences) {
        const pt = state.points.find((p) => p.id === corr.originalId);
        if (!pt) continue;
        const isMatch = corr.deviationMm <= 1.0;
        elements.push(
          createElement('circle', {
            key: `sym-${corr.originalId}`,
            cx: toSx(pt.x),
            cy: toSy(pt.y),
            r: 8,
            fill: isMatch ? '#22C55E' : '#EF4444',
            opacity: 0.4,
            pointerEvents: 'none',
          }),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [phase, axisP1, axisP2, cursorMm, snapResult, result, state.points, viewport]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'choose_axis',
    statusMessage,
    snapResult: phase !== 'showing_result' ? snapResult : null,
    overlayElements,
  };
}
