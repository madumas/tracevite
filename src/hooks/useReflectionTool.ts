/**
 * Reflection tool — spec §6.6.
 * State machine: CHOOSE_AXIS → AXIS_DRAWING → AXIS_DEFINED → (reflect, repeat or finish).
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { constrainAxisAngle, checkSymmetry, type SymmetryResult } from '@/engine/reflection';
import { detectAllFaces, classifyFigures } from '@/engine/figures';
import { STATUS_REFLECTION_AXIS, STATUS_REFLECTION_SELECT } from '@/config/messages';
import { CSS_PX_PER_MM } from '@/engine/viewport';

type ReflectionPhase = 'choose_axis' | 'axis_first_point' | 'axis_defined';

interface UseReflectionToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useReflectionTool({
  state,
  dispatch,
  viewport,
  isActive = true,
}: UseReflectionToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<ReflectionPhase>('choose_axis');
  const [axisP1, setAxisP1] = useState<{ x: number; y: number } | null>(null);
  const [axisP2, setAxisP2] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [lastReflectionMsg, setLastReflectionMsg] = useState<string | null>(null);
  const [symmetryCheckMode, setSymmetryCheckMode] = useState(false);
  const [symmetryResult, setSymmetryResult] = useState<SymmetryResult | null>(null);

  const is2eCycle = state.displayMode === 'simplifie';

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('choose_axis');
    setAxisP1(null);
    setAxisP2(null);
    setCursorMm(null);
    setSnapResult(null);
    setLastReflectionMsg(null);
    setSymmetryResult(null);
  }, []);

  /** Find the smallest figure containing a given segment. */
  const findFigureForSegment = useCallback(
    (segmentId: string) => {
      const faces = detectAllFaces(state);
      const figures = classifyFigures(faces, state, state.displayMode);
      // Find figures containing this segment, pick smallest (fewest sides)
      const matching = figures.filter((f) => f.segmentIds.includes(segmentId));
      if (matching.length === 0) return null;
      matching.sort((a, b) => a.pointIds.length - b.pointIds.length);
      return matching[0]!;
    },
    [state],
  );

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      const snapped = snap.snappedPosition;

      if (phase === 'choose_axis') {
        // Check if click is on a segment body → use as axis
        const segId = hitTestSegment(mmPos, state.segments, state.points);
        if (segId) {
          const seg = state.segments.find((s) => s.id === segId);
          if (seg) {
            const pointMap = new Map(state.points.map((p) => [p.id, p]));
            const start = pointMap.get(seg.startPointId);
            const end = pointMap.get(seg.endPointId);
            if (start && end) {
              const p1 = { x: start.x, y: start.y };
              const p2 = is2eCycle
                ? constrainAxisAngle(p1, { x: end.x, y: end.y })
                : { x: end.x, y: end.y };
              setAxisP1(p1);
              setAxisP2(p2);
              setPhase('axis_defined');
              return;
            }
          }
        }

        // Otherwise, start drawing a new axis from this point
        setAxisP1(snapped);
        setPhase('axis_first_point');
      } else if (phase === 'axis_first_point') {
        if (!axisP1) return;
        let p2 = snapped;
        if (is2eCycle) {
          p2 = constrainAxisAngle(axisP1, p2);
        }
        setAxisP2(p2);
        setPhase('axis_defined');
      } else if (phase === 'axis_defined') {
        if (!axisP1 || !axisP2) return;

        // Hit-test: segment > circle. Points are not reflectable on their own.
        const segId = hitTestSegment(mmPos, state.segments, state.points);
        if (segId) {
          const figure = findFigureForSegment(segId);

          // Symmetry check mode: verify instead of reflect
          if (symmetryCheckMode) {
            const pointIds = figure
              ? figure.pointIds
              : (() => {
                  const seg = state.segments.find((s) => s.id === segId);
                  return seg ? [seg.startPointId, seg.endPointId] : [];
                })();
            if (pointIds.length > 0) {
              const result = checkSymmetry(pointIds, state, axisP1, axisP2);
              setSymmetryResult(result);
              const name = figure?.name ?? 'Figure';
              setLastReflectionMsg(
                result.isSymmetric
                  ? `${name} est symétrique par rapport à cet axe.`
                  : `${name} n'est pas symétrique (écart max : ${result.maxDeviationMm.toFixed(1)} mm).`,
              );
            }
            return;
          }

          if (figure) {
            // Reflect the entire figure
            dispatch({
              type: 'REFLECT_ELEMENTS',
              pointIds: [...figure.pointIds],
              segmentIds: [...figure.segmentIds],
              axisP1,
              axisP2,
            });
            setLastReflectionMsg(`${figure.name} réfléchi.`);
          } else {
            // Reflect the single segment
            const seg = state.segments.find((s) => s.id === segId);
            if (seg) {
              dispatch({
                type: 'REFLECT_ELEMENTS',
                pointIds: [seg.startPointId, seg.endPointId],
                segmentIds: [segId],
                axisP1,
                axisP2,
              });
              const pointMap = new Map(state.points.map((p) => [p.id, p]));
              const startLabel = pointMap.get(seg.startPointId)?.label ?? '?';
              const endLabel = pointMap.get(seg.endPointId)?.label ?? '?';
              setLastReflectionMsg(`Segment ${startLabel}${endLabel} réfléchi.`);
            }
          }
          // Stay in axis_defined so user can reflect more elements
          return;
        }

        const circleId = hitTestCircle(mmPos, state.circles, state.points);
        if (circleId) {
          const circle = state.circles.find((c) => c.id === circleId);
          if (circle) {
            if (symmetryCheckMode) {
              // Can't verify symmetry for a single circle meaningfully
              setLastReflectionMsg('Clique sur une figure pour vérifier la symétrie.');
              return;
            }
            dispatch({
              type: 'REFLECT_ELEMENTS',
              pointIds: [circle.centerPointId],
              segmentIds: [],
              axisP1,
              axisP2,
            });
            setLastReflectionMsg('Cercle réfléchi.');
          }
          return;
        }

        // Click on empty space → clear axis, return to choose
        reset();
      }
    },
    [
      isActive,
      state,
      phase,
      axisP1,
      axisP2,
      is2eCycle,
      dispatch,
      findFigureForSegment,
      reset,
      symmetryCheckMode,
      tolerances,
    ],
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
    if (phase === 'axis_defined') {
      // Clear axis, back to choose
      setAxisP1(null);
      setAxisP2(null);
      setLastReflectionMsg(null);
      setPhase('choose_axis');
    } else if (phase === 'axis_first_point') {
      setAxisP1(null);
      setPhase('choose_axis');
    }
  }, [phase]);

  const toggleSymmetryCheck = useCallback(() => {
    setSymmetryCheckMode((prev) => !prev);
    setSymmetryResult(null);
    setLastReflectionMsg(null);
  }, []);

  // Status message
  const modeLabel = symmetryCheckMode ? 'Vérification' : 'Réflexion';
  let statusMessage: string;
  if (phase === 'choose_axis') {
    statusMessage = symmetryCheckMode
      ? 'Vérification — Clique un segment ou trace un axe pour vérifier la symétrie'
      : STATUS_REFLECTION_AXIS;
  } else if (phase === 'axis_first_point') {
    statusMessage = `${modeLabel} — Clique pour placer le deuxième point de l'axe`;
  } else {
    statusMessage = lastReflectionMsg
      ? `${modeLabel} — ${lastReflectionMsg} Clique sur un autre élément ou appuie Échap pour terminer.`
      : symmetryCheckMode
        ? 'Vérification — Clique sur une figure pour vérifier si elle est symétrique par rapport à cet axe.'
        : STATUS_REFLECTION_SELECT;
  }

  // Overlay: axis line (dashed red)
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    // Defined axis
    if (axisP1 && axisP2 && phase === 'axis_defined') {
      // Extend axis visually beyond the two points
      const dx = axisP2.x - axisP1.x;
      const dy = axisP2.y - axisP1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const extend = 2000; // mm — extend far enough to cross the canvas
        const ux = dx / len;
        const uy = dy / len;
        const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
        const x1 = (axisP1.x - ux * extend - viewport.panX) * pxPerMm;
        const y1 = (axisP1.y - uy * extend - viewport.panY) * pxPerMm;
        const x2 = (axisP2.x + ux * extend - viewport.panX) * pxPerMm;
        const y2 = (axisP2.y + uy * extend - viewport.panY) * pxPerMm;
        elements.push(
          createElement('line', {
            key: 'axis',
            x1,
            y1,
            x2,
            y2,
            stroke: '#C82828',
            strokeWidth: 1.5,
            strokeDasharray: '8 4',
            pointerEvents: 'none',
          }),
        );
      }
    }

    // Drawing axis preview (first point placed, cursor shows second)
    if (axisP1 && !axisP2 && phase === 'axis_first_point' && cursorMm) {
      let previewP2 = cursorMm;
      if (is2eCycle) {
        previewP2 = constrainAxisAngle(axisP1, previewP2);
      }
      const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
      const x1 = (axisP1.x - viewport.panX) * pxPerMm;
      const y1 = (axisP1.y - viewport.panY) * pxPerMm;
      const x2 = (previewP2.x - viewport.panX) * pxPerMm;
      const y2 = (previewP2.y - viewport.panY) * pxPerMm;
      elements.push(
        createElement('line', {
          key: 'axis-preview',
          x1,
          y1,
          x2,
          y2,
          stroke: '#C82828',
          strokeWidth: 1.5,
          strokeDasharray: '8 4',
          opacity: 0.5,
          pointerEvents: 'none',
        }),
      );
    }

    // Symmetry check result feedback: green/red circles at correspondence points
    if (symmetryResult && phase === 'axis_defined') {
      const pointMap = new Map(state.points.map((p) => [p.id, p]));
      const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
      for (const corr of symmetryResult.correspondences) {
        const point = pointMap.get(corr.originalId);
        if (!point) continue;
        const sx = (point.x - viewport.panX) * pxPerMm;
        const sy = (point.y - viewport.panY) * pxPerMm;
        const color = corr.deviationMm <= 1 ? '#22C55E' : '#EF4444';
        elements.push(
          createElement('circle', {
            key: `sym-${corr.originalId}`,
            cx: sx,
            cy: sy,
            r: 8,
            fill: color,
            opacity: 0.4,
            pointerEvents: 'none',
          }),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [axisP1, axisP2, phase, cursorMm, viewport, is2eCycle, symmetryResult, state.points]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: false,
    statusMessage,
    snapResult,
    overlayElements,
    symmetryCheckMode,
    onToggleSymmetryCheck: toggleSymmetryCheck,
  };
}
