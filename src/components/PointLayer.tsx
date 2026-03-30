import { memo } from 'react';
import type { Point, ViewportState } from '@/model/types';
import { CANVAS_POINT, CANVAS_LABEL } from '@/config/theme';
import { POINT_DISPLAY_RADIUS_MM, MIN_CANVAS_FONT_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface PointLayerProps {
  readonly points: readonly Point[];
  readonly viewport: ViewportState;
  readonly selectedElementId: string | null;
  readonly fontScale?: number;
}

export const PointLayer = memo(function PointLayer({
  points,
  viewport,
  selectedElementId,
  fontScale = 1,
}: PointLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const radiusPx = POINT_DISPLAY_RADIUS_MM * CSS_PX_PER_MM; // Physical mm to CSS px (independent of zoom for consistent screen size)

  return (
    <g data-testid="point-layer">
      {points.map((point) => {
        const sx = (point.x - viewport.panX) * pxPerMm;
        const sy = (point.y - viewport.panY) * pxPerMm;
        const isSelected = point.id === selectedElementId;

        return (
          <g key={point.id}>
            <circle
              cx={sx}
              cy={sy}
              r={radiusPx}
              fill={CANVAS_POINT}
              opacity={isSelected ? 1 : 0.8}
              data-testid={`point-${point.id}`}
            />
            <text
              x={sx + radiusPx + 4}
              y={sy - radiusPx - 2}
              fill={CANVAS_LABEL}
              fontSize={Math.max(MIN_CANVAS_FONT_PX, 14) * fontScale}
              fontFamily="system-ui, sans-serif"
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </g>
  );
});
