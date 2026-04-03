/**
 * Frieze/Tiling tool — spec v2.
 * 6-phase state machine:
 *   1. select_figure — click segment to select connected figure
 *   2. vector1_start — click to define start of translation vector
 *   3. vector1_end — click to define end of translation vector
 *   4. choose_count — +/- stepper for repetition count, ghost preview
 *   5. vector2_start — (tiling) click start of second vector
 *   6. vector2_end — (tiling) click end of second vector
 *   → back to choose_count in 2D mode
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
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_SELECTION_BG, CANVAS_GUIDE } from '@/config/theme';
import { FriezePanel } from '@/components/FriezePanel';

type FriezePhase =
  | 'select_figure'
  | 'vector1_start'
  | 'vector1_end'
  | 'choose_count'
  | 'vector2_start'
  | 'vector2_end';

interface SelectedElements {
  pointIds: string[];
  segmentIds: string[];
  circleIds: string[];
}

const MAX_FRIEZE_COUNT = 10;
const MAX_TOTAL_COPIES = 25;

interface UseFriezeToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useFriezeTool({
  state,
  dispatch,
  viewport,
  isActive = true,
}: UseFriezeToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<FriezePhase>('select_figure');
  const [selected, setSelected] = useState<SelectedElements | null>(null);
  const [vectorStart1, setVectorStart1] = useState<{ x: number; y: number } | null>(null);
  const [vectorEnd1, setVectorEnd1] = useState<{ x: number; y: number } | null>(null);
  const [vectorStart2, setVectorStart2] = useState<{ x: number; y: number } | null>(null);
  const [vectorEnd2, setVectorEnd2] = useState<{ x: number; y: number } | null>(null);
  const [count1, setCount1] = useState(3);
  const [count2, setCount2] = useState(3);
  const [isTiling, setIsTiling] = useState(false);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('select_figure');
    setSelected(null);
    setVectorStart1(null);
    setVectorEnd1(null);
    setVectorStart2(null);
    setVectorEnd2(null);
    setCount1(3);
    setCount2(3);
    setIsTiling(false);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const vector1 = useMemo(() => {
    if (!vectorStart1 || !vectorEnd1) return null;
    return { dx: vectorEnd1.x - vectorStart1.x, dy: vectorEnd1.y - vectorStart1.y };
  }, [vectorStart1, vectorEnd1]);

  const vector2 = useMemo(() => {
    if (!vectorStart2 || !vectorEnd2) return null;
    return { dx: vectorEnd2.x - vectorStart2.x, dy: vectorEnd2.y - vectorStart2.y };
  }, [vectorStart2, vectorEnd2]);

  // Dynamic max for tiling to keep total copies <= MAX_TOTAL_COPIES
  const maxCount1 = isTiling
    ? Math.min(MAX_FRIEZE_COUNT, Math.floor(MAX_TOTAL_COPIES / count2))
    : MAX_FRIEZE_COUNT;
  const maxCount2 = Math.min(MAX_FRIEZE_COUNT, Math.floor(MAX_TOTAL_COPIES / count1));

  // Clamp counts to current max (prevents exceeding budget when other axis changes)
  const effectiveCount1 = Math.min(count1, maxCount1);
  const effectiveCount2 = Math.min(count2, maxCount2);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;

      if (phase === 'select_figure') {
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

        setSelected({ pointIds, segmentIds, circleIds });
        setPhase('vector1_start');
      } else if (phase === 'vector1_start') {
        const snap = findSnap(mmPos, state, tolerances);
        setVectorStart1(snap.snappedPosition);
        setPhase('vector1_end');
      } else if (phase === 'vector1_end') {
        const snap = findSnap(mmPos, state, tolerances);
        const end = snap.snappedPosition;
        if (vectorStart1 && distance(vectorStart1, end) < MIN_POINT_DISTANCE_MM) return;
        setVectorEnd1(end);
        setPhase('choose_count');
      } else if (phase === 'vector2_start') {
        const snap = findSnap(mmPos, state, tolerances);
        setVectorStart2(snap.snappedPosition);
        setPhase('vector2_end');
      } else if (phase === 'vector2_end') {
        const snap = findSnap(mmPos, state, tolerances);
        const end = snap.snappedPosition;
        if (vectorStart2 && distance(vectorStart2, end) < MIN_POINT_DISTANCE_MM) return;
        setVectorEnd2(end);
        setPhase('choose_count');
      }
      // choose_count: clicks ignored on canvas (interaction via panel buttons)
    },
    [isActive, phase, state, tolerances, vectorStart1, vectorStart2],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setCursorMm(mmPos);
      if (
        phase === 'vector1_start' ||
        phase === 'vector1_end' ||
        phase === 'vector2_start' ||
        phase === 'vector2_end'
      ) {
        const snap = findSnap(mmPos, state, tolerances);
        setSnapResult(snap);
      } else {
        setSnapResult(null);
      }
    },
    [isActive, phase, state, tolerances],
  );

  const handleEscape = useCallback(() => {
    switch (phase) {
      case 'choose_count':
        if (isTiling && vector2) {
          // Drop second vector, back to 1D frieze
          setVectorStart2(null);
          setVectorEnd2(null);
          setIsTiling(false);
        } else {
          setVectorEnd1(null);
          setPhase('vector1_end');
        }
        break;
      case 'vector2_end':
        setVectorStart2(null);
        setPhase('vector2_start');
        break;
      case 'vector2_start':
        setIsTiling(false);
        setPhase('choose_count');
        break;
      case 'vector1_end':
        setVectorStart1(null);
        setPhase('vector1_start');
        break;
      case 'vector1_start':
        setSelected(null);
        setPhase('select_figure');
        break;
    }
  }, [phase, isTiling, vector2]);

  const handleValidate = useCallback(() => {
    if (!selected || !vector1) return;
    dispatch({
      type: 'REPRODUCE_FRIEZE',
      pointIds: selected.pointIds,
      segmentIds: selected.segmentIds,
      circleIds: selected.circleIds,
      vector1,
      count1: effectiveCount1,
      vector2: isTiling && vector2 ? vector2 : undefined,
      count2: isTiling && vector2 ? effectiveCount2 : undefined,
    });
    reset();
  }, [selected, vector1, vector2, effectiveCount1, effectiveCount2, isTiling, dispatch, reset]);

  const handleStartTiling = useCallback(() => {
    setIsTiling(true);
    setPhase('vector2_start');
  }, []);

  // Status message
  let statusMessage: string;
  switch (phase) {
    case 'select_figure':
      statusMessage = 'Étape 1/3 — Frise — Clique sur un segment pour sélectionner la figure';
      break;
    case 'vector1_start':
      statusMessage = 'Étape 2/3 — Frise — Clique pour placer le début de la flèche';
      break;
    case 'vector1_end':
      statusMessage = 'Étape 2/3 — Frise — Clique pour placer la fin de la flèche';
      break;
    case 'choose_count': {
      const totalCopies =
        isTiling && vector2 ? effectiveCount1 * effectiveCount2 - 1 : effectiveCount1 - 1;
      const totalSegs = totalCopies * (selected?.segmentIds.length ?? 0);
      const prefix = isTiling && vector2 ? 'Dallage' : 'Frise';
      statusMessage = `Étape 3/3 — ${prefix} — ${totalCopies} copie${totalCopies > 1 ? 's' : ''} (${totalSegs} segments). Utilise + et − pour changer.`;
      break;
    }
    case 'vector2_start':
      statusMessage = 'Étape 2/3 — Dallage — Clique pour placer le début de la deuxième flèche';
      break;
    case 'vector2_end':
      statusMessage = 'Étape 2/3 — Dallage — Clique pour placer la fin de la deuxième flèche';
      break;
  }

  // Overlay: highlights + arrows + ghost copies
  const overlayElements = useMemo(() => {
    if (!selected) return null;
    const elements: React.ReactNode[] = [];
    const pointMap = new Map(state.points.map((p) => [p.id, p]));
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    const toSx = (x: number) => (x - viewport.panX) * pxPerMm;
    const toSy = (y: number) => (y - viewport.panY) * pxPerMm;

    // Highlight selected segments
    for (const segId of selected.segmentIds) {
      const seg = state.segments.find((s) => s.id === segId);
      if (!seg) continue;
      const start = pointMap.get(seg.startPointId);
      const end = pointMap.get(seg.endPointId);
      if (!start || !end) continue;
      elements.push(
        createElement('line', {
          key: `sel-${segId}`,
          x1: toSx(start.x),
          y1: toSy(start.y),
          x2: toSx(end.x),
          y2: toSy(end.y),
          stroke: CANVAS_SELECTION_BG,
          strokeWidth: 6,
          strokeLinecap: 'round',
          opacity: 0.7,
          pointerEvents: 'none',
        }),
      );
    }

    // Arrow helper
    const renderArrow = (
      start: { x: number; y: number },
      end: { x: number; y: number },
      key: string,
      dashed: boolean,
    ) => {
      const markerId = `arrow-${key}`;
      return [
        createElement(
          'defs',
          { key: `defs-${key}` },
          createElement(
            'marker',
            {
              id: markerId,
              markerWidth: 8,
              markerHeight: 6,
              refX: 8,
              refY: 3,
              orient: 'auto',
            },
            createElement('path', {
              d: 'M0,0 L8,3 L0,6',
              fill: CANVAS_GUIDE,
            }),
          ),
        ),
        createElement('line', {
          key: `arr-${key}`,
          x1: toSx(start.x),
          y1: toSy(start.y),
          x2: toSx(end.x),
          y2: toSy(end.y),
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          strokeDasharray: dashed ? '6 3' : undefined,
          markerEnd: `url(#${markerId})`,
          opacity: 0.8,
          pointerEvents: 'none',
        }),
      ];
    };

    // Arrow 1 (preview while defining, or solid when defined)
    if (vectorStart1 && phase === 'vector1_end' && cursorMm) {
      const snapped = snapResult?.snappedPosition ?? cursorMm;
      elements.push(...renderArrow(vectorStart1, snapped, 'v1-preview', true));
    }
    if (vectorStart1 && vectorEnd1) {
      elements.push(...renderArrow(vectorStart1, vectorEnd1, 'v1', false));
    }

    // Arrow 2 (tiling)
    if (vectorStart2 && phase === 'vector2_end' && cursorMm) {
      const snapped = snapResult?.snappedPosition ?? cursorMm;
      elements.push(...renderArrow(vectorStart2, snapped, 'v2-preview', true));
    }
    if (vectorStart2 && vectorEnd2) {
      elements.push(...renderArrow(vectorStart2, vectorEnd2, 'v2', false));
    }

    // Ghost copies (during choose_count)
    if (phase === 'choose_count' && vector1) {
      const rows = isTiling && vector2 ? effectiveCount2 : 1;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < effectiveCount1; i++) {
          if (i === 0 && j === 0) continue; // Original figure
          const ox = i * vector1.dx + (vector2 && isTiling ? j * vector2.dx : 0);
          const oy = i * vector1.dy + (vector2 && isTiling ? j * vector2.dy : 0);

          for (const segId of selected.segmentIds) {
            const seg = state.segments.find((s) => s.id === segId);
            if (!seg) continue;
            const start = pointMap.get(seg.startPointId);
            const end = pointMap.get(seg.endPointId);
            if (!start || !end) continue;
            elements.push(
              createElement('line', {
                key: `ghost-${i}-${j}-${segId}`,
                x1: toSx(start.x + ox),
                y1: toSy(start.y + oy),
                x2: toSx(end.x + ox),
                y2: toSy(end.y + oy),
                stroke: '#8BD4D0',
                strokeWidth: 2,
                strokeLinecap: 'round',
                opacity: 0.5,
                strokeDasharray: '6 3',
                pointerEvents: 'none',
              }),
            );
          }
          for (const circleId of selected.circleIds) {
            const circle = state.circles.find((c) => c.id === circleId);
            if (!circle) continue;
            const center = pointMap.get(circle.centerPointId);
            if (!center) continue;
            elements.push(
              createElement('circle', {
                key: `ghost-circle-${i}-${j}-${circleId}`,
                cx: toSx(center.x + ox),
                cy: toSy(center.y + oy),
                r: circle.radiusMm * pxPerMm,
                fill: 'none',
                stroke: '#8BD4D0',
                strokeWidth: 2,
                opacity: 0.5,
                strokeDasharray: '6 3',
                pointerEvents: 'none',
              }),
            );
          }
        }
      }
    }

    return elements.length > 0 ? elements : null;
  }, [
    selected,
    phase,
    vectorStart1,
    vectorEnd1,
    vectorStart2,
    vectorEnd2,
    vector1,
    vector2,
    effectiveCount1,
    effectiveCount2,
    isTiling,
    cursorMm,
    snapResult,
    state,
    viewport,
  ]);

  // Tool panel (floating stepper UI)
  const toolPanel = useMemo(() => {
    if (phase !== 'choose_count' || !selected) return undefined;
    return createElement(FriezePanel, {
      count: effectiveCount1,
      segmentCount: selected.segmentIds.length,
      maxCount: maxCount1,
      onIncrement: () => setCount1((c) => Math.min(c + 1, maxCount1)),
      onDecrement: () => setCount1((c) => Math.max(c - 1, 2)),
      onValidate: handleValidate,
      showTilingButton: !isTiling || !vector2,
      onStartTiling: handleStartTiling,
      count2: isTiling && vector2 ? effectiveCount2 : undefined,
      maxCount2: isTiling && vector2 ? maxCount2 : undefined,
      onIncrement2: () => setCount2((c) => Math.min(c + 1, maxCount2)),
      onDecrement2: () => setCount2((c) => Math.max(c - 1, 2)),
    });
  }, [
    phase,
    selected,
    effectiveCount1,
    effectiveCount2,
    maxCount1,
    maxCount2,
    isTiling,
    vector2,
    handleValidate,
    handleStartTiling,
  ]);

  const needsSnap =
    phase === 'vector1_start' ||
    phase === 'vector1_end' ||
    phase === 'vector2_start' ||
    phase === 'vector2_end';

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'select_figure',
    statusMessage,
    snapResult: needsSnap ? snapResult : null,
    overlayElements,
    toolPanel,
  };
}
