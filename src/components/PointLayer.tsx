import { memo } from 'react';
import type { Point, ViewportState } from '@/model/types';
import { CANVAS_POINT, CANVAS_TRANSFORMED, CANVAS_TRANSFORM_PALETTE } from '@/config/theme';
import {
  POINT_DISPLAY_RADIUS_MM,
  MIN_CANVAS_FONT_PX,
  FOCUS_DIM_OPACITY,
} from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { chooseLabelOffset, type Obstacle } from '@/engine/label-placement';

interface PointLayerProps {
  readonly points: readonly Point[];
  readonly viewport: ViewportState;
  readonly selectedElementId: string | null;
  readonly fontScale?: number;
  readonly pointColor?: string;
  readonly labelObstacles?: Map<string, Obstacle[]>;
  readonly focusDimmedIds?: ReadonlySet<string>;
}

export const PointLayer = memo(function PointLayer({
  points,
  viewport,
  selectedElementId,
  fontScale = 1,
  pointColor = CANVAS_POINT,
  labelObstacles,
  focusDimmedIds,
}: PointLayerProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const radiusPx = POINT_DISPLAY_RADIUS_MM * CSS_PX_PER_MM;
  const fontSize = Math.max(MIN_CANVAS_FONT_PX, 14) * fontScale;
  const labelHeight = fontSize * 1.2;

  // Sort by ID for deterministic placement (accumulator order matters)
  const sortedPoints = [...points].sort((a, b) => a.id.localeCompare(b.id));

  // Accumulate placed labels in absolute screen coordinates
  const placedLabelsAbs: Array<Obstacle> = [];

  return (
    <g data-testid="point-layer">
      {sortedPoints.map((point) => {
        const sx = (point.x - viewport.panX) * pxPerMm;
        const sy = (point.y - viewport.panY) * pxPerMm;
        const isSelected = point.id === selectedElementId;
        const labelWidth = point.label.length * fontSize * 0.6;

        // Convert absolute placed labels to relative-to-this-point for chooseLabelOffset
        const pointObstacles = labelObstacles?.get(point.id) ?? [];
        const relPlaced = placedLabelsAbs.map((o) => ({
          x: o.x - sx,
          y: o.y - sy,
          width: o.width,
          height: o.height,
        }));
        const allObstacles = [...pointObstacles, ...relPlaced];

        const offset = chooseLabelOffset(radiusPx, labelWidth, labelHeight, allObstacles);

        // Register this label in absolute coordinates for subsequent points
        const labelCx =
          offset.textAnchor === 'start'
            ? offset.dx + labelWidth / 2
            : offset.textAnchor === 'end'
              ? offset.dx - labelWidth / 2
              : offset.dx;
        const labelCy = offset.dy - labelHeight / 2;
        placedLabelsAbs.push({
          x: sx + labelCx - labelWidth / 2,
          y: sy + labelCy - labelHeight / 2,
          width: labelWidth,
          height: labelHeight,
        });

        const isDimmed = focusDimmedIds?.has(point.id) ?? false;
        const effectiveColor =
          point.transformGroupIndex != null
            ? CANVAS_TRANSFORM_PALETTE[point.transformGroupIndex % CANVAS_TRANSFORM_PALETTE.length]!
            : point.transformOperation
              ? CANVAS_TRANSFORMED
              : pointColor;

        return (
          <g key={point.id} opacity={isDimmed ? FOCUS_DIM_OPACITY : undefined}>
            <circle
              cx={sx}
              cy={sy}
              r={radiusPx}
              fill={effectiveColor}
              opacity={isSelected ? 1 : 0.8}
              data-testid={`point-${point.id}`}
            />
            <text
              x={sx + offset.dx}
              y={sy + offset.dy}
              fill={effectiveColor}
              fontSize={fontSize}
              fontFamily="system-ui, sans-serif"
              textAnchor={offset.textAnchor}
              paintOrder="stroke"
              stroke="white"
              strokeWidth={3}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </g>
  );
});
