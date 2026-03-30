import { memo } from 'react';
import type { ViewportState, DisplayUnit } from '@/model/types';
import { CANVAS_GHOST, CANVAS_GHOST_OPACITY, CANVAS_MEASUREMENT } from '@/config/theme';
import { MIN_CANVAS_FONT_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { formatLength } from '@/engine/format';

interface GhostCircleProps {
  readonly centerMm: { x: number; y: number };
  readonly radiusMm: number;
  readonly viewport: ViewportState;
  readonly displayUnit: DisplayUnit;
}

export const GhostCircle = memo(function GhostCircle({
  centerMm,
  radiusMm,
  viewport,
  displayUnit,
}: GhostCircleProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const cx = (centerMm.x - viewport.panX) * pxPerMm;
  const cy = (centerMm.y - viewport.panY) * pxPerMm;
  const r = radiusMm * pxPerMm;

  return (
    <g data-testid="ghost-circle">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={CANVAS_GHOST}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={CANVAS_GHOST_OPACITY}
      />
      <text
        x={cx + r + 8}
        y={cy}
        fill={CANVAS_MEASUREMENT}
        fontSize={Math.max(MIN_CANVAS_FONT_PX, 12)}
        fontFamily="system-ui, sans-serif"
        opacity={0.8}
      >
        r = {formatLength(radiusMm, displayUnit)}
      </text>
    </g>
  );
});
