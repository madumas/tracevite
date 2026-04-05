import { useState, useEffect, useRef } from 'react';
import type { ConstructionState, ViewportState, Segment } from '@/model/types';
import {
  UI_SURFACE,
  UI_BORDER,
  UI_TEXT_PRIMARY,
  UI_DESTRUCTIVE,
  SEGMENT_COLORS,
} from '@/config/theme';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { ACTION_DELETE } from '@/config/messages';

/** Timeout before delete confirmation auto-resets (matches chainTimeoutMs). */
const DELETE_CONFIRM_TIMEOUT_MS = 8000;

interface ContextActionBarProps {
  readonly state: ConstructionState;
  readonly viewport: ViewportState;
  readonly onToggleLock?: (pointId: string) => void;
  readonly onFixCircleRadius?: (circleId: string) => void;
  readonly onFixSegmentLength?: (segmentId: string) => void;
  readonly onDeleteElement?: (elementId: string) => void;
  readonly onSetSegmentColor?: (segmentId: string, colorIndex: number | undefined) => void;
  readonly onSetCircleColor?: (circleId: string, colorIndex: number | undefined) => void;
  readonly containerWidth?: number;
  readonly fontScale?: number;
}

/**
 * Contextual action bar positioned near the selected element.
 * 44×44px buttons. Delete is only available via delete mode (trash tool).
 */
