import { memo } from 'react';
import type { Point, Segment, ViewportState, DisplayUnit } from '@/model/types';
import { CANVAS_SEGMENT, CANVAS_MEASUREMENT, CANVAS_SELECTION_BG } from '@/config/theme';
import { MIN_CANVAS_FONT_PX, SEGMENT_HIT_ZONE_MM } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { formatLength } from '@/engine/format';

interface SegmentLayerProps {
  readonly segments: readonly Segment[];
  readonly points: readonly Point[];
  readonly viewport: ViewportState;
  readonly displayUnit: DisplayUnit;
  readonly selectedElementId: string | null;
}

export const SegmentLayer = memo(function SegmentLayer({
  segments,
  points,
  viewport,
  displayUnit,
  selectedElementId,
}: SegmentLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const hitZonePx = SEGMENT_HIT_ZONE_MM * CSS_PX_PER_MM * 2;

  const pointMap = new Map(points.map((p) => [p.id, p]));

  return (
    <g data-testid="segment-layer">
      {segments.map((segment) => {
        const start = pointMap.get(segment.startPointId);
        const end = pointMap.get(segment.endPointId);
        if (!start || !end) return null;

        const sx1 = (start.x - viewport.panX) * pxPerMm;
        const sy1 = (start.y - viewport.panY) * pxPerMm;
        const sx2 = (end.x - viewport.panX) * pxPerMm;
        const sy2 = (end.y - viewport.panY) * pxPerMm;
        const midSx = (sx1 + sx2) / 2;
        const midSy = (sy1 + sy2) / 2;

        const isSelected = segment.id === selectedElementId;
        const lengthText = formatLength(segment.lengthMm, displayUnit);

        // Offset label perpendicular to segment
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const offsetX = len > 0 ? (-dy / len) * 14 : 0;
        const offsetY = len > 0 ? (dx / len) * 14 : -14;

        return (
          <g key={segment.id}>
            {/* Invisible hit zone for interaction */}
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={hitZonePx}
              data-element-id={segment.id}
            />
            {/* Selection highlight */}
            {isSelected && (
              <line
                x1={sx1}
                y1={sy1}
                x2={sx2}
                y2={sy2}
                stroke={CANVAS_SELECTION_BG}
                strokeWidth={6}
                strokeDasharray="4 2"
              />
            )}
            {/* Visible segment */}
            <line
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke={CANVAS_SEGMENT}
              strokeWidth={2}
              strokeLinecap="round"
              data-testid={`segment-${segment.id}`}
            />
            {/* Length label */}
            <text
              x={midSx + offsetX}
              y={midSy + offsetY}
              fill={CANVAS_MEASUREMENT}
              fontSize={Math.max(MIN_CANVAS_FONT_PX, 13)}
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {lengthText}
            </text>
          </g>
        );
      })}
    </g>
  );
});
