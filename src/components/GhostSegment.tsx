import { memo } from 'react';
import type { ViewportState, DisplayUnit } from '@/model/types';
import { CANVAS_GHOST, CANVAS_GHOST_OPACITY, CANVAS_MEASUREMENT } from '@/config/theme';
import { MIN_CANVAS_FONT_PX } from '@/config/accessibility';
import { CSS_PX_PER_MM } from '@/engine/viewport';
import { distance } from '@/engine/geometry';
import { formatLength } from '@/engine/format';

interface GhostSegmentProps {
  readonly startMm: { x: number; y: number };
  readonly endMm: { x: number; y: number };
  readonly viewport: ViewportState;
  readonly displayUnit: DisplayUnit;
  readonly isChaining: boolean;
}

export const GhostSegment = memo(function GhostSegment({
  startMm,
  endMm,
  viewport,
  displayUnit,
  isChaining,
}: GhostSegmentProps) {
  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const sx1 = (startMm.x - viewport.panX) * pxPerMm;
  const sy1 = (startMm.y - viewport.panY) * pxPerMm;
  const sx2 = (endMm.x - viewport.panX) * pxPerMm;
  const sy2 = (endMm.y - viewport.panY) * pxPerMm;

  const lengthMm = distance(startMm, endMm);
  const lengthText = formatLength(lengthMm, displayUnit);
  const opacity = isChaining ? 0.3 : CANVAS_GHOST_OPACITY;

  return (
    <g data-testid="ghost-segment">
      <line
        x1={sx1}
        y1={sy1}
        x2={sx2}
        y2={sy2}
        stroke={CANVAS_GHOST}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={opacity}
      />
      {/* Length label near cursor (end point) */}
      <text
        x={sx2 + 10}
        y={sy2 - 10}
        fill={CANVAS_MEASUREMENT}
        fontSize={Math.max(MIN_CANVAS_FONT_PX, 13)}
        fontFamily="system-ui, sans-serif"
        opacity={0.8}
      >
        {lengthText}
      </text>
    </g>
  );
});