export function ContextActionBar({
  state,
  viewport,
  onToggleLock,
  onFixCircleRadius,
  onFixSegmentLength,
  onDeleteElement,
  onSetSegmentColor,
  onSetCircleColor,
  containerWidth,
  fontScale = 1,
}: ContextActionBarProps) {
  const { selectedElementId } = state;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset confirmation when selection changes
  useEffect(() => {
    setConfirmingDelete(false);
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
  }, [selectedElementId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  if (!selectedElementId) return null;

  // Find element info
  const point = state.points.find((p) => p.id === selectedElementId);
  const segment = state.segments.find((s) => s.id === selectedElementId);
  const circle = state.circles.find((c) => c.id === selectedElementId);

  if (!point && !segment && !circle) return null;

  // Compute screen position
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  let posX = 0;
  let posY = 0;

  if (point) {
    posX = (point.x - viewport.panX) * pxPerMm;
    posY = (point.y - viewport.panY) * pxPerMm - 50;
  } else if (segment) {
    const start = state.points.find((p) => p.id === segment.startPointId);
    const end = state.points.find((p) => p.id === segment.endPointId);
    if (start && end) {
      posX = ((start.x + end.x) / 2 - viewport.panX) * pxPerMm;
      posY = ((start.y + end.y) / 2 - viewport.panY) * pxPerMm - 50;
    }
  } else if (circle) {
    const center = state.points.find((p) => p.id === circle.centerPointId);
    if (center) {
      posX = (center.x - viewport.panX) * pxPerMm;
      posY = (center.y - viewport.panY - circle.radiusMm) * pxPerMm - 50;
    }
  }

  // Keep in bounds (vertical + horizontal clamp)
  if (posY < 10) posY += 100;
  const estimatedHalfWidth = 150;
  posX = Math.max(
    estimatedHalfWidth + 8,
    Math.min(
      posX,
      (containerWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200)) -
        estimatedHalfWidth -
        8,
    ),
  );

  // Only show if there are actions to display
  const hasActions =
    (point && onToggleLock) ||
    (segment && (onFixSegmentLength || onSetSegmentColor)) ||
    (circle && onFixCircleRadius) ||
    onDeleteElement;
  if (!hasActions) return null;

  // Build concrete delete label (e.g. "Effacer AB ?" or "Effacer le point A ?")
  const deleteConfirmLabel = confirmingDelete
    ? point
      ? `Effacer ${point.label}?`
      : segment
        ? `Effacer ${getSegmentLabel(segment, state)}?`
        : circle
          ? `Effacer le cercle?`
          : 'Effacer?'
    : ACTION_DELETE;

  return (
    <div
      style={{
        position: 'absolute',
        left: posX,
        top: posY,
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: MIN_BUTTON_GAP_PX,
        background: UI_SURFACE,
        border: `1px solid ${UI_BORDER}`,
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        zIndex: 30,
        fontSize: 12 * fontScale,
        whiteSpace: 'nowrap',
      }}
      data-testid="context-action-bar"
    >
      {point && onToggleLock && (
        <button
          onClick={() => onToggleLock(point.id)}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            padding: '0 10px',
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 'inherit',
          }}
          data-testid="context-lock"
        >
          {point.locked ? 'Déverrouiller' : 'Verrouiller'}
        </button>
      )}

      {segment && onFixSegmentLength && (
        <button
          onClick={() => onFixSegmentLength(segment.id)}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            padding: '0 10px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            background: 'transparent',
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 'inherit',
          }}
          aria-label={`Fixer la longueur du segment ${getSegmentLabel(segment, state)}`}
          data-testid="context-fix-length"
        >
          {segment.fixedLength != null ? 'Modifier la longueur' : 'Fixer la longueur'}
        </button>
      )}

      {circle && onFixCircleRadius && (
        <button
          onClick={() => onFixCircleRadius(circle.id)}
          style={{
            minWidth: MIN_BUTTON_SIZE_PX,
            height: MIN_BUTTON_SIZE_PX,
            padding: '0 10px',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            background: 'transparent',
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: 'inherit',
          }}
          aria-label="Fixer le rayon ou le diamètre du cercle"
          data-testid="context-fix-radius"
        >
          Fixer rayon
        </button>
      )}

      {/* Per-element color pastilles */}
      {((segment && onSetSegmentColor) || (circle && onSetCircleColor)) && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {SEGMENT_COLORS.map((color, i) => {
            const currentIndex = segment ? segment.colorIndex : circle?.colorIndex;
            return (
              <button
                key={color}
                onClick={() => {
                  const newIndex = currentIndex === i ? undefined : i;
                  if (segment && onSetSegmentColor) onSetSegmentColor(segment.id, newIndex);
                  else if (circle && onSetCircleColor) onSetCircleColor(circle.id, newIndex);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: color,
                  border: currentIndex === i ? '3px solid #1A2433' : '2px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  padding: 0,
                  minWidth: 44,
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={`Couleur ${i + 1}`}
                data-testid={`context-color-${i}`}
              />
            );
          })}
        </div>
      )}

      {/* Delete with micro-confirmation */}
      {onDeleteElement && (
        <>
          <div style={{ width: 1, alignSelf: 'stretch', background: UI_BORDER, margin: '6px' }} />
          <button
            onClick={() => {
              if (confirmingDelete) {
                onDeleteElement(selectedElementId);
                setConfirmingDelete(false);
              } else {
                setConfirmingDelete(true);
                if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                confirmTimerRef.current = setTimeout(() => {
                  setConfirmingDelete(false);
                  confirmTimerRef.current = null;
                }, DELETE_CONFIRM_TIMEOUT_MS);
              }
            }}
            style={{
              minWidth: MIN_BUTTON_SIZE_PX,
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 10px',
              border: confirmingDelete ? `1px solid ${UI_DESTRUCTIVE}` : 'none',
              borderRadius: 4,
              background: confirmingDelete ? UI_DESTRUCTIVE : 'transparent',
              color: confirmingDelete ? '#FFFFFF' : UI_DESTRUCTIVE,
              cursor: 'pointer',
              fontSize: 'inherit',
              fontWeight: 500,
            }}
            aria-label={confirmingDelete ? 'Confirmer la suppression' : ACTION_DELETE}
            data-testid="context-delete"
          >
            {deleteConfirmLabel}
          </button>
        </>
      )}
    </div>
  );
}

function getSegmentLabel(segment: Segment, state: ConstructionState): string {
  const start = state.points.find((p) => p.id === segment.startPointId);
  const end = state.points.find((p) => p.id === segment.endPointId);
  return `${start?.label ?? '?'}${end?.label ?? '?'}`;
}
