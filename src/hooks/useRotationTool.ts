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
// rotatePoint used for potential future visual preview enhancement

type RotationPhase = 'set_center' | 'set_angle' | 'select_figure';

interface UseRotationToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useRotationTool({
  state,
  dispatch,
  viewport,
  isActive = true,
}: UseRotationToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<RotationPhase>('set_center');
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [angleDeg, setAngleDeg] = useState<number | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('set_center');
    setCenter(null);
    setAngleDeg(null);
    setSnapResult(null);
  }, []);

  const confirmAngle = useCallback((deg: number) => {
    setAngleDeg(deg);
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
      } else if (phase === 'select_figure' && center && angleDeg != null) {
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

        dispatch({
          type: 'ROTATE_ELEMENTS',
          pointIds,
          segmentIds,
          circleIds,
          center,
          angleDeg,
        });

        // Stay in select_figure for rotating more elements with same center + angle
      }
    },
    [isActive, phase, state, center, angleDeg, dispatch, tolerances],
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
      setCenter(null);
      setPhase('set_center');
    }
  }, [phase]);

  // Status message
  let statusMessage: string;
  if (phase === 'set_center') {
    statusMessage = 'Rotation — Clique pour placer le centre de rotation';
  } else if (phase === 'set_angle') {
    statusMessage = "Rotation — Choisis l'angle de rotation";
  } else {
    statusMessage = 'Rotation — Clique sur un segment pour faire tourner la figure.';
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

      // Arc preview when angle is defined
      if (angleDeg != null && phase === 'select_figure') {
        const r = 20; // px
        const endAngle = (angleDeg * Math.PI) / 180;
        const endX = cx + r * Math.cos(endAngle);
        const endY = cy + r * Math.sin(endAngle);
        const largeArc = Math.abs(angleDeg) > 180 ? 1 : 0;
        const sweep = angleDeg > 0 ? 1 : 0;

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

        // Arrow at end of arc
        const arrowAngle = endAngle + (angleDeg > 0 ? Math.PI / 2 : -Math.PI / 2);
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
              x: cx + (r + 12) * Math.cos(endAngle / 2),
              y: cy + (r + 12) * Math.sin(endAngle / 2),
              fill: CANVAS_GUIDE,
              fontSize: 12,
              textAnchor: 'middle',
              paintOrder: 'stroke',
              stroke: 'white',
              strokeWidth: 3,
              pointerEvents: 'none',
            },
            `${angleDeg}°`,
          ),
        );
      }
    }

    return elements.length > 0 ? elements : null;
  }, [center, angleDeg, phase, viewport]);

  // Floating angle input panel
  const toolPanel = useMemo(() => {
    if (phase !== 'set_angle' || !isActive) return undefined;

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
          minWidth: 200,
        },
      },
      createElement(
        'div',
        { style: { fontWeight: 600, fontSize: 13, color: '#1A2433' } },
        'Angle de rotation',
      ),
      createElement(
        'div',
        { style: { display: 'flex', gap: 8 } },
        ...[60, 90, 120, 180, 270].map((deg) =>
          createElement(
            'button',
            {
              key: `preset-${deg}`,
              onClick: () => confirmAngle(deg),
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
            `${deg}°`,
          ),
        ),
      ),
      createElement(
        'div',
        { style: { display: 'flex', gap: 8, alignItems: 'center' } },
        createElement('input', {
          id: 'rotation-angle-input',
          type: 'text',
          inputMode: 'decimal',
          placeholder: 'ex: 90',
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
              if (!isNaN(val) && val % 360 !== 0) confirmAngle(val % 360);
            }
          },
          autoFocus: true,
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
                if (!isNaN(val) && val % 360 !== 0) confirmAngle(val % 360);
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
        "Sens des aiguilles d'une montre",
      ),
    );
  }, [phase, isActive, confirmAngle]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'set_center',
    statusMessage,
    snapResult,
    overlayElements,
    toolPanel,
  };
}
