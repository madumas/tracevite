/**
 * Reproduce tool — spec §19 v2.
 * 3-phase state machine:
 *   1. Click a segment → auto-select connected figure (flood-fill) → highlight
 *   2. Click on canvas → set the target position → copy all elements with offset
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle, getHitTestTolerances } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { findConnectedElements } from '@/engine/reproduce';
import { detectAllFaces, classifyFigures } from '@/engine/figures';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_SELECTION_BG } from '@/config/theme';
import { useTransformAnimation } from './useTransformAnimation';
import { computeTranslationAnimData } from '@/engine/transform-animation';

type ReproducePhase = 'select_figure' | 'place_copy';

interface SelectedElements {
  pointIds: string[];
  segmentIds: string[];
  circleIds: string[];
  anchorMm: { x: number; y: number }; // Reference point for offset calculation
}

interface UseReproduceToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
  animateTransformations?: boolean;
}

export function useReproduceTool({
  state,
  dispatch,
  viewport,
  isActive = true,
  animateTransformations = false,
}: UseReproduceToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<ReproducePhase>('select_figure');
  const [selected, setSelected] = useState<SelectedElements | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

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
    setPhase('select_figure');
    setSelected(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;

      if (phase === 'select_figure') {
        const hitTol = getHitTestTolerances(state.toleranceProfile);
        // Hit-test: find a segment or circle to select its connected figure
        const segId = hitTestSegment(mmPos, state.segments, state.points, hitTol.segmentMm);
        const circleHitId = !segId
          ? hitTestCircle(mmPos, state.circles, state.points, hitTol.circleMm)
          : null;
        if (!segId && !circleHitId) return;

        let pointIds: string[];
        let segmentIds: string[];
        let circleIds: string[];

        if (circleHitId && !segId) {
          // Clicked on a circle — select the circle and its connected elements
          const circle = state.circles.find((c) => c.id === circleHitId);
          if (!circle) return;
          // Select the circle and its center point + connected segments
          const centerPoint = state.points.find((p) => p.id === circle.centerPointId);
          if (!centerPoint) return;
          pointIds = [circle.centerPointId];
          // Find segments connected to this center point
          segmentIds = state.segments
            .filter(
              (s) =>
                s.startPointId === circle.centerPointId || s.endPointId === circle.centerPointId,
            )
            .map((s) => s.id);
          // Add endpoint points of connected segments
          for (const sId of segmentIds) {
            const seg = state.segments.find((s) => s.id === sId);
            if (seg) {
              if (!pointIds.includes(seg.startPointId)) pointIds.push(seg.startPointId);
              if (!pointIds.includes(seg.endPointId)) pointIds.push(seg.endPointId);
            }
          }
          circleIds = [circleHitId];
          // Also include other circles whose center is in pointIds
          for (const c of state.circles) {
            if (c.id !== circleHitId && pointIds.includes(c.centerPointId)) {
              circleIds.push(c.id);
            }
          }
        } else {
          // Clicked on a segment — existing logic
          // Try to find a closed figure first
          const faces = detectAllFaces(state);
          const figures = classifyFigures(faces, state, state.displayMode);
          const figure = figures
            .filter((f) => f.segmentIds.includes(segId!))
            .sort((a, b) => a.pointIds.length - b.pointIds.length)[0];

          if (figure) {
            pointIds = [...figure.pointIds];
            segmentIds = [...figure.segmentIds];
          } else {
            // No closed figure — flood-fill connected subgraph
            const connected = findConnectedElements(segId!, state);
            pointIds = connected.pointIds;
            segmentIds = connected.segmentIds;
          }

          // Find circles whose center is in the selected points
          circleIds = state.circles
            .filter((c) => pointIds.includes(c.centerPointId))
            .map((c) => c.id);
        }

        // Compute centroid as anchor
        const pointMap = new Map(state.points.map((p) => [p.id, p]));
        const selectedPoints = pointIds.map((id) => pointMap.get(id)).filter(Boolean);
        if (selectedPoints.length === 0) return;
        const anchorX = selectedPoints.reduce((sum, p) => sum + p!.x, 0) / selectedPoints.length;
        const anchorY = selectedPoints.reduce((sum, p) => sum + p!.y, 0) / selectedPoints.length;

        setSelected({
          pointIds,
          segmentIds,
          circleIds,
          anchorMm: { x: anchorX, y: anchorY },
        });
        setPhase('place_copy');
      } else if (phase === 'place_copy' && selected) {
        const snap = findSnap(mmPos, state, tolerances);
        const target = snap.snappedPosition;

        const offsetX = target.x - selected.anchorMm.x;
        const offsetY = target.y - selected.anchorMm.y;

        const doDispatch = () => {
          dispatch({
            type: 'REPRODUCE_ELEMENTS',
            pointIds: selected.pointIds,
            segmentIds: selected.segmentIds,
            circleIds: selected.circleIds,
            offsetX,
            offsetY,
          });
          reset();
        };

        const animStarted = anim.startAnimation(
          computeTranslationAnimData(
            selected.pointIds,
            selected.segmentIds,
            state,
            offsetX,
            offsetY,
          ),
          doDispatch,
        );
        if (!animStarted) doDispatch();
      }
    },
    [isActive, phase, state, selected, dispatch, reset, tolerances, anim],
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
    if (phase !== 'select_figure') {
      reset();
    }
  }, [phase, reset]);

  // Status message
  let statusMessage: string;
  if (phase === 'select_figure') {
    statusMessage = 'Étape 1/2 — Reproduire — Clique sur un segment pour sélectionner la figure';
  } else {
    statusMessage = 'Étape 2/2 — Reproduire — Clique pour placer la copie';
  }

  // Overlay: highlight selected segments + ghost preview at cursor
  const overlayElements = useMemo(() => {
    if (!selected) return null;
    const elements: React.ReactNode[] = [];
    const pointMap = new Map(state.points.map((p) => [p.id, p]));
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    // Highlight selected segments
    for (const segId of selected.segmentIds) {
      const seg = state.segments.find((s) => s.id === segId);
      if (!seg) continue;
      const start = pointMap.get(seg.startPointId);
      const end = pointMap.get(seg.endPointId);
      if (!start || !end) continue;

      const sx1 = (start.x - viewport.panX) * pxPerMm;
      const sy1 = (start.y - viewport.panY) * pxPerMm;
      const sx2 = (end.x - viewport.panX) * pxPerMm;
      const sy2 = (end.y - viewport.panY) * pxPerMm;

      elements.push(
        createElement('line', {
          key: `sel-${segId}`,
          x1: sx1,
          y1: sy1,
          x2: sx2,
          y2: sy2,
          stroke: CANVAS_SELECTION_BG,
          strokeWidth: 6,
          strokeLinecap: 'round',
          opacity: 0.7,
          pointerEvents: 'none',
        }),
      );
    }

    // Highlight selected circles
    for (const circleId of selected.circleIds) {
      const circle = state.circles.find((c) => c.id === circleId);
      if (!circle) continue;
      const center = pointMap.get(circle.centerPointId);
      if (!center) continue;
      const cx = (center.x - viewport.panX) * pxPerMm;
      const cy = (center.y - viewport.panY) * pxPerMm;
      const cr = circle.radiusMm * pxPerMm;
      elements.push(
        createElement('circle', {
          key: `sel-circle-${circleId}`,
          cx,
          cy,
          r: cr,
          fill: 'none',
          stroke: CANVAS_SELECTION_BG,
          strokeWidth: 6,
          opacity: 0.7,
          pointerEvents: 'none',
        }),
      );
    }

    // Ghost preview at cursor position
    if (phase === 'place_copy' && cursorMm) {
      const snapped = snapResult?.snappedPosition ?? cursorMm;
      const offsetX = snapped.x - selected.anchorMm.x;
      const offsetY = snapped.y - selected.anchorMm.y;

      for (const segId of selected.segmentIds) {
        const seg = state.segments.find((s) => s.id === segId);
        if (!seg) continue;
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) continue;

        const sx1 = (start.x + offsetX - viewport.panX) * pxPerMm;
        const sy1 = (start.y + offsetY - viewport.panY) * pxPerMm;
        const sx2 = (end.x + offsetX - viewport.panX) * pxPerMm;
        const sy2 = (end.y + offsetY - viewport.panY) * pxPerMm;

        elements.push(
          createElement('line', {
            key: `ghost-${segId}`,
            x1: sx1,
            y1: sy1,
            x2: sx2,
            y2: sy2,
            stroke: '#8BD4D0',
            strokeWidth: 2,
            strokeLinecap: 'round',
            opacity: 0.6,
            strokeDasharray: '6 3',
            pointerEvents: 'none',
          }),
        );
      }

      // Ghost circles
      for (const circleId of selected.circleIds) {
        const circle = state.circles.find((c) => c.id === circleId);
        if (!circle) continue;
        const center = pointMap.get(circle.centerPointId);
        if (!center) continue;
        const cx = (center.x + offsetX - viewport.panX) * pxPerMm;
        const cy = (center.y + offsetY - viewport.panY) * pxPerMm;
        const cr = circle.radiusMm * pxPerMm;
        elements.push(
          createElement('circle', {
            key: `ghost-circle-${circleId}`,
            cx,
            cy,
            r: cr,
            fill: 'none',
            stroke: '#8BD4D0',
            strokeWidth: 2,
            opacity: 0.6,
            strokeDasharray: '6 3',
            pointerEvents: 'none',
          }),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [selected, phase, cursorMm, snapResult, state, viewport]);

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
    isIdle: phase === 'select_figure',
    statusMessage,
    snapResult: phase === 'place_copy' ? snapResult : null,
    overlayElements: mergedOverlay,
  };
}
