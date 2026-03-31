import { memo } from 'react';
import type { Point, ConstructionState, ViewportState } from '@/model/types';
import { useCanvasColors } from '@/config/theme';
import { POINT_DISPLAY_RADIUS_MM } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface MovePreviewProps {
  readonly point: Point;
  readonly previewPosition: { x: number; y: number };
  readonly state: ConstructionState;
  readonly viewport: ViewportState;
}

/**
 * Preview of a point being moved: enlarged point at cursor + ghost segments.
 */
export const MovePreview = memo(function MovePreview({
  point,
  previewPosition,
  state,
  viewport,
}: MovePreviewProps) {
  const colors = useCanvasColors();
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const radiusPx = POINT_DISPLAY_RADIUS_MM * CSS_PX_PER_MM * 1.3;

  const sx = (previewPosition.x - viewport.panX) * pxPerMm;
  const sy = (previewPosition.y - viewport.panY) * pxPerMm;

  // Connected segments rendered as ghost lines
  const connectedSegments = state.segments.filter(
    (s) => s.startPointId === point.id || s.endPointId === point.id,
  );

  const pointMap = new Map(state.points.map((p) => [p.id, p]));

  return (
    <g data-testid="move-preview">
      {/* Ghost connected segments */}
      {connectedSegments.map((seg) => {
        const otherId = seg.startPointId === point.id ? seg.endPointId : seg.startPointId;
        const other = pointMap.get(otherId);
        if (!other) return null;

        const ox = (other.x - viewport.panX) * pxPerMm;
        const oy = (other.y - viewport.panY) * pxPerMm;

        return (
          <line
            key={seg.id}
            x1={sx}
            y1={sy}
            x2={ox}
            y2={oy}
            stroke={colors.ghost}
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.5}
          />
        );
      })}

      {/* Enlarged point at cursor */}
      <circle cx={sx} cy={sy} r={radiusPx} fill={colors.point} opacity={0.7} />
    </g>
  );
});
