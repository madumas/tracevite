import { memo } from 'react';
import type { Circle, Point, ViewportState } from '@/model/types';
import { useCanvasColors } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface CircleLayerProps {
  readonly circles: readonly Circle[];
  readonly points: readonly Point[];
  readonly viewport: ViewportState;
  readonly selectedElementId: string | null;
}

export const CircleLayer = memo(function CircleLayer({
  circles,
  points,
  viewport,
  selectedElementId,
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

        return (
          <g key={circle.id}>
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
              stroke={colors.segment}
              strokeWidth={2}
              data-testid={`circle-${circle.id}`}
              data-element-id={circle.id}
            />
          </g>
        );
      })}
    </g>
  );
});
