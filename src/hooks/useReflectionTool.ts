/**
 * Reflection tool — spec §6.6.
 * State machine: CHOOSE_AXIS → AXIS_DRAWING → AXIS_DEFINED → (reflect, repeat or finish).
 */

import { useState, useCallback, useMemo, useEffect, useRef, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { constrainAxisAngle, reflectPoint } from '@/engine/reflection';
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
  const [stepByStep, setStepByStep] = useState(false);
  const [animSteps, setAnimSteps] = useState<
    {
      original: { x: number; y: number };
      foot: { x: number; y: number };
      image: { x: number; y: number };
      label: string;
    }[]
  >([]);
  const [animIndex, setAnimIndex] = useState(-1);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingReflect, setPendingReflect] = useState<ConstructionAction | null>(null);

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
    setAnimSteps([]);
    setAnimIndex(-1);
    setPendingReflect(null);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
  }, []);

  // Step-by-step animation timer — stops when tool is inactive
  useEffect(() => {
    if (!isActive || animIndex < 0 || animIndex >= animSteps.length) return;
    animTimerRef.current = setTimeout(() => {
      setAnimIndex((i) => i + 1);
    }, 500);
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [isActive, animIndex, animSteps.length]);

  // Dispatch deferred REFLECT_ELEMENTS once animation finishes
  useEffect(() => {
    if (pendingReflect && animSteps.length > 0 && animIndex >= animSteps.length) {
      dispatch(pendingReflect);
      setPendingReflect(null);
      setAnimSteps([]);
      setAnimIndex(-1);
    }
  }, [animIndex, animSteps.length, pendingReflect, dispatch]);

  /** Launch step-by-step animation for reflected points. */
  const launchStepAnimation = useCallback(
    (pointIds: string[], ax1: { x: number; y: number }, ax2: { x: number; y: number }) => {
      const pointMap = new Map(state.points.map((p) => [p.id, p]));
      const steps = pointIds
        .map((pid) => {
          const pt = pointMap.get(pid);
          if (!pt) return null;
          const reflected = reflectPoint(pt, ax1, ax2);
          // Foot = projection on axis
          const dx = ax2.x - ax1.x;
          const dy = ax2.y - ax1.y;
          const lenSq = dx * dx + dy * dy;
          const t = lenSq === 0 ? 0 : ((pt.x - ax1.x) * dx + (pt.y - ax1.y) * dy) / lenSq;
          const foot = { x: ax1.x + t * dx, y: ax1.y + t * dy };
          return { original: { x: pt.x, y: pt.y }, foot, image: reflected, label: pt.label };
        })
        .filter(Boolean) as typeof animSteps;
      setAnimSteps(steps);
      setAnimIndex(0);
    },
    [state.points],
  );

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
            if (stepByStep) {
              launchStepAnimation([...figure.pointIds], axisP1, axisP2);
              setPendingReflect(reflectAction);
            } else {
              dispatch(reflectAction);
            }
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
              if (stepByStep) {
                launchStepAnimation([seg.startPointId, seg.endPointId], axisP1, axisP2);
                setPendingReflect(reflectAction);
              } else {
                dispatch(reflectAction);
              }
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
            dispatch({
              type: 'REFLECT_ELEMENTS',
              pointIds: [circle.centerPointId],
              segmentIds: [],
              circleIds: [circleId],
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
      tolerances,
      stepByStep,
      launchStepAnimation,
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

    // Step-by-step animation: show dashed lines point → foot → image
    if (animSteps.length > 0 && animIndex >= 0) {
      const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
      for (let i = 0; i < Math.min(animIndex, animSteps.length); i++) {
        const step = animSteps[i]!;
        const ox = (step.original.x - viewport.panX) * pxPerMm;
        const oy = (step.original.y - viewport.panY) * pxPerMm;
        const fx = (step.foot.x - viewport.panX) * pxPerMm;
        const fy = (step.foot.y - viewport.panY) * pxPerMm;
        const ix = (step.image.x - viewport.panX) * pxPerMm;
        const iy = (step.image.y - viewport.panY) * pxPerMm;
        // Line from original to foot
        elements.push(
          createElement('line', {
            key: `step-of-${i}`,
            x1: ox,
            y1: oy,
            x2: fx,
            y2: fy,
            stroke: '#7A8B99',
            strokeWidth: 1,
            strokeDasharray: '4 3',
            opacity: 0.7,
            pointerEvents: 'none',
          }),
        );
        // Line from foot to image
        elements.push(
          createElement('line', {
            key: `step-fi-${i}`,
            x1: fx,
            y1: fy,
            x2: ix,
            y2: iy,
            stroke: '#7A8B99',
            strokeWidth: 1,
            strokeDasharray: '4 3',
            opacity: 0.7,
            pointerEvents: 'none',
          }),
        );
        // Image point marker
        elements.push(
          createElement('circle', {
            key: `step-img-${i}`,
            cx: ix,
            cy: iy,
            r: 5,
            fill: '#7A8B99',
            opacity: 0.6,
            pointerEvents: 'none',
          }),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [axisP1, axisP2, phase, cursorMm, viewport, is2eCycle, state.points, animSteps, animIndex]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: false,
    statusMessage,
    snapResult,
    overlayElements,
    stepByStep,
    onToggleStepByStep: () => setStepByStep((prev) => !prev),
  };
}
