import { memo } from 'react';
import type { SnapResult, ViewportState } from '@/model/types';
import { CANVAS_POINT, CANVAS_GUIDE } from '@/config/theme';
import { CSS_PX_PER_MM } from '@/engine/viewport';

interface SnapFeedbackProps {
  readonly snapResult: SnapResult | null;
  readonly viewport: ViewportState;
}

export const SnapFeedback = memo(function SnapFeedback({
  snapResult,
  viewport,
}: SnapFeedbackProps) {
  if (!snapResult || snapResult.snapType === 'none') return null;

  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const sx = (snapResult.snappedPosition.x - viewport.panX) * pxPerMm;
  const sy = (snapResult.snappedPosition.y - viewport.panY) * pxPerMm;

  if (snapResult.snapType === 'point') {
    // Halo around snapped point
    return (
      <circle
        cx={sx}
        cy={sy}
        r={12}
        fill="none"
        stroke={CANVAS_POINT}
        strokeWidth={2}
        opacity={0.4}
        data-testid="snap-point-halo"
      />
    );
  }

  if (snapResult.snapType === 'midpoint') {
    // Green diamond + "milieu" label (spec §7.1)
    return (
      <g>
        <rect
          x={sx - 5}
          y={sy - 5}
          width={10}
          height={10}
          fill={CANVAS_GUIDE}
          opacity={0.6}
          transform={`rotate(45 ${sx} ${sy})`}
          data-testid="snap-midpoint-diamond"
        />
        <text
          x={sx + 10}
          y={sy - 6}
          fill={CANVAS_GUIDE}
          fontSize={11}
          fontFamily="system-ui, sans-serif"
          opacity={0.8}
        >
          milieu
        </text>
      </g>
    );
  }

  if (snapResult.snapType === 'circumference') {
    // Halo on circle circumference
    return (
      <circle
        cx={sx}
        cy={sy}
        r={10}
        fill="none"
        stroke={CANVAS_GUIDE}
        strokeWidth={2}
        opacity={0.5}
        data-testid="snap-circumference-halo"
      />
    );
  }

  if (snapResult.snapType === 'grid') {
    // Small dot at grid intersection
    return (
      <circle cx={sx} cy={sy} r={4} fill={CANVAS_GUIDE} opacity={0.6} data-testid="snap-grid-dot" />
    );
  }

  return null;
});
