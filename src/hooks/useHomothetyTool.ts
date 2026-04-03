/**
 * Homothety (Agrandir/Réduire) tool — PFEQ 3e cycle.
 * 3-phase state machine:
 *   1. Click to place center of homothety
 *   2. Enter scale factor via floating panel (presets ×2, ×3, ×0.5 or free input)
 *   3. Click a segment/circle to scale the connected figure
 *
 * Visible only in mode complet.
 */

import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestSegment, hitTestCircle } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { findConnectedElements } from '@/engine/reproduce';
import { detectAllFaces, classifyFigures } from '@/engine/figures';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_GUIDE } from '@/config/theme';
import { useTransformAnimation } from './useTransformAnimation';
import { computeHomothetyAnimData } from '@/engine/transform-animation';

type HomothetyPhase = 'set_center' | 'set_factor' | 'select_figure';

interface UseHomothetyToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
  animateTransformations?: boolean;
}

export function useHomothetyTool({
  state,
  dispatch,
  viewport,
  isActive = true,
  animateTransformations = false,
}: UseHomothetyToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<HomothetyPhase>('set_center');
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [factor, setFactor] = useState<number | null>(null);
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
    setPhase('set_center');
    setCenter(null);
    setFactor(null);
    setSnapResult(null);
  }, []);

  const confirmFactor = useCallback((f: number) => {
    setFactor(f);
    setPhase('select_figure');
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      const snapped = snap.snappedPosition;

      if (phase === 'set_center') {
        setCenter(snapped);
        setPhase('set_factor');
      } else if (phase === 'select_figure' && center && factor != null) {
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

        const doDispatch = () =>
          dispatch({
            type: 'SCALE_ELEMENTS',
            pointIds,
            segmentIds,
            circleIds,
            center,
            factor,
          });

        const animStarted = anim.startAnimation(
          computeHomothetyAnimData(pointIds, segmentIds, state, center, factor),
          doDispatch,
        );
        if (!animStarted) doDispatch();

        // Stay in select_figure for scaling more elements with same center + factor
      }
    },
    [isActive, phase, state, center, factor, dispatch, tolerances],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      setSnapResult(snap);
    },
    [isActive, state, tolerances],
  );

  const handleEscape = useCallback(() => {
    if (phase === 'select_figure') {
      setFactor(null);
      setPhase('set_factor');
    } else if (phase === 'set_factor') {
      setCenter(null);
      setPhase('set_center');
    }
  }, [phase]);

  // Status message
  let statusMessage: string;
  if (phase === 'set_center') {
    statusMessage = "Étape 1/3 — Agrandir/Réduire — Clique pour placer le centre d'agrandissement";
  } else if (phase === 'set_factor') {
    statusMessage = 'Étape 2/3 — Agrandir/Réduire — Choisis le facteur';
  } else {
    statusMessage =
      'Étape 3/3 — Agrandir/Réduire — Clique sur un segment pour agrandir ou réduire la figure.';
  }

  // Overlay: center marker
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    if (center) {
      const cx = (center.x - viewport.panX) * pxPerMm;
      const cy = (center.y - viewport.panY) * pxPerMm;

      elements.push(
        createElement('circle', {
          key: 'homothety-center',
          cx,
          cy,
          r: 5,
          fill: 'none',
          stroke: CANVAS_GUIDE,
          strokeWidth: 2,
          pointerEvents: 'none',
        }),
      );
      elements.push(
        createElement('circle', {
          key: 'homothety-center-dot',
          cx,
          cy,
          r: 2,
          fill: CANVAS_GUIDE,
          pointerEvents: 'none',
        }),
      );

      // Factor label
      if (factor != null && phase === 'select_figure') {
        const factorStr = factor === Math.floor(factor) ? `×${factor}` : `×${factor}`;
        elements.push(
          createElement(
            'text',
            {
              key: 'homothety-factor-label',
              x: cx + 12,
              y: cy - 10,
              fill: CANVAS_GUIDE,
              fontSize: 12,
              paintOrder: 'stroke',
              stroke: 'white',
              strokeWidth: 3,
              pointerEvents: 'none',
            },
            factorStr,
          ),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [center, factor, phase, viewport]);

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

  // Floating factor input panel
  const toolPanel = useMemo(() => {
    if (phase !== 'set_factor' || !isActive) return undefined;

    return createElement(
      'div',
      {
        key: 'homothety-factor-panel',
        style: {
          background: 'white',
          border: '1px solid #D1D8E0',
          borderRadius: 8,
          padding: '12px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 8,
          alignItems: 'center',
          minWidth: 200,
        },
      },
      createElement(
        'div',
        { style: { fontWeight: 600, fontSize: 13, color: '#1A2433' } },
        'Facteur',
      ),
      createElement(
        'div',
        { style: { display: 'flex', gap: 8 } },
        ...[
          { label: '×0,5', value: 0.5 },
          { label: '×2', value: 2 },
          { label: '×3', value: 3 },
        ].map((preset) =>
          createElement(
            'button',
            {
              key: `preset-${preset.value}`,
              onClick: () => confirmFactor(preset.value),
              style: {
                minWidth: 44,
                height: 44,
                border: '1px solid #D1D8E0',
                borderRadius: 6,
                background: '#F5F7FA',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
              },
            },
            preset.label,
          ),
        ),
      ),
      createElement(
        'div',
        { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        createElement('span', { style: { fontSize: 14, color: '#4A5568' } }, '×'),
        createElement('input', {
          id: 'homothety-factor-input',
          type: 'text',
          inputMode: 'decimal',
          placeholder: 'ex: 1,5',
          style: {
            width: 70,
            height: 44,
            border: '1px solid #D1D8E0',
            borderRadius: 6,
            padding: '0 8px',
            fontSize: 14,
            textAlign: 'center' as const,
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              const val = parseFloat((e.target as HTMLInputElement).value.replace(',', '.'));
              if (!isNaN(val) && val > 0 && val !== 1) confirmFactor(val);
            }
          },
          autoFocus: true,
        }),
        createElement(
          'button',
          {
            onClick: () => {
              const input = document.getElementById(
                'homothety-factor-input',
              ) as HTMLInputElement | null;
              if (input) {
                const val = parseFloat(input.value.replace(',', '.'));
                if (!isNaN(val) && val > 0 && val !== 1) confirmFactor(val);
              }
            },
            style: {
              minWidth: 44,
              height: 44,
              border: '1px solid #0a7e7a',
              borderRadius: 6,
              background: '#0a7e7a',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            },
          },
          'OK',
        ),
      ),
      createElement(
        'div',
        { style: { fontSize: 13, color: '#4A5568', marginTop: 2 } },
        'Plus grand que 1 = agrandir, plus petit = réduire',
      ),
    );
  }, [phase, isActive, confirmFactor]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'set_center',
    statusMessage,
    snapResult,
    overlayElements: mergedOverlay,
    toolPanel,
  };
}
