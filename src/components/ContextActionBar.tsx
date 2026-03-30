import { useState, useEffect, useRef } from 'react';
import type { ConstructionState, ViewportState, Segment } from '@/model/types';
import { UI_SURFACE, UI_BORDER, UI_DESTRUCTIVE, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface ContextActionBarProps {
  readonly state: ConstructionState;
  readonly viewport: ViewportState;
  readonly onDelete: (elementId: string) => void;
  readonly onToggleLock?: (pointId: string) => void;
}

/**
 * Contextual action bar positioned near the selected element.
 * 44×44px buttons with micro-confirmation on delete.
 */
export function ContextActionBar({
  state,
  viewport,
  onDelete,
  onToggleLock,
}: ContextActionBarProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { selectedElementId } = state;

  // Reset confirmation when selection changes
  useEffect(() => {
    setConfirmingDelete(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  }, [selectedElementId]);

  // Escape cancels micro-confirmation
  useEffect(() => {
    if (!confirmingDelete) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setConfirmingDelete(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [confirmingDelete]);

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

  // Keep in bounds
  if (posY < 10) posY += 100; // Move below element if too close to top

  const deleteLabel = point
    ? `Supprimer le point ${point.label}`
    : segment
      ? `Supprimer le segment ${getSegmentLabel(segment, state)}`
      : 'Supprimer le cercle';

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      onDelete(selectedElementId);
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

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
        whiteSpace: 'nowrap',
      }}
      data-testid="context-action-bar"
    >
      <button
        onClick={handleDeleteClick}
        style={{
          minWidth: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          padding: '0 10px',
          border: 'none',
          borderRadius: 4,
          background: confirmingDelete ? UI_DESTRUCTIVE : 'transparent',
          color: confirmingDelete ? '#FFFFFF' : UI_TEXT_PRIMARY,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: confirmingDelete ? 600 : 400,
        }}
        data-testid="context-delete"
      >
        {confirmingDelete ? 'Confirmer?' : deleteLabel}
      </button>

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
            fontSize: 12,
          }}
          data-testid="context-lock"
        >
          {point.locked ? 'Déverrouiller' : 'Verrouiller'}
        </button>
      )}
    </div>
  );
}

function getSegmentLabel(segment: Segment, state: ConstructionState): string {
  const start = state.points.find((p) => p.id === segment.startPointId);
  const end = state.points.find((p) => p.id === segment.endPointId);
  return `${start?.label ?? '?'}${end?.label ?? '?'}`;
}
