import type { ConstructionState, ViewportState, Segment } from '@/model/types';
import { UI_SURFACE, UI_BORDER, UI_TEXT_PRIMARY } from '@/config/theme';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface ContextActionBarProps {
  readonly state: ConstructionState;
  readonly viewport: ViewportState;
  readonly onToggleLock?: (pointId: string) => void;
  readonly onFixCircleRadius?: (circleId: string) => void;
  readonly onFixSegmentLength?: (segmentId: string) => void;
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
  containerWidth,
  fontScale = 1,
}: ContextActionBarProps) {
  const { selectedElementId } = state;

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
  const estimatedHalfWidth = 100;
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
    (point && onToggleLock) || (segment && onFixSegmentLength) || (circle && onFixCircleRadius);
  if (!hasActions) return null;

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
    </div>
  );
}

function getSegmentLabel(segment: Segment, state: ConstructionState): string {
  const start = state.points.find((p) => p.id === segment.startPointId);
  const end = state.points.find((p) => p.id === segment.endPointId);
  return `${start?.label ?? '?'}${end?.label ?? '?'}`;
}
