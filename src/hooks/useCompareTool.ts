/**
 * Compare tool — isometric figure comparison by superposition (spec v2).
 * Read-only: selects two closed figures and overlays them via translation.
 * Visual feedback: green circles (match) / red circles (mismatch).
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle } from '@/engine/hit-test';
import { detectAllFaces, classifyFigures, type Figure } from '@/engine/figures';
import type { Circle } from '@/model/types';
import { compareFiguresByTranslation, type ComparisonResult } from '@/engine/comparison';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_SELECTION_BG } from '@/config/theme';

type ComparePhase = 'select_first' | 'select_second' | 'showing_result';

interface UseCompareToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useCompareTool({
  state,
  dispatch: _dispatch,
  viewport,
  isActive = true,
}: UseCompareToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<ComparePhase>('select_first');
  const [figureA, setFigureA] = useState<Figure | null>(null);
  const [figureB, setFigureB] = useState<Figure | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const reset = useCallback(() => {
    setPhase('select_first');
    setFigureA(null);
    setFigureB(null);
    setComparisonResult(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;

      if (phase === 'showing_result') {
        reset();
        return;
      }

      let figure: Figure | undefined;

      // Hit-test circle first (single center point → guaranteed mismatch vs polygons)
      const circleId = hitTestCircle(mmPos, state.circles, state.points);
      if (circleId) {
        const circle = state.circles.find((c) => c.id === circleId) as Circle;
        figure = {
          id: `circle-${circle.id}`,
          pointIds: [circle.centerPointId],
          segmentIds: [],
          name: 'Cercle',
          selfIntersecting: false,
          convex: true,
        };
      }

      if (!figure) {
        // Hit-test segment
        const segId = hitTestSegment(mmPos, state.segments, state.points);
        if (!segId) return;

        // Find closed figure containing this segment
        const faces = detectAllFaces(state);
        const figures = classifyFigures(faces, state, state.displayMode);
        figure = figures
          .filter((f) => f.segmentIds.includes(segId))
          .sort((a, b) => a.pointIds.length - b.pointIds.length)[0];

        // Standalone segment → pseudo-figure with 2 endpoints
        if (!figure) {
          const seg = state.segments.find((s) => s.id === segId)!;
          figure = {
            id: `segment-${segId}`,
            pointIds: [seg.startPointId, seg.endPointId],
            segmentIds: [segId],
            name: 'Segment',
            selfIntersecting: false,
            convex: true,
          };
        }
      }

      if (phase === 'select_first') {
        setFigureA(figure);
        setPhase('select_second');
      } else if (phase === 'select_second' && figureA) {
        // Reject if same figure or shared points
        const sharedPoints = figure.pointIds.filter((id) => figureA.pointIds.includes(id));
        if (sharedPoints.length > 0) {
          return;
        }

        setFigureB(figure);

        // Run comparison
        const result = compareFiguresByTranslation(figureA.pointIds, figure.pointIds, state.points);
        setComparisonResult(result);
        setPhase('showing_result');
      }
    },
    [isActive, phase, state, figureA, reset],
  );

  const handleCursorMove = useCallback(
    (_mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setSnapResult(null);
    },
    [isActive],
  );

  const handleEscape = useCallback(() => {
    if (phase === 'showing_result') {
      reset();
    } else if (phase === 'select_second') {
      setFigureA(null);
      setPhase('select_first');
    }
  }, [phase, reset]);

  // Status message
  let statusMessage: string;
  if (phase === 'select_first') {
    statusMessage = 'Étape 1/2 — Comparer — Clique sur une figure, un segment ou un cercle';
  } else if (phase === 'select_second') {
    statusMessage = 'Étape 2/2 — Comparer — Clique sur la deuxième figure';
  } else if (comparisonResult?.isIsometric) {
    statusMessage =
      state.displayMode === 'simplifie'
        ? 'Comparer — Les figures ont la même forme et la même grandeur!'
        : 'Comparer — Les figures sont isométriques!';
  } else {
    statusMessage =
      state.displayMode === 'simplifie'
        ? "Comparer — Les figures n'ont pas la même forme ou la même grandeur. Clique pour recommencer."
        : 'Comparer — Les figures ne sont pas isométriques. Clique pour recommencer.';
  }

  // Overlay rendering
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pointMap = new Map(state.points.map((p) => [p.id, p]));
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    // Helper: highlight a figure (segments + circle arc)
    const highlightFigure = (fig: Figure, keyPrefix: string, opacity: number) => {
      // Segment highlights
      for (const segId of fig.segmentIds) {
        const seg = state.segments.find((s) => s.id === segId);
        if (!seg) continue;
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) continue;

        elements.push(
          createElement('line', {
            key: `${keyPrefix}-${segId}`,
            x1: (start.x - viewport.panX) * pxPerMm,
            y1: (start.y - viewport.panY) * pxPerMm,
            x2: (end.x - viewport.panX) * pxPerMm,
            y2: (end.y - viewport.panY) * pxPerMm,
            stroke: CANVAS_SELECTION_BG,
            strokeWidth: 6,
            strokeLinecap: 'round',
            opacity,
            pointerEvents: 'none',
          }),
        );
      }

      // Circle highlight
      if (fig.id.startsWith('circle-')) {
        const circleId = fig.id.replace('circle-', '');
        const circle = state.circles.find((c) => c.id === circleId);
        if (circle) {
          const center = pointMap.get(circle.centerPointId);
          if (center) {
            elements.push(
              createElement('circle', {
                key: `${keyPrefix}-circle`,
                cx: (center.x - viewport.panX) * pxPerMm,
                cy: (center.y - viewport.panY) * pxPerMm,
                r: circle.radiusMm * pxPerMm,
                fill: 'none',
                stroke: CANVAS_SELECTION_BG,
                strokeWidth: 6,
                opacity,
                pointerEvents: 'none',
              }),
            );
          }
        }
      }
    };

    // Highlight figure A
    if (figureA) highlightFigure(figureA, 'selA', 0.7);

    // Highlight figure B
    if (figureB) highlightFigure(figureB, 'selB', 0.5);

    // Result overlay: ghost of A translated + green/red circles
    if (phase === 'showing_result' && comparisonResult && figureA) {
      const { translationVector: tv } = comparisonResult;

      // Ghost of figure A translated to align with B
      for (const segId of figureA.segmentIds) {
        const seg = state.segments.find((s) => s.id === segId);
        if (!seg) continue;
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) continue;

        elements.push(
          createElement('line', {
            key: `ghost-${segId}`,
            x1: (start.x + tv.x - viewport.panX) * pxPerMm,
            y1: (start.y + tv.y - viewport.panY) * pxPerMm,
            x2: (end.x + tv.x - viewport.panX) * pxPerMm,
            y2: (end.y + tv.y - viewport.panY) * pxPerMm,
            stroke: '#8BD4D0',
            strokeWidth: 2,
            strokeLinecap: 'round',
            opacity: 0.6,
            strokeDasharray: '6 3',
            pointerEvents: 'none',
          }),
        );
      }

      // Ghost circle translated
      if (figureA.id.startsWith('circle-')) {
        const circleId = figureA.id.replace('circle-', '');
        const circle = state.circles.find((c) => c.id === circleId);
        if (circle) {
          const center = pointMap.get(circle.centerPointId);
          if (center) {
            elements.push(
              createElement('circle', {
                key: 'ghost-circle',
                cx: (center.x + tv.x - viewport.panX) * pxPerMm,
                cy: (center.y + tv.y - viewport.panY) * pxPerMm,
                r: circle.radiusMm * pxPerMm,
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
      }

      // Green/red circles on B vertices
      for (const corr of comparisonResult.correspondences) {
        const pt = pointMap.get(corr.figureBPointId);
        if (!pt) continue;
        const cx = (pt.x - viewport.panX) * pxPerMm;
        const cy = (pt.y - viewport.panY) * pxPerMm;
        const isMatch = corr.deviationMm <= 1.0;

        elements.push(
          createElement('circle', {
            key: `corr-${corr.figureBPointId}`,
            cx,
            cy,
            r: 8,
            fill: isMatch ? '#22C55E' : '#EF4444',
            opacity: 0.4,
            pointerEvents: 'none',
          }),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [figureA, figureB, phase, comparisonResult, state, viewport]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'select_first',
    statusMessage,
    snapResult,
    overlayElements,
  };
}
