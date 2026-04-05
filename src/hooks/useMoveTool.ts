import { useState, useCallback, useMemo, createElement } from 'react';
import type { ConstructionState, ViewportState, SnapResult } from '@/model/types';
import type { ConstructionAction } from '@/model/reducer';
import type { ToolHookResult } from './types';
import { hitTestPoint, hitTestTextBox } from '@/engine/hit-test';
import { findSnap, DEFAULT_TOLERANCES, scaleTolerances } from '@/engine/snap';
import { TOLERANCE_PROFILES } from '@/config/accessibility';
import { STATUS_MOVE_IDLE, STATUS_MOVE_PICKED } from '@/config/messages';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { CANVAS_GHOST } from '@/config/theme';

const STATUS_MOVE_LOCKED =
  'Déplacer — Ce point est verrouillé. Déverrouille-le d\u2019abord (outil Sélectionner).';
import { MovePreview } from '@/components/MovePreview';

type MovePhase = 'idle' | 'point_picked' | 'textbox_picked';

interface UseMoveToolOptions {
  state: ConstructionState;
  dispatch: (action: ConstructionAction) => void;
  viewport: ViewportState;
  isActive?: boolean;
}

export function useMoveTool({
  state,
  dispatch,
  viewport,
  isActive = true,
}: UseMoveToolOptions): ToolHookResult {
  const [phase, setPhase] = useState<MovePhase>('idle');
  const [pickedPointId, setPickedPointId] = useState<string | null>(null);
  const [pickedTextBoxId, setPickedTextBoxId] = useState<string | null>(null);
  const [pickOffset, setPickOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [_originalPosition, setOriginalPosition] = useState<{ x: number; y: number } | null>(null);
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [lockedHint, setLockedHint] = useState(false);

  const tolerances = useMemo(
    () => scaleTolerances(DEFAULT_TOLERANCES, TOLERANCE_PROFILES[state.toleranceProfile]),
    [state.toleranceProfile],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setPickedPointId(null);
    setPickedTextBoxId(null);
    setOriginalPosition(null);
    setCursorMm(null);
    setSnapResult(null);
  }, []);

  const handleClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      if (phase === 'idle') {
        // Try to pick up a point
        const pointId = hitTestPoint(mmPos, state.points);
        if (pointId) {
          const point = state.points.find((p) => p.id === pointId);
          if (!point) return;
          if (point.locked) {
            setLockedHint(true);
            setTimeout(() => setLockedHint(false), 3000);
            return;
          }
          setPickedPointId(pointId);
          setOriginalPosition({ x: point.x, y: point.y });
          setPhase('point_picked');
          return;
        }
        // Try to pick up a textbox
        const tbId = hitTestTextBox(mmPos, state.textBoxes);
        if (tbId) {
          const tb = state.textBoxes.find((t) => t.id === tbId);
          if (!tb) return;
          setPickedTextBoxId(tbId);
          setPickOffset({ dx: mmPos.x - tb.x, dy: mmPos.y - tb.y });
          setOriginalPosition({ x: tb.x, y: tb.y });
          setPhase('textbox_picked');
          return;
        }
      } else if (phase === 'point_picked' && pickedPointId) {
        // Put down the point
        const snap = findSnap(mmPos, state, tolerances, [pickedPointId]);
        const target = snap.snappedPosition;
        dispatch({ type: 'MOVE_POINT', pointId: pickedPointId, x: target.x, y: target.y });
        reset();
      } else if (phase === 'textbox_picked' && pickedTextBoxId) {
        // Put down the textbox — apply pick offset so it drops where user expects
        const adjusted = { x: mmPos.x - pickOffset.dx, y: mmPos.y - pickOffset.dy };
        dispatch({ type: 'MOVE_TEXT_BOX', id: pickedTextBoxId, x: adjusted.x, y: adjusted.y });
        reset();
      }
    },
    [isActive, phase, state, pickedPointId, dispatch, reset],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      if (!isActive) return;
      setCursorMm(mmPos);
      if (pickedPointId) {
        const snap = findSnap(mmPos, state, tolerances, [pickedPointId]);
        setSnapResult(snap);
      } else if (pickedTextBoxId) {
        const snap = findSnap(mmPos, state, tolerances);
        setSnapResult(snap);
      }
    },
    [isActive, state, pickedPointId, pickedTextBoxId, tolerances],
  );

  const handleEscape = useCallback(() => {
    if (phase === 'point_picked' || phase === 'textbox_picked') {
      reset();
    }
  }, [phase, reset]);

  // Status message
  const pickedLabel = pickedPointId
    ? (state.points.find((p) => p.id === pickedPointId)?.label ?? '?')
    : '';
  const statusMessage = lockedHint
    ? STATUS_MOVE_LOCKED
    : phase === 'idle'
      ? STATUS_MOVE_IDLE
      : phase === 'textbox_picked'
        ? 'Déplacer — Clique pour déposer la zone de texte'
        : STATUS_MOVE_PICKED(pickedLabel);

  // Overlay: show the element at cursor position during pick-up
  const overlayElements = useMemo(() => {
    if (phase === 'point_picked' && pickedPointId && cursorMm) {
      const snappedPos = snapResult?.snappedPosition ?? cursorMm;
      const point = state.points.find((p) => p.id === pickedPointId);
      if (!point) return null;
      return createElement(MovePreview, {
        key: 'move-preview',
        point,
        previewPosition: snappedPos,
        state,
        viewport,
      });
    }
    if (phase === 'textbox_picked' && pickedTextBoxId) {
      const tb = state.textBoxes.find((t) => t.id === pickedTextBoxId);
      if (!tb) return null;
      // Apply pick offset so ghost stays under cursor at grab point
      const pos = cursorMm
        ? { x: cursorMm.x - pickOffset.dx, y: cursorMm.y - pickOffset.dy }
        : { x: tb.x, y: tb.y }; // before first move: show at original position
      const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
      const sx = (pos.x - viewport.panX) * pxPerMm;
      const sy = (pos.y - viewport.panY) * pxPerMm;
      const lines = (tb.text || '…').split('\n');
      // Match TextBoxLayer sizing exactly
      const fontSizeMm = Math.max(13 / pxPerMm, 3.5);
      const fontSizePx = fontSizeMm * pxPerMm;
      const lineH = fontSizePx * 1.4;
      const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
      const widthMm = Math.max(30, longestLine.length * fontSizeMm * 0.55 + 6);
      const widthPx = widthMm * pxPerMm;
      const heightMm = lines.length * fontSizeMm * 1.4 + 3;
      const heightPx = heightMm * pxPerMm;
      const padPx = 3 * pxPerMm;
      return createElement(
        'g',
        { key: 'move-textbox-preview', opacity: 0.6 },
        createElement('rect', {
          x: sx - padPx,
          y: sy - padPx,
          width: widthPx + padPx * 2,
          height: heightPx + padPx,
          rx: 3,
          fill: 'white',
          stroke: CANVAS_GHOST,
          strokeWidth: 2,
          strokeDasharray: '6 3',
        }),
        createElement(
          'text',
          {
            x: sx,
            y: sy + fontSizePx * 0.85,
            fontSize: fontSizePx,
            fontFamily: 'system-ui, sans-serif',
            fill: CANVAS_GHOST,
          },
          ...lines.map((line, i) =>
            createElement('tspan', { key: i, x: sx, dy: i === 0 ? 0 : lineH }, line),
          ),
        ),
      );
    }
    return null;
  }, [phase, pickedPointId, pickedTextBoxId, cursorMm, snapResult, state, viewport]);

  return {
    handleClick,
    handleCursorMove,
    handleEscape,
    reset,
    isIdle: phase === 'idle',
    statusMessage,
    snapResult: phase === 'point_picked' ? snapResult : null,
    overlayElements,
    isActiveGesture:
      (phase === 'point_picked' && !!pickedPointId && !!cursorMm) ||
      (phase === 'textbox_picked' && !!pickedTextBoxId),
    activePointId: phase === 'point_picked' ? pickedPointId : null,
  };
}
