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
import {
  constrainAxisAngle,
  checkSymmetry,
  reflectPoint,
  type SymmetryResult,
} from '@/engine/reflection';
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
    setAnimSteps([]);
    setAnimIndex(-1);
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
            if (stepByStep) launchStepAnimation([...figure.pointIds], axisP1, axisP2);
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
              if (stepByStep)
                launchStepAnimation([seg.startPointId, seg.endPointId], axisP1, axisP2);
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
      symmetryCheckMode,
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
            stroke: '#0B7285',
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
            stroke: '#0B7285',
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
            fill: '#0B7285',
            opacity: 0.6,
            pointerEvents: 'none',
          }),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [
    axisP1,
    axisP2,
    phase,
    cursorMm,
    viewport,
    is2eCycle,
    symmetryResult,
    state.points,
    animSteps,
    animIndex,
  ]);

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
    stepByStep,
    onToggleStepByStep: () => setStepByStep((prev) => !prev),
  };
}
