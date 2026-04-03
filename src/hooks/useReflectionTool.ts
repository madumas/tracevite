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
import { constrainAxisAngle } from '@/engine/reflection';
import { detectAllFaces, classifyFigures } from '@/engine/figures';
import { STATUS_REFLECTION_AXIS, STATUS_REFLECTION_SELECT } from '@/config/messages';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { useTransformAnimation } from './useTransformAnimation';
import { computeReflectionAnimData } from '@/engine/transform-animation';

type ReflectionPhase = 'choose_axis' | 'axis_first_point' | 'axis_defined';

interface UseReflectionToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
  animateTransformations?: boolean;
}

export function useReflectionTool({
  state,
  dispatch,
  viewport,
  isActive = true,
  animateTransformations = false,
}: UseReflectionToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<ReflectionPhase>('choose_axis');
  const [axisP1, setAxisP1] = useState<{ x: number; y: number } | null>(null);
  const [axisP2, setAxisP2] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [lastReflectionMsg, setLastReflectionMsg] = useState<string | null>(null);

  const is2eCycle = state.displayMode === 'simplifie';

  const anim = useTransformAnimation({
    viewport,
    animate: animateTransformations,
    points: state.points,
    segments: state.segments,
    circles: state.circles,
  });

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
    anim.cancelAnimation();
  }, [anim]);

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

          if (figure) {
            // Reflect the entire figure
            const reflectAction: ConstructionAction = {
              type: 'REFLECT_ELEMENTS',
              pointIds: [...figure.pointIds],
              segmentIds: [...figure.segmentIds],
              axisP1,
              axisP2,
            };
            const doDispatch = () => dispatch(reflectAction);
            const animStarted = anim.startAnimation(
              computeReflectionAnimData(
                [...figure.pointIds],
                [...figure.segmentIds],
                state,
                axisP1,
                axisP2,
              ),
              doDispatch,
            );
            if (!animStarted) doDispatch();
            setLastReflectionMsg(`${figure.name} réfléchi.`);
          } else {
            // Reflect the single segment
            const seg = state.segments.find((s) => s.id === segId);
            if (seg) {
              const reflectAction: ConstructionAction = {
                type: 'REFLECT_ELEMENTS',
                pointIds: [seg.startPointId, seg.endPointId],
                segmentIds: [segId],
                axisP1,
                axisP2,
              };
              const doDispatch2 = () => dispatch(reflectAction);
              const animStarted2 = anim.startAnimation(
                computeReflectionAnimData(
                  [seg.startPointId, seg.endPointId],
                  [segId],
                  state,
                  axisP1,
                  axisP2,
                ),
                doDispatch2,
              );
              if (!animStarted2) doDispatch2();
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
        if (circleId && !anim.isAnimating) {
          const circle = state.circles.find((c) => c.id === circleId);
          if (circle) {
            const reflectCircleAction: ConstructionAction = {
              type: 'REFLECT_ELEMENTS',
              pointIds: [circle.centerPointId],
              segmentIds: [],
              circleIds: [circleId],
              axisP1,
              axisP2,
            };
            const doDispatchCircle = () => dispatch(reflectCircleAction);
            const animStartedCircle = anim.startAnimation(
              computeReflectionAnimData([circle.centerPointId], [], state, axisP1, axisP2),
              doDispatchCircle,
            );
            if (!animStartedCircle) doDispatchCircle();
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
      tolerances,
      anim,
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

  // Status message
  let statusMessage: string;
  if (phase === 'choose_axis') {
    statusMessage = `Étape 1/2 — ${STATUS_REFLECTION_AXIS}`;
  } else if (phase === 'axis_first_point') {
    statusMessage = "Étape 1/2 — Réflexion — Clique pour placer le deuxième point de l'axe";
  } else {
    statusMessage = lastReflectionMsg
      ? `Étape 2/2 — Réflexion — ${lastReflectionMsg} Clique sur un autre élément.`
      : `Étape 2/2 — ${STATUS_REFLECTION_SELECT}`;
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

    return elements.length > 0 ? elements : null;
  }, [axisP1, axisP2, phase, cursorMm, viewport, is2eCycle]);

  const mergedOverlay = useMemo(() => {
    const base = overlayElements
      ? Array.isArray(overlayElements)
        ? overlayElements
        : [overlayElements]
      : [];
    const animElems = anim.animationOverlay
      ? Array.isArray(anim.animationOverlay)
        ? anim.animationOverlay
        : [anim.animationOverlay]
      : [];
    const all = [...base, ...animElems];
    return all.length > 0 ? all : null;
  }, [overlayElements, anim.animationOverlay]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: false,
    statusMessage,
    snapResult,
    overlayElements: mergedOverlay,
  };
}
