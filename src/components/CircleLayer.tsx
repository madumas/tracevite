import { memo } from 'react';
import type { Circle, Point, ViewportState, DisplayUnit } from '@/model/types';
import { useCanvasColors, SEGMENT_COLORS } from '@/config/theme';
import { MIN_CANVAS_FONT_PX, FOCUS_DIM_OPACITY } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { formatLength } from '@/engine/format';

interface CircleLayerProps {
  readonly circles: readonly Circle[];
  readonly points: readonly Point[];
  readonly viewport: ViewportState;
  readonly selectedElementId: string | null;
  readonly displayUnit: DisplayUnit;
  readonly fontScale: number;
  readonly estimationMode?: boolean;
  readonly focusDimmedIds?: ReadonlySet<string>;
}

export const CircleLayer = memo(function CircleLayer({
  circles,
  points,
  viewport,
  selectedElementId,
  displayUnit,
  fontScale,
  estimationMode = false,
  focusDimmedIds,
}: CircleLayerProps) {
  const colors = useCanvasColors();
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const pointMap = new Map(points.map((p) => [p.id, p]));

  return (
    <g data-testid="circle-layer">
      {circles.map((circle) => {
        const center = pointMap.get(circle.centerPointId);
        if (!center) return null;

        const cx = (center.x - viewport.panX) * pxPerMm;
        const cy = (center.y - viewport.panY) * pxPerMm;
        const r = circle.radiusMm * pxPerMm;
        const isSelected = circle.id === selectedElementId;

        const isDimmed = focusDimmedIds?.has(circle.centerPointId) ?? false;

        return (
          <g key={circle.id} opacity={isDimmed ? FOCUS_DIM_OPACITY : undefined}>
            {isSelected && (
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={colors.selectionBg}
                strokeWidth={6}
                strokeDasharray="4 2"
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={
                circle.colorIndex != null
                  ? (SEGMENT_COLORS[circle.colorIndex] ?? colors.segment)
                  : colors.segment
              }
              strokeWidth={2}
              data-testid={`circle-${circle.id}`}
              data-element-id={circle.id}
            />
            {/* Center crosshair — helps TDC children find the center for snap */}
            <line
              x1={cx - 5}
              y1={cy}
              x2={cx + 5}
              y2={cy}
              stroke={colors.guide}
              strokeWidth={1}
              opacity={0.5}
            />
            <line
              x1={cx}
              y1={cy - 5}
              x2={cx}
              y2={cy + 5}
              stroke={colors.guide}
              strokeWidth={1}
              opacity={0.5}
            />
            {/* Radius label — placed inside circle, below center */}
            {!estimationMode && (
              <text
                x={cx}
                y={cy + 30 * fontScale}
                fill={colors.measurement}
                fontSize={Math.max(MIN_CANVAS_FONT_PX, 13) * fontScale}
                fontFamily="system-ui, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
                paintOrder="stroke"
                stroke="white"
                strokeWidth={3}
              >
                rayon {formatLength(circle.radiusMm, displayUnit)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
