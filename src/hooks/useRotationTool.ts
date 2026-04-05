/**
 * Rotation tool — PFEQ 3e cycle.
 * 3-phase state machine:
 *   1. Click to place center of rotation
 *   2. Enter angle via floating panel (presets 90°/180°/270° or free input)
 *   3. Click a segment/circle to rotate the connected figure
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
import { computeRotationAnimData } from '@/engine/transform-animation';
import { rotatePoint } from '@/engine/rotation';

type RotationPhase = 'set_center' | 'set_angle' | 'select_figure';

interface UseRotationToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
  animateTransformations?: boolean;
}

export function useRotationTool({
  state,
  dispatch,
  viewport,
  isActive = true,
  animateTransformations = false,
}: UseRotationToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<RotationPhase>('set_center');
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [angleDeg, setAngleDeg] = useState<number | null>(null);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [clockwise, setClockwise] = useState(true);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  // Effective preview angle with direction sign
  const effectivePreview = previewAngle != null ? (clockwise ? previewAngle : -previewAngle) : null;

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
    setPhase('set_center');
    setCenter(null);
    setAngleDeg(null);
    setPreviewAngle(null);
    setSnapResult(null);
  }, []);

  const confirmAngle = useCallback((deg: number) => {
    setAngleDeg(deg);
    setPreviewAngle(null);
    setPhase('select_figure');
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      const snap = findSnap(mmPos, state, tolerances);
      const snapped = snap.snappedPosition;

      if (phase === 'set_center') {
        setCenter(snapped);
        setPhase('set_angle');
      } else if (phase === 'select_figure' && center && angleDeg != null && !anim.isAnimating) {
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
            type: 'ROTATE_ELEMENTS',
            pointIds,
            segmentIds,
            circleIds,
            center,
            angleDeg,
          });

        const animStarted = anim.startAnimation(
          computeRotationAnimData(pointIds, segmentIds, state, center, angleDeg),
          doDispatch,
        );
        if (!animStarted) doDispatch();

        // Stay in select_figure for rotating more elements with same center + angle
      }
    },
    [isActive, phase, state, center, angleDeg, dispatch, tolerances, anim],
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
      setAngleDeg(null);
      setPhase('set_angle');
    } else if (phase === 'set_angle') {
      if (previewAngle != null) {
        setPreviewAngle(null);
      } else {
        setCenter(null);
        setPhase('set_center');
      }
    }
  }, [phase, previewAngle]);

  // Status message
  let statusMessage: string;
  if (phase === 'set_center') {
    statusMessage = 'Étape 1/3 — Rotation — Clique pour placer le centre de rotation';
  } else if (phase === 'set_angle') {
    statusMessage =
      previewAngle != null
        ? `Aperçu de la rotation de ${previewAngle}° — Confirmer ou Annuler`
        : "Étape 2/3 — Rotation — Choisis l'angle de rotation";
  } else {
    statusMessage = 'Étape 3/3 — Rotation — Clique sur un segment pour faire tourner la figure.';
  }

  // Overlay: center marker + angle arc preview
  const overlayElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;

    // Center marker
    if (center) {
      const cx = (center.x - viewport.panX) * pxPerMm;
      const cy = (center.y - viewport.panY) * pxPerMm;

      // Cross-hair
      elements.push(
        createElement('circle', {
          key: 'rotation-center',
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
          key: 'rotation-center-dot',
          cx,
          cy,
          r: 2,
          fill: CANVAS_GUIDE,
          pointerEvents: 'none',
        }),
      );

      // Ghost preview when previewAngle is set (before confirmation)
      if (phase === 'set_angle' && effectivePreview != null) {
        const pointMap = new Map(state.points.map((p) => [p.id, p]));
        for (const seg of state.segments) {
          const start = pointMap.get(seg.startPointId);
          const end = pointMap.get(seg.endPointId);
          if (!start || !end) continue;
          const r1 = rotatePoint(start, center, effectivePreview);
          const r2 = rotatePoint(end, center, effectivePreview);
          elements.push(
            createElement('line', {
              key: `ghost-rot-${seg.id}`,
              x1: (r1.x - viewport.panX) * pxPerMm,
              y1: (r1.y - viewport.panY) * pxPerMm,
              x2: (r2.x - viewport.panX) * pxPerMm,
              y2: (r2.y - viewport.panY) * pxPerMm,
              stroke: CANVAS_GUIDE,
              strokeWidth: 2,
              strokeDasharray: '4 2',
              opacity: 0.4,
              paintOrder: 'stroke',
              pointerEvents: 'none',
            }),
          );
        }
        // Ghost points
        for (const pt of state.points) {
          const rp = rotatePoint(pt, center, effectivePreview);
          elements.push(
            createElement('circle', {
              key: `ghost-rot-pt-${pt.id}`,
              cx: (rp.x - viewport.panX) * pxPerMm,
              cy: (rp.y - viewport.panY) * pxPerMm,
              r: 3,
              fill: CANVAS_GUIDE,
              opacity: 0.35,
              pointerEvents: 'none',
            }),
          );
        }
      }

      // Arc preview when angle is defined (confirmed or previewing)
      const arcAngle = phase === 'select_figure' ? angleDeg : effectivePreview;
      if (arcAngle != null) {
        const r = 20; // px
        const endRad = (arcAngle * Math.PI) / 180;
        const endX = cx + r * Math.cos(endRad);
        const endY = cy + r * Math.sin(endRad);
        const largeArc = Math.abs(arcAngle) > 180 ? 1 : 0;
        const sweep = arcAngle > 0 ? 1 : 0;

        elements.push(
          createElement('path', {
            key: 'rotation-arc',
            d: `M ${cx + r} ${cy} A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`,
            fill: 'none',
            stroke: CANVAS_GUIDE,
            strokeWidth: 1.5,
            strokeDasharray: '4 2',
            pointerEvents: 'none',
          }),
        );

        // Arrow at end of arc — tangent direction at endpoint
        const arrowAngle = endRad + (arcAngle > 0 ? -Math.PI / 2 : Math.PI / 2);
        const arrowLen = 6;
        elements.push(
          createElement('line', {
            key: 'rotation-arrow1',
            x1: endX,
            y1: endY,
            x2: endX + arrowLen * Math.cos(arrowAngle + 0.5),
            y2: endY + arrowLen * Math.sin(arrowAngle + 0.5),
            stroke: CANVAS_GUIDE,
            strokeWidth: 1.5,
            pointerEvents: 'none',
          }),
        );
        elements.push(
          createElement('line', {
            key: 'rotation-arrow2',
            x1: endX,
            y1: endY,
            x2: endX + arrowLen * Math.cos(arrowAngle - 0.5),
            y2: endY + arrowLen * Math.sin(arrowAngle - 0.5),
            stroke: CANVAS_GUIDE,
            strokeWidth: 1.5,
            pointerEvents: 'none',
          }),
        );

        // Angle label
        elements.push(
          createElement(
            'text',
            {
              key: 'rotation-angle-label',
              x: cx + (r + 12) * Math.cos(endRad / 2),
              y: cy + (r + 12) * Math.sin(endRad / 2),
              fill: CANVAS_GUIDE,
              fontSize: 12,
              textAnchor: 'middle',
              paintOrder: 'stroke',
              stroke: 'white',
              strokeWidth: 3,
              pointerEvents: 'none',
            },
            `${arcAngle}°`,
          ),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [center, angleDeg, effectivePreview, phase, viewport, state.points, state.segments]);

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

  // PFEQ preset labels
  const presets: { deg: number; label: string }[] = useMemo(() => {
    const isComplet = state.displayMode === 'complet';
    return [
      { deg: 90, label: isComplet ? 'Quart de tour (90°)' : 'Quart de tour' },
      { deg: 180, label: isComplet ? 'Demi-tour (180°)' : 'Demi-tour' },
      { deg: 270, label: isComplet ? 'Trois quarts de tour (270°)' : 'Trois quarts de tour' },
      ...(isComplet
        ? [
            { deg: 60, label: '60°' },
            { deg: 120, label: '120°' },
          ]
        : []),
    ];
  }, [state.displayMode]);

  // Floating angle input panel
  const toolPanel = useMemo(() => {
    if (phase !== 'set_angle' || !isActive) return undefined;

    // Direction segmented control
    const directionControl = createElement(
      'div',
      {
        style: {
          display: 'flex',
          border: '1px solid #D1D8E0',
          borderRadius: 6,
          overflow: 'hidden' as const,
          width: '100%',
        },
      },
      createElement(
        'button',
        {
          onClick: () => setClockwise(true),
          style: {
            flex: 1,
            height: 44,
            border: 'none',
            background: clockwise ? '#0a7e7a' : '#F5F7FA',
            color: clockwise ? 'white' : '#4A5568',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          },
        },
        '↻ Horaire',
      ),
      createElement(
        'button',
        {
          onClick: () => setClockwise(false),
          style: {
            flex: 1,
            height: 44,
            border: 'none',
            borderLeft: '1px solid #D1D8E0',
            background: !clockwise ? '#0a7e7a' : '#F5F7FA',
            color: !clockwise ? 'white' : '#4A5568',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          },
        },
        '↺ Antihoraire',
      ),
    );

    // Preset list (vertical, full width)
    const presetList = createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column' as const, gap: 4, width: '100%' } },
      ...presets.map((p) =>
        createElement(
          'button',
          {
            key: `preset-${p.deg}`,
            onClick: () => setPreviewAngle(p.deg),
            style: {
              width: '100%',
              height: 44,
              padding: '0 12px',
              border: previewAngle === p.deg ? '2px solid #0a7e7a' : '1px solid #D1D8E0',
              borderRadius: 6,
              background: previewAngle === p.deg ? '#E0F2F1' : '#F5F7FA',
              cursor: 'pointer',
              fontWeight: previewAngle === p.deg ? 700 : 500,
              fontSize: 13,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          },
          createElement('span', null, p.label),
        ),
      ),
    );

    // Free input row
    const inputRow = createElement(
      'div',
      { style: { display: 'flex', gap: 8, alignItems: 'center', width: '100%' } },
      createElement('input', {
        id: 'rotation-angle-input',
        type: 'text',
        inputMode: 'decimal',
        placeholder: 'ex: 45',
        style: {
          flex: 1,
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
            if (!isNaN(val) && val % 360 !== 0) setPreviewAngle(val % 360);
          }
        },
        autoFocus: previewAngle == null,
      }),
      createElement('span', { style: { fontSize: 14, color: '#4A5568' } }, '°'),
      createElement(
        'button',
        {
          onClick: () => {
            const input = document.getElementById(
              'rotation-angle-input',
            ) as HTMLInputElement | null;
            if (input) {
              const val = parseFloat(input.value.replace(',', '.'));
              if (!isNaN(val) && val % 360 !== 0) setPreviewAngle(val % 360);
            }
          },
          style: {
            minWidth: 44,
            height: 44,
            border: '1px solid #0a7e7a',
            borderRadius: 6,
            background: previewAngle != null ? '#F5F7FA' : '#0a7e7a',
            color: previewAngle != null ? '#4A5568' : 'white',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          },
        },
        'OK',
      ),
    );

    // Confirm/Cancel row when preview is active
    const confirmRow =
      previewAngle != null
        ? createElement(
            'div',
            { style: { display: 'flex', gap: 8, marginTop: 4, width: '100%' } },
            createElement(
              'button',
              {
                onClick: () => confirmAngle(clockwise ? previewAngle : -previewAngle),
                style: {
                  minWidth: 44,
                  height: 44,
                  flex: 1,
                  border: 'none',
                  borderRadius: 6,
                  background: '#0a7e7a',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                },
              },
              'Confirmer',
            ),
            createElement(
              'button',
              {
                onClick: () => setPreviewAngle(null),
                style: {
                  minWidth: 44,
                  height: 44,
                  flex: 1,
                  border: '1px solid #D1D8E0',
                  borderRadius: 6,
                  background: 'white',
                  color: '#4A5568',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                },
              },
              'Annuler',
            ),
          )
        : null;

    return createElement(
      'div',
      {
        key: 'rotation-angle-panel',
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
          minWidth: 220,
        },
      },
      createElement(
        'div',
        { style: { fontWeight: 600, fontSize: 13, color: '#1A2433' } },
        'Angle de rotation',
      ),
      directionControl,
      presetList,
      inputRow,
      confirmRow,
    );
  }, [phase, isActive, previewAngle, clockwise, presets, confirmAngle]);

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
    isPreviewActive: previewAngle != null,
  };
}
