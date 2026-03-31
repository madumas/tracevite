/**
 * Compare tool — isometric figure comparison by superposition (spec v2).
 * Read-only: selects two closed figures and overlays them via translation.
 * Visual feedback: green circles (match) / red circles (mismatch).
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment } from '@/engine/hit-test';
import { detectAllFaces, classifyFigures, type Figure } from '@/engine/figures';
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

      // Hit-test segment
      const segId = hitTestSegment(mmPos, state.segments, state.points);
      if (!segId) return;

      // Find closed figure containing this segment
      const faces = detectAllFaces(state);
      const figures = classifyFigures(faces, state, state.displayMode);
      const figure = figures
        .filter((f) => f.segmentIds.includes(segId))
        .sort((a, b) => a.pointIds.length - b.pointIds.length)[0];

      if (!figure) {
        // Not a closed figure — reject
        return;
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
    statusMessage = 'Comparer — Clique sur le côté d\u2019une figure fermée';
  } else if (phase === 'select_second') {
    statusMessage = 'Comparer — Clique sur le côté de la deuxième figure';
  } else if (comparisonResult?.isIsometric) {
    statusMessage = 'Comparer — Les figures sont isométriques!';
  } else {
    statusMessage = 'Comparer — Les figures ne sont pas isométriques. Clique pour recommencer.';
  }

  // Overlay rendering
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pointMap = new Map(state.points.map((p) => [p.id, p]));
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    // Highlight figure A
    if (figureA) {
      for (const segId of figureA.segmentIds) {
        const seg = state.segments.find((s) => s.id === segId);
        if (!seg) continue;
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) continue;

        elements.push(
          createElement('line', {
            key: `selA-${segId}`,
            x1: (start.x - viewport.panX) * pxPerMm,
            y1: (start.y - viewport.panY) * pxPerMm,
            x2: (end.x - viewport.panX) * pxPerMm,
            y2: (end.y - viewport.panY) * pxPerMm,
            stroke: CANVAS_SELECTION_BG,
            strokeWidth: 6,
            strokeLinecap: 'round',
            opacity: 0.7,
            pointerEvents: 'none',
          }),
        );
      }
    }

    // Highlight figure B
    if (figureB) {
      for (const segId of figureB.segmentIds) {
        const seg = state.segments.find((s) => s.id === segId);
        if (!seg) continue;
        const start = pointMap.get(seg.startPointId);
        const end = pointMap.get(seg.endPointId);
        if (!start || !end) continue;

        elements.push(
          createElement('line', {
            key: `selB-${segId}`,
            x1: (start.x - viewport.panX) * pxPerMm,
            y1: (start.y - viewport.panY) * pxPerMm,
            x2: (end.x - viewport.panX) * pxPerMm,
            y2: (end.y - viewport.panY) * pxPerMm,
            stroke: CANVAS_SELECTION_BG,
            strokeWidth: 6,
            strokeLinecap: 'round',
            opacity: 0.5,
            pointerEvents: 'none',
          }),
        );
      }
    }

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
            stroke: '#85B7EB',
            strokeWidth: 2,
            strokeLinecap: 'round',
            opacity: 0.6,
            strokeDasharray: '6 3',
            pointerEvents: 'none',
          }),
        );
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
