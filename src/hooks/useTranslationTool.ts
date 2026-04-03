/**
 * Translation tool — spec §19 v2.
 * 3-phase state machine:
 *   1. Define translation vector (2 clicks: start → end of arrow)
 *   2. Click a segment to select connected figure
 *   3. Dispatch REPRODUCE_ELEMENTS with offset = vector
 *
 * Visible only in mode complet (3e cycle).
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES, MIN_POINT_DISTANCE_MM } from '@/config/accessibility';
import { findConnectedElements } from '@/engine/reproduce';
import { detectAllFaces, classifyFigures } from '@/engine/figures';
import { distance } from '@/engine/geometry';
import { formatLength } from '@/engine/format';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_GUIDE } from '@/config/theme';
import { useTransformAnimation } from './useTransformAnimation';
import { computeTranslationAnimData } from '@/engine/transform-animation';

type TranslationPhase = 'vector_start' | 'vector_end' | 'select_figure';

interface UseTranslationToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
  animateTransformations?: boolean;
}

export function useTranslationTool({
  state,
  dispatch,
  viewport,
  isActive = true,
  animateTransformations = false,
}: UseTranslationToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<TranslationPhase>('vector_start');
  const [vectorStart, setVectorStart] = useState<{ x: number; y: number } | null>(null);
  const [vectorEnd, setVectorEnd] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const anim = useTransformAnimation({
    viewport,
    animate: animateTransformations,
    points: state.points,
    segments: state.segments,
  });

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('vector_start');
    setVectorStart(null);
    setVectorEnd(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      const snapped = snap.snappedPosition;

      if (phase === 'vector_start') {
        setVectorStart(snapped);
        setPhase('vector_end');
      } else if (phase === 'vector_end') {
        if (vectorStart && distance(vectorStart, snapped) < MIN_POINT_DISTANCE_MM) return;
        setVectorEnd(snapped);
        setPhase('select_figure');
      } else if (phase === 'select_figure' && vectorStart && vectorEnd) {
        const segId = hitTestSegment(mmPos, state.segments, state.points);
        const circleHitId = !segId ? hitTestCircle(mmPos, state.circles, state.points) : null;
        if (!segId && !circleHitId) return;

        let pointIds: string[];
        let segmentIds: string[];
        let circleIds: string[];

        if (circleHitId && !segId) {
          const circle = state.circles.find((c) => c.id === circleHitId);
          if (!circle) return;
          pointIds = [circle.centerPointId];
          segmentIds = state.segments
            .filter(
              (s) =>
                s.startPointId === circle.centerPointId || s.endPointId === circle.centerPointId,
            )
            .map((s) => s.id);
          for (const sId of segmentIds) {
            const seg = state.segments.find((s) => s.id === sId);
            if (seg) {
              if (!pointIds.includes(seg.startPointId)) pointIds.push(seg.startPointId);
              if (!pointIds.includes(seg.endPointId)) pointIds.push(seg.endPointId);
            }
          }
          circleIds = [circleHitId];
          for (const c of state.circles) {
            if (c.id !== circleHitId && pointIds.includes(c.centerPointId)) circleIds.push(c.id);
          }
        } else {
          const faces = detectAllFaces(state);
          const figures = classifyFigures(faces, state, state.displayMode);
          const figure = figures
            .filter((f) => f.segmentIds.includes(segId!))
            .sort((a, b) => a.pointIds.length - b.pointIds.length)[0];

          if (figure) {
            pointIds = [...figure.pointIds];
            segmentIds = [...figure.segmentIds];
          } else {
            const connected = findConnectedElements(segId!, state);
            pointIds = connected.pointIds;
            segmentIds = connected.segmentIds;
          }

          circleIds = state.circles
            .filter((c) => pointIds.includes(c.centerPointId))
            .map((c) => c.id);
        }

        const offsetX = vectorEnd.x - vectorStart.x;
        const offsetY = vectorEnd.y - vectorStart.y;

        const doDispatch = () =>
          dispatch({
            type: 'REPRODUCE_ELEMENTS',
            pointIds,
            segmentIds,
            circleIds,
            offsetX,
            offsetY,
          });

        const animStarted = anim.startAnimation(
          computeTranslationAnimData(pointIds, segmentIds, state, offsetX, offsetY),
          doDispatch,
        );
        if (!animStarted) doDispatch();

        // Stay in select_figure to allow translating more elements with same vector
      }
    },
    [isActive, phase, state, vectorStart, vectorEnd, dispatch, tolerances],
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
    if (phase === 'select_figure') {
      setVectorEnd(null);
      setPhase('vector_end');
    } else if (phase === 'vector_end') {
      setVectorStart(null);
      setPhase('vector_start');
    }
  }, [phase]);

  // Status message
  let statusMessage: string;
  if (phase === 'vector_start') {
    statusMessage = 'Étape 1/3 — Translation — Clique pour placer le début de la flèche';
  } else if (phase === 'vector_end') {
    statusMessage = 'Étape 2/3 — Translation — Clique pour placer la fin de la flèche';
  } else {
    statusMessage = 'Étape 3/3 — Translation — Clique sur un segment pour translater la figure.';
  }

  // Overlay: translation arrow + preview
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    // Arrow marker definition — needed for both preview and defined phases
    if (vectorStart) {
      elements.push(
        createElement(
          'defs',
          { key: 'arrow-defs' },
          createElement(
            'marker',
            {
              id: 'translation-arrow',
              markerWidth: 10,
              markerHeight: 7,
              refX: 10,
              refY: 3.5,
              orient: 'auto',
            },
            createElement('polygon', {
              points: '0 0, 10 3.5, 0 7',
              fill: CANVAS_GUIDE,
            }),
          ),
        ),
      );
    }

    // Arrow preview while defining vector
    if (vectorStart && phase === 'vector_end' && cursorMm) {
      const endPos = snapResult?.snappedPosition ?? cursorMm;
      const sx1 = (vectorStart.x - viewport.panX) * pxPerMm;
      const sy1 = (vectorStart.y - viewport.panY) * pxPerMm;
      const sx2 = (endPos.x - viewport.panX) * pxPerMm;
      const sy2 = (endPos.y - viewport.panY) * pxPerMm;

      const vecLen = distance(vectorStart, endPos);
      elements.push(
        createElement('line', {
          key: 'arrow-preview',
          x1: sx1,
          y1: sy1,
          x2: sx2,
          y2: sy2,
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          strokeDasharray: '6 3',
          opacity: 0.6,
          markerEnd: 'url(#translation-arrow)',
          pointerEvents: 'none',
        }),
      );
      if (vecLen > 2) {
        elements.push(
          createElement(
            'text',
            {
              key: 'arrow-preview-label',
              x: (sx1 + sx2) / 2,
              y: (sy1 + sy2) / 2 - 8,
              fill: CANVAS_GUIDE,
              fontSize: 12,
              textAnchor: 'middle',
              paintOrder: 'stroke',
              stroke: 'white',
              strokeWidth: 3,
              pointerEvents: 'none',
            },
            formatLength(vecLen, state.displayUnit),
          ),
        );
      }
    }

    // Defined arrow
    if (vectorStart && vectorEnd && phase === 'select_figure') {
      const sx1 = (vectorStart.x - viewport.panX) * pxPerMm;
      const sy1 = (vectorStart.y - viewport.panY) * pxPerMm;
      const sx2 = (vectorEnd.x - viewport.panX) * pxPerMm;
      const sy2 = (vectorEnd.y - viewport.panY) * pxPerMm;

      const defLen = distance(vectorStart, vectorEnd);
      elements.push(
        createElement('line', {
          key: 'arrow-defined',
          x1: sx1,
          y1: sy1,
          x2: sx2,
          y2: sy2,
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          markerEnd: 'url(#translation-arrow)',
          pointerEvents: 'none',
        }),
      );
      if (defLen > 2) {
        elements.push(
          createElement(
            'text',
            {
              key: 'arrow-defined-label',
              x: (sx1 + sx2) / 2,
              y: (sy1 + sy2) / 2 - 8,
              fill: CANVAS_GUIDE,
              fontSize: 12,
              textAnchor: 'middle',
              paintOrder: 'stroke',
              stroke: 'white',
              strokeWidth: 3,
              pointerEvents: 'none',
            },
            formatLength(defLen, state.displayUnit),
          ),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [vectorStart, vectorEnd, phase, cursorMm, snapResult, viewport]);

  // Merge animation overlay
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
    isIdle: phase === 'vector_start',
    statusMessage,
    snapResult,
    overlayElements: mergedOverlay,
  };
}
